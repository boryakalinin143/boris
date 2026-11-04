# suroast — общее пространство

Specialty-кофе роастери из Праги. Seven Unique Roasts: семь уровней обжарки по Agtron = семь цветов бренда.

Этот репозиторий — общая копия всего, что сделано по компании: бренд-бриф, офисы-дашборды и данные к ним. Работать с живыми цифрами лучше в живых офисах по ссылкам ниже; здесь лежит снимок на 03.11.2026.

**Для ассистента, который читает это впервые:** источник правды по компании — `brand/suroast_brand_brief.md`. Альтернативный бренд SUR «Night Shift» пока только тестируется и лежит отдельно в `hypotheses/`: бриф и офисы под него не менялись.

## Живые офисы (claude.ai)

| Офис | Что там | Ссылка |
|---|---|---|
| suroast HQ | главный экран: финмодель v10 по годам, ключевые цифры, вехи, риски, открытые задачи, Agtron-палитра | https://claude.ai/artifact/TtFd3RBzUwH2SjLaxXdqag |
| Клиенты | кафе и воронка продаж, тарифы Supply / Partner / Signature, цели 40 → 60 → 120 кафе, e-shop и drip-bags по месяцам | https://claude.ai/artifact/NDwTiVvsX8tg8yw91mHBW5 |
| Рынки | рынок по брифу, страны Европы и регионы мира | https://claude.ai/artifact/YFCMFsDy2zskNSPAeXoX4Z |
| Склад | зелёный кофе по годам, лоты, оборудование, упаковка и расходники | https://claude.ai/artifact/1QeX2CX8XqSwSCww2uuMzx |
| Инвесторы и цели | раунд 6 × 1 млн Kč, воронка инвесторов, план vs факт из таблицы, цели и вехи M1 → M26 | https://claude.ai/artifact/TDmpwv4qscVxkNhaEmTEdf |
| Инвесторы suroast | канбан «к кому идти за инвестициями»: этапы от идеи до «да», тикеты 1 млн Kč ≈ 1% доли, ближайшие шаги | https://claude.ai/artifact/RH3vJE5mKD8KFZBXmMWzC4 |

Ссылки приватные: чтобы коллега их открыл, их нужно расшарить в меню Share у каждого офиса.

Финмодель (план): Google Sheet **CAPEX SUR** — https://docs.google.com/spreadsheets/d/1gPeGdmOiJ8aOQQswf53OxrsDTT1ltKAsK7AajdytW0E/edit

## Что в репозитории

```
brand/suroast_brand_brief.md   бренд-бриф: концепция, нейминг, логотип, цвета, шрифты, продукт, бизнес-модель, финансы
offices/hq/                    исходник страницы HQ + список её источников данных
offices/klienty/               страница «Клиенты»
offices/markets/               страница «Рынки» + источники
offices/sklad/                 страница «Склад» + источники
offices/investory/             страница «Инвесторы и цели»
offices/investor-tracker/      страница «Инвесторы suroast» (канбан людей для раунда; сами записи живут в базе офиса)
data/markets/                  страны и регионы (JSON)
data/investory/                цели (targets.json) и вехи пути к прибыли (milestones.json)
hypotheses/H01_night_shift_brandbook.md   гипотеза H01: бренд-бук SUR «Night Shift», сравнение с брифом, плюсы, риски, расхождения в цифрах
hypotheses/night-shift/        копии двух версий: v1 бренд-бук, v2 инвесторская презентация (24 слайда)
references/festival-packaging/ 12 фото упаковки с кофейного фестиваля (Dark Arts / NOT, ilse, april, kolo, 2:AM, Paloma, Sprout, Foundation, MTPAK)
sources/lyubov_original_brief.md   исходный бриф из файла «Любовь», с которого всё началось
research/laptop_coffee_findings.md  кофейные материалы с ноутбука: стандарты заваривания, цены на зелёное зерно, шаблон линейки, QC-отчёт
research/financing_debt_equity_hybrid.md  разбор «долг, доля или гибрид» для раунда 6 млн Kč (копия документа https://claude.ai/artifact/6tzhovLu9yMNebpTP7R5go)
```

Оригиналы Night Shift: бренд-бук https://claude.ai/artifact/HV3reU8X1qDMFCuYisqeGx · презентация https://claude.ai/artifact/1HwcTXNaSJX5ui89ZtJgX6

## Важно про HTML-файлы

Офисы работают внутри claude.ai: данные (кафе, инвесторы, факт по месяцам) хранятся в общей базе каждого офиса, а HQ, Рынки и Склад собраны на дашбордном шаблоне claude.ai. Поэтому файлы в `offices/` — это исходники и снимок, а не самостоятельный сайт: если открыть их локально в браузере, будет каркас без цифр. Для работы используй живые ссылки выше.

На момент снимка (03.11.2026) в «Клиентах», в воронке инвесторов и в факте по месяцам ещё нет записей, цели и вехи перенесены в `data/investory/`.
