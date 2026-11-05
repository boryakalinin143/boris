import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createTravelOS } from '../src/server.js';

const TRIPS = fileURLToPath(new URL('../../data/trips.example.json', import.meta.url));
const TOKEN = 'test-token';

async function start(env, now) {
  const server = createTravelOS({ env: { LOS_TOKEN: TOKEN, ...env }, now: () => now });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const raw = async (p) => (await fetch(base + p, { headers: { authorization: `Bearer ${TOKEN}` } })).text();
  return { server, base, raw, get: async (p) => JSON.parse(await raw(p)) };
}

test('без базы поездок: degraded и пустые данные', async () => {
  const s = await start({}, new Date('2026-11-04T20:00:00Z'));
  try {
    assert.equal((await (await fetch(s.base + '/health')).json()).status, 'degraded');
    assert.equal((await s.get('/api/v1/profile')).data.connection_status, 'disconnected');
    assert.deepEqual((await s.get('/api/v1/events')).data, []);
    assert.equal((await s.get('/api/v1/summary')).data.state, null);
  } finally { s.server.close(); }
});

test('накануне Барселоны: сводка, сегменты, предупреждения, без номеров броней', async () => {
  const s = await start({ TRAVEL_OS_TRIPS: TRIPS }, new Date('2026-11-04T20:00:00Z'));
  try {
    const profile = (await s.get('/api/v1/profile')).data;
    assert.equal(profile.connection_status, 'connected');
    assert.equal(profile.last_updated, '2026-11-04T20:00:00Z');

    assert.equal((await s.get('/api/v1/summary')).data.state, 'Ближайшая поездка: Барселона, 5 ноября – 9 ноября');

    const events = (await s.get('/api/v1/events')).data;
    assert.deepEqual(events.map((e) => e.title), [
      'Рейс VY1195: Прага PRG → Барселона BCN',
      'MIRA Festival 2026',
      'Рейс VY1198: Барселона BCN → Прага PRG',
    ]);

    const alerts = (await s.get('/api/v1/alerts')).data;
    assert.deepEqual(alerts.map((a) => a.severity), ['reminder', 'warning', 'reminder']);
    assert.match(alerts[0].text, /нет брони жилья/);
    assert.match(alerts[1].text, /регистрация закрывается/);
    assert.match(alerts[2].text, /VY1198.*нет посадочного/);

    const m = Object.fromEntries((await s.get('/api/v1/analytics')).data.metrics.map((x) => [x.key, x.value]));
    assert.deepEqual(m, { upcoming_trips: 1, days_to_next_trip: 1 });

    for (const r of ['summary', 'events', 'alerts', 'analytics', 'profile']) {
      assert.ok(!(await s.raw(`/api/v1/${r}`)).includes('XXXXXX'), `${r} не должен содержать номер брони`);
    }
  } finally { s.server.close(); }
});

test('во время поездки фаза считается по датам', async () => {
  const s = await start({ TRAVEL_OS_TRIPS: TRIPS }, new Date('2026-11-07T10:00:00Z'));
  try {
    assert.match((await s.get('/api/v1/summary')).data.state, /^Сейчас в поездке: Барселона/);
    assert.deepEqual((await s.get('/api/v1/events')).data.map((e) => e.title), ['Рейс VY1198: Барселона BCN → Прага PRG']);
  } finally { s.server.close(); }
});

test('после всех поездок: предстоящих нет, предупреждений нет', async () => {
  const s = await start({ TRAVEL_OS_TRIPS: TRIPS }, new Date('2026-11-20T10:00:00Z'));
  try {
    assert.equal((await s.get('/api/v1/summary')).data.state, 'Предстоящих поездок нет');
    assert.deepEqual((await s.get('/api/v1/alerts')).data, []);
  } finally { s.server.close(); }
});

test('действия отклоняются: у Travel OS нет объявленных действий', async () => {
  const s = await start({ TRAVEL_OS_TRIPS: TRIPS, LOS_SCOPES: 'los:read,los:execute' }, new Date('2026-11-04T20:00:00Z'));
  try {
    const r = await fetch(s.base + '/api/v1/actions', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ capability: 'buy_ticket' }) });
    assert.equal(r.status, 422);
  } finally { s.server.close(); }
});

test('в день вылета до рейса поездка ещё предстоящая', async () => {
  const s = await start({ TRAVEL_OS_TRIPS: TRIPS }, new Date('2026-11-05T00:10:00Z'));
  try {
    assert.equal((await s.get('/api/v1/summary')).data.state, 'Ближайшая поездка: Барселона, 5 ноября – 9 ноября');
    const m = Object.fromEntries((await s.get('/api/v1/analytics')).data.metrics.map((x) => [x.key, x.value]));
    assert.deepEqual(m, { upcoming_trips: 1, days_to_next_trip: 0 });
  } finally { s.server.close(); }
});
