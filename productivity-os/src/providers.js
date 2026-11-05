// Перевод Google Calendar / Google Tasks в объекты протокола LOS/1.
// Всё, что здесь считается, считается из реальных ответов Google. Нет подключения — пусто.

const SEP = '~'; // id в LOS/1: <calendarId|listId>~<id>, чтобы действия знали, где лежит объект
const join = (a, b) => `${a}${SEP}${b}`;
const split = (id) => {
  const i = String(id).lastIndexOf(SEP);
  if (i < 0) throw new Error('Неверный id: ожидается формат <список>~<id>');
  return [id.slice(0, i), id.slice(i + 1)];
};

export function localDate(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function toEvent(e) {
  const allDay = !e.start?.dateTime;
  return {
    id: join(e.calendarId, e.id),
    title: e.summary || '(без названия)',
    kind: 'calendar',
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    all_day: allDay,
    location: e.location ?? null,
  };
}

export function toTask(t) {
  return {
    id: join(t.listId, t.id),
    title: t.title || '(без названия)',
    status: t.status === 'completed' ? 'done' : 'todo',
    due: t.due ?? null,               // Google Tasks хранит только дату (время всегда 00:00Z)
    list: t.listTitle ?? null,
    completed_at: t.completed ?? null,
  };
}

// Дата срока задачи Google — календарная дата, без часового пояса.
const dueDate = (t) => (t.due ? t.due.slice(0, 10) : null);

function startOfWeek(today) {
  const d = new Date(`${today}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7; // понедельник
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

export function createProviders(google, { tz = 'Europe/Prague', now = () => new Date(), cacheMs = 30_000 } = {}) {
  let cache = null;
  let inflight = null;

  // Центр запрашивает 6–7 ресурсов параллельно: все они ждут одну загрузку из Google.
  function load() {
    if (!google.configured) return Promise.resolve(null);
    if (cache && Date.now() - cache.at < cacheMs) return Promise.resolve(cache);
    inflight ??= fetchAll().finally(() => { inflight = null; });
    return inflight;
  }

  async function fetchAll() {
    const n = now();
    const [events, tasks] = await Promise.all([
      google.listEvents(new Date(n.getTime() - 8 * 864e5), new Date(n.getTime() + 14 * 864e5)),
      google.listTasks(),
    ]);
    cache = { at: Date.now(), fetchedAt: n.toISOString(), events: events.filter((e) => e.status !== 'cancelled').map(toEvent), tasks: tasks.filter((t) => !t.deleted).map(toTask) };
    return cache;
  }

  const today = () => localDate(now(), tz);

  return {
    asOf: () => cache?.fetchedAt ?? null,

    profile: async (manifest) => {
      if (!google.configured) return { ...manifest, connection_status: 'disconnected', sync_state: 'never', last_updated: null };
      try {
        const d = await load();
        return { ...manifest, connection_status: 'connected', sync_state: 'idle', last_updated: d.fetchedAt };
      } catch {
        return { ...manifest, connection_status: 'partial', sync_state: 'error', last_updated: cache?.fetchedAt ?? null };
      }
    },

    summary: async () => {
      const d = await load();
      if (!d) return { state: null, highlights: [], progress: [] };
      const t = today();
      const eventsToday = d.events.filter((e) => localDate(new Date(e.start), tz) === t);
      const tasksToday = d.tasks.filter((x) => x.status !== 'done' && dueDate(x) === t);
      const next = d.events.find((e) => !e.all_day && new Date(e.start) > now());
      const parts = [];
      if (eventsToday.length) parts.push(`событий сегодня: ${eventsToday.length}`);
      if (tasksToday.length) parts.push(`задач на сегодня: ${tasksToday.length}`);
      return {
        state: parts.length ? parts.join(', ').replace(/^./, (c) => c.toUpperCase()) : 'На сегодня в календаре и задачах пусто',
        highlights: next ? [{ text: `Следующее: ${next.title}`, at: next.start }] : [],
        progress: [],
      };
    },

    goals: async () => [],

    tasks: async () => {
      const d = await load();
      if (!d) return [];
      return d.tasks.filter((x) => x.status !== 'done' || (x.completed_at && x.completed_at.slice(0, 10) >= startOfWeek(today())));
    },

    events: async ({ from, to } = {}) => {
      const d = await load();
      if (!d) return [];
      const lo = from ? new Date(from) : new Date(now().getTime() - 3600e3);
      const hi = to ? new Date(to) : new Date(now().getTime() + 14 * 864e5);
      return d.events.filter((e) => new Date(e.start) >= lo && new Date(e.start) <= hi);
    },

    alerts: async () => {
      const d = await load();
      if (!d) return [];
      const t = today();
      return d.tasks
        .filter((x) => x.status !== 'done' && dueDate(x) && dueDate(x) < t)
        .map((x) => ({ id: `overdue-${x.id}`, text: `Просрочена задача: ${x.title} (срок ${dueDate(x)})`, severity: 'warning', at: x.due }));
    },

    analytics: async () => {
      const d = await load();
      if (!d) return { period: 'week', from: null, metrics: [] };
      const from = startOfWeek(today());
      const inWeek = (iso) => iso && localDate(new Date(iso), tz) >= from && localDate(new Date(iso), tz) <= today();
      const timed = d.events.filter((e) => !e.all_day && inWeek(e.start) && e.end);
      const hours = timed.reduce((s, e) => s + (new Date(e.end) - new Date(e.start)) / 3600e3, 0);
      return {
        period: 'week',
        from,
        metrics: [
          { key: 'events_this_week', label: 'События с начала недели', value: d.events.filter((e) => inWeek(e.start)).length, unit: 'шт' },
          { key: 'scheduled_hours_this_week', label: 'Часы в календаре с начала недели', value: Math.round(hours * 10) / 10, unit: 'ч' },
          { key: 'tasks_done_this_week', label: 'Выполнено задач с начала недели', value: d.tasks.filter((x) => x.status === 'done' && x.completed_at && x.completed_at.slice(0, 10) >= from).length, unit: 'шт' },
          { key: 'tasks_open', label: 'Открытые задачи', value: d.tasks.filter((x) => x.status !== 'done').length, unit: 'шт' },
        ],
      };
    },

    proposal: async (p) => ({ status: 'queued', result: { received: p.title } }),

    action: async ({ capability, params = {} }) => {
      if (!google.configured) return { status: 'rejected', result: { reason: 'Google-аккаунт не подключён' } };
      let result;
      switch (capability) {
        case 'create_event':
          if (!params.title || !params.start || !params.end) return { status: 'rejected', result: { reason: 'Нужны title, start, end' } };
          result = toEvent({ ...(await google.insertEvent(params)), calendarId: google.calendarIds[0] });
          break;
        case 'create_task':
          if (!params.title) return { status: 'rejected', result: { reason: 'Нужен title' } };
          result = toTask({ ...(await google.insertTask(params)), listId: '@default' });
          break;
        case 'complete_task': {
          const [list, id] = split(params.task_id);
          await google.completeTask(id, list);
          result = { task_id: params.task_id };
          break;
        }
        case 'delete_task': {
          const [list, id] = split(params.task_id);
          await google.deleteTask(id, list);
          result = { task_id: params.task_id };
          break;
        }
        case 'delete_event': {
          const [cal, id] = split(params.event_id);
          await google.deleteEvent(id, cal);
          result = { event_id: params.event_id };
          break;
        }
        default:
          return { status: 'rejected', result: { reason: `Неизвестное действие ${capability}` } };
      }
      cache = null;
      return { status: 'done', result };
    },
  };
}
