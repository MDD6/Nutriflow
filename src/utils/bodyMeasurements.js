const CORE_BODY_MEASUREMENT_DEFINITIONS = [
  { key: 'weight', label: 'Peso', unit: 'kg', sourceKey: 'weight', decimals: 1 },
  { key: 'height', label: 'Altura', unit: 'm', sourceKey: 'height', decimals: 2 },
  { key: 'body-fat', label: 'Gordura corporal', unit: '%', sourceKey: 'bodyFat', decimals: 1 },
  { key: 'imc', label: 'IMC', unit: '', sourceKey: 'imc', decimals: 1 },
];

const CORE_BODY_MEASUREMENT_KEYS = new Set(
  CORE_BODY_MEASUREMENT_DEFINITIONS.map((definition) => definition.key),
);

function normalizeMeasurementKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function getMeasurementFractionDigits(unit = '', key = '') {
  if (key === 'height' || String(unit || '').trim().toLowerCase() === 'm') {
    return 2;
  }

  return 1;
}

function roundMeasurementValue(value, options = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const fractionDigits = getMeasurementFractionDigits(options.unit, options.key);
  return Number(parsed.toFixed(fractionDigits));
}

function formatMeasurementValue(value, unit = '', key = '') {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return '--';
  }

  const fractionDigits = getMeasurementFractionDigits(unit, key);
  const formatted = parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  if (!unit) {
    return formatted;
  }

  const trimmedUnit = String(unit).trim();
  return trimmedUnit === '%'
    ? `${formatted}${trimmedUnit}`
    : `${formatted} ${trimmedUnit}`;
}

function getMeasurementPriority(key = '') {
  const normalizedKey = String(key || '').trim();
  const index = CORE_BODY_MEASUREMENT_DEFINITIONS.findIndex(
    (definition) => definition.key === normalizedKey,
  );

  return index === -1 ? CORE_BODY_MEASUREMENT_DEFINITIONS.length + 10 : index;
}

function compareMeasurementEntries(left, right) {
  const priorityDifference = getMeasurementPriority(left?.key) - getMeasurementPriority(right?.key);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return String(left?.label || '').localeCompare(String(right?.label || ''), 'pt-BR');
}

function sortMeasurementsByRecency(measurements = []) {
  return [...measurements].sort((left, right) => {
    const timeDifference = new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return compareMeasurementEntries(left, right);
  });
}

function getLatestMeasurementsByType(measurements = [], limit = 6) {
  const latestByKey = new Map();

  for (const measurement of sortMeasurementsByRecency(measurements)) {
    if (latestByKey.has(measurement.key)) {
      continue;
    }

    latestByKey.set(measurement.key, measurement);

    if (latestByKey.size >= limit) {
      break;
    }
  }

  return [...latestByKey.values()].sort(compareMeasurementEntries);
}

function groupMeasurementsByDate(measurements = [], limit = 6) {
  const groups = [];
  const groupsByKey = new Map();

  for (const measurement of sortMeasurementsByRecency(measurements)) {
    const recordedAt = new Date(measurement.recordedAt);

    if (Number.isNaN(recordedAt.getTime())) {
      continue;
    }

    const groupKey = recordedAt.toISOString().slice(0, 10);

    if (!groupsByKey.has(groupKey)) {
      if (groups.length >= limit) {
        continue;
      }

      const group = {
        groupKey,
        recordedAt,
        items: [],
      };

      groupsByKey.set(groupKey, group);
      groups.push(group);
    }

    groupsByKey.get(groupKey).items.push(measurement);
  }

  return groups.map((group) => ({
    ...group,
    items: [...group.items].sort(compareMeasurementEntries),
  }));
}

function buildAssessmentMeasurements(payload) {
  const {
    weight,
    height,
    bodyFat,
    imc,
    recordedAt,
    extraMeasurements = [],
  } = payload;

  const coreMeasurements = CORE_BODY_MEASUREMENT_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    unit: definition.unit,
    value: roundMeasurementValue(payload[definition.sourceKey], definition),
    recordedAt,
  }));

  const customMeasurements = extraMeasurements.map((measurement) => ({
    key: measurement.key,
    label: measurement.label,
    unit: measurement.unit,
    value: roundMeasurementValue(measurement.value, measurement),
    recordedAt,
  }));

  return [
    ...coreMeasurements,
    ...customMeasurements,
  ];
}

module.exports = {
  CORE_BODY_MEASUREMENT_DEFINITIONS,
  CORE_BODY_MEASUREMENT_KEYS,
  buildAssessmentMeasurements,
  compareMeasurementEntries,
  formatMeasurementValue,
  getLatestMeasurementsByType,
  groupMeasurementsByDate,
  normalizeMeasurementKey,
  roundMeasurementValue,
};
