// Опрос специалистов по протоколу LOS/1. Ничего не придумывает: чего нет в ответе — того нет.
import { canRead } from './permissions.js';

const RESOURCES = ['summary', 'goals', 'tasks', 'alerts', 'events', 'analytics'];

async function getJson(fetchImpl, url, token, timeoutMs) {
  const res = await fetchImpl(url, {
    headers: token ? { authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Собрать состояние одной системы.
 * status: not_configured | no_token | unreachable | ok | degraded | down | error
 */
export async function syncSystem(system, perm, { fetchImpl = fetch, timeoutMs = 5000, now = new Date() } = {}) {
  const state = {
    system_id: system.system_id,
    name: system.name,
    domain: system.domain,
    status: 'not_configured',
    synced_at: now.toISOString(),
    manifest: null,
    data: {},       // resource -> { as_of, data }
    errors: [],
  };

  if (!system.base_url) return state;

  const base = system.base_url.replace(/\/$/, '');

  try {
    const health = await getJson(fetchImpl, `${base}/health`, null, timeoutMs);
    state.status = health.status || 'ok';
  } catch (e) {
    state.status = 'unreachable';
    state.errors.push(`health: ${e.message}`);
    return state;
  }

  if (!system.token) {
    state.status = 'no_token';
    return state;
  }

  if (canRead(perm, 'profile')) {
    try {
      const env = await getJson(fetchImpl, `${base}/api/v1/profile`, system.token, timeoutMs);
      state.manifest = env.data ?? null;
      if (state.manifest?.name) state.name = state.manifest.name;
      // Карточку определяет реестр центра; домен из манифеста — только если в реестре его нет.
      if (!state.domain && state.manifest?.domain) state.domain = state.manifest.domain;
    } catch (e) {
      state.errors.push(`profile: ${e.message}`);
    }
  }

  await Promise.all(
    RESOURCES.filter((r) => canRead(perm, r)).map(async (r) => {
      try {
        const env = await getJson(fetchImpl, `${base}/api/v1/${r}`, system.token, timeoutMs);
        state.data[r] = { as_of: env.as_of ?? null, data: env.data ?? null };
      } catch (e) {
        state.errors.push(`${r}: ${e.message}`);
      }
    }),
  );

  if (state.errors.length && state.status === 'ok') state.status = 'degraded';
  return state;
}

export async function syncAll(config, opts = {}) {
  return Promise.all(config.systems.map((s) => syncSystem(s, config.permissions[s.system_id], opts)));
}

/** Достать список ресурса из состояния системы (или []). */
export function listOf(state, resource) {
  const d = state?.data?.[resource]?.data;
  return Array.isArray(d) ? d : [];
}
