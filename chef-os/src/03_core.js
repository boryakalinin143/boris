// ================= CORE =================
const LIQ = new Set(["milk","olive","oil","cream","wine_w","wine_r","stock","soy","fishsauce","coconut","sesoil","oyster","worcester"]);
const $ = (s, r=document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const r0 = x => Math.round(x);
const r1 = x => Math.round(x * 10) / 10;
const pad = n => String(n).padStart(2, "0");
const iso = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
const parseISO = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate()+n); return iso(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const weekStart = (s = today()) => { const d = parseISO(s); const wd = (d.getDay()+6)%7; d.setDate(d.getDate()-wd); return iso(d); };
const DOW = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
const DOW_S = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const MONTHS_G = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const fmtDate = s => { const d = parseISO(s); return d.getDate() + " " + MONTHS_G[d.getMonth()]; };
const dayIdx = (s = today()) => (parseISO(s).getDay()+6)%7;

function money(czk, opts = {}) {
  const p = S.profile; const v = Math.round(czk);
  let out = v.toLocaleString("ru-RU") + " Kč";
  if (p.currency === "EUR" || opts.eur) out += " · " + (czk / (p.eurRate || 25)).toLocaleString("ru-RU", {maximumFractionDigits: 1}) + " €";
  return out;
}

// ---------- state ----------
function defaultState() {
  return {
    v: 1, updatedAt: 0,
    profile: { name: "", done: false, step: 0, flavors: [], likes: "", favDishes: "", spices: "", methods: [], cuisines: [], dislikes: "", neverTried: "", allergies: [], intolerances: "", diet: [], goal: "variety", trackKcal: false, sex: "", age: "", height: "", weight: "", activity: "1.375", kcalTarget: "", budgetWeek: 2000, currency: "CZK", eurRate: 25, meals: { breakfast: true, lunch: true, dinner: true, snack: false }, people: 1, timeWeekday: 40, timeWeekend: 120, stores: [], equipment: [], wantLearn: "" },
    plans: {}, shop: { items: [], built: 0, week: "" }, fridge: [], expenses: [], history: [], log: {}, skills: {}, skillXp: {}, techDone: [], photos: [], custom: [], chat: [], waste: [], used: [], ui: {}, seeded: false,
  };
}
let S = defaultState();
let saveTimer = null, saving = false, savePending = false, DOC = null, ASSETS = null, SAMPLE = null, DL = null, storeMode = "local", lastSaved = 0;
const LS_KEY = "pcos-state-v1";

function lsGet() { try { const t = localStorage.getItem(LS_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function lsSet(o) { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
function merge(base, o) { const d = defaultState(); const out = Object.assign(d, o || {}); out.profile = Object.assign(defaultState().profile, (o || {}).profile || {}); out.profile.meals = Object.assign(defaultState().profile.meals, ((o||{}).profile||{}).meals || {}); return out; }

function save() {
  S.updatedAt = Date.now();
  lsSet(S);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 700);
  renderFoot();
}
async function flush() {
  if (!DOC) { lastSaved = Date.now(); renderFoot(); return; }
  if (saving) { savePending = true; return; }
  saving = true;
  try { await DOC.set(JSON.parse(JSON.stringify(S))); lastSaved = Date.now(); }
  catch (e) {
    if (e && e.code === "quota_exceeded") toast("Облачное хранилище заполнено. Удалите старые фото или историю.");
    else if (e && e.code === "invalid_argument") toast("Данные слишком большие для облака — сохранены в браузере.");
    else if (e && e.code === "unavailable") { setTimeout(flush, 1500 + Math.random()*1000); }
  }
  saving = false; renderFoot();
  if (savePending) { savePending = false; flush(); }
}
async function initCloud() {
  const c = window.claude;
  if (!c || !c.use) return;
  try {
    const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
    if (db) {
      const ref = db.doc("kitchen/state");
      const timer = setTimeout(() => { if (storeMode !== "cloud") { storeMode = "local-wait"; renderFoot(); } }, 10000);
      const snap = await ref.get();
      clearTimeout(timer);
      DOC = ref; storeMode = "cloud";
      if (snap.exists) {
        const remote = snap.data();
        if (!S.updatedAt || (remote.updatedAt || 0) >= S.updatedAt) { S = merge(null, JSON.parse(JSON.stringify(remote))); lsSet(S); boot(true); }
        else flush();
      } else flush();
      renderFoot();
    }
  } catch (e) { storeMode = "local"; renderFoot(); }
  try { ASSETS = await c.use("assets"); } catch (e) {}
  try { SAMPLE = await c.use("sample"); } catch (e) {}
  try { DL = await c.use("downloads"); } catch (e) {}
  render();
}

// ---------- catalog / recipes ----------
const allRecipes = () => R.concat(S.custom || []);
const rec = id => allRecipes().find(r => r.id === id);
const gOf = (key, q, u) => (u === "pc" && CAT[key] && CAT[key].pcG) ? q * CAT[key].pcG : q;
const unitOf = key => LIQ.has(key) ? "мл" : "г";
function fmtG(key, g) {
  const c = CAT[key];
  if (c && c.pcG && c.pcName && !LIQ.has(key) && c.pcG < 1000) {
    const n = Math.round((g / c.pcG) * 2) / 2;
    if (n >= 0.5) return (n % 1 ? n.toLocaleString("ru-RU") : n) + " " + c.pcName + (c.pcName === "шт" && g >= 30 ? " (≈" + fmtMass(key, g) + ")" : "");
  }
  return fmtMass(key, g);
}
function fmtMass(key, g) {
  const u = unitOf(key);
  if (g >= 1000) return (Math.round(g / 100) / 10).toLocaleString("ru-RU") + (u === "мл" ? " л" : " кг");
  if (g < 10) return (Math.round(g * 10) / 10).toLocaleString("ru-RU") + " " + u;
  return Math.round(g) + " " + u;
}
function spoon(key, g) { const c = CAT[key]; if (!c || c.cat !== "Специи" || g > 20 || key === "blackpepper" && g > 6) return ""; const tsp = g / 2.5; return tsp >= 0.25 ? " · ≈" + (Math.round(tsp * 4) / 4).toLocaleString("ru-RU") + " ч. л." : " · щепотка"; }
function ingRows(r, serv) {
  const f = serv / r.s;
  return r.ing.map(i => {
    if (r.custom && !CAT[i[0]]) return { key: null, name: i[3] || i[0], g: (i[1] || 0) * f, label: (i[1] ? r1(i[1]*f) + " " + (i[2] || "") : "по вкусу") };
    const key = i[0]; let q = i[1] * f, u = i[2] || "g";
    if (u === "pc") { const keepHalf = ["lemon","lime","onion","pepper","cucumber","zucchini","redonion","avocado"].includes(key); q = keepHalf ? Math.max(0.5, Math.round(q*2)/2) : Math.max(1, Math.round(q)); }
    const g = gOf(key, q, u);
    let label = u === "pc" ? (q % 1 ? q.toLocaleString("ru-RU") : q) + " " + (CAT[key].pcName || "шт") + (CAT[key].pcName === "шт" && g >= 30 ? " (≈" + Math.round(g) + " г)" : "") : fmtMass(key, g);
    if (key === "salt" || key === "blackpepper") label = g < 4 ? "по вкусу" : label;
    return { key, name: CAT[key].name, g, label: label + spoon(key, g), nf: i[4] ?? 1, note: i[3] };
  });
}
function nutr(r) {
  if (r._n) return r._n;
  if (r.nut) return (r._n = Object.assign({ fib: 0, veg: 0 }, r.nut));
  const t = { kcal: 0, p: 0, f: 0, c: 0, fib: 0, veg: 0, cost: 0 };
  for (const x of ingRows(r, r.s)) {
    if (!x.key) continue; const c = CAT[x.key]; const k = x.g * x.nf / 100;
    t.kcal += c.kcal * k; t.p += c.p * k; t.f += c.f * k; t.c += c.c * k; t.fib += c.fib * k;
    if (c.cat === "Овощи и фрукты" || c.cat === "Зелень") t.veg += x.g;
  }
  for (const k in t) t[k] = t[k] / r.s;
  return (r._n = t);
}
function cost(r) {
  if (r._c != null) return r._c;
  if (r.costPer != null) return (r._c = r.costPer);
  let s = 0; for (const x of ingRows(r, r.s)) if (x.key) s += x.g * CAT[x.key].price / CAT[x.key].packG;
  return (r._c = s / r.s);
}
function allergensOf(r) { const set = new Set(); for (const i of r.ing) { const c = CAT[i[0]]; if (c) for (const ch of c.al) set.add(ch); } (r.al || "").split("").forEach(ch => ch && set.add(ch)); return set; }
function dislikeTokens() { return (S.profile.dislikes || "").toLowerCase().split(/[,;\n]+/).map(s => s.trim()).filter(s => s.length > 2); }
function conflicts(r) {
  const p = S.profile; const out = [];
  const al = allergensOf(r);
  for (const a of p.allergies) if (al.has(a)) out.push("аллерген: " + ALLERGENS[a]);
  const keys = r.ing.map(i => i[0]);
  const isMeat = keys.some(k => CAT[k] && CAT[k].cat === "Мясо и рыба" && !"fs".includes(CAT[k].al || "-"));
  const isFish = keys.some(k => CAT[k] && /[fs]/.test(CAT[k].al));
  if (p.diet.includes("vegetarian") && (isMeat || isFish)) out.push("не вегетарианское");
  if (p.diet.includes("pescatarian") && isMeat) out.push("содержит мясо");
  if (p.diet.includes("noPork") && al.has("k")) out.push("свинина");
  if (p.diet.includes("noAlcohol") && al.has("a")) out.push("алкоголь (есть замена)");
  if (p.diet.includes("glutenFree") && al.has("g")) out.push("глютен");
  if (p.diet.includes("lactoseFree") && al.has("m")) out.push("лактоза");
  const toks = dislikeTokens();
  for (const t of toks) { const hit = r.ing.find(i => { const c = CAT[i[0]]; const nm = (c ? c.name : (i[3] || i[0])).toLowerCase(); return nm.includes(t) || t.includes(nm.split(" ")[0]); }); if (hit) out.push("не любите: " + t); }
  const eq = p.equipment || [];
  if (eq.length) {
    if ((r.eq || []).some(e => /Духовка/.test(e)) && !eq.includes("Духовка")) out.push("нужна духовка");
    if ((r.eq || []).some(e => /блендер/i.test(e)) && !eq.some(e => /блендер/i.test(e))) out.push("нужен блендер");
  }
  return out;
}
const hardBlock = r => conflicts(r).some(c => !c.startsWith("алкоголь"));
const cookedCount = id => S.history.filter(h => h.rid === id && h.cooked).length;
const avgRating = id => { const a = S.history.filter(h => h.rid === id && h.rating); return a.length ? a.reduce((s, h) => s + h.rating, 0) / a.length : 0; };
function seasonalScore(r) { const ks = SEASON_KEYS[new Date().getMonth()] || []; return r.ing.filter(i => ks.includes(i[0])).length; }
function seasonalNames(r) { const ks = SEASON_KEYS[new Date().getMonth()] || []; return r.ing.filter(i => ks.includes(i[0])).map(i => CAT[i[0]].name.toLowerCase()); }

// ---------- fridge ----------
function fridgeG(key) { return S.fridge.filter(f => f.key === key && (f.exp == null || f.exp >= today())).reduce((s, f) => s + (+f.qty || 0), 0); }
function daysLeft(f) { return f.exp ? daysBetween(today(), f.exp) : 999; }
function expiring(n = 3) { return S.fridge.filter(f => f.exp && daysLeft(f) <= n).sort((a, b) => a.exp.localeCompare(b.exp)); }
function rescueRecipes(items) {
  const keys = new Set(items.map(f => f.key).filter(Boolean));
  if (!keys.size) return [];
  return allRecipes().filter(r => r.m !== "breakfast" || true).map(r => ({ r, hit: r.ing.filter(i => keys.has(i[0])).map(i => i[0]) }))
    .filter(x => x.hit.length && !hardBlock(x.r)).sort((a, b) => b.hit.length - a.hit.length || a.r.time - b.r.time);
}
function deductPlan(r, serv) {
  const out = [];
  for (const x of ingRows(r, serv)) {
    if (!x.key) continue; let need = x.g;
    const lots = S.fridge.filter(f => f.key === x.key && f.qty > 0).sort((a, b) => (a.exp || "9").localeCompare(b.exp || "9"));
    for (const f of lots) { if (need <= 0) break; const take = Math.min(f.qty, need); out.push({ id: f.id, key: x.key, name: f.name, take }); need -= take; }
  }
  return out;
}

// ---------- menu planning ----------
function slotsOn() { const m = S.profile.meals; return ["breakfast","lunch","dinner","snack"].filter(k => m[k]); }
function candidates(slot, dayI, opts = {}) {
  const p = S.profile; const weekend = dayI >= 5;
  const maxT = opts.quick ? 20 : (weekend ? +p.timeWeekend : +p.timeWeekday);
  const want = slot === "breakfast" ? "breakfast" : slot === "snack" ? "snack" : "main";
  return allRecipes().filter(r => r.m === want && !hardBlock(r) && (r.time <= maxT || (opts.ignoreTime)) && (!opts.fancy || r.d >= 3));
}
function scoreRecipe(r, ctx) {
  const p = S.profile; let s = Math.random() * 2;
  if (p.cuisines.includes(r.cu)) s += 2.5;
  const ar = avgRating(r.id); if (ar) s += (ar - 3) * 1.5;
  s += Math.min(seasonalScore(r), 3) * 0.8;
  if (ctx.expKeys) s += r.ing.filter(i => ctx.expKeys.has(i[0])).length * (ctx.dayI < 3 ? 2.2 : 0.6);
  if (ctx.prevCu && ctx.prevCu.includes(r.cu)) s -= 2.5;
  if (ctx.used && ctx.used.get(r.id)) s -= 6 * ctx.used.get(r.id);
  const lastWeek = S.history.filter(h => h.rid === r.id && daysBetween(h.date, today()) < 10).length; s -= lastWeek * 2;
  if (r.note && r.id === "hiyayakko" && !cookedCount(r.id)) s += 3; // план из заметок
  return s;
}
function generatePlan(ws, keepDone) {
  const p = S.profile; const people = Math.max(1, +p.people || 1);
  const old = S.plans[ws];
  const expKeys = new Set(expiring(5).map(f => f.key).filter(Boolean));
  const used = new Map(); const days = [];
  let prevCu = [];
  const discPool = allRecipes().filter(r => r.disc && !cookedCount(r.id) && !hardBlock(r) && r.time <= +p.timeWeekend);
  for (let d = 0; d < 7; d++) {
    const day = {}; const cuToday = [];
    for (const slot of ["breakfast","lunch","dinner","snack"]) {
      if (!p.meals[slot]) { day[slot] = null; continue; }
      if (keepDone && old && old.days[d] && old.days[d][slot] && old.days[d][slot].done) { day[slot] = old.days[d][slot]; used.set(day[slot].rid, (used.get(day[slot].rid) || 0) + 1); continue; }
      let cands = candidates(slot, d);
      if (!cands.length) cands = candidates(slot, d, { ignoreTime: true });
      if (!cands.length) { day[slot] = null; continue; }
      const ctx = { expKeys, dayI: d, prevCu: prevCu.concat(cuToday), used };
      let pick = cands.map(r => ({ r, s: scoreRecipe(r, ctx) })).sort((a, b) => b.s - a.s)[0].r;
      if (slot === "dinner" && d === 5 && discPool.length) { const dp = discPool.filter(r => !used.get(r.id)); if (dp.length) pick = dp[Math.floor(Math.random() * dp.length)]; }
      used.set(pick.id, (used.get(pick.id) || 0) + 1);
      cuToday.push(pick.cu);
      day[slot] = { rid: pick.id, serv: people };
    }
    prevCu = cuToday; days.push(day);
  }
  const plan = { status: "draft", created: Date.now(), days };
  fitBudget(plan, ws);
  S.plans[ws] = plan;
  return plan;
}
function planCost(plan) { let s = 0; plan.days.forEach(d => Object.values(d).forEach(x => { if (x) { const r = rec(x.rid); if (r) s += cost(r) * x.serv; } })); return s; }
function fitBudget(plan, ws) {
  const B = +S.profile.budgetWeek || 0; if (!B) return;
  for (let it = 0; it < 14 && planCost(plan) > B; it++) {
    let worst = null;
    plan.days.forEach((d, di) => Object.entries(d).forEach(([slot, x]) => { if (x && !x.done) { const c = cost(rec(x.rid)) * x.serv; if (!worst || c > worst.c) worst = { di, slot, c, rid: x.rid }; } }));
    if (!worst) break;
    const usedIds = new Set(); plan.days.forEach(d => Object.values(d).forEach(x => x && usedIds.add(x.rid)));
    const alt = candidates(worst.slot, worst.di).filter(r => !usedIds.has(r.id) && cost(r) < cost(rec(worst.rid)) * 0.8).sort((a, b) => cost(a) - cost(b))[0];
    if (!alt) break;
    plan.days[worst.di][worst.slot] = { rid: alt.id, serv: plan.days[worst.di][worst.slot].serv };
  }
}
function curPlan() { return S.plans[weekStart()]; }
function todayMenu() { const p = curPlan(); return p ? p.days[dayIdx()] : null; }

// ---------- shopping ----------
function buildShop(fromToday = true) {
  const ws = weekStart(); const plan = S.plans[ws]; if (!plan) return;
  const need = {}; const dishes = {}; const custom = [];
  plan.days.forEach((d, di) => {
    if (fromToday && di < dayIdx()) return;
    for (const [slot, x] of Object.entries(d)) {
      if (!x || x.done) continue; const r = rec(x.rid); if (!r) continue;
      for (const row of ingRows(r, x.serv)) {
        if (!row.key) { custom.push({ name: row.name, label: row.label, dish: r.n }); continue; }
        if (STAPLES.includes(row.key)) continue;
        need[row.key] = (need[row.key] || 0) + row.g;
        (dishes[row.key] = dishes[row.key] || new Set()).add(r.n);
      }
    }
  });
  const prev = new Map(S.shop.items.filter(i => i.key).map(i => [i.key, i]));
  const manual = S.shop.items.filter(i => i.manual);
  const items = [];
  for (const [key, g] of Object.entries(need)) {
    const have = fridgeG(key); const rest = g - have; if (rest <= 1) continue;
    const it = makeItem(key, rest, g, have); it.dishes = [...dishes[key]];
    const pv = prev.get(key); if (pv) { it.checked = pv.checked; if (pv.storeSet) { it.store = pv.store; it.storeSet = true; } }
    items.push(it);
  }
  for (const c of custom) items.push({ id: uid(), key: null, name: c.name, qtyLabel: c.label, price: 0, store: "", dishes: [c.dish], checked: false, manual: true });
  S.shop = { items: items.concat(manual.filter(m => !items.some(i => i.key && i.key === m.key))), built: Date.now(), week: ws };
}
function pickStore(c) {
  const st = S.profile.stores;
  if (!st.length || st.includes(c.store)) return c.store;
  if (c.cat === "Азиатские продукты") return st.find(s => s === "Rohlik" || s === "Košík") || c.store;
  return st[0];
}
function makeItem(key, rest, needG, have) {
  const c = CAT[key]; let buyG, price, qtyLabel, packs = 0;
  if (c.loose) {
    buyG = c.pcG && c.pcG < 1000 ? Math.ceil(rest / c.pcG) * c.pcG : Math.ceil(rest / 50) * 50;
    price = buyG * c.price / c.packG; qtyLabel = fmtG(key, buyG);
  } else {
    packs = Math.ceil(rest / c.packG); buyG = packs * c.packG; price = packs * c.price;
    qtyLabel = packs + " уп. × " + fmtMass(key, c.packG);
  }
  return { id: uid(), key, name: c.name, needG, haveG: have || 0, buyG, packs, price, qtyLabel, store: pickStore(c), dishes: [], checked: false };
}
function shopText() {
  const by = {};
  for (const i of S.shop.items) (by[i.store || "Любой магазин"] = by[i.store || "Любой магазин"] || []).push(i);
  let t = "Список покупок — Personal Chef OS (" + fmtDate(today()) + ")\nЦены — оценка шефа на " + fmtDate(PRICE_DATE) + ", в магазине не проверены.\n";
  for (const [st, arr] of Object.entries(by)) { t += "\n" + st + "\n"; for (const i of arr) t += (i.checked ? "[x] " : "[ ] ") + i.name + " — " + (i.qtyLabel || "") + (i.price ? " · ~" + Math.round(i.price) + " Kč" : "") + "\n"; }
  t += "\nИтого: ~" + Math.round(S.shop.items.reduce((s, i) => s + (i.price || 0), 0)) + " Kč\n";
  return t;
}
function shopCSV() {
  const rows = [["Продукт","Количество","Оценка Kč","Магазин","Для блюд","Куплено"]];
  for (const i of S.shop.items) rows.push([i.name, i.qtyLabel || "", Math.round(i.price || 0), i.store || "", (i.dishes || []).join(" / "), i.checked ? "да" : ""]);
  return rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\n");
}

// ---------- nutrition ----------
function targets() {
  const p = S.profile; const w = +p.weight, h = +p.height, a = +p.age;
  let kcal = +p.kcalTarget || 0;
  if (!kcal && w && h && a && p.sex) { const bmr = 10*w + 6.25*h - 5*a + (p.sex === "m" ? 5 : -161); kcal = bmr * (+p.activity || 1.375); if (p.goal === "lose") kcal *= 0.85; if (p.goal === "gain") kcal *= 1.1; }
  if (!kcal) return null;
  const prot = w ? w * (p.goal === "gain" ? 1.8 : 1.6) : kcal * 0.2 / 4;
  const fat = kcal * 0.3 / 9; const carb = Math.max(0, (kcal - prot*4 - fat*9) / 4);
  return { kcal: Math.round(kcal), p: Math.round(prot), f: Math.round(fat), c: Math.round(carb), fib: 30, veg: 400, water: w ? Math.round(w * 30 / 250) * 250 : 2000 };
}
function dayLog(d = today()) { return S.log[d] || (S.log[d] = { water: 0, items: [] }); }
function dayTotals(d = today()) { const L = S.log[d]; const t = { kcal: 0, p: 0, f: 0, c: 0, fib: 0, veg: 0, cost: 0 }; if (!L) return t; for (const i of L.items) for (const k in t) t[k] += +i[k] || 0; return t; }
function varietyWeek() { const set = new Set(); S.used.filter(u => daysBetween(u.date, today()) < 7).forEach(u => set.add(u.key)); S.history.filter(h => daysBetween(h.date, today()) < 7).forEach(h => (h.keys || []).forEach(k => set.add(k))); return set.size; }

// ---------- budget ----------
function spentBetween(a, b) { return S.expenses.filter(e => e.date >= a && e.date <= b).reduce((s, e) => s + (+e.amount || 0), 0); }

// ---------- daily choices ----------
function hashStr(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }
function chefSpecial() {
  const pool = allRecipes().filter(r => r.m === "main" && !hardBlock(r) && r.time <= Math.max(+S.profile.timeWeekend || 120, 60));
  if (!pool.length) return null;
  const scored = pool.map(r => ({ r, s: (r.d >= 2 ? 2 : 0) + seasonalScore(r) + (cookedCount(r.id) ? -1 : 1.5) + (S.profile.cuisines.includes(r.cu) ? 2 : 0) + avgRating(r.id) / 2 + (hashStr(today() + r.id) % 100) / 25 }));
  return scored.sort((a, b) => b.s - a.s)[0].r;
}
function dishOfWeek() {
  const pool = allRecipes().filter(r => r.disc && !hardBlock(r));
  if (!pool.length) return null;
  const fresh = pool.filter(r => !cookedCount(r.id));
  const list = fresh.length ? fresh : pool;
  return list[hashStr(weekStart()) % list.length];
}
function surprise() {
  const pool = allRecipes().filter(r => r.m === "main" && !hardBlock(r) && !cookedCount(r.id) && !S.profile.cuisines.includes(r.cu));
  const list = pool.length ? pool : allRecipes().filter(r => r.m === "main" && !hardBlock(r));
  return list[Math.floor(Math.random() * list.length)];
}
