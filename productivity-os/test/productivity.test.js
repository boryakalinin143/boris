import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProductivityOS } from '../src/server.js';

const NOW = new Date('2026-11-05T08:00:00Z'); // четверг, 09:00 в Праге
const TOKEN = 'test-token';
const ENV = { LOS_TOKEN: TOKEN, GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'sec', GOOGLE_REFRESH_TOKEN: 'rt' };

/** Поддельный Google: отвечает как настоящий API, записывает вызовы. */
function fakeGoogle() {
  const calls = [];
  const state = {
    events: [
      { id: 'e1', summary: 'Тренировка', start: { dateTime: '2026-11-05T14:00:00+01:00' }, end: { dateTime: '2026-11-05T15:30:00+01:00' } },
      { id: 'e2', summary: 'Отменено', status: 'cancelled', start: { dateTime: '2026-11-05T16:00:00+01:00' }, end: { dateTime: '2026-11-05T17:00:00+01:00' } },
      { id: 'e3', summary: 'Поездка в Вену', start: { date: '2026-11-07' }, end: { date: '2026-11-09' } },
    ],
    tasks: [
      { id: 't1', title: 'Отправить отчёт', status: 'needsAction', due: '2026-11-05T00:00:00.000Z' },
      { id: 't2', title: 'Оплатить аренду', status: 'needsAction', due: '2026-11-03T00:00:00.000Z' },
      { id: 't3', title: 'Купить зерно', status: 'completed', completed: '2026-11-04T12:00:00.000Z' },
    ],
  };
  const json = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fetchImpl = async (url, opts = {}) => {
    const u = new URL(url);
    const method = opts.method || 'GET';
    calls.push(`${method} ${u.pathname}`);
    if (u.pathname === '/token') return json({ access_token: 'at', expires_in: 3600 });
    if (opts.headers?.authorization !== 'Bearer at') return json({ error: { message: 'unauthorized' } }, 401);
    if (u.pathname === '/cal/calendars/primary/events' && method === 'GET') return json({ items: state.events });
    if (u.pathname === '/cal/calendars/primary/events' && method === 'POST') {
      const b = JSON.parse(opts.body); const e = { id: 'new-e', ...b }; state.events.push(e); return json(e);
    }
    if (u.pathname.startsWith('/cal/calendars/primary/events/') && method === 'DELETE') return json(null, 204);
    if (u.pathname === '/tasks/users/@me/lists') return json({ items: [{ id: 'L1', title: 'Мои задачи' }] });
    if (u.pathname === '/tasks/lists/L1/tasks') return json({ items: state.tasks });
    if (u.pathname === '/tasks/lists/%40default/tasks' && method === 'POST') {
      const b = JSON.parse(opts.body); const t = { id: 'new-t', status: 'needsAction', ...b }; state.tasks.push(t); return json(t);
    }
    if (u.pathname.startsWith('/tasks/lists/L1/tasks/') && method === 'PATCH') {
      const t = state.tasks.find((x) => u.pathname.endsWith(x.id)); t.status = 'completed'; t.completed = NOW.toISOString(); return json(t);
    }
    return json({ error: { message: `no route ${method} ${u.pathname}` } }, 404);
  };
  return { fetchImpl, calls, state, google: { tokenUrl: 'https://g.test/token', calendarApi: 'https://g.test/cal', tasksApi: 'https://g.test/tasks' } };
}

async function start(env = ENV, g = fakeGoogle()) {
  const server = createProductivityOS({ env, fetchImpl: g.fetchImpl, google: g.google, now: () => NOW });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (p) => (await fetch(base + p, { headers: { authorization: `Bearer ${TOKEN}` } })).json();
  const post = (p, body) => fetch(base + p, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { server, base, get, post, g };
}

test('без Google-аккаунта: degraded, disconnected и пустые данные', async () => {
  const s = await start({ LOS_TOKEN: TOKEN });
  try {
    assert.equal((await (await fetch(s.base + '/health')).json()).status, 'degraded');
    assert.equal((await s.get('/api/v1/profile')).data.connection_status, 'disconnected');
    assert.deepEqual((await s.get('/api/v1/events')).data, []);
    assert.deepEqual((await s.get('/api/v1/tasks')).data, []);
    assert.equal((await s.get('/api/v1/summary')).data.state, null);
    assert.deepEqual((await s.get('/api/v1/analytics')).data.metrics, []);
  } finally { s.server.close(); }
});

test('события, задачи, просрочки и сводка из Google', async () => {
  const s = await start();
  try {
    const profile = (await s.get('/api/v1/profile')).data;
    assert.equal(profile.connection_status, 'connected');
    assert.equal(profile.last_updated, NOW.toISOString());

    const events = (await s.get('/api/v1/events')).data;
    assert.deepEqual(events.map((e) => e.title), ['Тренировка', 'Поездка в Вену'], 'отменённые события не показываются');
    assert.equal(events[0].id, 'primary~e1');
    assert.equal(events[1].all_day, true);

    const tasks = (await s.get('/api/v1/tasks')).data;
    assert.deepEqual(tasks.map((t) => [t.title, t.status]), [['Отправить отчёт', 'todo'], ['Оплатить аренду', 'todo'], ['Купить зерно', 'done']]);

    const alerts = (await s.get('/api/v1/alerts')).data;
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].text, /Оплатить аренду/);

    const summary = (await s.get('/api/v1/summary')).data;
    assert.equal(summary.state, 'Событий сегодня: 1, задач на сегодня: 1');
    assert.equal(summary.highlights[0].text, 'Следующее: Тренировка');

    const m = Object.fromEntries((await s.get('/api/v1/analytics')).data.metrics.map((x) => [x.key, x.value]));
    assert.equal(m.tasks_done_this_week, 1);
    assert.equal(m.tasks_open, 2);
    assert.equal(m.events_this_week, 1, 'поездка 7.11 — после сегодняшнего дня, ещё не в счётчике');
    assert.equal(m.scheduled_hours_this_week, 1.5);

    assert.equal(s.g.calls.filter((c) => c.endsWith('/token')).length, 1, 'access token кэшируется');
    assert.equal(s.g.calls.filter((c) => c === 'GET /cal/calendars/primary/events').length, 1, 'данные Google кэшируются между запросами центра');
  } finally { s.server.close(); }
});

test('создание задачи и отметка выполненной идут в Google', async () => {
  const s = await start();
  try {
    let r = await (await s.post('/api/v1/actions', { capability: 'create_task', params: { title: 'Позвонить', due: '2026-11-06' }, idempotency_key: 'k1' })).json();
    assert.equal(r.status, 'done');
    assert.equal(s.g.state.tasks.at(-1).due, '2026-11-06T00:00:00.000Z');

    r = await (await s.post('/api/v1/actions', { capability: 'complete_task', params: { task_id: 'L1~t1' }, idempotency_key: 'k2' })).json();
    assert.equal(r.status, 'done');
    assert.equal(s.g.state.tasks[0].status, 'completed');
  } finally { s.server.close(); }
});

test('удаление события — критичное действие: без подтверждения отклоняется', async () => {
  const s = await start();
  try {
    const r = await s.post('/api/v1/actions', { capability: 'delete_event', params: { event_id: 'primary~e1' }, idempotency_key: 'k3' });
    assert.equal(r.status, 422);
    assert.ok(!s.g.calls.some((c) => c.startsWith('DELETE')));
    const ok = await (await s.post('/api/v1/actions', { capability: 'delete_event', params: { event_id: 'primary~e1' }, confirmation_id: 'c1', idempotency_key: 'k4' })).json();
    assert.equal(ok.status, 'done');
  } finally { s.server.close(); }
});

test('без токена центра данные не отдаются', async () => {
  const s = await start();
  try {
    assert.equal((await fetch(s.base + '/api/v1/events')).status, 403);
  } finally { s.server.close(); }
});

test('параллельные запросы центра вызывают Google один раз', async () => {
  const s = await start();
  try {
    await Promise.all(['summary', 'tasks', 'events', 'alerts', 'analytics', 'profile'].map((r) => s.get(`/api/v1/${r}`)));
    assert.equal(s.g.calls.filter((c) => c.endsWith('/token')).length, 1);
    assert.equal(s.g.calls.filter((c) => c === 'GET /cal/calendars/primary/events').length, 1);
  } finally { s.server.close(); }
});
