// Life Intelligence, слой правил. Правило срабатывает только когда все нужные системы
// дали реальные данные; иначе молчит. Каждый вывод хранит sources.

function metric(state, key) {
  const a = state?.data?.analytics;
  const m = a?.data?.metrics?.find((x) => x.key === key);
  if (!m || typeof m.value !== 'number') return null;
  return { ...m, system_id: state.system_id, as_of: a.as_of };
}

const byId = (states, id) => states.find((s) => s.system_id === id);

/**
 * «Расход против бюджета»: специалист сообщает плановый расход (метрика analytics),
 * Finance OS — остаток бюджета месяца (метрика month_budget_remaining). Валюта должна совпадать.
 */
const costVsBudget = ({ id, systemId, costKey, title }) => (states) => {
  const cost = metric(byId(states, systemId), costKey);
  const budget = metric(byId(states, 'finance-os'), 'month_budget_remaining');
  if (!cost || !budget || cost.unit !== budget.unit) return [];
  if (cost.value <= budget.value) return [];
  return [{
    rule_id: id,
    severity: 'warning',
    title,
    body: `${cost.label}: ${cost.value} ${cost.unit}, остаток бюджета месяца: ${budget.value} ${budget.unit}.`,
    sources: [
      { system_id: cost.system_id, metric: costKey, as_of: cost.as_of },
      { system_id: budget.system_id, metric: 'month_budget_remaining', as_of: budget.as_of },
    ],
  }];
};

export const RULES = [
  costVsBudget({ id: 'travel-vs-budget', systemId: 'travel-os', costKey: 'upcoming_trips_cost', title: 'Поездка может нарушить финансовый план' }),
  costVsBudget({ id: 'coffee-equipment-vs-budget', systemId: 'coffee-lab-os', costKey: 'planned_equipment_cost', title: 'Покупка оборудования Coffee Lab превышает остаток бюджета' }),
];

export function runRules(states, rules = RULES) {
  return rules.flatMap((rule) => rule(states));
}
