import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../src/server.js';
import { Store } from '../src/store.js';
import { startSpecialist, listen, baseConfig } from './helpers.js';

test('действие с подтверждением: предложение → подтверждение → вызов специалиста с confirmation_id', async () => {
  const calls = [];
  const sp = await startSpecialist({ onAction: async (a) => { calls.push(a); return { status: 'done', result: {} }; } });
  const config = baseConfig(
    [{ system_id: 'example-os', name: 'Example OS', domain: 'productivity', base_url: sp.url, token: sp.token }],
    { 'example-os': { level: 'EXECUTE', allow_actions: ['create_task'], deny_actions: [], confirm_actions: ['create_task'] } },
  );
  const app = createApp({ config, store: new Store(null) });
  const url = await listen(app);
  const post = (p, body) => fetch(url + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  try {
    const r1 = await post('/api/actions', { system_id: 'example-os', capability: 'create_task', params: { title: 'Купить зерно' } });
    assert.equal(r1.status, 202);
    const { proposal } = await r1.json();
    assert.equal(calls.length, 0, 'до подтверждения специалист не вызывается');

    const r2 = await post(`/api/proposals/${proposal.id}/approve`);
    assert.equal(r2.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].confirmation_id, proposal.id);

    const log = await (await fetch(url + '/api/log')).json();
    assert.deepEqual(log.map((l) => l.decision), ['needs_confirmation', 'confirmed', 'executed']);
  } finally { app.close(); sp.server.close(); }
});

test('запрещённое действие отклоняется и логируется', async () => {
  const sp = await startSpecialist();
  const config = baseConfig(
    [{ system_id: 'example-os', name: 'Example OS', domain: 'finance', base_url: sp.url, token: sp.token }],
    { 'example-os': { level: 'EXECUTE', allow_actions: ['create_task'], deny_actions: ['create_task'], confirm_actions: [] } },
  );
  const store = new Store(null);
  const app = createApp({ config, store });
  const url = await listen(app);
  try {
    const r = await fetch(url + '/api/actions', { method: 'POST', body: JSON.stringify({ system_id: 'example-os', capability: 'create_task' }) });
    assert.equal(r.status, 403);
    assert.equal(store.db.action_log[0].decision, 'denied');
  } finally { app.close(); sp.server.close(); }
});

test('дашборд и статика отдаются; путь за пределы public не читается', async () => {
  const app = createApp({ config: baseConfig([], {}), store: new Store(null) });
  const url = await listen(app);
  try {
    assert.equal((await fetch(url + '/')).status, 200);
    const d = await (await fetch(url + '/api/dashboard')).json();
    assert.equal(d.connected_count, 0);
    assert.equal((await fetch(url + '/..%2Fpackage.json')).status, 404);
  } finally { app.close(); }
});

test('шаблон специалиста соответствует JSON Schema манифеста по обязательным полям', () => {
  const schema = JSON.parse(readFileSync(new URL('../protocol/manifest.schema.json', import.meta.url)));
  const manifest = JSON.parse(readFileSync(new URL('../templates/specialist-os/manifest.json', import.meta.url)));
  for (const f of schema.required) assert.ok(f in manifest, f);
});
