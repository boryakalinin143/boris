---
name: coffee-map
description: Интерактивная карта кофе мира (сезоны, регионы, сорта, импортёры, биржа) — где лежит и как обновлять
metadata:
  type: project
---
Карта создана 03.11.2026: артефакт https://claude.ai/artifact/GpUhjv8dV2jREn4MHNex5j, код в репо boryakalinin143/boris папка coffee-map/ (PR #2), копия /mnt/project-files/coffee-map/.
Данные: data/origins.json (собирает tools/build_origins.py из coffee-library origins.csv и varieties.csv + ручные месяцы сбора, 87 регионов с координатами, 12 импортёров), data/market.json (цены ICE, history_kc, факты, новости).
Обновление рынка: правка market.json и переопубликация артефакта по URL с files {"data/market.json"}; порядок в coffee-map/README.md.
Борис хочет на карте импортёров (Sucafina, Nordic Approach, Mercanta, Falcon и др.). Упомянул «Терра» — неясно, какая компания. Списки стран у импортёров по памяти, требуют сверки.
Ежедневная задача «Карта кофе: цены и новости» (trig_0128z6v3x8MZZHQzJbtngT52), 9:40 по Праге с 04.11.2026: обновляет market.json (цены, курс EUR/USD, новости), переопубликует артефакт, коммитит в ветку claude/coffee-map-daily. Каждый запуск открывает новую ветку обсуждения в проекте.
v2 (03.11.2026): цены зелёного €/кг по странам (GREEN), сценарии цен на 1–3 года (FORECAST, гипотеза на Rabobank/WB/BMI/Reuters), OUTLOOK/CLIMATE по странам, RISKS, доли обработок PROC, 133 региона, 32 импортёра — всё в coffee-map/tools/extra_data.py. Борис хочет цены в евро за кг, не только биржу.
v3 (03.11.2026): слой «Мои лоты» (42 лота Coffee Miners из coffee-miners/coffee_miners_lots.xlsx, ★ = жарили: BRA-2026-001, ETH-2026-001), слой «Цвет Agtron» с именами suroast (AGTRON), «Высота» с горами регионов, тёплая палитра, панель «Что покупать сейчас». Новый жареный лот → дописать в ROASTED в extra_data.py.
v4 (03.11.2026): Борис просил светло-голубой фон в стиле suroast — палитра из brand/suroast_brand_brief.md (Agtron-цвета NORDIC #DCA564 … VOID #3C1204, PROCESS+ #0A0A0A) на голубом фоне; тёплая кремовая палитра его раздражала. Рельеф: data/relief.png (Natural Earth SR_50M, overlay). Годовой календарь линейки suroast (7 позиций) — LINEUP в extra_data.py.
v5 (03.11.2026): по просьбе Бориса «при приближении ничего не размывать» — подробный рельеф плитками SR_HR (data/relief/10 и /20, грузятся при зуме) и границы world-atlas 10m. Ловушка: в 10m у Мальдив вывернутые кольца закрывали весь глобус — index.html разворачивает такие полигоны.
