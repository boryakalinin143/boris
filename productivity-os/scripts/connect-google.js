// Разовое подключение Google-аккаунта. Запускается на своём компьютере:
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run connect-google
// Откроется ссылка Google, после согласия refresh token запишется в .env (права 600).
// Пароль от Google никто не видит и не вводит здесь: вход идёт на странице Google.
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { SCOPES } from '../src/google.js';

const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Нужны GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET (OAuth client типа Desktop app, см. README).');
  process.exit(1);
}

const port = 53682;
const redirect = `http://127.0.0.1:${port}/callback`;
const state = randomBytes(16).toString('hex');
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');

const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: id, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '),
  access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256',
});

function saveEnv(values) {
  const path = new URL('../.env', import.meta.url);
  const lines = existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter((l) => l && !Object.keys(values).some((k) => l.startsWith(`${k}=`))) : [];
  for (const [k, v] of Object.entries(values)) lines.push(`${k}=${v}`);
  writeFileSync(path, lines.join('\n') + '\n');
  chmodSync(path, 0o600);
}

const server = createServer(async (req, res) => {
  const q = new URL(req.url, redirect).searchParams;
  if (!req.url.startsWith('/callback')) return res.writeHead(404).end();
  if (q.get('state') !== state || !q.get('code')) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('Ошибка: неверный ответ Google. Запусти скрипт ещё раз.');
    return;
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: q.get('code'), client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const json = await r.json();
  if (!json.refresh_token) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('Google не вернул refresh token. Подробности в терминале.');
    console.error('Ответ Google:', json.error, json.error_description);
    server.close();
    return;
  }
  saveEnv({ GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REFRESH_TOKEN: json.refresh_token });
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('Готово. Google подключён, окно можно закрыть.');
  console.log('Готово: токен сохранён в productivity-os/.env');
  server.close();
});

server.listen(port, '127.0.0.1', () => {
  console.log('Открой ссылку в браузере и войди в свой Google-аккаунт:\n\n' + url + '\n');
});
