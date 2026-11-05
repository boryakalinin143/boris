// Дашборд. Данные специалистов вставляются только через textContent (никакого innerHTML).
const NO_DATA = 'Недостаточно данных';
const $ = (id) => document.getElementById(id);

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

let TZ; // часовой пояс центра (config.timezone), чтобы время совпадало с брифингом
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);

function fillList(id, items, render) {
  const ul = $(id);
  ul.replaceChildren(...(items.length ? items.map((x) => h('li', {}, render(x))) : [h('li', { class: 'empty' }, NO_DATA)]));
}

const src = (x) => (x.system_name ? h('span', { class: 'src' }, x.system_name) : null);

function renderToday(d) {
  TZ = d.today.timezone;
  $('weekday').textContent = d.today.weekday;
  $('date').textContent = d.today.date_label;
  $('weather').textContent = d.today.weather ? d.today.weather : 'Погода: источник не подключён';
  $('good-morning').textContent = d.good_morning.text;

  fillList('goals-list', d.goals, (g) => [g.title, g.due ? h('span', { class: 'src' }, `до ${g.due}`) : null, src(g)]);
  fillList('tasks-list', d.tasks_today, (t) => [t.title, src(t)]);
  fillList('reminders-list', d.reminders, (a) => [h('span', { class: `sev-${a.severity}` }, a.text), src(a)]);
  fillList('events-list', d.upcoming_events, (e) => [h('b', {}, fmtTime(e.start)), ' ', e.title, src(e)]);
  fillList('insights-list', d.insights, (i) => [h('b', {}, i.title), h('div', { class: 'muted' }, i.body), h('div', { class: 'src' }, 'Источники: ' + i.sources.map((s) => s.system_id).join(', '))]);
  fillList('projects-list', d.projects, (g) => [g.title, src(g)]);
  fillList('proposals-list', d.pending_proposals, (p) => [
    h('b', {}, p.title), h('span', { class: 'src' }, p.system_id), h('div', { class: 'muted' }, p.body || ''),
    actionButton('Подтвердить', `/api/proposals/${p.id}/approve`), ' ', actionButton('Отклонить', `/api/proposals/${p.id}/reject`),
  ]);

  $('connected').textContent = `${d.connected_count} / ${d.systems.length} подключено`;
  $('systems').replaceChildren(...d.systems.map((s) => h('div', { class: 'sys' },
    h('span', { class: `dot ${s.status}` }),
    h('div', {}, s.name, h('small', {}, s.status_label + (s.version ? ` · v${s.version}` : '') + (s.last_updated ? ` · ${fmtTime(s.last_updated)}` : ''))),
  )));
}

function actionButton(label, url) {
  const b = h('button', {}, label);
  b.addEventListener('click', async () => {
    b.disabled = true;
    await fetch(url, { method: 'POST' });
    load();
  });
  return b;
}

function renderOverview(d) {
  $('cards').replaceChildren(...d.overview.map((c) => {
    const systems = c.systems.map((s) => `${s.name}: ${s.status_label}`).join(' · ') || 'Специалист не создан';
    const body = c.has_data
      ? h('dl', {},
          h('dt', {}, 'Состояние'), h('dd', {}, c.state ?? NO_DATA),
          h('dt', {}, 'Последние события'), h('dd', {}, c.recent.length ? c.recent.map((r) => r.text).join('; ') : NO_DATA),
          h('dt', {}, 'Прогресс'), h('dd', {}, c.progress.length ? c.progress.map((p) => h('div', {}, p.label, p.unit === 'ratio' ? h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(0, Math.min(100, p.value * 100))}%` })) : ` ${p.value} ${p.unit ?? ''}`)) : NO_DATA),
          h('dt', {}, 'Задачи'), h('dd', {}, c.tasks.length ? c.tasks.map((t) => t.title).join('; ') : NO_DATA),
          h('dt', {}, 'Предупреждения'), h('dd', {}, c.alerts.length ? c.alerts.map((a) => a.text).join('; ') : 'Нет'),
        )
      : h('p', { class: 'empty' }, NO_DATA);
    return h('article', { class: 'panel card' },
      h('h3', {}, c.title),
      h('div', { class: 'meta' }, systems, c.last_updated ? ` · обновлено ${fmtTime(c.last_updated)}` : ''),
      body);
  }));
}

async function renderBriefing() {
  const b = await (await fetch('/api/briefing/morning')).json();
  $('briefing').replaceChildren(
    h('div', { class: 'eyebrow' }, b.for_date), h('h1', {}, b.greeting),
    h('ol', {}, b.sections.map((s) => h('li', {}, h('b', {}, s.title), s.empty ? h('div', { class: 'empty' }, s.placeholder) : h('ul', {}, s.items.map((i) => h('li', {}, i)))))),
  );
}

async function renderGoals() {
  const goals = await (await fetch('/api/goals')).json();
  fillList('all-goals', goals, (g) => [
    h('b', {}, g.title), h('span', { class: 'src' }, `${g.category} · ${g.priority}${g.due ? ' · до ' + g.due : ''}`),
    g.reason ? h('div', { class: 'muted' }, 'Зачем: ' + g.reason) : null,
    g.measurable_result ? h('div', { class: 'muted' }, 'Результат: ' + g.measurable_result) : null,
    h('div', { class: 'muted' }, 'Прогресс: ' + (typeof g.progress === 'number' ? Math.round(g.progress * 100) + '%' : NO_DATA)),
  ]);
}

$('goal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries([...new FormData(e.target)].filter(([, v]) => v !== ''));
  const res = await fetch('/api/goals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  if (res.ok) { e.target.reset(); renderGoals(); load(); }
});

document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${b.dataset.view}`));
  if (b.dataset.view === 'briefing') renderBriefing();
  if (b.dataset.view === 'goals') renderGoals();
}));

async function load(refresh = false) {
  try {
    const d = await (await fetch('/api/dashboard' + (refresh ? '?refresh=1' : ''))).json();
    renderToday(d);
    renderOverview(d);
  } catch (e) {
    $('good-morning').replaceChildren(h('span', { class: 'error' }, 'Оркестратор недоступен: ' + e.message));
  }
}

$('refresh').addEventListener('click', () => load(true));
load();
