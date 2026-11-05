// Перевод базы Travel OS (schema travel-os/1) в объекты LOS/1.
// Номера броней (ref), документы и цены наружу не отдаются: центру они не нужны.
import { readFile, stat } from 'node:fs/promises';

export function localDate(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

const fmtDay = (iso) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const fmtTime = (iso, tz) => new Intl.DateTimeFormat('ru-RU', { timeZone: tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const city = (s) => (s || '').split(/[,(]/)[0].trim();

const TYPE = { flight: 'Рейс', train: 'Поезд', bus: 'Автобус', car: 'Поездка на машине', event: 'Мероприятие', other: 'Переезд' };

/**
 * Фаза поездки считается по датам и текущему моменту, а не берётся из поля status.
 * В день вылета поездка ещё UPCOMING, пока не наступило время первого сегмента.
 */
export function phase(trip, today, now = null) {
  const [start, end] = trip.dates || [];
  if (!start || !end) return 'UNKNOWN';
  if (today < start) return 'UPCOMING';
  if (today > end) return 'COMPLETED';
  const first = (trip.segments || []).map((s) => s.dep).filter(Boolean).sort()[0];
  if (now && today === start && first && now < new Date(first)) return 'UPCOMING';
  return 'ACTIVE';
}

export function segmentTitle(seg) {
  if (seg.type === 'event') return seg.title || 'Мероприятие';
  const what = seg.flight ? `${TYPE.flight} ${seg.flight}` : `${TYPE[seg.type] || 'Переезд'}${seg.carrier && seg.carrier !== '—' ? ` ${seg.carrier}` : ''}`;
  return seg.to ? `${what}: ${city(seg.from)} → ${city(seg.to)}` : what;
}

export function toEvents(db) {
  return (db.trips || []).flatMap((trip) => (trip.segments || [])
    .filter((s) => s.dep)
    .map((s) => ({
      id: `${trip.id}~${s.id}`,
      title: segmentTitle(s),
      kind: s.type === 'event' ? 'event' : 'trip_segment',
      start: s.dep,
      end: s.arr ?? null,
      trip_id: trip.id,
      trip_title: trip.title,
      tz: s.tzFrom ?? null,
    })))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function buildAlerts(db, now, tz) {
  const today = localDate(now, tz);
  const soon = (iso, hours) => iso && new Date(iso) > now && new Date(iso) - now <= hours * 3600e3;
  const out = [];
  for (const trip of db.trips || []) {
    const ph = phase(trip, today, now);
    if (ph === 'COMPLETED' || ph === 'UNKNOWN') continue;
    const daysTo = (new Date(`${trip.dates[0]}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 864e5;
    if (daysTo > 14) continue;
    if (!trip.hotel && trip.hotelNote) {
      out.push({ id: `${trip.id}~hotel`, text: `${trip.title}: нет брони жилья в документах`, severity: 'reminder', at: db.updated ?? null });
    }
    for (const s of trip.segments || []) {
      const label = segmentTitle(s);
      if (soon(s.checkinCloses, 24)) {
        out.push({ id: `${trip.id}~${s.id}~checkin`, text: `${label}: регистрация закрывается ${fmtTime(s.checkinCloses, s.tzFrom || tz)}`, severity: 'warning', at: s.checkinCloses });
      }
      if (s.type === 'flight' && s.boardingPass === false && s.dep && new Date(s.dep) > now) {
        out.push({ id: `${trip.id}~${s.id}~bp`, text: `${label}: нет посадочного талона`, severity: soon(s.dep, 48) ? 'warning' : 'reminder', at: s.dep });
      }
      if (s.dep === null && s.note && ph !== 'COMPLETED') {
        out.push({ id: `${trip.id}~${s.id}~time`, text: `${label}: ${s.note}`, severity: 'info', at: db.updated ?? null });
      }
    }
  }
  return out;
}

export function createTripProviders({ path, tz = 'Europe/Prague', now = () => new Date() }) {
  let cache = { mtime: 0, db: null };

  async function load() {
    if (!path) return null;
    try {
      const st = await stat(path);
      if (st.mtimeMs !== cache.mtime) cache = { mtime: st.mtimeMs, db: JSON.parse(await readFile(path, 'utf8')), error: null };
      return cache.db;
    } catch (e) {
      cache = { mtime: 0, db: null, error: e.message };
      return null;
    }
  }

  const today = () => localDate(now(), tz);

  return {
    lastError: () => cache.error ?? null,
    asOf: () => cache.db?.updated ?? null,

    profile: async (manifest) => {
      const db = await load();
      return db
        ? { ...manifest, connection_status: 'connected', sync_state: 'idle', last_updated: db.updated ?? null }
        : { ...manifest, connection_status: 'disconnected', sync_state: path ? 'error' : 'never', last_updated: null };
    },

    summary: async () => {
      const db = await load();
      if (!db) return { state: null, highlights: [], progress: [] };
      const t = today();
      const trips = (db.trips || []).filter((x) => ['ACTIVE', 'UPCOMING'].includes(phase(x, t, now()))).sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
      const trip = trips[0];
      if (!trip) return { state: 'Предстоящих поездок нет', highlights: [], progress: [] };
      const when = `${fmtDay(trip.dates[0])} – ${fmtDay(trip.dates[1])}`;
      const state = phase(trip, t, now()) === 'ACTIVE' ? `Сейчас в поездке: ${trip.title} (${when})` : `Ближайшая поездка: ${trip.title}, ${when}`;
      const next = toEvents({ trips: [trip] }).find((e) => new Date(e.start) > now());
      return { state, highlights: next ? [{ text: `Дальше: ${next.title}`, at: next.start }] : [], progress: [] };
    },

    goals: async () => [],
    tasks: async () => [],

    events: async ({ from, to } = {}) => {
      const db = await load();
      if (!db) return [];
      const lo = from ? new Date(from) : new Date(now().getTime() - 3600e3);
      const hi = to ? new Date(to) : new Date(now().getTime() + 30 * 864e5);
      return toEvents(db).filter((e) => new Date(e.start) >= lo && new Date(e.start) <= hi);
    },

    alerts: async () => {
      const db = await load();
      return db ? buildAlerts(db, now(), tz) : [];
    },

    analytics: async () => {
      const db = await load();
      if (!db) return { period: 'month', from: null, metrics: [] };
      const t = today();
      const upcoming = (db.trips || []).filter((x) => phase(x, t, now()) === 'UPCOMING').sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
      const metrics = [{ key: 'upcoming_trips', label: 'Предстоящие поездки', value: upcoming.length, unit: 'шт' }];
      if (upcoming[0]) metrics.push({ key: 'days_to_next_trip', label: 'Дней до ближайшей поездки', value: Math.round((new Date(`${upcoming[0].dates[0]}T00:00:00Z`) - new Date(`${t}T00:00:00Z`)) / 864e5), unit: 'дн' });
      return { period: 'month', from: t, metrics };
    },

    proposal: async (p) => ({ status: 'queued', result: { received: p.title } }),
    action: async (a) => ({ status: 'rejected', result: { reason: `Travel OS пока не выполняет действия (${a.capability})` } }),
  };
}
