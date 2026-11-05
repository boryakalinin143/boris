// Travel OS → LIFE MANAGER OS: отдаёт базу поездок по протоколу LOS/1.
// Офлайн-приложение (app.html) этим не затрагивается: адаптер только читает trips.json.
import { pathToFileURL } from 'node:url';
import { createSpecialist } from './los-server.js';
import { createTripProviders } from './trips.js';

export function createTravelOS({ env = process.env, now } = {}) {
  const p = createTripProviders({ path: env.TRAVEL_OS_TRIPS || null, tz: env.LOS_TZ || 'Europe/Prague', ...(now ? { now } : {}) });
  return createSpecialist({
    token: env.LOS_TOKEN,
    scopes: (env.LOS_SCOPES || 'los:read,los:analyze,los:propose').split(','),
    p,
    health: () => (!env.TRAVEL_OS_TRIPS || p.lastError() ? 'degraded' : 'ok'),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.LOS_TOKEN) {
    console.error('Нет LOS_TOKEN. Сгенерируй: openssl rand -hex 32');
    process.exit(1);
  }
  const port = Number(process.env.PORT || 4202);
  createTravelOS().listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Travel OS (LOS/1): http://127.0.0.1:${port}`));
}
