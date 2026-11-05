# Productivity OS

Специалист LIFE MANAGER OS по времени: события из **Google Calendar** и задачи из **Google Tasks**, отданные по протоколу LOS/1 (см. `../life-manager-os/docs/PROTOCOL.md`).

| LOS/1 | Откуда |
|---|---|
| `events` | события календарей из `GOOGLE_CALENDAR_IDS` (по умолчанию `primary`) на 14 дней вперёд, отменённые не показываются |
| `tasks` | все списки Google Tasks: открытые задачи и выполненные с начала недели |
| `alerts` | просроченные задачи |
| `summary` | сколько событий и задач на сегодня, ближайшее событие |
| `analytics` | счётчики недели: события, часы в календаре, выполненные и открытые задачи |
| `actions` | `create_event`, `create_task`, `complete_task`; `delete_event` и `delete_task` критичные и выполняются только с подтверждением Бориса |

Если Google не подключён, сервис отвечает `degraded` и отдаёт пустые данные: на дашборде будет «Недостаточно данных».

## Подключение (один раз, на своём компьютере)

Пароль от Google никуда не вводится: вход идёт на странице Google, а сервис получает только ограниченный токен на календарь и задачи.

1. [Google Cloud Console](https://console.cloud.google.com/) → создать проект → **APIs & Services → Library**: включить **Google Calendar API** и **Google Tasks API**.
2. **OAuth consent screen**: тип External, добавить свой адрес в Test users.
3. **Credentials → Create credentials → OAuth client ID → Desktop app**. Скопировать Client ID и Client secret.
4. В папке `productivity-os/`:

   ```bash
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run connect-google
   ```

   Открыть ссылку, войти, разрешить доступ. Токен сохранится в `productivity-os/.env` (файл не попадает в git).
5. Добавить в тот же `.env` токен для связи с центром: `LOS_TOKEN=` + результат `openssl rand -hex 32`.

## Запуск вместе с центром

```bash
# терминал 1
cd productivity-os && npm start                  # http://127.0.0.1:4201

# терминал 2
cd life-manager-os
LOS_URL_PRODUCTIVITY_OS=http://127.0.0.1:4201 LOS_TOKEN_PRODUCTIVITY_OS=<тот же LOS_TOKEN> npm start
```

Открыть http://127.0.0.1:4100: задачи на сегодня, события и просрочки придут из Google.

## Тесты

`npm test`: 6 тестов на поддельном Google API (без сети и без настоящего аккаунта).
