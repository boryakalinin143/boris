import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { syncAll } from '../src/connector.js';
import { buildDashboard, NO_DATA } from '../src/overview.js';
import { morningBriefing } from '../src/briefing.js';
import { runRules } from '../src/intelligence.js';
import { Store } from '../src/store.js';

test('ничего не подключено: везде «Недостаточно данных», ни одного выдуманного числа', async () => {
  const config = loadConfig({ env: {} });
  const states = await syncAll(config);
  const d = buildDashboard({ states, store: new Store(null), now: new Date('2026-11-05T07:00:00Z') });

  assert.equal(d.connected_count, 0);
  assert.equal(d.systems.length, 10);
  assert.ok(d.good_morning.text.startsWith(NO_DATA));
  assert.equal(d.today.weather, null);
  assert.equal(d.today.weekday, 'четверг');
  assert.equal(d.overview.length, 10);
  for (const c of d.overview) {
    assert.equal(c.has_data, false, c.title);
    assert.deepEqual(c.progress, []);
    assert.equal(c.last_updated, null);
  }
  const b = morningBriefing(d);
  assert.equal(b.sections.length, 10);
  assert.ok(b.sections.every((s) => s.empty && s.placeholder === NO_DATA));
});

const withAnalytics = (system_id, domain, metrics) => ({ system_id, name: system_id, domain, status: 'ok', manifest: null, errors: [], data: { analytics: { as_of: '2026-11-04T10:00:00Z', data: { period: 'month', metrics } } } });

test('правило «поездка против бюджета» молчит без данных одной из сторон', () => {
  const travel = withAnalytics('travel-os', 'travel', [{ key: 'upcoming_trips_cost', label: 'Поездки', value: 12000, unit: 'CZK' }]);
  assert.deepEqual(runRules([travel]), []);
});

test('правило срабатывает, когда обе системы дали реальные данные, и хранит источники', () => {
  const travel = withAnalytics('travel-os', 'travel', [{ key: 'upcoming_trips_cost', label: 'Поездки', value: 12000, unit: 'CZK' }]);
  const finance = withAnalytics('finance-os', 'finance', [{ key: 'month_budget_remaining', label: 'Остаток', value: 8000, unit: 'CZK' }]);
  const [i] = runRules([travel, finance]);
  assert.equal(i.rule_id, 'travel-vs-budget');
  assert.deepEqual(i.sources.map((s) => s.system_id), ['travel-os', 'finance-os']);
  assert.deepEqual(runRules([travel, withAnalytics('finance-os', 'finance', [{ key: 'month_budget_remaining', label: 'Остаток', value: 800, unit: 'EUR' }])]), [], 'разные валюты не сравниваются');
});

test('цели: история изменений и прогресс null по умолчанию', () => {
  const s = new Store(null);
  const g = s.addGoal({ title: 'Пробежать полумарафон', category: 'fitness', priority: 'high' });
  assert.equal(g.progress, null);
  s.updateGoal(g.id, { progress: 0.2 });
  assert.equal(s.goalHistory(g.id).length, 2);
  assert.throws(() => s.addGoal({ title: 'x', category: 'unknown' }));
});
