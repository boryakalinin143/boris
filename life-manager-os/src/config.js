import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const envKey = (prefix, systemId) => `${prefix}_${systemId.toUpperCase().replace(/-/g, '_')}`;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Реестр систем + права. Адреса и токены можно переопределить окружением:
 * LOS_URL_FINANCE_OS, LOS_TOKEN_FINANCE_OS. Токены берутся только из окружения.
 */
export function loadConfig({ env = process.env, configDir = join(ROOT, 'config') } = {}) {
  const { systems } = readJson(join(configDir, 'systems.json'));
  const permissions = readJson(join(configDir, 'permissions.json'));
  delete permissions._comment;

  return {
    timezone: env.LOS_TZ || 'Europe/Prague',
    systems: systems.map((s) => ({
      ...s,
      base_url: env[envKey('LOS_URL', s.system_id)] || s.base_url || null,
      token: env[envKey('LOS_TOKEN', s.system_id)] || null,
    })),
    permissions,
  };
}
