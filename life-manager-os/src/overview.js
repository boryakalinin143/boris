// Модель дашборда: MY LIFE TODAY + LIFE OVERVIEW. Только реальные данные; пустое — null / [].
import { listOf } from './connector.js';
import { runRules } from './intelligence.js';

export const NO_DATA = 'Недостаточно данных';

export const DOMAINS = [
  { key: 'health', title: 'HEALTH' },
  { key: 'finance', title: 'FINANCE' },
  { key: 'fitness', title: 'FITNESS' },
  { key: 'nutrition', title: 'NUTRITION' },
  { key: 'travel', title: 'TRAVEL' },
  { key: 'coffee', title: 'COFFEE' },
  { key: 'knowledge', title: 'KNOWLEDGE' },
  { key: 'productivity', title: 'PRODUCTIVITY' },
  { key: 'home', title: 'HOME' },
  { key: 'style', title: 'STYLE' },
];

export const STATUS_LABELS = {
  not_configured: 'Не развернута',
  no_token: 'Нет токена доступа',
  unreachable: 'Недоступна',
  ok: 'Работает',
  degraded: 'Частично',
  down: 'Не работает',
  error: 'Ошибка',
};

const LIVE = new Set(['ok', 'degraded']);
const DONE = new Set(['done', 'cancelled']);

export function localDate(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

const tag = (state) => (item) => ({ ...item, system_id: state.system_id, system_name: state.name });

function latest(values) {
  const v = values.filter(Boolean).sort();
  return v.length ? v[v.length - 1] : null;
}

function buildCard(domain, states) {
  const mine = states.filter((s) => s.domain === domain.key);
  const live = mine.filter((s) => LIVE.has(s.status));
  const summaries = live.map((s) => s.data.summary?.data).filter(Boolean);

  const card = {
    domain: domain.key,
    title: domain.title,
    systems: mine.map((s) => ({ system_id: s.system_id, name: s.name, status: s.status, status_label: STATUS_LABELS[s.status] ?? s.status })),
    state: summaries.map((x) => x.state).find(Boolean) ?? null,
    recent: summaries.flatMap((x) => x.highlights || []).slice(0, 3),
    progress: summaries.flatMap((x) => x.progress || []).filter((p) => typeof p.value === 'number'),
    tasks: live.flatMap((s) => listOf(s, 'tasks').filter((t) => !DONE.has(t.status)).map(tag(s))).slice(0, 5),
    alerts: live.flatMap((s) => listOf(s, 'alerts').map(tag(s))),
    last_updated: latest(live.flatMap((s) => Object.values(s.data).map((d) => d.as_of))),
  };
  card.has_data = Boolean(card.state || card.recent.length || card.progress.length || card.tasks.length || card.alerts.length);
  return card;
}

export function buildDashboard({ states, store, now = new Date(), tz = 'Europe/Prague' }) {
  const today = localDate(now, tz);
  const weekAhead = new Date(now.getTime() + 7 * 864e5);
  const live = states.filter((s) => LIVE.has(s.status));

  const allTasks = live.flatMap((s) => listOf(s, 'tasks').map(tag(s)));
  const tasksToday = allTasks.filter((t) => !DONE.has(t.status) && t.due && localDate(new Date(t.due), tz) === today);

  const events = live
    .flatMap((s) => listOf(s, 'events').map(tag(s)))
    .filter((e) => e.start && new Date(e.start) >= new Date(now.getTime() - 3600e3) && new Date(e.start) <= weekAhead)
    .sort((a, b) => a.start.localeCompare(b.start));

  const alerts = live.flatMap((s) => listOf(s, 'alerts').map(tag(s)))
    .sort((a, b) => ['critical', 'warning', 'reminder', 'info'].indexOf(a.severity) - ['critical', 'warning', 'reminder', 'info'].indexOf(b.severity));

  const goals = [
    ...store.db.goals.filter((g) => g.status === 'active').map((g) => ({ ...g, system_id: g.owner_system_id, source: 'central' })),
    ...live.flatMap((s) => listOf(s, 'goals').map(tag(s))),
  ].sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.priority ?? 'medium') - ['critical', 'high', 'medium', 'low'].indexOf(b.priority ?? 'medium'));

  const insights = runRules(states);
  const connected = live.length;

  return {
    generated_at: now.toISOString(),
    today: {
      date: today,
      date_label: new Intl.DateTimeFormat('ru-RU', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(now),
      weekday: new Intl.DateTimeFormat('ru-RU', { timeZone: tz, weekday: 'long' }).format(now),
      timezone: tz,
      weather: null, // источник погоды не подключён
    },
    good_morning: goodMorning({ connected, tasksToday, events, alerts, insights, now, tz }),
    goals: goals.slice(0, 5),
    projects: goals.filter((g) => ['business', 'career'].includes(g.category)),
    tasks_today: tasksToday,
    reminders: alerts,
    upcoming_events: events,
    insights,
    pending_proposals: store.db.proposals.filter((p) => p.status === 'pending'),
    systems: states.map((s) => ({
      system_id: s.system_id,
      name: s.name,
      domain: s.domain,
      status: s.status,
      status_label: STATUS_LABELS[s.status] ?? s.status,
      version: s.manifest?.version ?? null,
      last_updated: s.manifest?.last_updated ?? latest(Object.values(s.data).map((d) => d.as_of)),
      sync_state: s.manifest?.sync_state ?? null,
    })),
    connected_count: connected,
    overview: DOMAINS.map((d) => buildCard(d, states)),
  };
}

const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${n} ${w}`;
};

/** Короткий текст GOOD MORNING — собирается только из фактов, которые есть. */
export function goodMorning({ connected, tasksToday, events, alerts, insights, now, tz }) {
  if (connected === 0) {
    return { lines: [], text: `${NO_DATA}: пока не подключена ни одна система.` };
  }
  const lines = [];
  if (tasksToday.length) lines.push(`Сегодня ${plural(tasksToday.length, 'задача', 'задачи', 'задач')} со сроком на сегодня.`);
  const today = localDate(now, tz);
  for (const e of events.slice(0, 3)) {
    const day = localDate(new Date(e.start), tz);
    const time = new Intl.DateTimeFormat('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(e.start));
    const when = day === today ? `Сегодня в ${time}` : new Intl.DateTimeFormat('ru-RU', { timeZone: tz, day: 'numeric', month: 'long' }).format(new Date(e.start)) + ` в ${time}`;
    lines.push(`${when}: ${e.title} (${e.system_name}).`);
  }
  for (const a of alerts.filter((x) => x.severity !== 'info').slice(0, 2)) lines.push(`${a.text} (${a.system_name}).`);
  for (const i of insights.slice(0, 2)) lines.push(i.title + '.');
  return { lines, text: lines.length ? lines.join(' ') : `${NO_DATA}: подключённые системы пока ничего не сообщили на сегодня.` };
}
