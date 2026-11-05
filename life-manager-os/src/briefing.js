// DAILY LIFE BRIEFING — 10 разделов из ТЗ. Каждый раздел собирается только из реальных данных
// подключённых систем; пустой раздел помечается «Недостаточно данных».
// LLM-слой (формулировки, «рекомендация дня») подключается позже поверх этой структуры.
import { NO_DATA, localDate } from './overview.js';

const hhmm = (iso, tz) => new Intl.DateTimeFormat('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const fromDomain = (dash, domain) => dash.overview.find((c) => c.domain === domain);

function domainSection(dash, domain) {
  const card = fromDomain(dash, domain);
  if (!card?.has_data) return [];
  return [
    card.state,
    ...card.alerts.map((a) => a.text),
    ...card.tasks.map((t) => t.title),
  ].filter(Boolean);
}

export function morningBriefing(dash) {
  const sections = [
    { key: 'events', title: 'Главные события', items: dash.upcoming_events.filter((e) => localDate(new Date(e.start), dash.today.timezone) === dash.today.date).slice(0, 5).map((e) => `${hhmm(e.start, dash.today.timezone)} ${e.title} (${e.system_name})`) },
    { key: 'top_tasks', title: 'Главные задачи', items: [...dash.tasks_today].sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.priority ?? 'medium') - ['critical', 'high', 'medium', 'low'].indexOf(b.priority ?? 'medium')).slice(0, 3).map((t) => t.title) },
    { key: 'health', title: 'Здоровье', items: (fromDomain(dash, 'health')?.alerts || []).map((a) => a.text) },
    { key: 'fitness', title: 'Спорт', items: domainSection(dash, 'fitness') },
    { key: 'nutrition', title: 'Питание', items: domainSection(dash, 'nutrition') },
    { key: 'finance', title: 'Финансы', items: domainSection(dash, 'finance') },
    { key: 'work', title: 'Работа и проекты', items: [...domainSection(dash, 'productivity'), ...dash.projects.map((g) => g.title)] },
    { key: 'travel', title: 'Путешествия', items: domainSection(dash, 'travel') },
    { key: 'learning', title: 'Обучение', items: domainSection(dash, 'knowledge').slice(0, 1) },
    { key: 'tip', title: 'Рекомендация дня', items: dash.insights.slice(0, 1).map((i) => i.title) },
  ];
  return {
    kind: 'morning',
    for_date: dash.today.date,
    greeting: 'GOOD MORNING',
    sections: sections.map((s) => ({ ...s, empty: s.items.length === 0, placeholder: s.items.length ? null : NO_DATA })),
  };
}
