import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncSystem } from '../src/connector.js';
import { startSpecialist } from './helpers.js';

const sys = (extra) => ({ system_id: 'example-os', name: 'Example OS', domain: 'other', base_url: null, token: null, ...extra });

test('не развернутая система: статус not_configured и никаких данных', async () => {
  const s = await syncSystem(sys(), { level: 'READ' });
  assert.equal(s.status, 'not_configured');
  assert.deepEqual(s.data, {});
});

test('без токена центр видит только /health', async () => {
  const sp = await startSpecialist();
  try {
    const s = await syncSystem(sys({ base_url: sp.url }), { level: 'READ' });
    assert.equal(s.status, 'no_token');
    assert.equal(s.manifest, null);
  } finally { sp.server.close(); }
});

test('с токеном: манифест и данные; analytics только при ANALYZE', async () => {
  const sp = await startSpecialist({ data: { tasks: [{ id: '1', title: 'Сдать отчёт', status: 'todo' }] } });
  try {
    const read = await syncSystem(sys({ base_url: sp.url, token: sp.token }), { level: 'READ' });
    assert.equal(read.status, 'ok');
    assert.equal(read.manifest.protocol_version, 'LOS/1');
    assert.equal(read.data.tasks.data[0].title, 'Сдать отчёт');
    assert.equal(read.data.analytics, undefined);

    const an = await syncSystem(sys({ base_url: sp.url, token: sp.token }), { level: 'ANALYZE' });
    assert.ok(an.data.analytics);
  } finally { sp.server.close(); }
});

test('неверный токен: система помечается degraded с ошибками', async () => {
  const sp = await startSpecialist();
  try {
    const s = await syncSystem(sys({ base_url: sp.url, token: 'wrong' }), { level: 'READ' });
    assert.equal(s.status, 'degraded');
    assert.ok(s.errors.some((e) => e.includes('403')));
  } finally { sp.server.close(); }
});

test('недоступная система: unreachable', async () => {
  const s = await syncSystem(sys({ base_url: 'http://127.0.0.1:1', token: 'x' }), { level: 'READ' }, { timeoutMs: 500 });
  assert.equal(s.status, 'unreachable');
});
