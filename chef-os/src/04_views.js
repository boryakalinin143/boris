// ================= VIEWS =================
const ICONS = {
  kitchen:'<path d="M4 11h16M6 11V7a6 6 0 0 1 12 0v4M5 11l1 9h12l1-9"/>',
  menu:'<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 9h16M9 3v4M15 3v4"/>',
  shop:'<path d="M5 7h14l-1.5 11h-11z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  fridge:'<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M6 10h12M9 6v2M9 13v3"/>',
  recipes:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
  discover:'<circle cx="12" cy="12" r="8"/><path d="M15 9l-2 4-4 2 2-4z"/>',
  nutrition:'<path d="M12 21c-4 0-7-3-7-8 0-3 2-6 5-6 1 0 1.5.5 2 .5s1-.5 2-.5c3 0 5 3 5 6 0 5-3 8-7 8z"/><path d="M12 7c0-2 1-4 3-4"/>',
  budget:'<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 10h18M16 15h2"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  learn:'<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
  reports:'<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
};
const ico = n => '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>';
const ROUTES = [
  ["kitchen","Моя кухня"],["menu","Меню на неделю"],["shop","Покупки"],["fridge","Холодильник"],["recipes","Книга рецептов"],["discover","Открытия"],
  ["sep"],["nutrition","Питание"],["budget","Бюджет"],["chat","Шеф-чат"],["learn","Обучение"],["reports","Отчёты"],["profile","Профиль вкусов"]
];
const MOBILE = ["kitchen","menu","shop","fridge"];
let route = "kitchen";

function renderNav() {
  $("#nav").innerHTML = ROUTES.map(r => r[0] === "sep" ? '<div class="sep"></div>' : `<button data-a="go" data-r="${r[0]}" class="${route === r[0] ? "on" : ""}">${ico(r[0])}<span>${r[1]}</span></button>`).join("");
  $("#tabbar").innerHTML = MOBILE.map(k => `<button data-a="go" data-r="${k}" class="${route === k ? "on" : ""}">${ico(k)}<span>${ROUTES.find(r => r[0] === k)[1].split(" ")[0]}</span></button>`).join("") + `<button data-a="moreNav" class="${MOBILE.includes(route) ? "" : "on"}">${ico("more")}<span>Ещё</span></button>`;
}
function renderFoot() {
  const el = $("#railFoot"); if (!el) return;
  const t = lastSaved ? new Date(lastSaved).toTimeString().slice(0, 5) : "";
  const where = storeMode === "cloud" ? "в вашем облачном хранилище" : storeMode === "local-wait" ? "в браузере (облако пока не ответило)" : "в этом браузере";
  el.innerHTML = `Данные сохраняются ${where}${t ? " · <b>" + t + "</b>" : ""}.<br>Цены — оценка на ${fmtDate(PRICE_DATE)}, не проверены в магазинах.`;
}

function plate(r, opts = {}) {
  const ph = S.photos.filter(p => p.rid === r.id && p.kind !== "receipt").slice(-1)[0];
  const [c1, c2, c3] = r.col || ["#b67a3f", "#34312c", "#6d7d3c"];
  const img = ph ? `<img src="${esc(photoSrc(ph))}" alt="Моё фото: ${esc(r.n)}" loading="lazy">` : "";
  return `<div class="plate" style="--c1:${c1};--c2:${c2};--c3:${c3}">${img ? img : '<div class="dish"></div>'}${opts.noTag ? "" : `<span class="tag">${ph ? "Моё фото" : "Иллюстрация"}</span>`}${opts.cu ? `<span class="cz">${esc(r.cu)}</span>` : ""}</div>`;
}
const photoSrc = ph => ph.asset ? "/_blob/" + ph.asset : ph.data;
const diffName = d => ["", "Просто", "Несложно", "Средне", "Сложно", "Шеф"][d] || "";

function topbar(eyebrow, title, acts = "") { return `<div class="topbar"><div class="t"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1></div><div class="acts">${acts}</div></div>`; }

function render() {
  renderNav(); renderFoot();
  const v = VIEWS[route] || VIEWS.kitchen;
  $("#view").innerHTML = v();
  if (route === "chat") { const c = $("#chatBox"); if (c) c.scrollTop = c.scrollHeight; }
}

// ---------- KITCHEN ----------
function greeting() { const h = new Date().getHours(); return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер"; }
function mealRow(slot, x, di, ws) {
  const label = MEALS[slot];
  if (!x) return `<div class="meal"><div class="plate" style="--c1:#d9cdb6;--c2:#e9e0cf"><div class="dish"></div></div><div><div class="when">${label}</div><div class="name muted" style="font-style:italic">Не запланировано</div></div><div class="acts"><button class="btn sm ghost" data-a="pickSlot" data-w="${ws}" data-d="${di}" data-s="${slot}">Выбрать блюдо</button></div></div>`;
  const r = rec(x.rid); if (!r) return "";
  const n = nutr(r);
  return `<div class="meal"><div style="cursor:pointer" data-a="openRecipe" data-id="${r.id}" data-serv="${x.serv}">${plate(r, { noTag: true })}</div>
  <div class="col" style="gap:3px"><div class="when">${label}${x.done ? ' · <span class="done-mark">✓ готово</span>' : ""}</div><div class="name" data-a="openRecipe" data-id="${r.id}" data-serv="${x.serv}">${esc(r.n)}</div>
  <div class="small muted num">${r.time} мин · ${r0(n.kcal)} ккал · Б ${r0(n.p)} / Ж ${r0(n.f)} / У ${r0(n.c)} · ${money(cost(r) * x.serv)}</div></div>
  <div class="acts">${x.done ? "" : `<button class="btn sm" data-a="cook" data-id="${r.id}" data-serv="${x.serv}" data-w="${ws}" data-d="${di}" data-s="${slot}">Готовить</button><button class="btn sm ghost" data-a="quickSwap" data-w="${ws}" data-d="${di}" data-s="${slot}" title="Заменить на вариант до 20 минут">Быстрее</button><button class="btn sm ghost" data-a="pickSlot" data-w="${ws}" data-d="${di}" data-s="${slot}">Заменить</button>`}</div></div>`;
}
function macroBar(lbl, v, t, unit, cls = "") { const pct = t ? Math.min(100, v / t * 100) : 0; return `<div class="macro"><span>${lbl}</span><div class="bar ${cls}"><i style="width:${pct}%"></i></div><span class="r num">${r0(v)}${t ? " / " + t : ""} ${unit}</span></div>`; }

const VIEWS = {};
VIEWS.kitchen = () => {
  const ws = weekStart(); const plan = S.plans[ws]; const di = dayIdx(); const day = plan ? plan.days[di] : null;
  const p = S.profile; const sp = chefSpecial();
  const planned = { kcal: 0, p: 0, f: 0, c: 0, cost: 0 };
  if (day) for (const x of Object.values(day)) if (x) { const r = rec(x.rid); if (!r) continue; const n = nutr(r); planned.kcal += n.kcal; planned.p += n.p; planned.f += n.f; planned.c += n.c; planned.cost += cost(r) * x.serv; }
  const T = targets(); const eaten = dayTotals();
  const exp = expiring(3); const rescue = rescueRecipes(exp)[0];
  const toBuy = S.shop.items.filter(i => !i.checked);
  const spent = spentBetween(ws, addDays(ws, 6)); const B = +p.budgetWeek || 0;
  const ask = S.history.filter(h => h.cooked && h.ask && !h.rating).slice(-1)[0];
  const newRecipes = allRecipes().filter(r => !cookedCount(r.id) && !hardBlock(r) && r.m === "main").sort((a, b) => hashStr(today() + a.id) - hashStr(today() + b.id)).slice(0, 3);
  const month = new Date().getMonth();
  const tip = TECHNIQUES[hashStr(today()) % TECHNIQUES.length];
  let html = topbar(`${DOW[di]}, ${fmtDate(today())}`, `${greeting()}${p.name ? ", " + esc(p.name) : ""}. <em style="color:var(--bordeaux)">Chef’s menu</em>`, `<button class="btn copper" data-a="surprise">Удиви меня</button><button class="btn ghost" data-a="go" data-r="chat">Спросить шефа</button>`);
  if (!p.done) html += `<div class="card" style="border-color:var(--copper);background:var(--gold-soft)"><div class="row between"><div class="col" style="gap:4px"><span class="eyebrow">Знакомство · 10 вопросов</span><h3>Расскажите шефу о своих вкусах</h3><p class="small">Сейчас меню собрано по общим правилам. После анкеты я учту аллергии, бюджет, время и любимые кухни и пересоберу неделю.</p></div><button class="btn wine" data-a="wizard">Начать анкету</button></div></div>`;
  if (ask) { const r = rec(ask.rid); if (r) html += `<div class="card"><div class="row between"><div class="col" style="gap:4px"><span class="eyebrow">Отзыв о блюде</span><h4>Как получилось «${esc(r.n)}»?</h4><span class="small muted">Приготовлено ${fmtDate(ask.date)}. Оценка помогает понять, что вам действительно нравится.</span></div><div class="row">${stars(ask.id, 0)}<button class="link" data-a="skipRate" data-h="${ask.id}">Позже</button></div></div></div>`; }
  if (sp) { const n = nutr(sp); html += `<section class="special"><div style="cursor:pointer" data-a="openRecipe" data-id="${sp.id}">${plate(sp, { cu: true })}</div><div class="body"><span class="eyebrow">Chef’s special of the day</span><h2>${esc(sp.n)}</h2><p style="color:#d8cfbf">${esc(sp.taste || "")}</p><div class="meta"><span>Время<b class="num">${sp.time} мин</b></span><span>Порция<b class="num">${money(cost(sp))}</b></span><span>Энергия<b class="num">${r0(n.kcal)} ккал</b></span><span>Сложность<b>${diffName(sp.d)}</b></span></div>${seasonalNames(sp).length ? `<p class="small" style="color:var(--gold)">Сезонное: ${esc(seasonalNames(sp).join(", "))}</p>` : ""}<div class="row" style="margin-top:6px"><button class="btn copper" data-a="openRecipe" data-id="${sp.id}">Открыть рецепт</button><button class="btn ghost" data-a="toTonight" data-id="${sp.id}">Готовлю сегодня на ужин</button></div></div></section>`; }
  html += `<div class="split"><div class="card"><div class="card-h"><h3>Меню на сегодня</h3><span class="small muted num">${plan ? "≈ " + r0(planned.kcal) + " ккал · " + money(planned.cost) : ""}</span></div>`;
  if (!plan) html += `<div class="empty">На эту неделю меню ещё нет.<br><button class="btn" style="margin-top:10px" data-a="genPlan">Составить меню на неделю</button></div>`;
  else html += slotsOn().map(s => mealRow(s, day[s], di, ws)).join("") + (plan.status === "draft" ? `<div class="note" style="margin-top:12px">Меню недели — черновик шефа. <button class="link" data-a="go" data-r="menu">Посмотреть и утвердить</button></div>` : "");
  html += `</div><div class="stack">
    <div class="card"><div class="card-h"><h3>Питание сегодня</h3><button class="link" data-a="go" data-r="nutrition">Подробнее</button></div>
      ${T ? macroBar("Калории", eaten.kcal, T.kcal, "ккал", "copper") + macroBar("Белки", eaten.p, T.p, "г") + macroBar("Жиры", eaten.f, T.f, "г") + macroBar("Углеводы", eaten.c, T.c, "г") : `<div class="col small"><div class="row num" style="gap:18px"><div class="stat"><span class="v">${r0(eaten.kcal)}</span><span class="l">ккал съедено</span></div><div class="stat"><span class="v">${r0(eaten.p)}</span><span class="l">белок, г</span></div><div class="stat"><span class="v">${r0(eaten.f)}</span><span class="l">жиры, г</span></div><div class="stat"><span class="v">${r0(eaten.c)}</span><span class="l">углев., г</span></div></div><span class="muted">По плану на день: ${r0(planned.kcal)} ккал, Б ${r0(planned.p)} · Ж ${r0(planned.f)} · У ${r0(planned.c)}. Цель по калориям появится, если укажете её в профиле.</span></div>`}
    </div>
    <div class="card"><div class="card-h"><h3>Бюджет недели</h3><button class="link" data-a="go" data-r="budget">Расходы</button></div>
      <div class="row between num"><div class="stat"><span class="v">${Math.round(spent).toLocaleString("ru-RU")}</span><span class="l">потрачено, Kč</span></div><div class="stat" style="text-align:right"><span class="v">${plan ? Math.round(planCost(plan)).toLocaleString("ru-RU") : "—"}</span><span class="l">стоимость меню, Kč</span></div></div>
      ${B ? `<div class="bar ${spent > B ? "wine" : ""}" style="margin-top:10px"><i style="width:${Math.min(100, spent / B * 100)}%"></i></div><div class="tiny muted" style="margin-top:4px">Лимит ${money(B)} в неделю</div>` : ""}
    </div>
  </div></div>`;
  html += `<div class="grid g3">
    <div class="card"><div class="card-h"><h3>Скоро истекает</h3><button class="link" data-a="go" data-r="fridge">Холодильник</button></div>
      ${exp.length ? `<div class="list">${exp.slice(0, 5).map(f => `<div class="li"><span class="dot ${daysLeft(f) < 0 ? "bad" : daysLeft(f) <= 1 ? "warn" : ""}"></span><div class="grow"><div class="ttl">${esc(f.name)}</div><div class="tiny muted">${f.key ? fmtG(f.key, f.qty) : esc(f.qty + " " + (f.unit || ""))} · ${expLabel(f)}</div></div></div>`).join("")}</div>` : `<div class="empty">Ничего не истекает в ближайшие 3 дня.</div>`}
      ${rescue ? `<div class="note olive" style="margin-top:12px">У вас ${esc(rescue.hit.map(k => CAT[k].name.toLowerCase()).slice(0, 3).join(", "))} — скоро истекает срок. Предлагаю сегодня «${esc(rescue.r.n)}». <div class="row" style="margin-top:8px"><button class="btn sm olive" data-a="toTonight" data-id="${rescue.r.id}">На ужин сегодня</button><button class="btn sm ghost" data-a="openRecipe" data-id="${rescue.r.id}">Рецепт</button></div></div>` : ""}
    </div>
    <div class="card"><div class="card-h"><h3>Нужно купить</h3><button class="link" data-a="go" data-r="shop">Список</button></div>
      ${toBuy.length ? `<div class="list">${toBuy.slice(0, 6).map(i => `<div class="li"><span class="dot mute"></span><div class="grow"><div class="ttl">${esc(i.name)}</div><div class="tiny muted">${esc(i.qtyLabel || "")} · ${esc(i.store || "")}</div></div><span class="small num">${i.price ? "~" + Math.round(i.price) + " Kč" : ""}</span></div>`).join("")}</div><div class="small muted" style="margin-top:8px">${toBuy.length} поз. · ≈ ${money(toBuy.reduce((s, i) => s + (i.price || 0), 0))}</div>` : `<div class="empty">Список пуст. ${plan ? `<button class="link" data-a="buildShop">Собрать из меню</button>` : ""}</div>`}
    </div>
    <div class="card"><div class="card-h"><h3>Дома есть</h3><span class="small muted">${S.fridge.length} продуктов</span></div>
      <div class="row" style="gap:6px">${S.fridge.slice().sort((a, b) => (a.exp || "9").localeCompare(b.exp || "9")).slice(0, 14).map(f => `<span class="chip">${esc(f.name.split(" (")[0])}</span>`).join("") || '<span class="muted small">Пока пусто — добавьте продукты.</span>'}</div>
      <div class="row" style="margin-top:12px"><button class="btn sm ghost" data-a="addFridge">Добавить продукт</button><button class="btn sm ghost" data-a="receipt">Чек или фото</button></div>
    </div></div>`;
  html += `<div class="grid g3">
    <div class="card" style="grid-column:span 2"><div class="card-h"><h3>Новые рецепты для вас</h3><button class="link" data-a="go" data-r="recipes">Вся книга</button></div><div class="rgrid">${newRecipes.map(rcard).join("")}</div></div>
    <div class="stack"><div class="card"><span class="eyebrow">Рекомендация шефа</span><h4 style="margin:6px 0">${esc(tip.n)}</h4><p class="small">${esc(tip.what)}</p><p class="small muted" style="margin-top:6px"><b>Почему:</b> ${esc(tip.why)}</p></div>
    <div class="card"><span class="eyebrow">Сезон · ${["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"][month]} в Чехии</span><div class="row" style="gap:6px;margin-top:10px">${SEASON[month].map(s => `<span class="chip olive">${esc(s)}</span>`).join("")}</div></div></div>
  </div>`;
  return html;
};
function expLabel(f) { const d = daysLeft(f); if (!f.exp) return "без срока"; if (d < 0) return "просрочено " + (-d) + " дн."; if (d === 0) return "истекает сегодня"; if (d === 1) return "истекает завтра"; return "ещё " + d + " дн. (до " + fmtDate(f.exp) + ")"; }
function stars(hid, val) { return `<span class="stars" role="group" aria-label="Оценка">${[1,2,3,4,5].map(i => `<button data-a="rate" data-h="${hid}" data-v="${i}" class="${i <= val ? "on" : ""}" aria-label="${i} из 5">★</button>`).join("")}</span>`; }
function rcard(r) { const n = nutr(r); const conf = conflicts(r); return `<button class="rcard" data-a="openRecipe" data-id="${r.id}">${plate(r, { cu: true })}<div class="in"><h4>${esc(r.n)}</h4><div class="m num"><span>${r.time} мин</span><span>${diffName(r.d)}</span><span>${r0(n.kcal)} ккал</span><span>${money(cost(r))}/порц.</span></div>${conf.length ? `<span class="chip wine">${esc(conf[0])}</span>` : ""}${r.disc && !cookedCount(r.id) ? '<span class="chip gold">Открытие</span>' : ""}${cookedCount(r.id) ? `<span class="chip olive">Готовили ${cookedCount(r.id)}×${avgRating(r.id) ? " · " + avgRating(r.id).toFixed(1) + "★" : ""}</span>` : ""}</div></button>`; }

// ---------- MENU ----------
VIEWS.menu = () => {
  const off = S.ui.weekOff || 0; const ws = addDays(weekStart(), 7 * off); const plan = S.plans[ws];
  const pc = plan ? planCost(plan) : 0; const B = +S.profile.budgetWeek || 0;
  let html = topbar("Неделя с " + fmtDate(ws) + " по " + fmtDate(addDays(ws, 6)), "Меню на неделю",
    `<button class="btn ghost" data-a="weekNav" data-o="${off - 1}" aria-label="Предыдущая неделя">←</button><button class="btn ghost" data-a="weekNav" data-o="0">Эта неделя</button><button class="btn ghost" data-a="weekNav" data-o="${off + 1}" aria-label="Следующая неделя">→</button>`);
  if (!plan) return html + `<div class="empty">Меню на эту неделю ещё не составлено.<br><button class="btn copper" style="margin-top:12px" data-a="genPlan" data-w="${ws}">Составить меню на 7 дней</button></div>`;
  let kcal = 0, prot = 0, cnt = 0; const cus = new Set();
  plan.days.forEach(d => Object.values(d).forEach(x => { if (x) { const r = rec(x.rid); if (r) { const n = nutr(r); kcal += n.kcal; prot += n.p; cnt++; cus.add(r.cu); } } }));
  html += `<div class="card"><div class="row between"><div class="row" style="gap:28px">
    <div class="stat"><span class="v num">${money(pc).split(" · ")[0]}</span><span class="l">стоимость блюд на ${S.profile.people} чел.${B ? " · лимит " + B.toLocaleString("ru-RU") + " Kč" : ""}</span></div>
    <div class="stat"><span class="v num">${r0(kcal / 7)}</span><span class="l">ккал в день по плану</span></div>
    <div class="stat"><span class="v num">${r0(prot / 7)}</span><span class="l">г белка в день</span></div>
    <div class="stat"><span class="v num">${cus.size}</span><span class="l">кухонь мира</span></div></div>
    <div class="row"><span class="chip ${plan.status === "approved" ? "olive" : "gold"}">${plan.status === "approved" ? "Утверждено" : "Черновик"}</span>
    ${plan.status !== "approved" ? `<button class="btn olive" data-a="approve" data-w="${ws}">Утвердить и собрать покупки</button>` : `<button class="btn ghost" data-a="buildShop">Обновить список покупок</button>`}
    <button class="btn ghost" data-a="genPlan" data-w="${ws}" data-keep="1">Пересобрать</button></div></div>
    ${B && pc > B ? `<div class="note wine" style="margin-top:10px">Меню дороже лимита на ${money(pc - B)}. Я уже заменил самые дорогие блюда, но подходящих дешёвых вариантов не хватило. Замените одно-два блюда вручную или поднимите лимит в профиле.</div>` : ""}</div>`;
  html += `<div class="wk-scroll"><div class="week">${plan.days.map((d, di) => {
    const date = addDays(ws, di); const isT = date === today();
    let dk = 0; Object.values(d).forEach(x => { if (x) { const r = rec(x.rid); if (r) dk += nutr(r).kcal; } });
    return `<div class="day ${isT ? "today" : ""}"><div class="row between"><h4>${DOW_S[di]} <span class="muted" style="font-size:.9rem">${parseISO(date).getDate()}</span></h4><span class="tiny muted num">${r0(dk)} ккал</span></div>
    ${slotsOn().map(s => { const x = d[s]; const r = x && rec(x.rid);
      return `<div class="slot ${r ? "" : "empty"}"><div class="k"><span>${MEALS[s]}</span>${x && x.done ? '<span style="color:var(--olive)">✓</span>' : ""}</div>
      <div class="n" ${r ? `data-a="openRecipe" data-id="${r.id}" data-serv="${x.serv}"` : `data-a="pickSlot" data-w="${ws}" data-d="${di}" data-s="${s}"`}>${r ? esc(r.n) : "Выбрать"}</div>
      ${r ? `<div class="tiny muted">${esc(r.cu)} · ${r.time} мин${r.disc && !cookedCount(r.id) ? " · <b style='color:var(--copper)'>новое</b>" : ""}</div><div class="x"><button class="btn xs ghost" data-a="pickSlot" data-w="${ws}" data-d="${di}" data-s="${s}">Заменить</button><button class="btn xs ghost" data-a="reroll" data-w="${ws}" data-d="${di}" data-s="${s}" title="Случайная замена">↻</button>${x.done ? "" : `<button class="btn xs ghost" data-a="cook" data-id="${r.id}" data-serv="${x.serv}" data-w="${ws}" data-d="${di}" data-s="${s}">Готовить</button>`}</div>` : ""}</div>`; }).join("")}</div>`;
  }).join("")}</div></div>`;
  html += `<p class="small muted">Меню учитывает ваши аллергии и ограничения, нелюбимые продукты, время на готовку, бюджет, сезонные продукты Чехии и то, что истекает в холодильнике. Кухни чередуются, а в субботу — одно новое блюдо недели.</p>`;
  return html;
};

// ---------- SHOP ----------
VIEWS.shop = () => {
  const items = S.shop.items; const tot = items.reduce((s, i) => s + (i.price || 0), 0); const checked = items.filter(i => i.checked);
  const byStore = {}; for (const i of items) { const k = i.store || "Без магазина"; (byStore[k] = byStore[k] || []).push(i); }
  let html = topbar(S.shop.built ? "Собрано " + new Date(S.shop.built).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "Grocery intelligence", "Список покупок",
    `<button class="btn ghost" data-a="buildShop">Собрать из меню</button><button class="btn ghost" data-a="addShop">Добавить вручную</button><button class="btn ghost" data-a="exportShop">Экспорт</button>`);
  html += `<div class="note">Цены и упаковки — моя оценка по типичным ценам чешских сетей на ${fmtDate(PRICE_DATE)}. У этого приложения нет доступа к каталогам и корзинам Rohlik, Košík, Tesco и других магазинов, поэтому реальные цены и наличие проверяйте по ссылкам. Заказы и оплату я не оформляю.</div>`;
  if (!items.length) return html + `<div class="empty">Список пуст. Утвердите меню недели — я соберу ингредиенты, объединю одинаковые и вычту то, что уже есть дома.<br><button class="btn" style="margin-top:12px" data-a="buildShop">Собрать из меню</button></div>` + searchBlock();
  html += `<div class="card"><div class="row between"><div class="row" style="gap:28px"><div class="stat"><span class="v num">${items.length}</span><span class="l">позиций</span></div><div class="stat"><span class="v num">${Math.round(tot).toLocaleString("ru-RU")} Kč</span><span class="l">оценка итого${S.profile.currency === "EUR" ? " · " + (tot / S.profile.eurRate).toFixed(0) + " €" : ""}</span></div><div class="stat"><span class="v num">${checked.length}</span><span class="l">отмечено</span></div></div>
  <div class="row"><button class="btn olive" data-a="buyChecked" ${checked.length ? "" : "disabled"}>Купил отмеченное → в холодильник</button><button class="btn ghost" data-a="clearShop">Очистить список</button></div></div></div>`;
  for (const [st, arr] of Object.entries(byStore)) {
    html += `<div class="card"><div class="card-h"><h3>${esc(st)}</h3><span class="small muted num">≈ ${money(arr.reduce((s, i) => s + (i.price || 0), 0))}</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th></th><th>Продукт</th><th>Количество</th><th class="r">Оценка</th><th>Магазин</th><th>Для блюд</th><th>Найти</th><th></th></tr></thead><tbody>
    ${arr.map(i => { const c = i.key && CAT[i.key]; const q = c ? c.cz : i.name; const conf = c ? S.profile.allergies.filter(a => c.al.includes(a)).map(a => ALLERGENS[a]) : [];
      return `<tr class="${i.checked ? "done" : ""}"><td><input type="checkbox" aria-label="Куплено" data-on="shopCheck" data-id="${i.id}" ${i.checked ? "checked" : ""}></td>
      <td><div class="pn" style="font-weight:500">${esc(i.name)}</div>${c ? `<div class="tiny muted">${esc(c.cz)} · ${esc(c.cat)}</div>` : ""}${conf.length ? `<span class="chip wine">аллерген: ${esc(conf.join(", "))}</span>` : ""}</td>
      <td class="num">${esc(i.qtyLabel || "")}${i.haveG ? `<div class="tiny muted">нужно ${fmtMass(i.key, i.needG)}, дома ${fmtMass(i.key, i.haveG)}</div>` : ""}</td>
      <td class="r num">${i.price ? "~" + Math.round(i.price) + " Kč" : "—"}${c && !c.loose ? `<div class="tiny muted">${Math.round(c.price / c.packG * 1000)} Kč/${LIQ.has(i.key) ? "л" : "кг"}</div>` : c ? `<div class="tiny muted">${c.price} Kč/кг</div>` : ""}</td>
      <td><select aria-label="Магазин" data-on="shopStore" data-id="${i.id}" style="width:auto">${STORES.map(s => `<option ${s === i.store ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      <td class="small">${esc((i.dishes || []).join(", "))}</td>
      <td class="small"><a href="${STORE_SEARCH.Rohlik(q)}" target="_blank" rel="noopener">Rohlik</a> · <a href="${STORE_SEARCH["Košík"](q)}" target="_blank" rel="noopener">Košík</a> · <a href="${(STORE_SEARCH[i.store] || STORE_SEARCH.Tesco)(q)}" target="_blank" rel="noopener">${esc(STORE_SEARCH[i.store] && i.store !== "Rohlik" && i.store !== "Košík" ? i.store : "Tesco")}</a></td>
      <td><button class="btn xs ghost" data-a="delShop" data-id="${i.id}" aria-label="Удалить">✕</button></td></tr>`; }).join("")}
    </tbody></table></div></div>`;
  }
  return html + searchBlock();
};
function searchBlock() {
  const q = (S.ui.shopQ || "").trim().toLowerCase();
  const res = q ? Object.values(CAT).filter(c => c.name.toLowerCase().includes(q) || c.cz.toLowerCase().includes(q)).slice(0, 12) : [];
  return `<div class="card"><div class="card-h"><h3>Поиск продуктов</h3><span class="small muted">Сравнение по моему каталогу + прямой поиск в магазинах</span></div>
  <input type="search" id="shopQ" placeholder="Например: тофу, лосось, гочуджан" value="${esc(S.ui.shopQ || "")}" data-on="shopQ">
  ${q ? (res.length ? `<div class="tbl-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Продукт</th><th>Упаковка</th><th class="r">Оценка</th><th class="r">За кг/л</th><th>Где обычно есть</th><th>Искать в магазинах</th><th></th></tr></thead><tbody>${res.map(c => `<tr><td><b style="font-weight:500">${esc(c.name)}</b><div class="tiny muted">${esc(c.cz)}</div></td><td class="num">${c.loose ? "на вес" : fmtMass(c.key, c.packG)}</td><td class="r num">~${c.price} Kč</td><td class="r num">${Math.round(c.price / c.packG * 1000)} Kč</td><td>${esc(c.store)}</td><td class="small">${STORES.map(s => `<a href="${STORE_SEARCH[s](c.cz)}" target="_blank" rel="noopener">${s}</a>`).join(" · ")}</td><td><button class="btn xs ghost" data-a="addShopKey" data-k="${c.key}">В список</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="small muted" style="margin-top:10px">В моём каталоге нет «${esc(q)}». Искать напрямую: ${STORES.map(s => `<a href="${STORE_SEARCH[s](q)}" target="_blank" rel="noopener">${s}</a>`).join(" · ")}</div>`) : `<p class="small muted" style="margin-top:8px">Rohlik, Košík и Tesco открываются поиском на сайте магазина; Albert, Lidl, Kaufland и BILLA — поиском по их сайтам.</p>`}</div>`;
}

// ---------- FRIDGE ----------
VIEWS.fridge = () => {
  const f = S.ui.fridgeLoc || "all";
  const items = S.fridge.filter(x => f === "all" || x.loc === f).sort((a, b) => (a.exp || "9").localeCompare(b.exp || "9"));
  const demo = S.fridge.some(x => x.demo);
  let html = topbar("Kitchen manager", "Холодильник и запасы", `<button class="btn" data-a="addFridge">Добавить вручную</button><button class="btn ghost" data-a="receipt">Чек или фото продуктов</button>`);
  if (demo) html += `<div class="note">Строки с пометкой «пример» добавлены для демонстрации, это не ваши продукты. <button class="link" data-a="clearDemo">Удалить примеры</button></div>`;
  const exp = expiring(3); const resc = rescueRecipes(exp).slice(0, 3);
  if (resc.length) html += `<div class="card" style="border-color:var(--olive)"><span class="eyebrow" style="color:var(--olive)">Меньше отходов</span><h3 style="margin:6px 0 10px">Что приготовить из того, что скоро испортится</h3><div class="list">${resc.map(x => `<div class="li"><div class="grow"><div class="ttl">${esc(x.r.n)}</div><div class="tiny muted">использует: ${esc(x.hit.map(k => CAT[k].name.toLowerCase()).join(", "))} · ${x.r.time} мин</div></div><button class="btn sm olive" data-a="toTonight" data-id="${x.r.id}">На ужин</button><button class="btn sm ghost" data-a="openRecipe" data-id="${x.r.id}">Рецепт</button></div>`).join("")}</div></div>`;
  html += `<div class="row">${[["all","Все"],["холодильник","Холодильник"],["морозилка","Морозилка"],["шкаф","Шкаф"]].map(([k, l]) => `<button class="chip ${f === k ? "sel" : ""}" data-a="fridgeLoc" data-l="${k}">${l} · ${k === "all" ? S.fridge.length : S.fridge.filter(x => x.loc === k).length}</button>`).join("")}</div>`;
  if (!items.length) return html + `<div class="empty">Здесь пусто. Добавьте продукты вручную, сфотографируйте чек или отметьте покупки в списке.</div>`;
  html += `<div class="card"><div class="tbl-wrap"><table class="t"><thead><tr><th></th><th>Продукт</th><th>Остаток</th><th>Категория</th><th>Место</th><th>Куплено</th><th>Срок</th><th></th></tr></thead><tbody>
  ${items.map(x => { const d = daysLeft(x); const pct = x.init ? Math.round(x.qty / x.init * 100) : 100;
    return `<tr><td><span class="dot ${d < 0 ? "bad" : d <= 1 ? "warn" : d <= 3 ? "warn" : ""}"></span></td><td><b style="font-weight:500">${esc(x.name)}</b>${x.demo ? ' <span class="chip">пример</span>' : ""}</td>
    <td class="num" style="min-width:120px">${x.key ? fmtG(x.key, x.qty) : esc(r1(x.qty) + " " + (x.unit || ""))}<div class="bar" style="margin-top:4px"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div></td>
    <td class="small">${esc(x.cat || "")}</td><td class="small">${esc(x.loc || "")}</td><td class="small num">${x.bought ? fmtDate(x.bought) : ""}</td>
    <td class="small">${expLabel(x)}</td>
    <td style="white-space:nowrap"><button class="btn xs ghost" data-a="useFridge" data-id="${x.id}">Использовать</button> <button class="btn xs ghost" data-a="editFridge" data-id="${x.id}">Изменить</button> <button class="btn xs ghost" data-a="delFridge" data-id="${x.id}" aria-label="Убрать">✕</button></td></tr>`; }).join("")}
  </tbody></table></div></div>`;
  return html;
};

// ---------- RECIPES ----------
VIEWS.recipes = () => {
  const u = S.ui; const q = (u.rq || "").toLowerCase(); const cu = u.rcu || ""; const m = u.rm || ""; const tab = u.rtab || "book";
  let html = topbar("Professional recipe book · " + allRecipes().length + " рецептов", "Книга рецептов", `<button class="btn" data-a="newRecipe">Добавить свой рецепт</button>`);
  html += `<div class="row"><button class="chip ${tab === "book" ? "sel" : ""}" data-a="rtab" data-t="book">Рецепты</button><button class="chip ${tab === "gallery" ? "sel" : ""}" data-a="rtab" data-t="gallery">Галерея моих блюд · ${S.photos.filter(p => p.kind !== "receipt").length}</button><button class="chip ${tab === "history" ? "sel" : ""}" data-a="rtab" data-t="history">История блюд · ${S.history.filter(h => h.cooked).length}</button></div>`;
  if (tab === "gallery") return html + galleryView();
  if (tab === "history") return html + historyView();
  html += `<div class="fgrid"><label class="f">Поиск<input type="search" id="rq" data-on="rq" value="${esc(u.rq || "")}" placeholder="Название или продукт"></label>
  <label class="f">Кухня<select data-on="rcu" id="rcu"><option value="">Все кухни</option>${[...new Set(allRecipes().map(r => r.cu))].map(c => `<option ${c === cu ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
  <label class="f">Приём пищи<select data-on="rm" id="rm"><option value="">Все</option><option value="breakfast" ${m === "breakfast" ? "selected" : ""}>Завтраки</option><option value="main" ${m === "main" ? "selected" : ""}>Обеды и ужины</option><option value="snack" ${m === "snack" ? "selected" : ""}>Перекусы и десерты</option></select></label>
  <label class="f">Время<select data-on="rt" id="rt"><option value="">Любое</option>${[15, 30, 45, 60].map(t => `<option value="${t}" ${+u.rt === t ? "selected" : ""}>до ${t} мин</option>`).join("")}</select></label></div>`;
  const list = allRecipes().filter(r => (!cu || r.cu === cu) && (!m || r.m === m) && (!u.rt || r.time <= +u.rt) && (!q || r.n.toLowerCase().includes(q) || r.ing.some(i => (CAT[i[0]] ? CAT[i[0]].name : String(i[3] || i[0])).toLowerCase().includes(q))));
  return html + (list.length ? `<div class="rgrid">${list.map(rcard).join("")}</div>` : `<div class="empty">Ничего не нашлось. Спросите шефа в чате — он предложит рецепт, и его можно сохранить в книгу.</div>`);
};
function galleryView() {
  const ph = S.photos.filter(p => p.kind !== "receipt").slice().reverse();
  return `<div class="card"><p class="small muted">Загружайте фото своих блюд из карточки рецепта. Шеф сравнит подачу с описанием сервировки и подскажет, что улучшить. Иллюстрации в книге — это схематичные тарелки, а не фотографии результата.</p></div>` +
    (ph.length ? `<div class="photo-grid">${ph.map(p => { const r = rec(p.rid); return `<figure><img src="${esc(photoSrc(p))}" alt="${esc(r ? r.n : "Фото")}" loading="lazy"><figcaption class="small"><b style="font-weight:500">${esc(r ? r.n : "Блюдо")}</b><div class="tiny muted">${fmtDate(p.date)}</div>${p.critique ? `<div class="tiny" style="margin-top:4px">${esc(p.critique.slice(0, 220))}${p.critique.length > 220 ? "…" : ""}</div>` : ""}<div class="row" style="margin-top:4px">${r ? `<button class="btn xs ghost" data-a="critique" data-id="${p.id}">${p.critique ? "Ещё совет" : "Оценить подачу"}</button>` : ""}<button class="btn xs ghost" data-a="delPhoto" data-id="${p.id}">Удалить</button></div></figcaption></figure>`; }).join("")}</div>` : `<div class="empty">Фото пока нет. Откройте рецепт и нажмите «Добавить фото моего блюда».</div>`);
}
function historyView() {
  const h = S.history.filter(x => x.cooked).slice().reverse();
  if (!h.length) return `<div class="empty">Здесь появятся блюда, которые вы приготовили, с вашими оценками. Открытый рецепт не считается приготовленным.</div>`;
  return `<div class="card"><div class="list">${h.map(x => `<div class="li"><div class="grow"><div class="ttl">${esc(x.name)}</div><div class="tiny muted">${fmtDate(x.date)} · ${x.serv} порц. · ${money(x.cost || 0)}${x.comment ? " · «" + esc(x.comment) + "»" : ""}</div></div>${stars(x.id, x.rating || 0)}<button class="btn xs ghost" data-a="delHist" data-id="${x.id}" aria-label="Удалить запись">✕</button></div>`).join("")}</div></div>`;
}

// ---------- DISCOVER ----------
VIEWS.discover = () => {
  const w = dishOfWeek(); const others = allRecipes().filter(r => r.disc && (!w || r.id !== w.id));
  let html = topbar("Recipe discovery", "Гастрономические открытия", `<button class="btn copper" data-a="surprise">Удиви меня</button>`);
  if (w) { const n = nutr(w); html += `<section class="special"><div style="cursor:pointer" data-a="openRecipe" data-id="${w.id}">${plate(w, { cu: true })}</div><div class="body"><span class="eyebrow">One new dish every week · неделя с ${fmtDate(weekStart())}</span><h2>${esc(w.n)}</h2><p style="color:#d8cfbf">${esc(w.taste)}</p>
    <div class="col small" style="color:#d8cfbf;gap:6px"><div><b style="color:var(--on-dark)">Откуда:</b> ${esc(w.disc.origin)}</div><div><b style="color:var(--on-dark)">Почему стоит попробовать:</b> ${esc(w.disc.why)}</div><div><b style="color:var(--on-dark)">Сложность:</b> ${diffName(w.d)}, ${w.time} мин</div><div><b style="color:var(--on-dark)">Где купить:</b> ${esc(w.disc.where)}</div></div>
    <div class="meta"><span>Порция<b class="num">${money(cost(w))}</b></span><span>Энергия<b class="num">${r0(n.kcal)} ккал</b></span><span>Статус<b>${cookedCount(w.id) ? "Пробовали" : "Ещё не пробовали"}</b></span></div>
    <div class="row"><button class="btn copper" data-a="openRecipe" data-id="${w.id}">Рецепт</button><button class="btn ghost" data-a="addToMenu" data-id="${w.id}">Добавить в меню</button></div></div></section>`; }
  html += `<div class="card"><div class="card-h"><h3>Открытия для вас</h3><span class="small muted">Блюда, которые расширяют вкус и технику</span></div><div class="list">${others.map(r => `<div class="li"><div style="width:90px;flex:none">${plate(r, { noTag: true })}</div><div class="grow"><div class="ttl" style="font-family:var(--display);font-size:1.25rem;font-weight:600">${esc(r.n)}</div><div class="small">${esc(r.taste)}</div><div class="tiny muted" style="margin-top:3px">${esc(r.disc.origin)} · ${diffName(r.d)} · ${r.time} мин · ${esc(r.disc.why)}</div><div class="tiny muted">Где купить: ${esc(r.disc.where)}</div></div><div class="col" style="gap:6px;align-items:flex-end">${cookedCount(r.id) ? '<span class="chip olive">Пробовали</span>' : '<span class="chip gold">Новое</span>'}<button class="btn sm ghost" data-a="openRecipe" data-id="${r.id}">Рецепт</button><button class="btn sm ghost" data-a="addToMenu" data-id="${r.id}">В меню</button></div></div>`).join("")}</div></div>`;
  const untried = CUISINES.filter(c => !S.history.some(h => h.cooked && rec(h.rid) && rec(h.rid).cu === c));
  html += `<div class="card"><h3>Карта кухонь</h3><p class="small muted" style="margin:4px 0 10px">Зелёные — уже готовили. Нажмите, чтобы увидеть рецепты кухни.</p><div class="row">${CUISINES.map(c => `<button class="chip ${untried.includes(c) ? "" : "olive"}" data-a="cuisineGo" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>`;
  return html;
};

// ---------- NUTRITION ----------
VIEWS.nutrition = () => {
  const T = targets(); const t = dayTotals(); const L = dayLog(); const p = S.profile;
  let html = topbar("Nutrition tracker · " + fmtDate(today()), "Питание", `<button class="btn" data-a="addFood">Добавить приём пищи</button>`);
  html += `<div class="note">Это ориентиры для сбалансированного питания, а не медицинская диета. Данные из систем здоровья не подключены, поэтому активность учитывается по уровню, который вы указали в профиле.</div>`;
  html += `<div class="grid g2"><div class="card"><div class="card-h"><h3>Сегодня</h3>${T ? `<span class="small muted">цель ${T.kcal} ккал</span>` : `<button class="link" data-a="go" data-r="profile">Указать цель</button>`}</div>
    ${macroBar("Калории", t.kcal, T && T.kcal, "ккал", "copper")}${macroBar("Белки", t.p, T && T.p, "г")}${macroBar("Жиры", t.f, T && T.f, "г")}${macroBar("Углеводы", t.c, T && T.c, "г")}${macroBar("Клетчатка", t.fib, 30, "г")}${macroBar("Овощи и фрукты", t.veg, 400, "г")}
    <div class="row between" style="margin-top:12px"><span>Вода: <b class="num">${L.water} мл</b>${T ? ` / ${T.water}` : " / 2000"}</span><div class="row"><button class="btn sm ghost" data-a="water" data-v="-250">−250</button><button class="btn sm" data-a="water" data-v="250">+250 мл</button></div></div></div>
    <div class="card"><div class="card-h"><h3>Что я ел</h3><span class="small muted">Разнообразие недели: ${varietyWeek()} продуктов</span></div>
    ${L.items.length ? `<div class="list">${L.items.map(i => `<div class="li"><div class="grow"><div class="ttl">${esc(i.name)}</div><div class="tiny muted num">${r0(i.kcal)} ккал · Б ${r0(i.p)} · Ж ${r0(i.f)} · У ${r0(i.c)}</div></div><button class="btn xs ghost" data-a="delFood" data-id="${i.id}" aria-label="Удалить">✕</button></div>`).join("")}</div>` : `<div class="empty">Пока ничего. Нажмите «Готовить» у блюда из меню или добавьте приём пищи вручную.</div>`}</div></div>`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6)); const vals = days.map(d => dayTotals(d).kcal); const mx = Math.max(T ? T.kcal : 0, ...vals, 1);
  html += `<div class="card"><div class="card-h"><h3>Последние 7 дней</h3><span class="small muted">ккал${T ? " · линия цели " + T.kcal : ""}</span></div><div class="chart" style="position:relative">${T ? `<div style="position:absolute;left:0;right:0;bottom:${T.kcal / mx * 100}%;border-top:1px dashed var(--olive)"></div>` : ""}${vals.map((v, i) => `<div class="c"><span class="num">${v ? r0(v) : ""}</span><i class="${i === 6 ? "cur" : ""}" style="height:${v / mx * 100}%"></i></div>`).join("")}</div><div class="chart-l">${days.map(d => `<span>${DOW_S[dayIdx(d)]}</span>`).join("")}</div></div>`;
  return html;
};

// ---------- BUDGET ----------
VIEWS.budget = () => {
  const ws = weekStart(); const B = +S.profile.budgetWeek || 0; const wk = spentBetween(ws, addDays(ws, 6));
  const m0 = today().slice(0, 8) + "01"; const mo = spentBetween(m0, today());
  const cooked = S.history.filter(h => h.cooked);
  const bySlot = {}; cooked.forEach(h => { const k = h.slot || "other"; bySlot[k] = (bySlot[k] || 0) + (h.cost || 0); });
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws, -7 * (7 - i))); const wv = weeks.map(w => spentBetween(w, addDays(w, 6))); const mx = Math.max(B, ...wv, 1);
  const pricey = allRecipes().filter(r => r.m === "main" && !r.custom).sort((a, b) => cost(b) - cost(a)).slice(0, 4);
  let html = topbar("Food cost", "Бюджет питания", `<button class="btn" data-a="addExpense">Добавить расход</button><button class="btn ghost" data-a="exportExp">Экспорт CSV</button>`);
  html += `<div class="grid g4"><div class="card stat"><span class="v num">${Math.round(wk).toLocaleString("ru-RU")}</span><span class="l">Kč за эту неделю${B ? " из " + B.toLocaleString("ru-RU") : ""}</span>${B ? `<div class="bar ${wk > B ? "wine" : ""}" style="margin-top:8px"><i style="width:${Math.min(100, wk / B * 100)}%"></i></div>` : ""}</div>
    <div class="card stat"><span class="v num">${Math.round(mo).toLocaleString("ru-RU")}</span><span class="l">Kč в этом месяце</span></div>
    <div class="card stat"><span class="v num">${S.plans[ws] ? Math.round(planCost(S.plans[ws])).toLocaleString("ru-RU") : "—"}</span><span class="l">Kč — расчётная стоимость меню недели</span></div>
    <div class="card stat"><span class="v num">${cooked.length ? Math.round(cooked.reduce((s, h) => s + (h.cost || 0), 0) / Math.max(1, cooked.reduce((s, h) => s + (h.serv || 1), 0))) : "—"}</span><span class="l">Kč — средняя порция</span></div></div>`;
  html += `<div class="grid g2"><div class="card"><div class="card-h"><h3>Расходы по неделям</h3><span class="small muted">Kč${B ? " · пунктир — лимит" : ""}</span></div><div class="chart" style="position:relative">${B ? `<div style="position:absolute;left:0;right:0;bottom:${B / mx * 100}%;border-top:1px dashed var(--bordeaux)"></div>` : ""}${wv.map((v, i) => `<div class="c"><span class="num">${v ? Math.round(v) : ""}</span><i class="${i === 7 ? "cur" : ""}" style="height:${v / mx * 100}%"></i></div>`).join("")}</div><div class="chart-l">${weeks.map(w => `<span>${parseISO(w).getDate()}.${parseISO(w).getMonth() + 1}</span>`).join("")}</div></div>
    <div class="card"><div class="card-h"><h3>Стоимость приготовленного</h3></div>${Object.keys(bySlot).length ? Object.entries(bySlot).map(([k, v]) => `<div class="row between li"><span>${MEALS[k] || "Вне меню"}</span><b class="num" style="font-weight:500">${money(v)}</b></div>`).join("") : `<div class="empty">Появится после первых приготовленных блюд.</div>`}</div></div>`;
  html += `<div class="card"><div class="card-h"><h3>Самые дорогие блюда и альтернативы</h3><span class="small muted">Дорогой качественный продукт — нормальный выбор; это просто варианты</span></div><div class="list">${pricey.map(r => { const n = nutr(r); const alt = allRecipes().filter(a => a.m === r.m && a.id !== r.id && !hardBlock(a) && cost(a) < cost(r) * 0.6 && Math.abs(nutr(a).p - n.p) < 15).sort((a, b) => Math.abs(nutr(a).p - n.p) - Math.abs(nutr(b).p - n.p))[0];
    return `<div class="li"><div class="grow"><div class="ttl">${esc(r.n)} — <span class="num">${money(cost(r))}</span>/порц.</div>${alt ? `<div class="small muted">Похоже по белку (${r0(n.p)} г → ${r0(nutr(alt).p)} г): <button class="link" data-a="openRecipe" data-id="${alt.id}">${esc(alt.n)}</button>, ${money(cost(alt))}/порц.</div>` : ""}</div></div>`; }).join("")}</div></div>`;
  html += `<div class="card"><div class="card-h"><h3>Расходы</h3><span class="small muted">Personal Finance OS не подключена — используйте экспорт CSV</span></div>${S.expenses.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>Дата</th><th>Магазин</th><th>Комментарий</th><th class="r">Сумма</th><th></th></tr></thead><tbody>${S.expenses.slice().sort((a, b) => b.date.localeCompare(a.date)).map(e => `<tr><td class="num">${fmtDate(e.date)}</td><td>${esc(e.store)}</td><td class="small">${esc(e.note || "")}</td><td class="r num">${money(+e.amount)}</td><td><button class="btn xs ghost" data-a="delExp" data-id="${e.id}" aria-label="Удалить">✕</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Расходов пока нет. Они добавятся, когда вы отметите покупки, загрузите чек или внесёте сумму вручную.</div>`}</div>`;
  return html;
};

// ---------- CHAT ----------
const QUICK = ["У меня дома курица, картошка и сливки. Что приготовить?", "Хочу сегодня что-нибудь итальянское", "Хочу научиться готовить ресторанный стейк", "Составь мне меню на неделю за 80 €", "Удиви меня сегодня"];
VIEWS.chat = () => {
  let html = topbar("Personal Chef AI", "Шеф-чат", S.chat.length ? `<button class="btn ghost" data-a="clearChat">Очистить чат</button>` : "");
  if (!SAMPLE) html += `<div class="note">Чат с шефом работает, когда приложение открыто на claude.ai и вы разрешили странице обращаться к Claude. Сейчас эта возможность недоступна, но кнопки ниже всё равно подберут рецепт из книги.</div>`;
  html += `<div class="card"><div class="chat" id="chatBox">${S.chat.length ? S.chat.map((m, i) => `<div class="msg ${m.role === "user" ? "me" : "ai"}">${esc(m.content)}${m.role === "assistant" && m.content.length > 200 ? `<div style="margin-top:8px"><button class="btn xs ghost" data-a="saveChatRecipe" data-i="${i}">Сохранить как рецепт</button></div>` : ""}</div>`).join("") : `<div class="empty">Спросите что угодно о еде: что приготовить из продуктов, как освоить технику, чем заменить ингредиент. Шеф знает ваш профиль, холодильник и меню.</div>`}<div id="chatLive"></div></div>
  <div class="row" style="margin:12px 0 10px">${QUICK.map(q => `<button class="chip" data-a="quickAsk" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <form class="row" data-form="chat" style="flex-wrap:nowrap"><input type="text" id="chatIn" placeholder="Напишите шефу…" autocomplete="off"><button class="btn" type="submit">Отправить</button></form></div>`;
  return html;
};

// ---------- LEARN ----------
VIEWS.learn = () => {
  let html = topbar("Cooking education", "Кулинарное развитие");
  html += `<div class="split"><div class="card"><div class="card-h"><h3>Мои навыки</h3><span class="small muted">Оцените себя от 0 до 5 · практика считается по приготовленным блюдам</span></div>
    ${Object.entries(SKILLS).map(([k, n]) => { const lv = S.skills[k] || 0; const xp = S.skillXp[k] || 0; return `<div class="skill"><span>${n}</span><span class="lv">${[1,2,3,4,5].map(i => `<button class="${i <= lv ? "on" : ""}" data-a="skillLv" data-k="${k}" data-v="${i === lv ? i - 1 : i}" aria-label="${n}: уровень ${i}"></button>`).join("")}</span><span class="tiny muted num">${xp} практик</span></div>`; }).join("")}</div>
    <div class="card"><div class="card-h"><h3>Техника недели</h3></div>${(() => { const sk = Object.entries(SKILLS).sort((a, b) => (S.skills[a[0]] || 0) - (S.skills[b[0]] || 0))[0][0]; const t = TECHNIQUES.find(x => x.sk === sk && !S.techDone.includes(x.id)) || TECHNIQUES.find(x => !S.techDone.includes(x.id)) || TECHNIQUES[0]; const rs = allRecipes().filter(r => (r.skills || []).includes(t.sk) && !hardBlock(r)).slice(0, 3);
      return `<span class="eyebrow">${SKILLS[t.sk]}</span><h3 style="margin:6px 0">${esc(t.n)}</h3><p>${esc(t.what)}</p><p class="small muted" style="margin-top:8px"><b>Почему это работает:</b> ${esc(t.why)}</p><p class="small" style="margin-top:10px">Потренируйтесь на: ${rs.map(r => `<button class="link" data-a="openRecipe" data-id="${r.id}">${esc(r.n)}</button>`).join(", ")}</p>`; })()}</div></div>`;
  html += `<div class="card"><div class="card-h"><h3>Библиотека техник</h3></div><div class="grid g2">${TECHNIQUES.map(t => `<div class="col" style="gap:4px;padding:10px 0;border-top:1px solid var(--line)"><div class="row between"><b style="font-weight:600">${esc(t.n)}</b><button class="chip ${S.techDone.includes(t.id) ? "sel" : ""}" data-a="techDone" data-id="${t.id}">${S.techDone.includes(t.id) ? "Освоено" : "Отметить освоенным"}</button></div><span class="small">${esc(t.what)}</span><span class="tiny muted">${esc(t.why)}</span></div>`).join("")}</div></div>`;
  html += `<div class="card"><div class="card-h"><h3>Безопасность на кухне</h3>${S.profile.allergies.length ? `<span class="chip wine">Ваши аллергены: ${esc(S.profile.allergies.map(a => ALLERGENS[a]).join(", "))}</span>` : ""}</div><div class="grid g2">${SAFETY.map(([h, t]) => `<div class="col" style="gap:4px;padding:8px 0;border-top:1px solid var(--line)"><b style="font-weight:600">${h}</b><span class="small">${t}</span></div>`).join("")}</div></div>`;
  return html;
};

// ---------- REPORTS ----------
VIEWS.reports = () => {
  const d = S.ui.repDate || today(); const L = S.log[d] || { items: [], water: 0 }; const t = dayTotals(d); const ws = weekStart(d);
  const used = S.used.filter(u => u.date === d); const tomorrow = S.plans[weekStart(addDays(d, 1))]; const tm = tomorrow ? tomorrow.days[dayIdx(addDays(d, 1))] : null;
  const wkH = S.history.filter(h => h.cooked && h.date >= ws && h.date <= addDays(ws, 6));
  const best = wkH.filter(h => h.rating >= 4); const firsts = wkH.filter(h => S.history.filter(x => x.cooked && x.rid === h.rid && x.date < h.date).length === 0);
  const waste = {}; S.waste.filter(w => w.reason === "spoiled").forEach(w => waste[w.name] = (waste[w.name] || 0) + 1);
  let wk = { kcal: 0, p: 0 }; for (let i = 0; i < 7; i++) { const x = dayTotals(addDays(ws, i)); wk.kcal += x.kcal; wk.p += x.p; }
  let html = topbar("Daily & weekly", "Отчёты", `<input type="date" id="repDate" data-on="repDate" value="${d}" style="width:auto" aria-label="Дата отчёта">`);
  html += `<div class="grid g2"><div class="card"><div class="card-h"><h3>День · ${fmtDate(d)}</h3></div>
    <div class="col small"><div><b>Что я ел:</b> ${L.items.length ? esc(L.items.map(i => i.name).join("; ")) : "записей нет"}</div>
    <div><b>Пищевая ценность (примерно):</b> <span class="num">${r0(t.kcal)} ккал · Б ${r0(t.p)} · Ж ${r0(t.f)} · У ${r0(t.c)} · клетчатка ${r0(t.fib)} г · овощи/фрукты ${r0(t.veg)} г · вода ${L.water} мл</span></div>
    <div><b>Разнообразие:</b> ${new Set(L.items.flatMap(i => i.keys || [])).size} разных продуктов за день</div>
    <div><b>Использованные продукты:</b> ${used.length ? esc(used.map(u => u.name + " " + fmtMass(u.key, u.g)).join(", ")) : "—"}</div>
    <div><b>Осталось дома:</b> ${S.fridge.length} продуктов, скоро истекают: ${esc(expiring(3).map(f => f.name).join(", ") || "нет")}</div>
    <div><b>Завтра:</b> ${tm ? esc(slotsOn().map(s => tm[s] && rec(tm[s].rid) ? MEALS[s] + " — " + rec(tm[s].rid).n : "").filter(Boolean).join("; ")) : "меню не составлено"}</div></div></div>
    <div class="card"><div class="card-h"><h3>Неделя с ${fmtDate(ws)}</h3></div><div class="col small">
    <div><b>Итоги питания:</b> <span class="num">в среднем ${r0(wk.kcal / 7)} ккал и ${r0(wk.p / 7)} г белка в день</span> (по записям)</div>
    <div><b>Закупки:</b> ${money(spentBetween(ws, addDays(ws, 6)))}</div>
    <div><b>Самые удачные блюда:</b> ${best.length ? esc(best.map(h => h.name + " (" + h.rating + "★)").join(", ")) : "оценок 4–5 пока нет"}</div>
    <div><b>Новые блюда:</b> ${firsts.length ? esc([...new Set(firsts.map(h => h.name))].join(", ")) : "—"}</div>
    <div><b>Часто портится:</b> ${Object.keys(waste).length ? esc(Object.entries(waste).sort((a, b) => b[1] - a[1]).map(([n, c]) => n + " ×" + c).join(", ")) : "ничего не выбрасывали"}</div>
    <div><b>Нужно купить:</b> ${S.shop.items.filter(i => !i.checked).length} позиций</div>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="genNext">Меню на следующую неделю</button><button class="btn sm ghost" data-a="copyReport">Скопировать отчёт</button></div></div></div></div>`;
  return html;
};

// ---------- PROFILE ----------
const FLAVORS = ["солёное","сладкое","кислое","острое","умами","пряное","дымное","свежее, травяное","сливочное","хрустящее"];
const METHODS = ["жарка","запекание","тушение","гриль","на пару","вок","фритюр","су-вид","сырое/тартар","копчение"];
const DIETS = [["vegetarian","Вегетарианство"],["pescatarian","Пескетарианство"],["noPork","Без свинины"],["noAlcohol","Без алкоголя в блюдах"],["glutenFree","Без глютена"],["lactoseFree","Без лактозы"]];
const EQUIP = ["Духовка","Чугунная сковорода","Антипригарная сковорода","Вок","Утятница/казан","Погружной блендер","Стационарный блендер","Миксер","Термометр","Пароварка","Мультиварка","Аэрогриль","Кухонные весы","Мандолина"];
function chipsSel(field, opts, sel) { return `<div class="row" style="gap:6px">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<button class="chip ${sel.includes(v) ? "sel" : ""}" data-a="togglePf" data-f="${field}" data-v="${esc(v)}" aria-pressed="${sel.includes(v)}">${esc(l)}</button>`; }).join("")}</div>`; }
const tf = (f, label, ph, area) => `<label class="f">${label}${area ? `<textarea id="pf_${f}" data-on="pf" data-f="${f}" placeholder="${esc(ph)}">${esc(S.profile[f])}</textarea>` : `<input type="text" id="pf_${f}" data-on="pf" data-f="${f}" value="${esc(S.profile[f])}" placeholder="${esc(ph)}">`}</label>`;
const nf = (f, label, ph) => `<label class="f">${label}<input type="number" id="pf_${f}" data-on="pf" data-f="${f}" value="${esc(S.profile[f])}" placeholder="${esc(ph || "")}"></label>`;
const WIZ = [
  ["Ваши вкусы", () => `<p class="small muted">Что вам нравится в еде? Выберите всё подходящее.</p>${chipsSel("flavors", FLAVORS, S.profile.flavors)}${tf("likes", "Любимые продукты", "например: грибы, лосось, тыква, сыры")}${tf("favDishes", "Любимые блюда", "например: рамен, борщ, паста карбонара")}${tf("spices", "Любимые специи", "например: копчёная паприка, кардамон")}<span class="small muted">Любимые способы приготовления</span>${chipsSel("methods", METHODS, S.profile.methods)}`],
  ["Любимые кухни", () => `<p class="small muted">Они будут появляться в меню чаще, но остальные я тоже буду чередовать.</p>${chipsSel("cuisines", CUISINES, S.profile.cuisines)}`],
  ["Нелюбимые продукты", () => `${tf("dislikes", "Что вы не едите или не любите (через запятую)", "например: кинза, печень, оливки", 1)}${tf("neverTried", "Продукты, которые никогда не пробовали", "например: мисо, гочуджан, халуми")}`],
  ["Аллергии и ограничения", () => `<p class="small muted">Аллергены полностью исключаются из меню и покупок.</p>${chipsSel("allergies", Object.entries(ALLERGENS), S.profile.allergies)}${tf("intolerances", "Непереносимости (описанием)", "например: плохо переношу бобовые")}<span class="small muted">Ограничения в питании</span>${chipsSel("diet", DIETS, S.profile.diet)}`],
  ["Цели питания", () => `<div class="row">${[["variety","Вкусно и разнообразно"],["maintain","Поддерживать вес"],["lose","Мягко снизить вес"],["gain","Набрать мышечную массу"]].map(([v, l]) => `<button class="chip ${S.profile.goal === v ? "sel" : ""}" data-a="setPf" data-f="goal" data-v="${v}">${l}</button>`).join("")}</div><div class="fgrid"><label class="f">Пол<select data-on="pf" data-f="sex" id="pf_sex"><option value="">—</option><option value="m" ${S.profile.sex === "m" ? "selected" : ""}>мужской</option><option value="f" ${S.profile.sex === "f" ? "selected" : ""}>женский</option></select></label>${nf("age", "Возраст")}${nf("height", "Рост, см")}${nf("weight", "Вес, кг")}<label class="f">Активность<select data-on="pf" data-f="activity" id="pf_activity">${[["1.2","Сидячая"],["1.375","Лёгкая (1–3 тренировки)"],["1.55","Средняя (3–5)"],["1.725","Высокая (6–7)"]].map(([v, l]) => `<option value="${v}" ${S.profile.activity === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>${nf("kcalTarget", "Своя цель, ккал", "необязательно")}</div><p class="tiny muted">Данные нужны только для ориентира по калориям и белку. Можно оставить пустыми.</p>`],
  ["Бюджет на продукты", () => `<div class="fgrid">${nf("budgetWeek", "Бюджет в неделю, Kč", "2000")}<label class="f">Показывать также<select data-on="pf" data-f="currency" id="pf_currency"><option value="CZK" ${S.profile.currency === "CZK" ? "selected" : ""}>только кроны</option><option value="EUR" ${S.profile.currency === "EUR" ? "selected" : ""}>кроны и евро</option></select></label>${nf("eurRate", "Курс, Kč за 1 €", "25")}</div><p class="small muted">80 € ≈ ${(80 * (+S.profile.eurRate || 25)).toLocaleString("ru-RU")} Kč по указанному курсу.</p>`],
  ["Приёмы пищи", () => `<p class="small muted">Какие приёмы пищи планировать и на сколько человек готовить?</p><div class="row">${Object.entries(MEALS).map(([k, l]) => `<button class="chip ${S.profile.meals[k] ? "sel" : ""}" data-a="toggleMeal" data-k="${k}">${l}</button>`).join("")}</div><div class="fgrid">${nf("people", "Человек за столом", "1")}</div>`],
  ["Время на готовку", () => `<div class="fgrid"><label class="f">В будни, до<select data-on="pf" data-f="timeWeekday" id="pf_tw">${[15, 20, 30, 40, 60, 90].map(t => `<option value="${t}" ${+S.profile.timeWeekday === t ? "selected" : ""}>${t} мин</option>`).join("")}</select></label><label class="f">В выходные, до<select data-on="pf" data-f="timeWeekend" id="pf_twe">${[30, 60, 90, 120, 180, 240].map(t => `<option value="${t}" ${+S.profile.timeWeekend === t ? "selected" : ""}>${t} мин</option>`).join("")}</select></label></div>`],
  ["Магазины", () => `<p class="small muted">Где вам удобно покупать? Первый выбранный — основной.</p>${chipsSel("stores", STORES, S.profile.stores)}`],
  ["Кухонное оборудование", () => `<p class="small muted">Я не буду предлагать рецепты, для которых нужна техника, которой у вас нет (духовка, блендер).</p>${chipsSel("equipment", EQUIP, S.profile.equipment)}${tf("wantLearn", "Какие блюда хотите научиться готовить", "например: ресторанный стейк, хлеб на закваске, рамен")}${tf("name", "Как к вам обращаться", "Борис")}`],
];
VIEWS.profile = () => {
  const p = S.profile;
  let html = topbar("Taste profile", "Профиль вкусов", `<button class="btn" data-a="wizard">${p.done ? "Пройти анкету заново" : "Начать анкету"}</button>`);
  const liked = [...new Set(S.history.filter(h => h.rating >= 4).map(h => h.name))]; const disliked = [...new Set(S.history.filter(h => h.rating && h.rating <= 2).map(h => h.name))];
  const cuCount = {}; S.history.filter(h => h.rating >= 4).forEach(h => { const r = rec(h.rid); if (r) cuCount[r.cu] = (cuCount[r.cu] || 0) + 1; });
  html += `<div class="card"><h3>Что я о вас знаю</h3><p class="small muted" style="margin:4px 0 12px">Профиль складывается из анкеты и ваших оценок. Открытый рецепт не считается признаком того, что блюдо понравилось.</p>
    <div class="grid g2 small">
    <div><b>Любимые вкусы:</b> ${esc(p.flavors.join(", ") || "—")}</div><div><b>Любимые продукты:</b> ${esc(p.likes || "—")}</div>
    <div><b>Любимые кухни:</b> ${esc(p.cuisines.join(", ") || "—")}</div><div><b>Любимые блюда:</b> ${esc(p.favDishes || "—")}</div>
    <div><b>Специи:</b> ${esc(p.spices || "—")}</div><div><b>Способы приготовления:</b> ${esc(p.methods.join(", ") || "—")}</div>
    <div><b>Не люблю:</b> ${esc(p.dislikes || "—")}</div><div><b>Аллергии:</b> ${esc(p.allergies.map(a => ALLERGENS[a]).join(", ") || "не указаны")}</div>
    <div><b>Непереносимости:</b> ${esc(p.intolerances || "—")}</div><div><b>Ограничения:</b> ${esc(p.diet.map(d => (DIETS.find(x => x[0] === d) || [0, d])[1]).join(", ") || "—")}</div>
    <div><b>Никогда не пробовал:</b> ${esc(p.neverTried || "—")}</div><div><b>Хочу научиться:</b> ${esc(p.wantLearn || "—")}</div>
    <div><b>Бюджет:</b> ${money(+p.budgetWeek || 0)} в неделю</div><div><b>Время:</b> будни до ${p.timeWeekday} мин, выходные до ${p.timeWeekend} мин</div>
    <div><b>Магазины:</b> ${esc(p.stores.join(", ") || "—")}</div><div><b>Оборудование:</b> ${esc(p.equipment.join(", ") || "—")}</div>
    </div></div>`;
  html += `<div class="grid g2"><div class="card"><h3>По вашим оценкам</h3><div class="col small" style="margin-top:10px"><div><b>Понравилось (4–5★):</b> ${esc(liked.join(", ") || "пока нет оценок")}</div><div><b>Не понравилось (1–2★):</b> ${esc(disliked.join(", ") || "—")}</div><div><b>Кухни-фавориты по оценкам:</b> ${esc(Object.entries(cuCount).sort((a, b) => b[1] - a[1]).map(([c, n]) => c + " (" + n + ")").join(", ") || "—")}</div></div></div>
    <div class="card"><h3>Данные</h3><p class="small muted" style="margin:6px 0 10px">Резервная копия всех данных приложения в JSON и восстановление.</p><div class="row"><button class="btn sm ghost" data-a="backup">Скачать резервную копию</button><label class="btn sm ghost" style="cursor:pointer">Восстановить<input type="file" accept="application/json" data-on="restore" hidden></label><button class="btn sm ghost" data-a="resetAll">Сбросить всё</button></div></div></div>`;
  html += `<div class="card"><h3>Быстрое редактирование</h3><div class="stack" style="margin-top:12px">${WIZ.map(([t, f]) => `<details><summary style="cursor:pointer;font-weight:500;padding:6px 0">${t}</summary><div class="stack" style="padding:10px 0">${f()}</div></details>`).join("")}<button class="btn olive" data-a="replan" style="align-self:flex-start">Пересобрать меню с учётом профиля</button></div></div>`;
  return html;
};
