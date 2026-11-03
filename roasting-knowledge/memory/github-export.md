---
name: github-export
description: Как база знаний проекта выгружается в репозиторий github.com/boryakalinin143/boris (папка roasting-knowledge/, ежедневно)
metadata:
  type: project
  modified: 2026-11-03T12:18:27.525Z
---
С 03.11.2026 вся база знаний копируется в github.com/boryakalinin143/boris, в папку `roasting-knowledge/`, чтобы ассистент в проекте Surroast знал то же самое. Первый PR: https://github.com/boryakalinin143/boris/pull/1.

Как устроено:
- Скрипт `scripts/sync_roasting_knowledge.sh` в репозитории копирует coffee-library, coffee-db, coffee-miners, Baza_znaniy.md и память проекта (`memory/`). Пропускает PDF, zip, uploads/, скрытые файлы и `Rezyume_*` (чужие персональные данные). Список PDF пишет в `SOURCES_PDF.md`.
- Работа через ветку `claude/project-thread-s9m7eu` и PR в main, не в main напрямую. Если PR слит, ветку пересоздать от origin/main.
- Остальное в репозитории (brand/, offices/, data/, hypotheses/ и т.д.) — снимок suroast, его не трогать.
- Ежедневная задача «Ежедневная выгрузка базы обжарки в GitHub» в 20:47 по Праге запускает синхронизацию; если изменений нет, Борису не пишет.

**How to apply:** новый раздел библиотеки или новый тип файла добавлять в скрипт и в `roasting-knowledge/README.md`. Связано с [[suroast-company]].
