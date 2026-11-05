# LIFE MANAGER OS

Центральный оркестратор персональной экосистемы PERSONAL-LIFE-OS: опрашивает специалистов (Health OS, Finance OS, Coffee Lab OS, …) по единому протоколу LOS/1, проверяет каждое действие через Permission Manager и показывает дашборд «My life today», «Life overview», утренний брифинг и цели.

Главное правило: **никаких выдуманных данных**. Если система не подключена или ничего не сообщила, интерфейс пишет «Недостаточно данных».

## Документы

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — общая архитектура, структура репозиториев, Central Data Layer, Life Intelligence, дорожная карта
- [docs/PROTOCOL.md](docs/PROTOCOL.md) — протокол LOS/1, который реализует каждый специалист ([openapi.yaml](protocol/openapi.yaml), [manifest.schema.json](protocol/manifest.schema.json))
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — уровни READ / ANALYZE / PROPOSE / EXECUTE и стартовые права
- [db/schema.sql](db/schema.sql) — схема центральной базы (PostgreSQL)

## Запуск

Нужен Node.js 22+. Внешних зависимостей нет.

```bash
cd life-manager-os
npm test            # 19 тестов: права, протокол, «нет данных → Недостаточно данных»
npm start           # http://127.0.0.1:4100
```

Без подключённых систем дашборд честно показывает, что всё «Не развернута».

Попробовать подключение на эталонном специалисте:

```bash
# терминал 1 — специалист (токен придумай сам, например `openssl rand -hex 32`)
LOS_TOKEN=<токен> LOS_SCOPES=los:read,los:analyze PORT=4200 npm run specialist
# терминал 2 — центр видит его как productivity-os
LOS_URL_PRODUCTIVITY_OS=http://127.0.0.1:4200 LOS_TOKEN_PRODUCTIVITY_OS=<токен> npm start
```

## Безопасность

- Токены специалистов — только в переменных окружения сервера (`LOS_TOKEN_<SYSTEM_ID>`), не в репозитории и не в чате.
- У дашборда пока нет входа по паролю, поэтому сервер слушает только `127.0.0.1`. Перед выкладкой наружу его нужно закрыть авторизацией (этап 3 дорожной карты).
- Данные специалистов выводятся в браузер только как текст, без HTML.

## Новый специалист

Скопировать `templates/specialist-os/` в новую папку `boris/<system>-os/`, заполнить `manifest.json`, подставить реальные источники в `providers`. Подробно — §10 в ARCHITECTURE.md.
