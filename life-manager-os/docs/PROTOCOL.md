# Протокол LOS/1 (Life OS Protocol, версия 1)

Каждый специалист (`*-os`) реализует этот протокол. Машиночитаемая версия — `protocol/openapi.yaml` и `protocol/manifest.schema.json`. Эталонная реализация — `templates/specialist-os/`.

## Общие правила

- Транспорт: HTTPS, JSON, UTF-8. Время — ISO 8601 с часовым поясом.
- Авторизация: `Authorization: Bearer <token>`. Токен выдаёт специалист, хранит центр в секретах сервера. Токен несёт scope: `los:read`, `los:analyze`, `los:propose`, `los:execute`. `GET /health` без авторизации.
- Каждый ответ с данными оборачивается в конверт:

```json
{
  "system_id": "finance-os",
  "as_of": "2026-11-04T19:40:00+01:00",
  "data": ...
}
```

`as_of` — время, когда данные актуальны у источника, а не время ответа.

- **Нет данных — пустой список или `null`.** Запрещено отдавать примерные, демонстрационные или «оценочные» значения, если они не посчитаны из реальных данных.
- Ошибки: `{"error": {"code": "forbidden", "message": "..."}}` с HTTP-кодом 401/403/404/422/503.

## Методы

### `GET /health`

```json
{ "status": "ok", "version": "0.1.0" }
```

`status`: `ok` | `degraded` | `down`.

### `GET /api/v1/profile` — манифест

| Поле | Тип | Пример |
|---|---|---|
| `system_id` | string, kebab-case | `travel-os` |
| `name` | string | `Travel OS` |
| `version` | semver | `0.3.1` |
| `description` | string | `Билеты, поездки, бронирования` |
| `domain` | enum карточки | `travel` |
| `protocol_version` | string | `LOS/1` |
| `capabilities` | список функций | см. ниже |
| `data_offered` | какие наборы данных отдаёт и насколько они чувствительны | `[{"key":"trips","sensitivity":"normal"}]` |
| `permissions_supported` | какие уровни поддерживает | `["READ","ANALYZE","PROPOSE"]` |
| `connection_status` | `connected` / `partial` / `disconnected` | состояние внешних источников самого специалиста |
| `last_updated` | datetime или null | когда специалист последний раз обновил свои данные |
| `sync_state` | `idle` / `syncing` / `error` / `never` | |

`capabilities` — действия, которые можно вызвать через `POST /api/v1/actions`:

```json
{
  "id": "prepare_itinerary",
  "title": "Подготовить маршрут",
  "level": "PROPOSE",
  "critical": false,
  "params_schema": { "type": "object", "properties": { "trip_id": { "type": "string" } } }
}
```

`critical: true` означает, что действие всегда требует подтверждения Бориса, независимо от настроек центра.

`domain` — одна из карточек LIFE OVERVIEW: `health`, `finance`, `fitness`, `nutrition`, `travel`, `coffee`, `knowledge`, `productivity`, `home`, `style`, либо `other` для новых специалистов.

### `GET /api/v1/summary`

Короткая сводка для карточки:

```json
{
  "state": "Поездка в Вену через 2 дня",
  "highlights": [ { "text": "...", "at": "2026-11-04T10:00:00+01:00" } ],
  "progress": [ { "label": "Бюджет поездки", "value": 0.64, "unit": "ratio", "goal_id": "g-12" } ]
}
```

`state` может быть `null`. `progress.value` указывается только если посчитан из реальных данных.

### `GET /api/v1/goals`, `GET /api/v1/tasks`, `GET /api/v1/alerts`, `GET /api/v1/events`

Списки. Поддерживают `?from=&to=` (даты) и `?status=`. Формы объектов — в `openapi.yaml` (`Goal`, `Task`, `Alert`, `Event`). У каждого объекта есть `id`, уникальный внутри системы; глобальный ключ — `system_id:id`.

### `GET /api/v1/analytics`

Агрегаты за период `?period=day|week|month&from=`:

```json
{ "period": "week", "from": "2026-10-27", "metrics": [ { "key": "groceries_spend", "label": "Продукты", "value": 1840, "unit": "CZK", "plan": 1600 } ] }
```

Требует scope `los:analyze`.

### `POST /api/v1/proposals`

Центр кладёт предложение; специалист показывает его в своём интерфейсе и/или возвращает статус. Требует `los:propose`.

```json
{ "title": "Купить продукты на неделю", "body": "...", "source_insight_id": "i-77", "suggested_action": { "capability": "create_shopping_list", "params": {} } }
```

### `POST /api/v1/actions`

Требует `los:execute`. Тело:

```json
{ "capability": "create_task", "params": { ... }, "confirmation_id": "c-2026-11-04-001", "idempotency_key": "..." }
```

`confirmation_id` обязателен для `critical` действий: это id подтверждения Бориса в центре. Специалист вправе сверить его через центр. Ответ: `{"status": "done" | "queued" | "rejected", "result": ...}`.
