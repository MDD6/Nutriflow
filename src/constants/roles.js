const ROLE_MAP = {
  paciente: 'PATIENT',
  patient: 'PATIENT',
  patients: 'PATIENT',
  nutritionist: 'NUTRITIONIST',
  nutricionista: 'NUTRITIONIST',
  nutricionistas: 'NUTRITIONIST',
  admin: 'ADMIN',
  administrador: 'ADMIN',
  administradores: 'ADMIN',
  patient_upper: 'PATIENT',
  nutritionist_upper: 'NUTRITIONIST',
  admin_upper: 'ADMIN',
};

function normalizeRole(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized === 'PATIENT') {
    return 'PATIENT';
  }

  if (normalized === 'NUTRITIONIST') {
    return 'NUTRITIONIST';
  }

  if (normalized === 'ADMIN') {
    return 'ADMIN';
  }

  return ROLE_MAP[normalized.toLowerCase()] || '';
}

function isPatientRole(value) {
  return normalizeRole(value) === 'PATIENT';
}

function isNutritionistRole(value) {
  return normalizeRole(value) === 'NUTRITIONIST';
}

function isAdminRole(value) {
  return normalizeRole(value) === 'ADMIN';
}

function toRoleLabel(value) {
  const normalized = normalizeRole(value);

  if (normalized === 'PATIENT') {
    return 'Paciente';
  }

  if (normalized === 'NUTRITIONIST') {
    return 'Nutricionista';
  }

  if (normalized === 'ADMIN') {
    return 'Administrador';
  }

  return '';
}

function getRoleStorageValues(value) {
  const normalized = normalizeRole(value);

  if (normalized === 'PATIENT') {
    return ['PATIENT', 'Paciente', 'paciente'];
  }

  if (normalized === 'NUTRITIONIST') {
    return ['NUTRITIONIST', 'Nutricionista', 'nutricionista'];
  }

  if (normalized === 'ADMIN') {
    return ['ADMIN', 'Administrador', 'administrador'];
  }

  return [];
}

module.exports = {
  normalizeRole,
  isPatientRole,
  isNutritionistRole,
  isAdminRole,
  toRoleLabel,
  getRoleStorageValues,
};
