// Permission Manager: READ < ANALYZE < PROPOSE < EXECUTE. См. docs/PERMISSIONS.md.

export const LEVELS = ['READ', 'ANALYZE', 'PROPOSE', 'EXECUTE'];

const rank = (level) => {
  const i = LEVELS.indexOf(level);
  if (i === -1) throw new Error(`Неизвестный уровень доступа: ${level}`);
  return i;
};

export const hasLevel = (granted, required) => rank(granted) >= rank(required);

/** Какой уровень нужен для чтения ресурса LOS/1. */
export const READ_REQUIREMENTS = {
  profile: 'READ',
  summary: 'READ',
  goals: 'READ',
  tasks: 'READ',
  alerts: 'READ',
  events: 'READ',
  analytics: 'ANALYZE',
};

export function canRead(perm, resource) {
  if (!perm) return false;
  const required = READ_REQUIREMENTS[resource];
  if (!required) return false;
  return hasLevel(perm.level, required);
}

const matches = (list = [], action) => list.includes('*') || list.includes(action);

/**
 * Решение по действию центра в системе.
 * @param {object} perm — запись из config/permissions.json
 * @param {string} action — id capability
 * @param {object} [capability] — описание из манифеста специалиста ({level, critical})
 * @returns {{decision: 'allowed'|'denied'|'needs_confirmation', reason: string}}
 */
export function checkAction(perm, action, capability = null) {
  if (!perm) return { decision: 'denied', reason: 'Для системы не настроены права' };

  if ((perm.deny_actions || []).includes(action)) {
    return { decision: 'denied', reason: `Действие «${action}» запрещено для этой системы всегда` };
  }

  if (!capability) {
    return { decision: 'denied', reason: `Система не объявляла действие «${action}» в манифесте` };
  }

  const required = capability.level === 'EXECUTE' ? 'EXECUTE' : 'PROPOSE';
  if (!hasLevel(perm.level, required)) {
    return { decision: 'denied', reason: `Нужен уровень ${required}, выдан ${perm.level}` };
  }

  if (required === 'EXECUTE' && !(perm.allow_actions || []).includes(action)) {
    return { decision: 'denied', reason: `Действие «${action}» не входит в белый список` };
  }

  if (capability.critical || matches(perm.confirm_actions, action)) {
    return { decision: 'needs_confirmation', reason: capability.critical ? 'Критичное действие' : 'Требует подтверждения по настройкам' };
  }

  return { decision: 'allowed', reason: 'В пределах выданных прав' };
}
