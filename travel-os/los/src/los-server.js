// Сервер протокола LOS/1. Копия life-manager-os/templates/specialist-os/server.js:
// системы не импортируют код друг друга, поэтому шаблон копируется, а не подключается.
//
// Запуск: LOS_TOKEN=<длинный случайный токен> LOS_SCOPES=los:read,los:analyze node server.js
// Токен генерируется на сервере (например `openssl rand -hex 32`) и кладётся в секреты
// окружения специалиста и центра. В репозиторий и в чат он не попадает.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

const defaultManifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

// Источники данных. Пока источника нет — честно пусто: [] или null, без примеров и заглушек.
export const providers = {
  asOf: () => defaultManifest.last_updated,
  summary: async () => ({ state: null, highlights: [], progress: [] }),
  goals: async () => [],
  tasks: async () => [],
  alerts: async () => [],
  events: async () => [],
  analytics: async () => ({ period: 'week', from: null, metrics: [] }),
  proposal: async (p) => ({ status: 'queued', result: { received: p.title } }),
  action: async (a) => ({ status: 'rejected', result: { reason: `Действие ${a.capability} ещё не реализовано` } }),
};

const SCOPE_FOR = {
  profile: 'los:read', summary: 'los:read', goals: 'los:read', tasks: 'los:read', alerts: 'los:read', events: 'los:read',
  analytics: 'los:analyze', proposals: 'los:propose', actions: 'los:execute',
};

function authorized(req, scope, { token, scopes }) {
  if (!token) return false;
  const given = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected) && scopes.includes(scope);
}

export function createSpecialist({ token = process.env.LOS_TOKEN, scopes = (process.env.LOS_SCOPES || 'los:read').split(','), p = providers, manifest = defaultManifest, health = () => 'ok' } = {}) {
  const send = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  };
  const envelope = (data) => ({ system_id: manifest.system_id, as_of: p.asOf(), data });

  return createServer(async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    if (req.method === 'GET' && path === '/health') return send(res, 200, { status: await health(), version: manifest.version });

    const m = path.match(/^\/api\/v1\/(\w+)$/);
    const resource = m?.[1];
    if (!resource || !SCOPE_FOR[resource]) return send(res, 404, { error: { code: 'not_found', message: 'Not found' } });
    if (!authorized(req, SCOPE_FOR[resource], { token, scopes })) return send(res, 403, { error: { code: 'forbidden', message: 'Нет нужного scope' } });

    try {
      if (req.method === 'GET') {
        if (resource === 'profile') return send(res, 200, envelope(typeof p.profile === 'function' ? await p.profile(manifest) : manifest));
        if (typeof p[resource] === 'function' && !['proposals', 'actions'].includes(resource)) return send(res, 200, envelope(await p[resource](Object.fromEntries(new URL(req.url, 'http://x').searchParams))));
      }
      if (req.method === 'POST' && (resource === 'proposals' || resource === 'actions')) {
        let raw = '';
        for await (const c of req) raw += c;
        const body = JSON.parse(raw || '{}');
        if (resource === 'actions') {
          const cap = manifest.capabilities.find((c) => c.id === body.capability);
          if (!cap) return send(res, 422, { error: { code: 'unknown_capability', message: body.capability } });
          if (cap.critical && !body.confirmation_id) return send(res, 422, { error: { code: 'confirmation_required', message: 'Критичное действие без подтверждения' } });
          return send(res, 200, await p.action(body));
        }
        return send(res, 202, await p.proposal(body));
      }
      return send(res, 405, { error: { code: 'method_not_allowed', message: req.method } });
    } catch (e) {
      return send(res, 500, { error: { code: 'internal', message: e.message } });
    }
  });
}
