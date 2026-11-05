-- LIFE MANAGER OS — Central Data Layer (PostgreSQL 15+)
-- Только общие данные. Медицинская история и банковские транзакции здесь не хранятся:
-- они остаются в health-os / finance-os, сюда попадают лишь их разрешённые сводки (snapshots).

CREATE TYPE access_level AS ENUM ('READ', 'ANALYZE', 'PROPOSE', 'EXECUTE');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE systems (
  system_id        text PRIMARY KEY,
  name             text NOT NULL,
  domain           text NOT NULL,
  base_url         text,                       -- NULL = система ещё не развернута
  manifest         jsonb,                      -- последний GET /api/v1/profile
  health_status    text NOT NULL DEFAULT 'unknown',  -- ok / degraded / down / unreachable / not_configured
  last_sync_at     timestamptz,
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  system_id        text PRIMARY KEY REFERENCES systems ON DELETE CASCADE,
  level            access_level NOT NULL DEFAULT 'READ',
  allow_actions    text[] NOT NULL DEFAULT '{}',
  deny_actions     text[] NOT NULL DEFAULT '{}',
  confirm_actions  text[] NOT NULL DEFAULT '{}',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       text NOT NULL DEFAULT 'boris'
);

CREATE TABLE goals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  description        text,
  reason             text,
  category           text NOT NULL CHECK (category IN ('health','fitness','finance','career','business','education','travel','personal_development','lifestyle')),
  due                date,
  priority           priority NOT NULL DEFAULT 'medium',
  measurable_result  text,
  owner_system_id    text REFERENCES systems,      -- ответственный AI-специалист
  progress           numeric CHECK (progress BETWEEN 0 AND 1),  -- NULL = нет данных
  parent_goal_id     uuid REFERENCES goals,        -- разбиение больших целей
  status             text NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goal_history (
  id          bigserial PRIMARY KEY,
  goal_id     uuid NOT NULL REFERENCES goals ON DELETE CASCADE,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  text NOT NULL,                       -- boris / life-manager / <system_id>
  field       text NOT NULL,
  old_value   jsonb,
  new_value   jsonb,
  note        text
);

CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled','moved')),
  due           timestamptz,
  priority      priority NOT NULL DEFAULT 'medium',
  goal_id       uuid REFERENCES goals,
  system_id     text REFERENCES systems,           -- где задача живёт
  external_id   text,                              -- id внутри системы
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  UNIQUE (system_id, external_id)
);

CREATE TABLE preferences (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id    text NOT NULL REFERENCES systems,
  external_id  text NOT NULL,
  kind         text,
  title        text NOT NULL,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  as_of        timestamptz NOT NULL,
  UNIQUE (system_id, external_id)
);

CREATE TABLE snapshots (
  id          bigserial PRIMARY KEY,
  system_id   text NOT NULL REFERENCES systems,
  kind        text NOT NULL CHECK (kind IN ('summary','analytics','alerts')),
  period      text,                                -- для analytics: day/week/month + дата
  as_of       timestamptz NOT NULL,
  payload     jsonb NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX snapshots_lookup ON snapshots (system_id, kind, as_of DESC);

CREATE TABLE insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     text,                                -- детерминированное правило или 'llm'
  title       text NOT NULL,
  body        text,
  severity    text NOT NULL DEFAULT 'info',
  sources     jsonb NOT NULL,                      -- [{system_id, snapshot_id|external_id}] — обязательно
  created_at  timestamptz NOT NULL DEFAULT now(),
  dismissed   boolean NOT NULL DEFAULT false,
  CHECK (jsonb_array_length(sources) > 0)
);

CREATE TABLE proposals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id        text NOT NULL REFERENCES systems,
  capability       text,
  params           jsonb,
  title            text NOT NULL,
  body             text,
  insight_id       uuid REFERENCES insights,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed')),
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE action_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,                       -- boris / life-manager / scheduler
  system_id   text,
  operation   text NOT NULL,                       -- read:summary, execute:create_task, ...
  decision    text NOT NULL CHECK (decision IN ('allowed','denied','needs_confirmation','confirmed','executed','failed')),
  reason      text,
  details     jsonb
);

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text,
  channel     text NOT NULL DEFAULT 'dashboard',
  source      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);

CREATE TABLE briefings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('morning','evening','weekly')),
  for_date    date NOT NULL,
  content     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, for_date)
);
