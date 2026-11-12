import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAction, canRead } from '../src/permissions.js';

const perms = JSON.parse(readFileSync(new URL('../config/permissions.json', import.meta.url)));
const exec = (id, critical = false) => ({ id, title: id, level: 'EXECUTE', critical });
const propose = (id) => ({ id, title: id, level: 'PROPOSE', critical: false });

test('Finance OS: переводы запрещены даже при уровне EXECUTE', () => {
  const p = { ...perms['finance-os'], level: 'EXECUTE', allow_actions: ['transfer_money'] };
  assert.equal(checkAction(p, 'transfer_money', exec('transfer_money')).decision, 'denied');
});

test('READ не даёт analytics, ANALYZE даёт', () => {
  assert.equal(canRead({ level: 'READ' }, 'analytics'), false);
  assert.equal(canRead({ level: 'ANALYZE' }, 'analytics'), true);
  assert.equal(canRead(undefined, 'summary'), false);
});

test('Productivity OS: создание задачи разрешено, удаление требует подтверждения', () => {
  assert.equal(checkAction(perms['productivity-os'], 'create_task', exec('create_task')).decision, 'allowed');
  assert.equal(checkAction(perms['productivity-os'], 'delete_task', exec('delete_task')).decision, 'needs_confirmation');
});

test('Travel OS: покупка билета не выполняется без уровня EXECUTE, маршрут — только через подтверждение', () => {
  assert.equal(checkAction(perms['travel-os'], 'buy_ticket', exec('buy_ticket', true)).decision, 'denied');
  assert.equal(checkAction(perms['travel-os'], 'prepare_itinerary', propose('prepare_itinerary')).decision, 'needs_confirmation');
});

test('Критичное действие всегда требует подтверждения', () => {
  const p = { level: 'EXECUTE', allow_actions: ['x'], deny_actions: [], confirm_actions: [] };
  assert.equal(checkAction(p, 'x', exec('x', true)).decision, 'needs_confirmation');
  assert.equal(checkAction(p, 'x', exec('x', false)).decision, 'allowed');
});

test('Действие, не объявленное в манифесте, отклоняется', () => {
  assert.equal(checkAction(perms['productivity-os'], 'create_task', null).decision, 'denied');
});
