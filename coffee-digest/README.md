# Кофейный дайджест suroast

Ежедневная выжимка новостей кофейного мира: продукты и форматы (капсулы, дрип-пакеты, концентраты), оборудование и обжарка, обработки, приготовление (турбо-шоты и т.п.), рынок и тренды спешелти, чемпионаты (кто выиграл и почему), фестивали.
Цены и биржу зелёного ведёт карта кофе (https://claude.ai/artifact/GpUhjv8dV2jREn4MHNex5j), здесь только ссылка на неё.

Опубликован как артефакт: https://claude.ai/artifact/MLG5mqUZ3rEt9dDCPYU55q

## Файлы
- `index.html` — страница. Читает `data/digest.json`, сама не меняется при ежедневном обновлении.
- `data/digest.json` — выпуски (`issues`, новый в начало), календарь событий (`calendar`), чемпионы сезона (`champions`), категории.
- Текстовая копия каждого выпуска: `coffee-library/news/ГГГГ-ММ-ДД.md`.

## Формат новости (`issues[].items[]`)
`cat` (products, gear, processing, brewing, trends, champs, events), `top` (true для 2–3 главных), `date` (дата события или публикации), `title`, `text` (факты, только с источником), `why` (что это значит для suroast, наш вывод), `sources` [{name, url}].

## Ежедневное обновление
1. Прочитать `data/digest.json` (через Artifact read с path `data/digest.json`), чтобы не повторять уже вышедшие новости.
2. Найти через WebSearch 5–10 новостей за последние 1–3 дня по всем категориям. Источники: Daily Coffee News, Sprudge, Perfect Daily Grind, World Coffee Portal, Global Coffee Report, Barista Magazine, European Coffee Trip, wcc.coffee, sca.coffee, сайты фестивалей.
3. Добавить выпуск в начало `issues` (date = сегодня, headline, lead, items). Хранить не больше 30 выпусков, старые остаются в `coffee-library/news/`.
4. Обновить `calendar` (новые фестивали, прошедшие убрать) и `champions`, если прошёл чемпионат. Поменять `updated`.
5. Переопубликовать артефакт по URL с `files: {"data/digest.json": ...}`.
6. Записать `coffee-library/news/ГГГГ-ММ-ДД.md`.

Факты без источника не вносить. Если в дне нет заметных новостей, выпуск короче, но не выдумывать.
