import { createSpecialist, providers } from '../templates/specialist-os/server.js';

export async function listen(server) {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${server.address().port}`;
}

/** Специалист с тестовыми данными (только для тестов, в продукт не попадает). */
export async function startSpecialist({ token = 't0k3n', scopes = ['los:read', 'los:analyze', 'los:propose', 'los:execute'], data = {}, onAction } = {}) {
  const p = { ...providers };
  for (const [k, v] of Object.entries(data)) p[k] = async () => v;
  if (data.asOf) p.asOf = () => data.asOf;
  if (onAction) p.action = onAction;
  const server = createSpecialist({ token, scopes, p });
  const url = await listen(server);
  return { server, url, token };
}

export const baseConfig = (systems, permissions) => ({ timezone: 'Europe/Prague', systems, permissions });
