// ================= MODALS, COOKING, ACTIONS =================
let M = null, C = null, cookTick = null, wakeLock = null, audioCtx = null;
function toast(t) { const el = $("#toastRoot"); el.innerHTML = `<div class="toast" role="status">${esc(t)}</div>`; clearTimeout(toast._t); toast._t = setTimeout(() => el.innerHTML = "", 3200); }
function refresh() {
  const a = document.activeElement; const id = a && a.id; let ss = null; try { ss = a && a.selectionStart; } catch (e) {}
  render(); if (M) renderModal(); if (C) renderCook();
  if (id) { const el = document.getElementById(id); if (el && el !== document.activeElement) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, ss); } catch (e) {} } }
}
function openModal(m) { M = m; renderModal(); }
function closeModal() { M = null; $("#modalRoot").innerHTML = ""; }
function shell(title, body, foot = "", cls = "", eyebrow = "") { return `<div class="ov" data-a="ovClick"><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><div class="col" style="gap:4px">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}<h2>${title}</h2></div><button class="x-btn" data-a="closeModal" aria-label="Закрыть">×</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ""}</div></div>`; }
function renderModal() { if (!M) return; const f = MODALS[M.type]; if (f) $("#modalRoot").innerHTML = f(M); }
const MODALS = {};
const val = id => { const el = document.getElementById(id); return el ? el.value : ""; };

// ---------- recipe ----------
MODALS.recipe = m => {
  const r = rec(m.id); if (!r) return "";
  const serv = m.serv || r.s; const n = nutr(r); const rows = ingRows(r, serv); const conf = conflicts(r);
  const myPh = S.photos.filter(p => p.rid === r.id && p.kind !== "receipt"); const hist = S.history.filter(h => h.rid === r.id && h.cooked);
  const body = `<div class="rd-top"><div class="col">${plate(r, { cu: true })}<span class="tiny muted">${myPh.length ? "Ваше последнее фото блюда." : "Схематичная иллюстрация, не фотография результата. Добавьте своё фото, когда приготовите."}</span></div>
  <div class="col"><p style="font-size:1.05rem">${esc(r.taste || "")}</p>
  <div class="row" style="gap:6px"><span class="chip">${esc(r.cu)}</span><span class="chip">${MEALS[r.m] || (r.m === "main" ? "Обед/ужин" : "")}</span><span class="chip">${r.time} мин</span><span class="chip">${diffName(r.d)}</span>${seasonalNames(r).length ? '<span class="chip olive">сезонное</span>' : ""}${r.custom ? '<span class="chip gold">мой рецепт</span>' : ""}</div>
  ${conf.length ? `<div class="note wine"><b>Внимание:</b> ${esc(conf.join("; "))}.</div>` : ""}
  ${r.note ? `<div class="note olive">${esc(r.note)}</div>` : ""}
  <div class="row between"><span>Порций</span><span class="stepper"><button data-a="mServ" data-v="-1" aria-label="Меньше">−</button><span class="num">${serv}</span><button data-a="mServ" data-v="1" aria-label="Больше">+</button></span></div>
  <div class="grid g4 num" style="gap:8px"><div class="stat"><span class="v" style="font-size:1.5rem">${r0(n.kcal)}</span><span class="l">ккал/порц.</span></div><div class="stat"><span class="v" style="font-size:1.5rem">${r0(n.p)}</span><span class="l">белки, г</span></div><div class="stat"><span class="v" style="font-size:1.5rem">${r0(n.f)}</span><span class="l">жиры, г</span></div><div class="stat"><span class="v" style="font-size:1.5rem">${r0(n.c)}</span><span class="l">углеводы, г</span></div></div>
  <div class="small muted num">Стоимость: ${money(cost(r))} за порцию · ${money(cost(r) * serv)} всего · клетчатка ${r1(n.fib)} г${r.nut ? " · КБЖУ — оценка" : ""}</div>
  ${hist.length ? `<div class="small">Готовили ${hist.length}× · ${avgRating(r.id) ? "средняя оценка " + avgRating(r.id).toFixed(1) + "★" : "без оценки"}</div>` : ""}</div></div>
  <div class="grid g2"><div><h4 style="margin-bottom:6px">Ингредиенты на ${serv} порц.</h4>${rows.map(x => { const have = x.key ? fridgeG(x.key) : 0; return `<div class="ing"><span>${esc(x.name)}${x.key && have >= x.g ? ' <span class="chip olive" style="padding:0 6px">дома</span>' : x.key && have > 0 ? ' <span class="chip gold" style="padding:0 6px">мало</span>' : ""}</span><span class="q">${esc(x.label)}</span></div>`; }).join("")}
  <h4 style="margin:16px 0 6px">Оборудование</h4><p class="small">${esc((r.eq || []).join(", "))}</p></div>
  <div><h4 style="margin-bottom:6px">Приготовление</h4><ol class="steps">${r.steps.map(s => `<li><div><div>${esc(s.t)}</div><div class="row" style="gap:6px;margin-top:4px">${s.temp ? `<span class="chip wine">${esc(s.temp)}</span>` : ""}${s.min ? `<span class="chip">${s.min >= 60 ? Math.floor(s.min / 60) + " ч " + (s.min % 60 ? s.min % 60 + " мин" : "") : s.min + " мин"}</span>` : ""}</div>${s.cue ? `<div class="tiny muted" style="margin-top:3px">Готовность: ${esc(s.cue)}</div>` : ""}</div></li>`).join("")}</ol></div></div>
  ${(r.tips || []).length ? `<div class="note"><b>Советы шефа.</b> ${esc(r.tips.join(" "))}</div>` : ""}
  ${(r.subs || []).length ? `<div class="small"><b>Замены:</b> ${esc(r.subs.join(" · "))}</div>` : ""}
  ${r.safety ? `<div class="note wine"><b>Безопасность.</b> ${esc(r.safety)}</div>` : ""}
  ${r.disc ? `<div class="small"><b>Происхождение:</b> ${esc(r.disc.origin)}. <b>Где купить:</b> ${esc(r.disc.where)}</div>` : ""}
  ${myPh.length ? `<div class="photo-grid">${myPh.slice(-4).map(p => `<figure><img src="${esc(photoSrc(p))}" alt="Моё фото"><figcaption class="tiny muted">${fmtDate(p.date)}</figcaption></figure>`).join("")}</div>` : ""}`;
  const foot = `<label class="btn ghost" style="cursor:pointer">Добавить фото моего блюда<input type="file" accept="image/*" data-on="dishPhoto" data-id="${r.id}" hidden></label><button class="btn ghost" data-a="recipeToShop" data-id="${r.id}" data-serv="${serv}">Недостающее в покупки</button><button class="btn ghost" data-a="addToMenu" data-id="${r.id}">В меню</button>${r.custom ? `<button class="btn ghost" data-a="delRecipe" data-id="${r.id}">Удалить рецепт</button>` : ""}<button class="btn copper" data-a="cook" data-id="${r.id}" data-serv="${serv}">Режим готовки</button>`;
  return shell(esc(r.n), body, foot, "", esc(r.cu) + " · " + (r.m === "main" ? "основное блюдо" : MEALS[r.m] || ""));
};

// ---------- pick slot ----------
MODALS.pick = m => {
  const filt = m.f || "all";
  let list = candidates(m.s, +m.d, { quick: filt === "quick", fancy: filt === "fancy", ignoreTime: filt === "fancy" || filt === "any" });
  const q = (m.q || "").toLowerCase(); if (q) list = list.filter(r => r.n.toLowerCase().includes(q) || r.cu.toLowerCase().includes(q));
  const ctx = { expKeys: new Set(expiring(5).map(f => f.key)), dayI: +m.d, used: new Map() };
  list = list.map(r => ({ r, s: scoreRecipe(r, ctx) + (filt === "quick" ? -r.time / 10 : 0) })).sort((a, b) => b.s - a.s).map(x => x.r);
  const body = `<div class="row">${[["all","Подходящие"],["quick","Быстро, до 20 мин"],["fancy","Ресторанный вариант"],["any","Без ограничения времени"]].map(([k, l]) => `<button class="chip ${filt === k ? "sel" : ""}" data-a="pickF" data-f="${k}">${l}</button>`).join("")}</div>
  <input type="search" id="pickQ" data-on="pickQ" placeholder="Поиск по названию или кухне" value="${esc(m.q || "")}">
  ${list.length ? `<div class="list">${list.map(r => { const n = nutr(r); return `<div class="li"><div style="width:64px;flex:none">${plate(r, { noTag: true })}</div><div class="grow"><div class="ttl">${esc(r.n)}</div><div class="tiny muted num">${esc(r.cu)} · ${r.time} мин · ${r0(n.kcal)} ккал · ${money(cost(r))}/порц.${cookedCount(r.id) ? " · готовили" : ""}</div></div><button class="btn sm" data-a="setSlot" data-id="${r.id}">Выбрать</button></div>`; }).join("")}</div>` : `<div class="empty">Нет подходящих рецептов с этими условиями. Попробуйте «Без ограничения времени».</div>`}`;
  return shell(MEALS[m.s] + " · " + DOW[+m.d], body, `<button class="btn ghost" data-a="clearSlot">Убрать из меню</button>`, "", "Выбор блюда");
};
function ensurePlan(ws) { if (!S.plans[ws]) S.plans[ws] = { status: "draft", created: Date.now(), days: Array.from({ length: 7 }, () => ({ breakfast: null, lunch: null, dinner: null, snack: null })) }; return S.plans[ws]; }

// ---------- add to menu ----------
MODALS.toMenu = m => {
  const r = rec(m.id); const ws0 = weekStart(); const opts = [];
  for (let w = 0; w < 2; w++) for (let d = 0; d < 7; d++) { const date = addDays(ws0, w * 7 + d); if (date < today()) continue; opts.push([w, d, date]); }
  const slotDef = r.m === "breakfast" ? "breakfast" : r.m === "snack" ? "snack" : "dinner";
  const body = `<p>«${esc(r.n)}»</p><div class="fgrid"><label class="f">День<select id="tmDay">${opts.map(([w, d, date]) => `<option value="${w}|${d}">${DOW[d]}, ${fmtDate(date)}</option>`).join("")}</select></label><label class="f">Приём пищи<select id="tmSlot">${Object.entries(MEALS).map(([k, l]) => `<option value="${k}" ${k === slotDef ? "selected" : ""}>${l}</option>`).join("")}</select></label><label class="f">Порций<input type="number" id="tmServ" min="1" value="${S.profile.people || 1}"></label></div>`;
  return shell("Добавить в меню", body, `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="toMenuOk" data-id="${r.id}">Добавить</button>`, "narrow");
};

// ---------- fridge ----------
const catNames = () => `<datalist id="catList">${Object.values(CAT).map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>`;
function normalize(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ё/g, "е"); }
function matchKey(name) {
  const n = normalize(name); if (!n) return null; let best = null, bs = 0;
  for (const c of Object.values(CAT)) {
    const ru = normalize(c.name), cz = normalize(c.cz); let s = 0;
    if (ru === n) s = 10; else if (n.includes(ru) || ru.includes(n)) s = 6;
    const w1 = ru.split(/[\s(,]/)[0]; if (w1.length > 3 && n.includes(w1.slice(0, Math.max(4, w1.length - 2)))) s = Math.max(s, 4);
    const cw = cz.split(" ")[0]; if (cw.length > 3 && n.includes(cw.slice(0, Math.max(4, cw.length - 1)))) s = Math.max(s, 5);
    if (s > bs) { bs = s; best = c.key; }
  }
  return bs >= 4 ? best : null;
}
MODALS.fridgeEdit = m => {
  const x = m.id ? S.fridge.find(f => f.id === m.id) : null; const key = x && x.key;
  const qtyShow = x ? (key && CAT[key].pcG && CAT[key].pcName === "шт" ? r1(x.qty / CAT[key].pcG) : r1(x.qty)) : "";
  const unitShow = x ? (key && CAT[key].pcG && CAT[key].pcName === "шт" ? "шт" : (x.unit || unitOf(key))) : "г";
  const body = `${catNames()}<div class="fgrid"><label class="f">Продукт<input type="text" id="feName" list="catList" value="${esc(x ? x.name : "")}" placeholder="Начните вводить" data-on="feName"></label>
  <label class="f">Количество<input type="number" id="feQty" step="any" value="${qtyShow}"></label>
  <label class="f">Единица<select id="feUnit">${["г","мл","шт","кг","л"].map(u => `<option ${u === unitShow ? "selected" : ""}>${u}</option>`).join("")}</select></label>
  <label class="f">Место<select id="feLoc">${["холодильник","морозилка","шкаф"].map(u => `<option ${x && x.loc === u ? "selected" : ""}>${u}</option>`).join("")}</select></label>
  <label class="f">Категория<input type="text" id="feCat" value="${esc(x ? x.cat : "")}" placeholder="определится сама"></label>
  <label class="f">Дата покупки<input type="date" id="feBought" value="${x ? x.bought || "" : today()}"></label>
  <label class="f">Срок годности<input type="date" id="feExp" value="${x ? x.exp || "" : ""}"></label></div><p class="tiny muted">Если срок не указан, я подставлю типичный для продукта (для свежего мяса — 2 дня, для круп — год). Проверьте дату на упаковке.</p>`;
  return shell(x ? "Изменить продукт" : "Добавить продукт", body, `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="fridgeSave" data-id="${x ? x.id : ""}">Сохранить</button>`, "narrow");
};
function toBase(key, q, u) { q = +q || 0; if (u === "кг" || u === "л") return { q: q * 1000, unit: u === "л" ? "мл" : "г" }; if (u === "шт" && key && CAT[key].pcG) return { q: q * CAT[key].pcG, unit: unitOf(key) }; return { q, unit: u }; }
MODALS.useFridge = m => { const x = S.fridge.find(f => f.id === m.id); if (!x) return ""; const pc = x.key && CAT[x.key].pcG && CAT[x.key].pcName === "шт";
  return shell("Использовать: " + esc(x.name), `<p class="small muted">Сейчас: ${x.key ? fmtG(x.key, x.qty) : esc(x.qty + " " + x.unit)}</p><div class="fgrid"><label class="f">Сколько использовали<input type="number" id="useQ" step="any" value="${pc ? 1 : Math.min(100, x.qty)}"></label><label class="f">Единица<select id="useU">${(pc ? ["шт", "г"] : [x.unit || unitOf(x.key)]).map(u => `<option>${u}</option>`).join("")}</select></label></div>`,
  `<button class="btn ghost" data-a="useAll" data-id="${x.id}">Использовал всё</button><button class="btn" data-a="useOk" data-id="${x.id}">Списать</button>`, "narrow"); };
MODALS.delFridge = m => { const x = S.fridge.find(f => f.id === m.id); if (!x) return "";
  return shell("Убрать: " + esc(x.name), `<p>Почему убираете продукт? Это помогает понять, что часто портится.</p><div class="col">${[["used","Использовал полностью"],["spoiled","Испортился, выбросил"],["mistake","Ошибка ввода"]].map(([k, l], i) => `<label class="row"><input type="radio" name="delR" value="${k}" ${i === 0 ? "checked" : ""}> ${l}</label>`).join("")}</div>`,
  `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn wine" data-a="delFridgeOk" data-id="${x.id}">Убрать</button>`, "narrow"); };

// ---------- receipt / photo ----------
MODALS.receipt = m => {
  let body = "";
  if (m.busy) body = `<div class="empty">Шеф читает ${m.kind === "receipt" ? "чек" : "фото"}…</div>`;
  else if (m.rows) {
    body = `<p class="small muted">Проверьте распознанное: исправьте названия и количества, снимите галочки с лишнего.</p><div class="tbl-wrap"><table class="t"><thead><tr><th></th><th>Продукт</th><th>Кол-во</th><th>Ед.</th><th class="r">Цена, Kč</th><th>Каталог</th></tr></thead><tbody>${m.rows.map((r, i) => `<tr><td><input type="checkbox" data-on="rcRow" data-i="${i}" data-f="on" ${r.on ? "checked" : ""} aria-label="Добавить"></td><td><input type="text" data-on="rcRow" data-i="${i}" data-f="name" value="${esc(r.name)}"></td><td><input type="number" step="any" style="width:80px" data-on="rcRow" data-i="${i}" data-f="qty" value="${esc(r.qty)}"></td><td><select data-on="rcRow" data-i="${i}" data-f="unit">${["г","мл","шт","кг","л"].map(u => `<option ${u === r.unit ? "selected" : ""}>${u}</option>`).join("")}</select></td><td class="r"><input type="number" step="any" style="width:80px" data-on="rcRow" data-i="${i}" data-f="price" value="${esc(r.price ?? "")}"></td><td class="tiny">${r.key && CAT[r.key] ? esc(CAT[r.key].name) : '<span class="muted">не найден</span>'}</td></tr>`).join("")}</tbody></table></div>
    <div class="fgrid"><label class="f">Магазин<select id="rcStore">${STORES.concat(["Другой"]).map(s => `<option ${s === m.store ? "selected" : ""}>${s}</option>`).join("")}</select></label><label class="f">Сумма чека, Kč (в расходы)<input type="number" step="any" id="rcTotal" value="${m.total ?? ""}"></label><label class="f">Дата покупки<input type="date" id="rcDate" value="${m.date || today()}"></label></div>`;
  } else {
    body = `${m.err ? `<div class="note wine">${esc(m.err)}</div>` : ""}
    <div class="grid g2"><label class="drop" style="cursor:pointer"><b style="color:var(--ink)">Фото чека</b><br>Шеф прочитает позиции, количество и сумму<input type="file" accept="image/*" data-on="rcFile" data-k="receipt" hidden></label>
    <label class="drop" style="cursor:pointer"><b style="color:var(--ink)">Фото продуктов</b><br>Холодильник, полка или пакет с покупками<input type="file" accept="image/*" data-on="rcFile" data-k="photo" hidden></label></div>
    <label class="f">Или вставьте текст чека (например, из e-mail Rohlik/Košík)<textarea id="rcText" placeholder="ZAMPIONY BILE 400G   45,90&#10;SMETANA 33% 250ML   41,90"></textarea></label>
    ${SAMPLE ? "" : `<p class="tiny muted">Распознавание фото работает, когда приложение открыто на claude.ai с разрешением обращаться к Claude. Текст чека я разберу и без этого, но проще.</p>`}`;
  }
  const foot = m.rows ? `<button class="btn ghost" data-a="rcBack">Назад</button><button class="btn olive" data-a="rcSave">Добавить в холодильник</button>` : m.busy ? "" : `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="rcParseText">Разобрать текст</button>`;
  return shell("Чек или фото продуктов", body, foot);
};
function catalogBrief() { return Object.values(CAT).map(c => c.key + "=" + c.name + "/" + c.cz).join("; "); }
async function blobToDataURL(b) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); }); }
function dataURLToBlob(d) { const [h, b] = d.split(","); const mime = (h.match(/data:(.*?);/) || [])[1] || "image/jpeg"; const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
async function downscale(file, max = 1400, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise(res => cv.toBlob(res, "image/jpeg", q));
  } finally { URL.revokeObjectURL(url); }
}
async function storePhoto(blob, meta) {
  let ph = Object.assign({ id: uid(), date: today() }, meta);
  if (ASSETS) { try { const a = await ASSETS.upload(blob); ph.asset = a.id; } catch (e) { ASSETS = ASSETS; } }
  if (!ph.asset) { const small = await downscale(new File([blob], "p.jpg", { type: "image/jpeg" }), 560, 0.7); ph.data = await blobToDataURL(small); }
  S.photos.push(ph); save(); return ph;
}
const RC_SCHEMA = 'Верни только JSON: {"items":[{"name":"название продукта по-русски","qty":число,"unit":"г|мл|шт|кг|л","price":число или null,"key":"ключ из каталога или null"}],"total":число или null,"store":"Albert|Lidl|Kaufland|Tesco|BILLA|Rohlik|Košík|Другой|null"}. Не включай непищевые товары, пакеты и залоги.';
async function rcRun(input, images, kind) {
  M = Object.assign(M || { type: "receipt" }, { busy: true, kind, err: "" }); renderModal();
  try {
    const prompt = (kind === "receipt" ? "Это чек из чешского продуктового магазина. Извлеки пищевые позиции." : kind === "photo" ? "Это фото продуктов (холодильник, полка или покупки). Перечисли видимые продукты и оцени количество." : "Это текст чека из чешского магазина. Извлеки пищевые позиции.") +
      " Сопоставь каждую позицию с ключом каталога, если подходит. Каталог (ключ=русское/чешское название): " + catalogBrief() + ". " + RC_SCHEMA + (input ? "\n\nТекст:\n" + input : "");
    const out = await SAMPLE.json(prompt, images ? { images, modelTier: "default" } : { modelTier: "default" });
    const items = (out && out.items) || [];
    M.rows = items.map(i => ({ on: true, name: i.name || "", qty: i.qty ?? "", unit: ["г","мл","шт","кг","л"].includes(i.unit) ? i.unit : "шт", price: i.price ?? "", key: CAT[i.key] ? i.key : matchKey(i.name) }));
    M.total = out.total ?? (kind === "photo" ? "" : r1(M.rows.reduce((s, r) => s + (+r.price || 0), 0)));
    M.store = STORES.includes(out.store) ? out.store : (S.profile.stores[0] || "Lidl");
    if (!M.rows.length) { M.rows = null; M.err = "Не удалось найти продукты. Попробуйте более чёткое фото или вставьте текст."; }
  } catch (e) { M.rows = null; M.err = e && e.code === "not_granted" ? "Доступ к Claude не разрешён. Разрешите его в меню страницы или вставьте текст чека." : "Не получилось распознать: " + ((e && e.message) || "ошибка") + ". Попробуйте ещё раз или вставьте текст."; }
  M.busy = false; renderModal();
}
function localParse(text) {
  return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
    const price = (l.match(/(\d+[.,]\d{2})\s*(kč|czk)?\s*$/i) || [])[1];
    let rest = price ? l.slice(0, l.lastIndexOf(price)).trim() : l;
    const qm = rest.match(/(\d+[.,]?\d*)\s*(kg|g|ml|l|ks|шт|г|мл|кг|л)\b/i);
    let qty = "", unit = "шт";
    if (qm) { qty = +qm[1].replace(",", "."); const u = qm[2].toLowerCase(); unit = { kg: "кг", g: "г", ml: "мл", l: "л", ks: "шт" }[u] || u; }
    const name = rest.replace(qm ? qm[0] : "", "").replace(/\s{2,}/g, " ").trim();
    const key = matchKey(name);
    return { on: true, name: key ? CAT[key].name : name, qty: qty || 1, unit, price: price ? +price.replace(",", ".") : "", key };
  }).filter(r => r.name);
}

// ---------- shop ----------
MODALS.addShop = () => shell("Добавить в список", `${catNames()}<div class="fgrid"><label class="f">Продукт<input type="text" id="asName" list="catList" placeholder="Например: Шампиньоны"></label><label class="f">Количество<input type="number" step="any" id="asQty" value="1"></label><label class="f">Единица<select id="asUnit">${["шт","г","кг","мл","л","уп."].map(u => `<option>${u}</option>`).join("")}</select></label><label class="f">Магазин<select id="asStore">${STORES.map(s => `<option>${s}</option>`).join("")}</select></label></div>`, `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="addShopOk">Добавить</button>`, "narrow");
MODALS.buy = () => { const it = S.shop.items.filter(i => i.checked); const est = it.reduce((s, i) => s + (i.price || 0), 0);
  return shell("Покупка", `<p>${it.length} позиций перейдут в холодильник со сроками годности по типу продукта, а сумма — в расходы.</p><div class="small muted">${esc(it.map(i => i.name).join(", "))}</div><div class="fgrid"><label class="f">Фактическая сумма, Kč<input type="number" step="any" id="buyAmt" value="${Math.round(est)}"></label><label class="f">Магазин<select id="buyStore">${STORES.map(s => `<option ${s === (it[0] && it[0].store) ? "selected" : ""}>${s}</option>`).join("")}</select></label><label class="f">Дата<input type="date" id="buyDate" value="${today()}"></label></div>`,
  `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn olive" data-a="buyOk">Подтвердить</button>`, "narrow"); };
MODALS.exportShop = () => shell("Экспорт списка покупок", `<textarea id="expText" readonly style="min-height:260px;font-size:.85rem">${esc(shopText())}</textarea>${DL ? "" : `<p class="tiny muted">Скачивание файлов здесь недоступно — скопируйте текст.</p>`}`,
  `<button class="btn ghost" data-a="copyExp">Скопировать</button>${DL ? `<button class="btn ghost" data-a="dlShop" data-f="txt">Скачать .txt</button><button class="btn" data-a="dlShop" data-f="csv">Скачать .csv</button>` : ""}`);

// ---------- food / expense ----------
MODALS.addFood = () => shell("Добавить приём пищи", `<label class="f">Блюдо из книги (необязательно)<select id="afR"><option value="">— ввести вручную —</option>${allRecipes().map(r => `<option value="${r.id}">${esc(r.n)}</option>`).join("")}</select></label><div class="fgrid"><label class="f">Порций<input type="number" step="0.5" id="afP" value="1"></label><label class="f">Название<input type="text" id="afN" placeholder="Например: кофе с молоком"></label><label class="f">Ккал<input type="number" id="afK"></label><label class="f">Белки, г<input type="number" id="afPr"></label><label class="f">Жиры, г<input type="number" id="afF"></label><label class="f">Углеводы, г<input type="number" id="afC"></label></div>`,
  `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="addFoodOk">Добавить</button>`, "narrow");
MODALS.expense = () => shell("Добавить расход", `<div class="fgrid"><label class="f">Дата<input type="date" id="exD" value="${today()}"></label><label class="f">Магазин<select id="exS">${STORES.concat(["Рынок","Ресторан/доставка","Другое"]).map(s => `<option>${s}</option>`).join("")}</select></label><label class="f">Сумма, Kč<input type="number" step="any" id="exA"></label><label class="f">Комментарий<input type="text" id="exN"></label></div>`,
  `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="expenseOk">Сохранить</button>`, "narrow");
MODALS.confirm = m => shell(m.title, `<p>${m.text}</p>`, `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn wine" data-a="${m.ok}">${m.okLabel}</button>`, "narrow");

// ---------- custom recipe ----------
MODALS.newRecipe = m => shell("Свой рецепт", `<div class="fgrid"><label class="f">Название<input type="text" id="nrN"></label><label class="f">Кухня<select id="nrCu">${CUISINES.concat(["Другая"]).map(c => `<option>${c}</option>`).join("")}</select></label><label class="f">Приём пищи<select id="nrM"><option value="main">Обед/ужин</option><option value="breakfast">Завтрак</option><option value="snack">Перекус/десерт</option></select></label><label class="f">Порций<input type="number" id="nrS" value="2"></label><label class="f">Время, мин<input type="number" id="nrT" value="30"></label><label class="f">Сложность 1–5<input type="number" id="nrD" min="1" max="5" value="2"></label></div>
  <label class="f">Ингредиенты — по строке: продукт; количество; единица (г, мл, шт)<textarea id="nrI" placeholder="Шампиньоны; 400; г&#10;Сливки 33%; 200; мл&#10;Яйца; 2; шт"></textarea></label>
  <label class="f">Шаги — по строке<textarea id="nrSt"></textarea></label>
  <div class="fgrid"><label class="f">Оборудование<input type="text" id="nrE"></label><label class="f">Советы<input type="text" id="nrTip"></label><label class="f">Замены<input type="text" id="nrSub"></label></div>
  <p class="tiny muted">Продукты, найденные в каталоге, получат КБЖУ и стоимость автоматически. Для остальных можно указать КБЖУ на порцию:</p>
  <div class="fgrid"><label class="f">Ккал/порц.<input type="number" id="nrK"></label><label class="f">Б<input type="number" id="nrP"></label><label class="f">Ж<input type="number" id="nrF"></label><label class="f">У<input type="number" id="nrC"></label></div>`,
  `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn" data-a="newRecipeOk">Сохранить в книгу</button>`);
function buildCustom(o) {
  const ing = []; let allKeyed = true;
  for (const x of o.ing) {
    const unit = /^шт|pc|pcs/i.test(x.unit || "") ? "pc" : /мл|ml|л|l/i.test(x.unit || "") ? "ml" : "g";
    let q = +x.qty || 0; if (/^кг|kg|^л$|^l$/i.test(x.unit || "")) q *= 1000;
    const key = CAT[x.key] ? x.key : matchKey(x.name);
    if (key && q && !(unit === "pc" && !CAT[key].pcG)) ing.push([key, q, unit]); else { allKeyed = false; ing.push(["_" + uid(), q, x.unit || "", x.name]); }
  }
  const r = { id: "c_" + uid(), n: o.n || "Мой рецепт", cu: o.cu || "Другая", m: o.m || "main", s: Math.max(1, +o.s || 2), time: +o.time || 30, d: Math.min(5, Math.max(1, +o.d || 2)), col: ["#b07a48", "#302d28", "#6b7b3a"], taste: o.taste || "", ing, steps: (o.steps || []).map(s => typeof s === "string" ? { t: s } : s).filter(s => s.t), eq: o.eq || [], tips: o.tips || [], subs: o.subs || [], skills: [], custom: true };
  if (o.nut && +o.nut.kcal && !allKeyed) r.nut = { kcal: +o.nut.kcal, p: +o.nut.p || 0, f: +o.nut.f || 0, c: +o.nut.c || 0 };
  if (o.costPer != null && !allKeyed) r.costPer = +o.costPer;
  return r;
}

// ---------- wizard ----------
MODALS.wiz = m => { const [t, f] = WIZ[m.step]; return shell(t, `<div class="wiz-steps">${WIZ.map((_, i) => `<i class="${i <= m.step ? "on" : ""}"></i>`).join("")}</div>${f()}`,
  `${m.step ? `<button class="btn ghost" data-a="wizGo" data-v="${m.step - 1}">Назад</button>` : `<button class="btn ghost" data-a="closeModal">Позже</button>`}${m.step < WIZ.length - 1 ? `<button class="btn" data-a="wizGo" data-v="${m.step + 1}">Дальше</button>` : `<button class="btn copper" data-a="wizDone">Готово — составить первое меню</button>`}`, "", "Анкета · шаг " + (m.step + 1) + " из " + WIZ.length); };

// ---------- finish cooking ----------
MODALS.finish = m => { const r = rec(m.id); const ded = deductPlan(r, m.serv);
  return shell("Приготовлено: " + esc(r.n), `<div class="fgrid"><label class="f">Сколько порций приготовили<input type="number" id="fnServ" min="1" value="${m.serv}"></label><label class="f">Сколько порций съели сейчас<input type="number" step="0.5" id="fnEat" value="${Math.min(1, m.serv)}"></label></div>
  ${ded.length ? `<label class="row"><input type="checkbox" id="fnDed" checked> Списать продукты из холодильника</label><div class="small muted">${esc(ded.map(d => d.name + " — " + fmtMass(d.key, d.take)).join(" · "))}</div>` : `<p class="small muted">В холодильнике нет продуктов из этого рецепта для списания.</p>`}
  <label class="f">Заметка (необязательно)<input type="text" id="fnNote" placeholder="Что бы изменили в следующий раз"></label>`,
  `<button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn olive" data-a="finishOk">Сохранить</button>`, "narrow"); };
function recordCook(r, serv, eat, deduct, slot, note) {
  const first = !cookedCount(r.id); const n = nutr(r);
  const keys = r.ing.map(i => i[0]).filter(k => CAT[k]);
  const h = { id: uid(), date: today(), rid: r.id, name: r.n, serv, cost: cost(r) * serv, cooked: true, slot: slot && slot.s, keys, ask: first || Math.random() < 0.34, rating: 0, comment: note || "" };
  S.history.push(h);
  if (eat > 0) dayLog().items.push({ id: uid(), name: r.n + (eat !== 1 ? " ×" + eat : ""), kcal: n.kcal * eat, p: n.p * eat, f: n.f * eat, c: n.c * eat, fib: n.fib * eat, veg: n.veg * eat, cost: cost(r) * eat, keys, rid: r.id });
  if (deduct) for (const d of deductPlan(r, serv)) { const f = S.fridge.find(x => x.id === d.id); if (!f) continue; f.qty -= d.take; S.used.push({ date: today(), key: d.key, name: f.name, g: d.take }); if (f.qty <= 0.5) S.fridge = S.fridge.filter(x => x.id !== f.id); }
  for (const s of r.skills || []) S.skillXp[s] = (S.skillXp[s] || 0) + 1;
  if (slot && slot.w && S.plans[slot.w] && S.plans[slot.w].days[slot.d] && S.plans[slot.w].days[slot.d][slot.s]) S.plans[slot.w].days[slot.d][slot.s].done = true;
  if (S.used.length > 600) S.used = S.used.slice(-400);
  save();
}

// ---------- cooking mode ----------
function startCook(id, serv, slot) {
  const r = rec(id); if (!r) return; closeModal();
  C = { id, serv: +serv || r.s, stage: -1, slot, timers: C ? C.timers : [], checks: {} };
  try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(w => wakeLock = w).catch(() => {}); } catch (e) {}
  if (!cookTick) cookTick = setInterval(tickTimers, 1000);
  renderCook();
}
function endCook() { C = null; $("#cookRoot").innerHTML = ""; try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; clearInterval(cookTick); cookTick = null; }
function renderCook() {
  if (!C) return; const r = rec(C.id); const st = r.steps; const rows = ingRows(r, C.serv);
  const pct = ((C.stage + 1) / (st.length + 1)) * 100;
  let body;
  if (C.stage < 0) body = `<span class="eyebrow" style="color:var(--gold)">Этап 1 · mise en place</span><h2>Подготовьте всё до включения плиты</h2><div class="mise">${rows.map((x, i) => `<label><input type="checkbox" data-on="mise" data-i="${i}" ${C.checks[i] ? "checked" : ""}> <span style="flex:1">${esc(x.name)}</span><b class="num" style="font-weight:500">${esc(x.label)}</b></label>`).join("")}</div><p class="small" style="color:var(--on-dark-mute)">Оборудование: ${esc((r.eq || []).join(", "))}</p>${r.safety ? `<div class="tip">${esc(r.safety)}</div>` : ""}`;
  else { const s = st[C.stage]; body = `<span class="eyebrow" style="color:var(--gold)">Шаг ${C.stage + 1} из ${st.length}</span><p class="big">${esc(s.t)}</p><div class="row">${s.temp ? `<span class="pill t">🌡 ${esc(s.temp)}</span>` : ""}${s.min ? `<span class="pill">${s.min} мин</span><button class="btn copper" data-a="addTimer" data-m="${s.min}" data-l="Шаг ${C.stage + 1}">Запустить таймер ${s.min} мин</button>` : ""}</div>${s.cue ? `<div class="cue"><b>Признак готовности:</b> ${esc(s.cue)}</div>` : ""}${C.stage === st.length - 1 && (r.tips || []).length ? `<div class="tip"><b>Совет шефа:</b> ${esc(r.tips[0])}</div>` : ""}${C.stage === 0 && (r.tips || [])[1] ? `<div class="tip"><b>Совет шефа:</b> ${esc(r.tips[1])}</div>` : ""}`; }
  $("#cookRoot").innerHTML = `<div class="cook" role="dialog" aria-modal="true" aria-label="Режим готовки"><div class="ch"><div class="col" style="gap:2px"><span class="eyebrow" style="color:var(--gold)">Режим готовки · ${C.serv} порц.</span><h3>${esc(r.n)}</h3></div><div class="row"><button class="btn sm ghost" data-a="addTimer" data-m="5" data-l="Свой таймер">+ таймер 5 мин</button><button class="btn sm ghost" data-a="endCook">Выйти</button></div></div><div class="prog"><i style="width:${pct}%"></i></div>
  <div class="cb">${body}<div class="timers" id="timers"></div></div>
  <div class="cf"><button class="btn ghost" data-a="cookStep" data-v="-1" ${C.stage < 0 ? "disabled" : ""}>← Назад</button>${C.stage < st.length - 1 ? `<button class="btn copper" data-a="cookStep" data-v="1">${C.stage < 0 ? "Начать готовить" : "Следующий шаг"} →</button>` : `<button class="btn olive" data-a="cookDone">Готово</button>`}</div></div>`;
  renderTimers();
}
const fmtT = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + pad(m) : m) + ":" + pad(x); };
function renderTimers() { const el = $("#timers"); if (!el || !C) return; el.innerHTML = C.timers.map(t => `<div class="timer ${t.ring ? "ring" : ""}"><div class="col" style="gap:0"><span class="tiny" style="color:var(--on-dark-mute)">${esc(t.l)}</span><span class="tv">${fmtT(t.left)}</span></div>${t.ring ? `<button class="btn xs copper" data-a="tmr" data-id="${t.id}" data-op="del">Стоп</button>` : `<button class="btn xs ghost" data-a="tmr" data-id="${t.id}" data-op="toggle">${t.run ? "Пауза" : "Пуск"}</button><button class="btn xs ghost" data-a="tmr" data-id="${t.id}" data-op="plus">+1</button><button class="btn xs ghost" data-a="tmr" data-id="${t.id}" data-op="del" aria-label="Удалить таймер">✕</button>`}</div>`).join(""); }
function tickTimers() {
  if (!C) return; let ring = false;
  for (const t of C.timers) if (t.run) { t.left = Math.max(0, (t.end - Date.now()) / 1000); if (t.left <= 0) { t.run = false; t.ring = true; ring = true; } }
  if (C.timers.some(t => t.ring) && Date.now() % 2000 < 1000) beep();
  renderTimers(); if (ring) toast("Таймер сработал");
}
function beep() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.25); } catch (e) {} }

// ---------- chat ----------
function chatContext() {
  const p = S.profile; const tm = todayMenu();
  return "Ты — персональный шеф-повар и нутрициолог пользователя (Personal Chef OS). Отвечай по-русски, тепло и профессионально, конкретно, с точными граммовками. Пользователь живёт в Чехии (магазины Albert, Lidl, Kaufland, Tesco, BILLA, Rohlik, Košík). Не назначай медицинских диет. Не придумывай реальные цены магазинов — если называешь цены, помечай их как оценку. Никогда не оформляй заказы.\n" +
    "Профиль: любимые вкусы — " + (p.flavors.join(", ") || "не указаны") + "; любимые кухни — " + (p.cuisines.join(", ") || "не указаны") + "; любимые продукты — " + (p.likes || "—") + "; не любит — " + (p.dislikes || "—") + "; аллергии — " + (p.allergies.map(a => ALLERGENS[a]).join(", ") || "нет") + "; ограничения — " + (p.diet.join(", ") || "нет") + "; цель — " + p.goal + "; бюджет в неделю — " + p.budgetWeek + " Kč (курс " + p.eurRate + " Kč/€); время в будни до " + p.timeWeekday + " мин; оборудование — " + (p.equipment.join(", ") || "не указано") + ".\n" +
    "Дома есть: " + (S.fridge.map(f => f.name + " " + (f.key ? fmtG(f.key, f.qty) : f.qty + f.unit) + (f.exp ? " (до " + f.exp + ")" : "")).join("; ") || "ничего не записано") + ".\n" +
    "Меню на сегодня: " + (tm ? slotsOn().map(s => tm[s] && rec(tm[s].rid) ? MEALS[s] + ": " + rec(tm[s].rid).n : "").filter(Boolean).join("; ") : "нет") + ".\n" +
    "Рецепты в книге пользователя: " + allRecipes().map(r => r.n).join("; ") + ".\n" +
    "Высоко оценённые блюда: " + ([...new Set(S.history.filter(h => h.rating >= 4).map(h => h.name))].join(", ") || "пока нет") + ".";
}
async function sendChat(text) {
  text = (text || "").trim(); if (!text) return;
  S.chat.push({ role: "user", content: text }); if (S.chat.length > 40) S.chat = S.chat.slice(-40); save(); refresh();
  const live = () => $("#chatLive");
  if (!SAMPLE) { S.chat.push({ role: "assistant", content: offlineAnswer(text) }); save(); refresh(); return; }
  if (live()) live().innerHTML = `<div class="msg ai">Шеф думает…</div>`;
  const hist = S.chat.slice(-12).map(m => ({ role: m.role, content: m.content }));
  hist[hist.length - 1] = { role: "user", content: chatContext() + "\n\nСообщение пользователя: " + text };
  while (hist.length && hist[0].role !== "user") hist.shift();
  try {
    const res = await SAMPLE(hist, { cache: false, onText: ({ text: t }) => { const el = live(); if (el) { el.innerHTML = `<div class="msg ai">${esc(t)}</div>`; const b = $("#chatBox"); if (b) b.scrollTop = b.scrollHeight; } } });
    S.chat.push({ role: "assistant", content: res.text });
  } catch (e) { S.chat.push({ role: "assistant", content: e && e.code === "not_granted" ? "Доступ к Claude для этой страницы не разрешён. Разрешите его в меню страницы, и я смогу отвечать." : e && e.code === "rate_limited" ? "Слишком много запросов подряд. Подождите минуту и спросите снова." : "Не получилось ответить: " + ((e && e.message) || "ошибка") + "." }); }
  save(); refresh();
}
function offlineAnswer(t) {
  const s = t.toLowerCase();
  if (/удиви/.test(s)) { const r = surprise(); return "Предлагаю «" + r.n + "» (" + r.cu + "). " + (r.taste || "") + " Время: " + r.time + " мин, порция ≈ " + Math.round(cost(r)) + " Kč. Откройте рецепт в книге."; }
  const cu = CUISINES.find(c => s.includes(c.toLowerCase().slice(0, 5)));
  if (cu) { const rs = allRecipes().filter(r => r.cu === cu && !hardBlock(r)); return rs.length ? "Из кухни «" + cu + "» в вашей книге: " + rs.map(r => r.n + " (" + r.time + " мин)").join("; ") + "." : "В книге пока нет рецептов кухни «" + cu + "»."; }
  if (/меню/.test(s)) return "Меню на неделю собирается в разделе «Меню на неделю» кнопкой «Пересобрать»: я учту бюджет из профиля и подберу блюда.";
  const keys = Object.values(CAT).filter(c => s.includes(normalize(c.name).split(" ")[0].slice(0, 5))).map(c => c.key);
  if (keys.length) { const rs = allRecipes().map(r => ({ r, h: r.ing.filter(i => keys.includes(i[0])).length })).filter(x => x.h && !hardBlock(x.r)).sort((a, b) => b.h - a.h).slice(0, 3); if (rs.length) return "Из этих продуктов можно приготовить: " + rs.map(x => x.r.n + " (" + x.r.time + " мин)").join("; ") + ". Все рецепты есть в книге."; }
  return "Без доступа к Claude я отвечаю только по книге рецептов. Напишите продукты или кухню, например «курица и сливки» или «итальянское».";
}

// ---------- actions ----------
const A = {
  go: d => { route = d.r; location.hash = d.r; closeModal(); refresh(); window.scrollTo(0, 0); },
  moreNav: () => openModal({ type: "more" }),
  ovClick: (d, el, ev) => { if (ev.target === el) closeModal(); },
  closeModal: () => closeModal(),
  genPlan: d => { const ws = d.w || weekStart(); generatePlan(ws, !!d.keep); save(); refresh(); toast("Меню на неделю составлено. Проверьте и утвердите."); },
  genNext: () => { const ws = addDays(weekStart(), 7); generatePlan(ws); S.ui.weekOff = 1; save(); A.go({ r: "menu" }); toast("Меню на следующую неделю готово."); },
  replan: () => { generatePlan(weekStart(), true); save(); A.go({ r: "menu" }); toast("Меню пересобрано с учётом профиля."); },
  approve: d => { const p = S.plans[d.w]; if (!p) return; p.status = "approved"; if (d.w === weekStart()) buildShop(); save(); refresh(); toast(d.w === weekStart() ? "Меню утверждено. Список покупок собран." : "Меню утверждено."); },
  buildShop: () => { if (!curPlan()) { toast("Сначала составьте меню на эту неделю."); return; } buildShop(); save(); refresh(); toast("Список покупок собран: одинаковые продукты объединены, домашние запасы вычтены."); },
  weekNav: d => { S.ui.weekOff = +d.o; refresh(); },
  pickSlot: d => openModal({ type: "pick", w: d.w, d: d.d, s: d.s, f: "all" }),
  pickF: d => { M.f = d.f; renderModal(); },
  setSlot: d => { const p = ensurePlan(M.w); p.days[+M.d][M.s] = { rid: d.id, serv: +S.profile.people || 1 }; save(); closeModal(); refresh(); toast("Блюдо добавлено в меню."); },
  clearSlot: () => { const p = S.plans[M.w]; if (p) p.days[+M.d][M.s] = null; save(); closeModal(); refresh(); },
  quickSwap: d => { const c = candidates(d.s, +d.d, { quick: true }).sort((a, b) => a.time - b.time); if (!c.length) { toast("Нет подходящих рецептов до 20 минут."); return; } const cur = S.plans[d.w].days[+d.d][d.s]; const pick = c.find(r => !cur || r.id !== cur.rid) || c[0]; S.plans[d.w].days[+d.d][d.s] = { rid: pick.id, serv: cur ? cur.serv : +S.profile.people || 1 }; save(); refresh(); toast("Быстрый вариант: " + pick.n + ", " + pick.time + " мин."); },
  reroll: d => { const cur = S.plans[d.w].days[+d.d][d.s]; const used = new Set(); S.plans[d.w].days.forEach(x => Object.values(x).forEach(y => y && used.add(y.rid))); const c = candidates(d.s, +d.d).filter(r => !used.has(r.id)); const list = c.length ? c : candidates(d.s, +d.d); const pick = list[Math.floor(Math.random() * list.length)]; if (!pick) return; S.plans[d.w].days[+d.d][d.s] = { rid: pick.id, serv: cur ? cur.serv : 1 }; save(); refresh(); },
  openRecipe: d => openModal({ type: "recipe", id: d.id, serv: +d.serv || null }),
  mServ: d => { const r = rec(M.id); M.serv = Math.max(1, Math.min(20, (M.serv || r.s) + +d.v)); renderModal(); },
  cook: d => startCook(d.id, d.serv, d.w ? { w: d.w, d: +d.d, s: d.s } : null),
  toTonight: d => { const ws = weekStart(); const p = ensurePlan(ws); const slot = S.profile.meals.dinner ? "dinner" : "lunch"; p.days[dayIdx()][slot] = { rid: d.id, serv: +S.profile.people || 1 }; const r = rec(d.id); const added = addMissing(r, +S.profile.people || 1); save(); closeModal(); refresh(); toast("«" + r.n + "» — " + MEALS[slot].toLowerCase() + " сегодня." + (added ? " Недостающее (" + added + ") в списке покупок." : " Всё нужное есть дома.")); },
  surprise: () => { const r = surprise(); if (r) openModal({ type: "recipe", id: r.id }); },
  addToMenu: d => openModal({ type: "toMenu", id: d.id }),
  toMenuOk: d => { const [w, di] = val("tmDay").split("|").map(Number); const ws = addDays(weekStart(), w * 7); const p = ensurePlan(ws); p.days[di][val("tmSlot")] = { rid: d.id, serv: Math.max(1, +val("tmServ") || 1) }; save(); closeModal(); refresh(); toast("Добавлено в меню."); },
  recipeToShop: d => { const n = addMissing(rec(d.id), +d.serv); save(); refresh(); toast(n ? "Добавлено в покупки: " + n + " поз." : "Всё нужное уже есть дома или в списке."); },
  delRecipe: d => { S.custom = S.custom.filter(r => r.id !== d.id); save(); closeModal(); refresh(); toast("Рецепт удалён."); },
  rate: d => { const h = S.history.find(x => x.id === d.h); if (!h) return; h.rating = +d.v; h.ask = false; save(); refresh(); toast("Спасибо! Учту в будущих меню."); },
  skipRate: d => { const h = S.history.find(x => x.id === d.h); if (h) h.ask = false; save(); refresh(); },
  delHist: d => { S.history = S.history.filter(h => h.id !== d.id); save(); refresh(); },
  wizard: () => openModal({ type: "wiz", step: S.profile.step && S.profile.step < WIZ.length ? S.profile.step : 0 }),
  wizGo: d => { M.step = +d.v; S.profile.step = M.step; save(); renderModal(); },
  wizDone: () => { S.profile.done = true; S.profile.step = 0; generatePlan(weekStart(), true); buildShop(); save(); closeModal(); A.go({ r: "menu" }); toast("Первое меню на 7 дней готово, список покупок собран."); },
  togglePf: d => { const a = S.profile[d.f]; const i = a.indexOf(d.v); i >= 0 ? a.splice(i, 1) : a.push(d.v); save(); refresh(); },
  setPf: d => { S.profile[d.f] = d.v; save(); refresh(); },
  toggleMeal: d => { S.profile.meals[d.k] = !S.profile.meals[d.k]; save(); refresh(); },
  addShop: () => openModal({ type: "addShop" }),
  addShopOk: () => { const name = val("asName").trim(); if (!name) return toast("Введите продукт."); const key = matchKey(name); const q = +val("asQty") || 1; const u = val("asUnit"); const store = val("asStore");
    if (key && u !== "уп.") { const b = toBase(key, q, u); const it = makeItem(key, b.q, b.q, 0); it.manual = true; it.store = store; it.storeSet = true; S.shop.items.push(it); }
    else if (key) { const c = CAT[key]; S.shop.items.push({ id: uid(), key, name: c.name, buyG: q * c.packG, packs: q, price: q * c.price, qtyLabel: q + " уп. × " + fmtMass(key, c.packG), store, storeSet: true, dishes: [], checked: false, manual: true }); }
    else S.shop.items.push({ id: uid(), key: null, name, qtyLabel: q + " " + u, price: 0, store, dishes: [], checked: false, manual: true });
    save(); closeModal(); refresh(); },
  addShopKey: d => { const c = CAT[d.k]; const it = makeItem(d.k, c.loose ? (c.pcG && c.pcG < 1000 ? c.pcG : 500) : c.packG, 0, 0); it.manual = true; S.shop.items.push(it); save(); refresh(); toast(c.name + " — в списке."); },
  delShop: d => { S.shop.items = S.shop.items.filter(i => i.id !== d.id); save(); refresh(); },
  clearShop: () => openModal({ type: "confirm", title: "Очистить список?", text: "Все позиции будут удалены. Меню и холодильник не изменятся.", ok: "clearShopOk", okLabel: "Очистить" }),
  clearShopOk: () => { S.shop.items = []; save(); closeModal(); refresh(); },
  buyChecked: () => openModal({ type: "buy" }),
  buyOk: () => { const it = S.shop.items.filter(i => i.checked); const date = val("buyDate") || today(); const store = val("buyStore"); const amt = +val("buyAmt") || 0;
    for (const i of it) { if (i.key) { const c = CAT[i.key]; S.fridge.push({ id: uid(), key: i.key, name: c.name, qty: i.buyG, init: i.buyG, unit: unitOf(i.key), cat: c.cat, loc: c.loc, bought: date, exp: addDays(date, c.shelf) }); } else S.fridge.push({ id: uid(), key: null, name: i.name, qty: 1, init: 1, unit: "уп.", cat: "Другое", loc: "холодильник", bought: date, exp: addDays(date, 7) }); }
    if (amt) S.expenses.push({ id: uid(), date, store, amount: amt, note: it.length + " поз. из списка покупок", src: "shop" });
    S.shop.items = S.shop.items.filter(i => !i.checked); save(); closeModal(); refresh(); toast("Продукты в холодильнике, расход " + Math.round(amt) + " Kč записан."); },
  exportShop: () => openModal({ type: "exportShop" }),
  copyExp: async () => { const el = $("#expText"); try { await navigator.clipboard.writeText(el.value); toast("Скопировано."); } catch (e) { el.focus(); el.select(); toast("Текст выделен — скопируйте сочетанием клавиш."); } },
  dlShop: async d => { try { await DL.save({ filename: "spisok-pokupok-" + today() + "." + d.f, data: d.f === "csv" ? "﻿" + shopCSV() : shopText() }); toast("Файл сохранён."); } catch (e) { toast(e && e.code === "cancelled" ? "Сохранение отменено." : "Не удалось сохранить файл."); } },
  addFridge: () => openModal({ type: "fridgeEdit" }),
  editFridge: d => openModal({ type: "fridgeEdit", id: d.id }),
  fridgeSave: d => { const name = val("feName").trim(); if (!name) return toast("Введите название продукта."); const key = matchKey(name); const b = toBase(key, val("feQty"), val("feUnit")); if (!b.q) return toast("Укажите количество.");
    const bought = val("feBought") || today(); const c = key && CAT[key];
    const o = { key, name: c && normalize(c.name) === normalize(name) ? c.name : name, qty: b.q, unit: key ? unitOf(key) : b.unit, loc: val("feLoc"), cat: val("feCat") || (c ? c.cat : "Другое"), bought, exp: val("feExp") || (c ? addDays(bought, c.shelf) : addDays(bought, 7)) };
    if (d.id) { const x = S.fridge.find(f => f.id === d.id); const wasInit = x.init; Object.assign(x, o); x.demo = false; x.init = Math.max(wasInit || 0, o.qty); } else S.fridge.push(Object.assign({ id: uid(), init: o.qty }, o));
    save(); closeModal(); refresh(); toast("Сохранено."); },
  useFridge: d => openModal({ type: "useFridge", id: d.id }),
  useOk: d => { const x = S.fridge.find(f => f.id === d.id); let q = +val("useQ") || 0; if (val("useU") === "шт" && x.key && CAT[x.key].pcG) q *= CAT[x.key].pcG; x.qty -= q; S.used.push({ date: today(), key: x.key, name: x.name, g: q }); if (x.qty <= 0.5) S.fridge = S.fridge.filter(f => f.id !== x.id); save(); closeModal(); refresh(); },
  useAll: d => { const x = S.fridge.find(f => f.id === d.id); S.used.push({ date: today(), key: x.key, name: x.name, g: x.qty }); S.fridge = S.fridge.filter(f => f.id !== d.id); save(); closeModal(); refresh(); },
  delFridge: d => openModal({ type: "delFridge", id: d.id }),
  delFridgeOk: d => { const x = S.fridge.find(f => f.id === d.id); const reason = (document.querySelector('input[name="delR"]:checked') || {}).value || "used"; if (reason !== "mistake" && !x.demo) S.waste.push({ date: today(), key: x.key, name: x.name, qty: x.qty, reason }); if (reason === "used") S.used.push({ date: today(), key: x.key, name: x.name, g: x.qty }); S.fridge = S.fridge.filter(f => f.id !== d.id); save(); closeModal(); refresh(); },
  clearDemo: () => { S.fridge = S.fridge.filter(f => !f.demo); save(); refresh(); toast("Примеры удалены."); },
  fridgeLoc: d => { S.ui.fridgeLoc = d.l; refresh(); },
  receipt: () => openModal({ type: "receipt" }),
  rcBack: () => { M.rows = null; renderModal(); },
  rcParseText: () => { const t = val("rcText").trim(); if (!t) return toast("Вставьте текст чека или выберите фото."); if (SAMPLE) rcRun(t, null, "text"); else { M.rows = localParse(t); M.total = r1(M.rows.reduce((s, r) => s + (+r.price || 0), 0)); M.store = S.profile.stores[0] || "Lidl"; renderModal(); } },
  rcSave: () => { const kind = M.kind; const date = val("rcDate") || today(); const store = val("rcStore"); const total = +val("rcTotal") || 0; let n = 0;
    for (const r of M.rows) { if (!r.on || !r.name) continue; const key = r.key && CAT[r.key] ? r.key : matchKey(r.name); const b = toBase(key, r.qty || 1, r.unit); const c = key && CAT[key];
      S.fridge.push({ id: uid(), key, name: c ? c.name : r.name, qty: b.q, init: b.q, unit: key ? unitOf(key) : b.unit, cat: c ? c.cat : "Другое", loc: c ? c.loc : "холодильник", bought: date, exp: addDays(date, c ? c.shelf : 7) }); n++; }
    if (total && kind !== "photo") S.expenses.push({ id: uid(), date, store, amount: total, note: "Чек: " + n + " поз.", src: "receipt" });
    save(); closeModal(); refresh(); toast("Добавлено продуктов: " + n + (total && kind !== "photo" ? ", расход записан." : ".")); },
  newRecipe: () => openModal({ type: "newRecipe" }),
  newRecipeOk: () => { const n = val("nrN").trim(); if (!n) return toast("Введите название."); const ing = val("nrI").split("\n").map(l => l.split(";").map(s => s.trim())).filter(a => a[0]).map(([name, qty, unit]) => ({ name, qty: +String(qty || "").replace(",", ".") || 0, unit: unit || "г" }));
    const r = buildCustom({ n, cu: val("nrCu"), m: val("nrM"), s: val("nrS"), time: val("nrT"), d: val("nrD"), ing, steps: val("nrSt").split("\n").map(s => s.trim()).filter(Boolean), eq: val("nrE") ? [val("nrE")] : [], tips: val("nrTip") ? [val("nrTip")] : [], subs: val("nrSub") ? [val("nrSub")] : [], nut: { kcal: val("nrK"), p: val("nrP"), f: val("nrF"), c: val("nrC") } });
    S.custom.push(r); save(); closeModal(); refresh(); openModal({ type: "recipe", id: r.id }); },
  rtab: d => { S.ui.rtab = d.t; refresh(); },
  cuisineGo: d => { S.ui.rcu = d.c; S.ui.rtab = "book"; A.go({ r: "recipes" }); },
  critique: async d => { const ph = S.photos.find(p => p.id === d.id); const r = rec(ph.rid); if (!SAMPLE) return toast("Оценка подачи работает с доступом к Claude на claude.ai.");
    try { const lim = await SAMPLE.limits(); if (!lim.images) return toast("Отправка изображений Claude здесь недоступна.");
      toast("Шеф смотрит на подачу…"); const blob = ph.asset ? await (await fetch("/_blob/" + ph.asset)).blob() : dataURLToBlob(ph.data);
      const res = await SAMPLE("Ты шеф-повар. На фото — блюдо пользователя «" + r.n + "» (" + r.cu + "). Задуманная подача: " + (r.taste || "") + ". Сравни с ресторанной подачей этого блюда: что получилось хорошо, и 3 конкретных способа улучшить сервировку (тарелка, высота, цвет, соус, гарнир). Если на фото не еда — скажи об этом. Коротко, по-русски, без markdown.", { images: [blob] });
      ph.critique = res.text; save(); refresh(); } catch (e) { toast(e && e.code === "not_granted" ? "Доступ к Claude не разрешён." : "Не получилось оценить фото."); } },
  delPhoto: async d => { const ph = S.photos.find(p => p.id === d.id); if (ph && ph.asset && ASSETS) { try { await ASSETS.delete(ph.asset); } catch (e) {} } S.photos = S.photos.filter(p => p.id !== d.id); save(); refresh(); },
  addFood: () => openModal({ type: "addFood" }),
  addFoodOk: () => { const rid = val("afR"); const k = +val("afP") || 1; if (rid) { const r = rec(rid); const n = nutr(r); dayLog().items.push({ id: uid(), name: r.n + (k !== 1 ? " ×" + k : ""), kcal: n.kcal * k, p: n.p * k, f: n.f * k, c: n.c * k, fib: n.fib * k, veg: n.veg * k, keys: r.ing.map(i => i[0]).filter(x => CAT[x]), rid }); }
    else { const nm = val("afN").trim(); if (!nm) return toast("Выберите блюдо или введите название."); dayLog().items.push({ id: uid(), name: nm, kcal: (+val("afK") || 0) * k, p: (+val("afPr") || 0) * k, f: (+val("afF") || 0) * k, c: (+val("afC") || 0) * k, fib: 0, veg: 0 }); }
    save(); closeModal(); refresh(); },
  delFood: d => { const L = dayLog(); L.items = L.items.filter(i => i.id !== d.id); save(); refresh(); },
  water: d => { const L = dayLog(); L.water = Math.max(0, L.water + +d.v); save(); refresh(); },
  addExpense: () => openModal({ type: "expense" }),
  expenseOk: () => { const a = +val("exA"); if (!a) return toast("Укажите сумму."); S.expenses.push({ id: uid(), date: val("exD") || today(), store: val("exS"), amount: a, note: val("exN"), src: "manual" }); save(); closeModal(); refresh(); },
  delExp: d => { S.expenses = S.expenses.filter(e => e.id !== d.id); save(); refresh(); },
  exportExp: async () => { const csv = "﻿" + [["Дата","Магазин","Сумма Kč","Комментарий"]].concat(S.expenses.map(e => [e.date, e.store, e.amount, e.note || ""])).map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\n");
    if (DL) { try { await DL.save({ filename: "rashody-pitanie-" + today() + ".csv", data: csv }); toast("Файл сохранён."); } catch (e) { toast("Сохранение отменено."); } } else { try { await navigator.clipboard.writeText(csv); toast("CSV скопирован в буфер обмена."); } catch (e) { toast("Скачивание недоступно на этой странице."); } } },
  clearChat: () => { S.chat = []; save(); refresh(); },
  quickAsk: d => sendChat(d.q),
  saveChatRecipe: async d => { const m = S.chat[+d.i]; if (!SAMPLE) return; toast("Сохраняю рецепт…");
    try { const o = await SAMPLE.json("Преобразуй рецепт из текста в JSON по схеме: {\"n\":\"название\",\"cu\":\"кухня по-русски\",\"m\":\"main|breakfast|snack\",\"s\":порции,\"time\":минуты,\"d\":сложность 1-5,\"taste\":\"описание вкуса\",\"ing\":[{\"name\":\"продукт\",\"qty\":число,\"unit\":\"г|мл|шт\",\"key\":\"ключ каталога или null\"}],\"steps\":[{\"t\":\"шаг\",\"min\":минуты или 0,\"temp\":\"температура или пусто\",\"cue\":\"признак готовности\"}],\"eq\":[],\"tips\":[],\"subs\":[],\"nut\":{\"kcal\":на порцию,\"p\":,\"f\":,\"c\":},\"costPer\":оценка Kč на порцию}. Если в тексте несколько рецептов — возьми первый. Каталог: " + catalogBrief() + "\n\nТекст:\n" + m.content);
      const r = buildCustom(o); S.custom.push(r); save(); refresh(); openModal({ type: "recipe", id: r.id }); toast("Рецепт сохранён в книгу."); } catch (e) { toast("Не получилось разобрать рецепт."); } },
  skillLv: d => { S.skills[d.k] = +d.v; save(); refresh(); },
  techDone: d => { const i = S.techDone.indexOf(d.id); i >= 0 ? S.techDone.splice(i, 1) : S.techDone.push(d.id); save(); refresh(); },
  copyReport: async () => { const t = $("#view").innerText; try { await navigator.clipboard.writeText(t); toast("Отчёт скопирован."); } catch (e) { toast("Копирование недоступно — выделите текст вручную."); } },
  backup: async () => { const data = JSON.stringify(S, null, 1); if (DL) { try { await DL.save({ filename: "personal-chef-os-" + today() + ".json", data }); toast("Копия сохранена."); } catch (e) { toast("Сохранение отменено."); } } else toast("Скачивание недоступно на этой странице."); },
  resetAll: () => openModal({ type: "confirm", title: "Сбросить все данные?", text: "Профиль, меню, холодильник, история и расходы будут удалены. Это нельзя отменить.", ok: "resetOk", okLabel: "Сбросить" }),
  resetOk: () => { S = defaultState(); seed(); save(); closeModal(); A.go({ r: "kitchen" }); },
  addTimer: d => { if (!C) return; const s = +d.m * 60; C.timers.push({ id: uid(), l: d.l, total: s, left: s, end: Date.now() + s * 1000, run: true }); beep(); renderTimers(); },
  tmr: d => { const t = C.timers.find(x => x.id === d.id); if (!t) return; if (d.op === "del") C.timers = C.timers.filter(x => x.id !== d.id); else if (d.op === "toggle") { if (t.run) { t.run = false; } else { t.run = true; t.end = Date.now() + t.left * 1000; } } else if (d.op === "plus") { t.left += 60; t.end += 60000; } renderTimers(); },
  cookStep: d => { C.stage = Math.max(-1, Math.min(rec(C.id).steps.length - 1, C.stage + +d.v)); renderCook(); $(".cook .cb") && ($(".cook .cb").scrollTop = 0); },
  cookDone: () => { const c = C; endCook(); openModal({ type: "finish", id: c.id, serv: c.serv, slot: c.slot }); },
  endCook: () => endCook(),
  finishOk: () => { const r = rec(M.id); const serv = Math.max(1, +val("fnServ") || M.serv); const eat = +val("fnEat") || 0; const ded = $("#fnDed") ? $("#fnDed").checked : false; recordCook(r, serv, eat, ded, M.slot, val("fnNote")); closeModal(); refresh(); toast("Записано: «" + r.n + "». Оцените блюдо на главной, когда попробуете."); },
};
MODALS.more = () => shell("Разделы", `<div class="col">${ROUTES.filter(r => r[0] !== "sep" && !MOBILE.includes(r[0])).map(r => `<button class="btn ghost" style="justify-content:flex-start" data-a="go" data-r="${r[0]}">${ico(r[0])} ${r[1]}</button>`).join("")}</div>`, "", "narrow");
function addMissing(r, serv) {
  let n = 0;
  for (const x of ingRows(r, serv)) { if (!x.key || STAPLES.includes(x.key)) continue; const rest = x.g - fridgeG(x.key); if (rest <= 1) continue;
    const ex = S.shop.items.find(i => i.key === x.key);
    if (ex) { if (!(ex.dishes || []).includes(r.n)) { const it = makeItem(x.key, (ex.needG || 0) + rest, (ex.needG || 0) + rest, ex.haveG); Object.assign(ex, { buyG: it.buyG, packs: it.packs, price: it.price, qtyLabel: it.qtyLabel, needG: it.needG }); ex.dishes = (ex.dishes || []).concat(r.n); n++; } }
    else { const it = makeItem(x.key, rest, x.g, fridgeG(x.key)); it.dishes = [r.n]; it.manual = true; S.shop.items.push(it); n++; } }
  return n;
}

// ---------- events ----------
document.addEventListener("click", ev => { const el = ev.target.closest("[data-a]"); if (!el) return; const a = A[el.dataset.a]; if (!a) return; if (el.dataset.a === "ovClick" && ev.target !== el) return; ev.preventDefault(); a(el.dataset, el, ev); });
document.addEventListener("submit", ev => { const f = ev.target.closest("[data-form]"); if (!f) return; ev.preventDefault(); if (f.dataset.form === "chat") { const i = $("#chatIn"); const t = i.value; i.value = ""; sendChat(t); } });
const ON = {
  shopCheck: el => { const i = S.shop.items.find(x => x.id === el.dataset.id); if (i) i.checked = el.checked; save(); refresh(); },
  shopStore: el => { const i = S.shop.items.find(x => x.id === el.dataset.id); if (i) { i.store = el.value; i.storeSet = true; } save(); refresh(); },
  shopQ: el => { S.ui.shopQ = el.value; refresh(); },
  rq: el => { S.ui.rq = el.value; refresh(); }, rcu: el => { S.ui.rcu = el.value; refresh(); }, rm: el => { S.ui.rm = el.value; refresh(); }, rt: el => { S.ui.rt = el.value; refresh(); },
  pickQ: el => { M.q = el.value; renderModal(); const i = $("#pickQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  pf: (el, ev) => { S.profile[el.dataset.f] = el.value; save(); if (ev.type === "change" && el.tagName === "SELECT") refresh(); },
  repDate: el => { S.ui.repDate = el.value; refresh(); },
  mise: el => { C.checks[el.dataset.i] = el.checked; },
  rcRow: el => { const r = M.rows[+el.dataset.i]; const f = el.dataset.f; r[f] = f === "on" ? el.checked : el.value; if (f === "name") r.key = matchKey(el.value); },
  feName: () => {},
  rcFile: async el => { const file = el.files && el.files[0]; if (!file) return; const kind = el.dataset.k; const blob = await downscale(file, 1600, 0.85);
    if (kind === "receipt") storePhoto(blob, { kind: "receipt" });
    if (!SAMPLE) { M.err = "Распознавание фото работает с доступом к Claude на claude.ai. " + (kind === "receipt" ? "Фото чека сохранено; вставьте текст чека или добавьте продукты вручную." : "Добавьте продукты вручную."); renderModal(); return; }
    try { const lim = await SAMPLE.limits(); if (!lim.images) { M.err = "Отправка изображений Claude здесь недоступна. Вставьте текст чека."; renderModal(); return; } } catch (e) {}
    rcRun("", [blob], kind); },
  dishPhoto: async el => { const file = el.files && el.files[0]; if (!file) return; toast("Сохраняю фото…"); const blob = await downscale(file, 1400, 0.84); await storePhoto(blob, { rid: el.dataset.id, kind: "dish" }); refresh(); toast("Фото добавлено в галерею."); },
  restore: async el => { const f = el.files && el.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); S = merge(null, o); save(); refresh(); toast("Данные восстановлены."); } catch (e) { toast("Файл не похож на резервную копию Personal Chef OS."); } },
};
function onField(ev) { const el = ev.target.closest("[data-on]"); if (!el) return; const h = ON[el.dataset.on]; if (!h) return;
  const textish = (el.tagName === "INPUT" && /text|search|number/.test(el.type)) || el.tagName === "TEXTAREA";
  if (ev.type === "input" && !textish) return; if (ev.type === "change" && textish && el.dataset.on !== "pf" && el.dataset.on !== "rcRow") return;
  if (el.dataset.on === "pf" && ev.type === "change" && textish) return;
  h(el, ev); }
document.addEventListener("input", onField);
document.addEventListener("change", onField);
document.addEventListener("keydown", ev => { if (ev.key === "Escape") { if (M) closeModal(); } });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== route) { route = h; closeModal(); refresh(); } });

// ---------- seed & boot ----------
function seed() {
  if (S.seeded) return; S.seeded = true;
  const t = today(); const add = (key, g, expIn, extra = {}) => { const c = CAT[key]; S.fridge.push(Object.assign({ id: uid(), key, name: c.name, qty: g, init: g, unit: unitOf(key), cat: c.cat, loc: c.loc, bought: addDays(t, -2), exp: addDays(t, expIn), demo: true }, extra)); };
  add("champ", 400, 1); add("cream", 250, 2); add("chthigh", 500, 2); add("egg", 360, 12); add("milk", 700, 4); add("potato", 1500, 20); add("onion", 400, 30); add("garlic", 60, 40); add("butter", 180, 25); add("parmesan", 80, 40); add("rice", 800, 300); add("spaghetti", 500, 300); add("olive", 400, 300); add("oil", 700, 200); add("soy", 300, 300); add("honey", 200, 500); add("flour", 900, 200); add("sugar", 800, 500); add("tomcan", 400, 500); add("yogurt", 450, 6); add("apple", 540, 14); add("salt", 800, 3000); add("blackpepper", 40, 500); add("paprika", 25, 400);
}
function boot(fromCloud) {
  if (!fromCloud) { const loc = lsGet(); if (loc) S = merge(null, loc); }
  seed();
  if (!S.plans[weekStart()]) { generatePlan(weekStart()); buildShop(); S.updatedAt = Date.now(); lsSet(S); if (fromCloud) save(); }
  const h = location.hash.slice(1); if (VIEWS[h]) route = h;
  refresh();
}
const VIEWS_READY = true;
