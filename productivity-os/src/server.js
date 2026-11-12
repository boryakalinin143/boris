// Productivity OS — специалист LOS/1 поверх Google Calendar и Google Tasks.
// Запуск: npm start (переменные берутся из .env, см. README).
import { pathToFileURL } from 'node:url';
import { createSpecialist } from './los-server.js';
import { GoogleClient } from './google.js';
import { createProviders } from './providers.js';

export function createProductivityOS({ env = process.env, fetchImpl = fetch, now, google: googleOpts = {} } = {}) {
  const google = new GoogleClient({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    calendarIds: (env.GOOGLE_CALENDAR_IDS || 'primary').split(',').map((s) => s.trim()).filter(Boolean),
    fetchImpl,
    ...googleOpts,
  });
  const p = createProviders(google, { tz: env.LOS_TZ || 'Europe/Prague', ...(now ? { now } : {}) });
  const health = () => (!google.configured ? 'degraded' : google.lastError ? 'degraded' : 'ok');
  return createSpecialist({
    token: env.LOS_TOKEN,
    scopes: (env.LOS_SCOPES || 'los:read,los:analyze,los:propose,los:execute').split(','),
    p,
    health,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.LOS_TOKEN) {
    console.error('Нет LOS_TOKEN. Сгенерируй: openssl rand -hex 32 и положи в .env (см. README).');
    process.exit(1);
  }
  const port = Number(process.env.PORT || 4201);
  createProductivityOS().listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Productivity OS: http://127.0.0.1:${port}`));
}
