// Central Data Layer, локальная версия: JSON-файл с теми же сущностями, что db/schema.sql.
// Для продакшена заменяется на PostgreSQL без изменения интерфейса.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const EMPTY = () => ({ goals: [], goal_history: [], tasks: [], proposals: [], action_log: [], notifications: [], preferences: {} });

export const GOAL_CATEGORIES = ['health', 'fitness', 'finance', 'career', 'business', 'education', 'travel', 'personal_development', 'lifestyle'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export class Store {
  /** @param {string|null} path — null = только в памяти (тесты) */
  constructor(path = null) {
    this.path = path;
    this.db = path && existsSync(path) ? { ...EMPTY(), ...JSON.parse(readFileSync(path, 'utf8')) } : EMPTY();
  }

  save() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.db, null, 2));
  }

  log(entry) {
    const row = { id: this.db.action_log.length + 1, at: new Date().toISOString(), actor: 'life-manager', ...entry };
    this.db.action_log.push(row);
    this.save();
    return row;
  }

  addGoal(input, actor = 'boris') {
    if (!input?.title) throw new Error('У цели должно быть название');
    if (!GOAL_CATEGORIES.includes(input.category)) throw new Error(`Категория цели должна быть одной из: ${GOAL_CATEGORIES.join(', ')}`);
    if (input.priority && !PRIORITIES.includes(input.priority)) throw new Error('Неверный приоритет');
    const goal = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? null,
      reason: input.reason ?? null,
      category: input.category,
      due: input.due ?? null,
      priority: input.priority ?? 'medium',
      measurable_result: input.measurable_result ?? null,
      owner_system_id: input.owner_system_id ?? null,
      progress: typeof input.progress === 'number' ? input.progress : null, // null = нет данных
      parent_goal_id: input.parent_goal_id ?? null,
      task_ids: [],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.goals.push(goal);
    this.db.goal_history.push({ goal_id: goal.id, changed_at: goal.created_at, changed_by: actor, field: '*', old_value: null, new_value: goal });
    this.save();
    return goal;
  }

  updateGoal(id, patch, actor = 'boris') {
    const goal = this.db.goals.find((g) => g.id === id);
    if (!goal) throw new Error('Цель не найдена');
    for (const [field, value] of Object.entries(patch)) {
      if (['id', 'created_at'].includes(field)) continue;
      this.db.goal_history.push({ goal_id: id, changed_at: new Date().toISOString(), changed_by: actor, field, old_value: goal[field] ?? null, new_value: value });
      goal[field] = value;
    }
    goal.updated_at = new Date().toISOString();
    this.save();
    return goal;
  }

  goalHistory(id) {
    return this.db.goal_history.filter((h) => h.goal_id === id);
  }

  addProposal(p) {
    const row = { id: randomUUID(), status: 'pending', created_at: new Date().toISOString(), ...p };
    this.db.proposals.push(row);
    this.save();
    return row;
  }

  decideProposal(id, approved) {
    const p = this.db.proposals.find((x) => x.id === id);
    if (!p) throw new Error('Предложение не найдено');
    if (p.status !== 'pending') throw new Error(`Предложение уже в статусе ${p.status}`);
    p.status = approved ? 'approved' : 'rejected';
    p.decided_at = new Date().toISOString();
    this.save();
    return p;
  }
}
