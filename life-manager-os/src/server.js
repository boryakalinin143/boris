// LIFE MANAGER OS — оркестратор + дашборд. Node.js 22, без внешних зависимостей.
// Внимание: у интерфейса пока нет входа по паролю, поэтому сервер слушает только 127.0.0.1.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { loadConfig, ROOT } from './config.js';
import { syncAll } from './connector.js';
import { checkAction } from './permissions.js';
import { buildDashboard } from './overview.js';
import { morningBriefing } from './briefing.js';
import { Store } from './store.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

export function createApp({ config = loadConfig(), store = new Store(join(ROOT, 'data', 'state.json')), fetchImpl = fetch, cacheMs = 60_000, now = () => new Date() } = {}) {
  let cache = { at: 0, states: null };

  async function states(force = false) {
    if (force || !cache.states || Date.now() - cache.at > cacheMs) {
      cache = { at: Date.now(), states: await syncAll(config, { fetchImpl, now: now() }) };
    }
    return cache.states;
  }

  const dashboard = async (force) => buildDashboard({ states: await states(force), store, now: now(), tz: config.timezone });

  async function sendToSpecialist(systemId, capability, params, confirmationId) {
    const system = config.systems.find((s) => s.system_id === systemId);
    const isProposal = capability.level !== 'EXECUTE';
    const url = `${system.base_url.replace(/\/$/, '')}/api/v1/${isProposal ? 'proposals' : 'actions'}`;
    const body = isProposal
      ? { title: capability.title, suggested_action: { capability: capability.id, params } }
      : { capability: capability.id, params, confirmation_id: confirmationId, idempotency_key: confirmationId || randomUUID() };
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${system.token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return json;
  }

  async function requestAction({ system_id, capability: capId, params = {} }) {
    const st = (await states()).find((s) => s.system_id === system_id);
    if (!st) return [404, { error: { code: 'not_found', message: 'Система не найдена' } }];
    const capability = st.manifest?.capabilities?.find((c) => c.id === capId) ?? null;
    const perm = config.permissions[system_id];
    const { decision, reason } = checkAction(perm, capId, capability);
    store.log({ system_id, operation: `action:${capId}`, decision, reason, details: { params } });

    if (decision === 'denied') return [403, { decision, reason }];
    if (decision === 'needs_confirmation') {
      const proposal = store.addProposal({ system_id, capability: capId, params, title: capability.title, body: reason });
      return [202, { decision, reason, proposal }];
    }
    const result = await sendToSpecialist(system_id, capability, params, null);
    store.log({ system_id, operation: `action:${capId}`, decision: 'executed', details: { result } });
    return [200, { decision, result }];
  }

  async function decide(id, approved) {
    const p = store.decideProposal(id, approved);
    store.log({ actor: 'boris', system_id: p.system_id, operation: `action:${p.capability}`, decision: approved ? 'confirmed' : 'denied', reason: approved ? 'Подтверждено Борисом' : 'Отклонено Борисом' });
    if (!approved) return [200, { proposal: p }];

    const st = (await states()).find((s) => s.system_id === p.system_id);
    const capability = st?.manifest?.capabilities?.find((c) => c.id === p.capability);
    // Повторная проверка: права могли поменяться, deny-лист по-прежнему сильнее подтверждения.
    const recheck = checkAction(config.permissions[p.system_id], p.capability, capability);
    if (recheck.decision === 'denied') {
      p.status = 'failed';
      store.save();
      return [403, { proposal: p, reason: recheck.reason }];
    }
    try {
      const result = await sendToSpecialist(p.system_id, capability, p.params, p.id);
      p.status = 'executed';
      store.save();
      store.log({ system_id: p.system_id, operation: `action:${p.capability}`, decision: 'executed', details: { result } });
      return [200, { proposal: p, result }];
    } catch (e) {
      p.status = 'failed';
      store.save();
      store.log({ system_id: p.system_id, operation: `action:${p.capability}`, decision: 'failed', reason: e.message });
      return [502, { proposal: p, error: { code: 'specialist_error', message: e.message } }];
    }
  }

  async function readBody(req) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 1e6) throw Object.assign(new Error('Слишком большой запрос'), { status: 413 });
    }
    return raw ? JSON.parse(raw) : {};
  }

  async function route(req) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const m = req.method;

    if (m === 'GET' && path === '/api/dashboard') return [200, await dashboard(url.searchParams.has('refresh'))];
    if (m === 'GET' && path === '/api/briefing/morning') return [200, morningBriefing(await dashboard(false))];
    if (m === 'POST' && path === '/internal/sync') {
      const s = await states(true);
      return [200, { synced_at: new Date().toISOString(), systems: s.map(({ system_id, status, errors }) => ({ system_id, status, errors })) }];
    }
    if (m === 'GET' && path === '/api/goals') return [200, store.db.goals];
    if (m === 'POST' && path === '/api/goals') return [201, store.addGoal(await readBody(req))];
    let g;
    if ((g = path.match(/^\/api\/goals\/([\w-]+)$/)) && m === 'PATCH') return [200, store.updateGoal(g[1], await readBody(req))];
    if ((g = path.match(/^\/api\/goals\/([\w-]+)\/history$/)) && m === 'GET') return [200, store.goalHistory(g[1])];
    if (m === 'POST' && path === '/api/actions') return requestAction(await readBody(req));
    if (m === 'GET' && path === '/api/proposals') return [200, store.db.proposals];
    if ((g = path.match(/^\/api\/proposals\/([\w-]+)\/(approve|reject)$/)) && m === 'POST') return decide(g[1], g[2] === 'approve');
    if (m === 'GET' && path === '/api/log') return [200, store.db.action_log.slice(-200)];

    if (m === 'GET') {
      const file = path === '/' ? 'index.html' : path.slice(1);
      if (/^[\w.-]+$/.test(file) && MIME[extname(file)]) {
        try {
          return [200, await readFile(join(ROOT, 'public', file)), MIME[extname(file)]];
        } catch { /* 404 ниже */ }
      }
    }
    return [404, { error: { code: 'not_found', message: 'Не найдено' } }];
  }

  return createServer(async (req, res) => {
    let status, body, type;
    try {
      [status, body, type] = await route(req);
    } catch (e) {
      status = e.status || (e instanceof SyntaxError ? 400 : 422);
      body = { error: { code: 'bad_request', message: e.message } };
    }
    res.writeHead(status, { 'content-type': type || 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(Buffer.isBuffer(body) ? body : JSON.stringify(body));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4100);
  const host = process.env.HOST || '127.0.0.1';
  createApp().listen(port, host, () => console.log(`LIFE MANAGER OS: http://${host}:${port}`));
}
