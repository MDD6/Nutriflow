function safeParse(jsonValue) {
  try {
    return jsonValue ? JSON.parse(jsonValue) : null;
  } catch (error) {
    return null;
  }
}

const state = {
  currentUser: safeParse(localStorage.getItem('nutriflow.user')),
  dashboard: null,
  isAddingMeal: false,
  isSendingMessage: false,
  isLinkingNutritionist: false,
};

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const logoutButton = document.getElementById('logoutButton');
const addMealButton = document.getElementById('addMealButton');
const quickAddMealButton = document.getElementById('quickAddMealButton');
const toast = document.getElementById('patientToast');
const overviewRing = document.querySelector('.metric-ring');
const patientConnectionForm = document.getElementById('patientConnectionForm');
const patientNutritionistEmail = document.getElementById('patientNutritionistEmail');
const patientConnectionAge = document.getElementById('patientConnectionAge');
const patientConnectionObjective = document.getElementById('patientConnectionObjective');
const patientConnectionRestrictions = document.getElementById('patientConnectionRestrictions');
const patientConnectionSubmitButton = document.getElementById('patientConnectionSubmitButton');

function getSessionToken() {
  return localStorage.getItem('nutriflow.token');
}

function persistCurrentUser(user) {
  if (!user) {
    return;
  }

  state.currentUser = user;
  localStorage.setItem('nutriflow.user', JSON.stringify(user));
}

function clearSessionAndRedirect() {
  localStorage.removeItem('nutriflow.token');
  localStorage.removeItem('nutriflow.user');
  localStorage.removeItem('nutriflow.lastAuthAt');
  window.location.replace('index.html');
}

function isPatientProfile(profile) {
  return String(profile || '').trim().toLowerCase() === 'paciente';
}

function ensurePatientAccess() {
  const token = getSessionToken();

  if (!token) {
    clearSessionAndRedirect();
    return false;
  }

  if (state.currentUser && !isPatientProfile(state.currentUser.profile)) {
    clearSessionAndRedirect();
    return false;
  }

  return true;
}

function getInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Paciente';
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Bom dia';
  }

  if (hour < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
}

function formatLongDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
}

function formatShortDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date());
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function showToast(message) {
  if (!toast || !message) {
    return;
  }

  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('is-visible');

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.classList.add('hidden');
  }, 2400);
}

async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getSessionToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await window.NutriFlowApi.request(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    message: 'Resposta invalida do servidor.',
  }));

  if (response.status === 401 || response.status === 403) {
    showToast(data.message || 'Sua sessao expirou. Faca login novamente.');
    window.setTimeout(clearSessionAndRedirect, 800);
    throw new Error(data.message || 'Sessao invalida.');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Nao foi possivel concluir a operacao.');
  }

  return data;
}

async function getPatientDashboard() {
  return apiRequest('/api/patient/dashboard');
}

async function createMealEntry(payload = {}) {
  return apiRequest('/api/patient/meals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function sendPatientMessage(payload) {
  return apiRequest('/api/patient/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function linkNutritionist(payload) {
  return apiRequest('/api/patient/link-nutritionist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function applyDashboardState(payload) {
  state.dashboard = payload || null;

  if (!payload?.patient) {
    return;
  }

  persistCurrentUser({
    ...state.currentUser,
    ...payload.patient,
    nutritionist: payload.patient.nutritionist,
  });
}

function getPatientData() {
  return state.dashboard?.patient || state.currentUser || {
    name: 'Paciente NutriFlow',
    email: 'paciente@nutriflow.com',
    profile: 'Paciente',
    nutritionist: {
      name: 'Nutricionista',
      email: 'nutricionista@nutriflow.com',
    },
  };
}

function isSetupRequired() {
  return state.dashboard?.setupRequired === true;
}

function getNutritionistData() {
  return getPatientData().nutritionist || {
    name: 'Nutricionista',
    email: 'nutricionista@nutriflow.com',
  };
}

function getDailyMealTarget() {
  const regularityGoal = state.dashboard?.goals?.items?.find((item) => item.label.toLowerCase().includes('regularidade'));
  const match = regularityGoal?.valueLabel?.match(/\/\s*(\d+)/);
  return match ? Number(match[1]) : 4;
}

function setTextContent(selectorOrElement, value) {
  const element = typeof selectorOrElement === 'string'
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;

  if (element) {
    element.textContent = value;
  }
}

function renderHeader() {
  const patient = getPatientData();
  const nutritionist = getNutritionistData();

  document.querySelectorAll('[data-user-name]').forEach((element) => {
    element.textContent = patient.name || 'Paciente NutriFlow';
  });

  document.querySelectorAll('[data-user-profile]').forEach((element) => {
    element.textContent = patient.profile || 'Paciente';
  });

  document.querySelectorAll('[data-user-email]').forEach((element) => {
    element.textContent = patient.email || 'paciente@nutriflow.com';
  });

  document.querySelectorAll('[data-user-initial]').forEach((element) => {
    element.textContent = getInitials(patient.name || 'Paciente NutriFlow');
  });

  document.querySelectorAll('[data-linked-nutritionist-name]').forEach((element) => {
    element.textContent = nutritionist.name || 'Nutricionista';
  });

  document.querySelectorAll('[data-linked-nutritionist-initial]').forEach((element) => {
    element.textContent = getInitials(nutritionist.name || 'Nutricionista');
  });

  setTextContent('[data-greeting]', `${getGreeting()}, ${getFirstName(patient.name)}`);
  setTextContent('[data-dashboard-date]', `${formatLongDate()} - acompanhe metas, refeicoes e progresso em um unico lugar.`);
  setTextContent('[data-dashboard-date-short]', formatShortDate());

  if (chatInput) {
    chatInput.placeholder = `Escreva uma mensagem para ${nutritionist.name || 'sua nutricionista'}`;
  }
}

function renderHighlights() {
  const patient = getPatientData();
  const nutritionist = patient.nutritionist;
  const clinical = state.dashboard?.clinical;
  const chat = state.dashboard?.chat;
  const pendingChecklist = (clinical?.checklist || []).filter((item) => !item.done).length;

  setTextContent(
    document.getElementById('patientHighlightNutritionistValue'),
    nutritionist?.name || 'Sem vinculo',
  );
  setTextContent(
    document.getElementById('patientHighlightNutritionistMeta'),
    nutritionist?.email || 'Conecte seu profissional para liberar dashboard, plano e chat.',
  );
  setTextContent(
    document.getElementById('patientHighlightObjectiveValue'),
    patient.objective || 'A definir',
  );
  setTextContent(
    document.getElementById('patientHighlightObjectiveMeta'),
    patient.objective
      ? 'Seu objetivo atual guia plano alimentar, metas e acompanhamento.'
      : 'Defina seu objetivo nutricional ao concluir o vinculo inicial.',
  );
  setTextContent(
    document.getElementById('patientHighlightConsultationValue'),
    clinical?.nextAppointment?.dateLabel || 'Sem agenda',
  );
  setTextContent(
    document.getElementById('patientHighlightConsultationMeta'),
    clinical?.nextAppointment?.description || 'Assim que uma consulta for marcada, este card mostra o proximo passo.',
  );
  setTextContent(
    document.getElementById('patientHighlightChatValue'),
    isSetupRequired() ? 'Bloqueado' : (chat?.responseTimeLabel || 'Disponivel'),
  );
  setTextContent(
    document.getElementById('patientHighlightChatMeta'),
    isSetupRequired()
      ? 'Conecte sua conta para liberar o canal com o nutricionista.'
      : pendingChecklist > 0
        ? `${pendingChecklist} ponto(s) do acompanhamento ainda pedem sua atencao.`
        : 'Use o chat para ajustes rapidos de plano, fome, treino e rotina.',
  );
}

function setInteractionsEnabled(isEnabled) {
  [addMealButton, quickAddMealButton].forEach((button) => {
    if (button) {
      button.disabled = !isEnabled || state.isAddingMeal;
    }
  });

  if (chatInput) {
    chatInput.disabled = !isEnabled || state.isSendingMessage;
  }

  const submitButton = chatForm?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = !isEnabled || state.isSendingMessage;
  }
}

function renderConnectionPanel() {
  const patient = getPatientData();
  const nutritionist = patient.nutritionist || null;
  const isDisconnected = isSetupRequired();
  const statusElement = document.getElementById('patientConnectionStatus');
  const linkedNameElement = document.getElementById('patientLinkedNutritionistName');

  setTextContent(
    document.getElementById('patientConnectionTitle'),
    isDisconnected ? 'Conecte sua conta ao nutricionista' : 'Seu vinculo com o nutricionista',
  );
  setTextContent(
    document.getElementById('patientConnectionDescription'),
    isDisconnected
      ? 'Informe o e-mail do profissional e complete seus dados basicos para liberar dashboard, chat e plano alimentar.'
      : 'Seu acompanhamento esta conectado. Se precisar reconfirmar o vinculo, use o mesmo e-mail do profissional abaixo.',
  );

  if (statusElement) {
    statusElement.textContent = isDisconnected ? 'Aguardando vinculo' : 'Conta conectada';
    statusElement.className = isDisconnected
      ? 'rounded-full bg-[#fdf6e7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#916a12]'
      : 'rounded-full bg-[#eef6e8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-700';
  }

  setTextContent(
    linkedNameElement,
    nutritionist ? `Nutricionista: ${nutritionist.name}` : 'Nenhum nutricionista conectado',
  );

  if (patientNutritionistEmail && !patientNutritionistEmail.value && nutritionist?.email) {
    patientNutritionistEmail.value = nutritionist.email;
  }

  if (patientConnectionObjective && !patientConnectionObjective.value && patient.objective) {
    patientConnectionObjective.value = patient.objective;
  }

  setInteractionsEnabled(!isDisconnected);

  if (patientConnectionSubmitButton) {
    patientConnectionSubmitButton.disabled = state.isLinkingNutritionist;
    patientConnectionSubmitButton.textContent = state.isLinkingNutritionist
      ? 'Conectando...'
      : (isDisconnected ? 'Conectar ao nutricionista' : 'Atualizar vinculo');
  }
}

function renderSidebar() {
  const overview = state.dashboard?.overview;
  const clinical = state.dashboard?.clinical;
  const nutritionist = getNutritionistData();
  const mealCount = state.dashboard?.meals?.length || 0;
  const remainingMeals = Math.max(0, getDailyMealTarget() - mealCount);
  const adherencePercent = overview?.adherencePercent || 0;

  const statusLabel = adherencePercent >= 85
    ? 'boa aderencia'
    : adherencePercent >= 60
      ? 'aderencia estavel'
      : 'espaco para melhorar a consistencia';
  const remainingText = remainingMeals > 0
    ? `Faltam ${pluralize(remainingMeals, 'refeicao', 'refeicoes')}`
    : 'Suas refeicoes principais de hoje ja foram registradas';

  setTextContent(
    document.getElementById('sidebarStatusText'),
    `Seu plano de hoje esta com ${statusLabel}. ${remainingText} e seu check-in com ${nutritionist.name}.`,
  );

  if (clinical?.nextAppointment) {
    setTextContent(
      document.getElementById('sidebarAppointmentMeta'),
      `${clinical.nextAppointment.dateLabel} com ${nutritionist.name}`,
    );
    setTextContent(
      document.getElementById('sidebarAppointmentNote'),
      clinical.nextAppointment.description,
    );
    return;
  }

  setTextContent(
    document.getElementById('sidebarAppointmentMeta'),
    `Sem consulta agendada com ${nutritionist.name}`,
  );
  setTextContent(
    document.getElementById('sidebarAppointmentNote'),
    'Assim que um acompanhamento for marcado, os detalhes vao aparecer aqui.',
  );
}

function renderWeeklyBars(items) {
  const container = document.getElementById('weeklyCaloriesChart');

  if (!container) {
    return;
  }

  if (!items?.length) {
    container.innerHTML = '<p class="col-span-full text-sm text-nutriflow-600">Comece a registrar refeicoes para acompanhar o comportamento da semana.</p>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div title="${escapeHtml(`${item.calories} kcal`)}">
      <span style="height:${Math.max(item.percent, item.calories > 0 ? 14 : 6)}%"></span>
      <small>${escapeHtml(item.label)}</small>
    </div>
  `).join('');
}

function getWeeklyHeadline(weeklyCalories) {
  const activeDays = weeklyCalories.filter((item) => item.calories > 0);

  if (!activeDays.length) {
    return {
      headline: 'Comece a registrar para acompanhar sua regularidade nutricional.',
      trend: '0%',
    };
  }

  const firstCalories = activeDays[0].calories;
  const lastCalories = activeDays[activeDays.length - 1].calories;
  const trendValue = firstCalories > 0 ? Math.round(((lastCalories - firstCalories) / firstCalories) * 100) : 0;
  const prefix = trendValue > 0 ? '+' : '';

  if (trendValue >= 8) {
    return {
      headline: 'Seu consumo esta mais proximo da meta nos dias mais recentes.',
      trend: `${prefix}${trendValue}%`,
    };
  }

  if (trendValue <= -8) {
    return {
      headline: 'Seu consumo caiu nos ultimos dias. Vale revisar horarios e lanches.',
      trend: `${trendValue}%`,
    };
  }

  return {
    headline: 'Seu consumo esta mais regular e previsivel ao longo da semana.',
    trend: `${prefix}${trendValue}%`,
  };
}

function renderOverview() {
  const overview = state.dashboard?.overview || {
    adherencePercent: 0,
    caloriesConsumed: 0,
    caloriesTarget: 0,
    fiber: 0,
    waterLiters: 0,
    macros: [],
    weeklyCalories: [],
  };
  const macroByLabel = Object.fromEntries((overview.macros || []).map((macro) => [macro.label, macro]));
  const mealCount = state.dashboard?.meals?.length || 0;
  const weeklyCopy = getWeeklyHeadline(overview.weeklyCalories || []);

  setTextContent(document.getElementById('overviewAdherenceValue'), `${overview.adherencePercent || 0}%`);
  setTextContent(
    document.getElementById('overviewAdherenceNote'),
    `${pluralize(mealCount, 'refeicao registrada', 'refeicoes registradas')} hoje e ${Number(overview.waterLiters || 0).toFixed(1)}L de agua.`,
  );
  setTextContent(document.getElementById('calorieConsumedValue'), formatNumber(overview.caloriesConsumed));
  setTextContent(document.getElementById('calorieTargetValue'), `de ${formatNumber(overview.caloriesTarget)} kcal`);
  setTextContent(document.getElementById('fiberValue'), `${overview.fiber || 0}g`);
  setTextContent(document.getElementById('waterValue'), `${Number(overview.waterLiters || 0).toFixed(1)}L`);

  const macroTargets = [
    ['Proteinas', 'proteinValue', 'proteinProgress', 'proteinNote'],
    ['Carboidratos', 'carbsValue', 'carbsProgress', 'carbsNote'],
    ['Gorduras', 'fatsValue', 'fatsProgress', 'fatsNote'],
  ];

  macroTargets.forEach(([label, valueId, progressId, noteId]) => {
    const macro = macroByLabel[label] || { value: 0, progress: 0, note: 'Sem meta definida' };
    setTextContent(document.getElementById(valueId), `${macro.value || 0}g`);

    const progressBar = document.getElementById(progressId);
    if (progressBar) {
      progressBar.style.width = `${macro.progress || 0}%`;
    }

    setTextContent(document.getElementById(noteId), macro.note || 'Sem meta definida');
  });

  if (overviewRing) {
    overviewRing.style.setProperty('--progress', `${Math.max(0, Math.min(100, overview.adherencePercent || 0))}%`);
  }

  setTextContent(document.getElementById('weeklyCaloriesHeadline'), weeklyCopy.headline);
  setTextContent(document.getElementById('weeklyTrendPercent'), weeklyCopy.trend);
  renderWeeklyBars(overview.weeklyCalories || []);
}

function renderGoals() {
  const container = document.getElementById('goalsList');
  const goals = state.dashboard?.goals?.items || [];

  if (!container) {
    return;
  }

  if (!goals.length) {
    container.innerHTML = '<div class="rounded-[24px] border border-nutriflow-100 bg-white p-4 text-sm text-nutriflow-600">Nenhuma meta disponivel no momento.</div>';
  } else {
    container.innerHTML = goals.map((goal) => `
      <article class="rounded-[24px] border border-nutriflow-100 bg-white p-4">
        <div class="flex items-center justify-between gap-4">
          <p class="text-sm font-semibold text-nutriflow-950">${escapeHtml(goal.label)}</p>
          <span class="text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-600">${escapeHtml(goal.valueLabel)}</span>
        </div>
        <div class="mini-progress mt-4"><span style="width:${goal.percent || 0}%"></span></div>
      </article>
    `).join('');
  }

  setTextContent(document.getElementById('goalFocusTitle'), state.dashboard?.goals?.focusTitle || 'Mantenha o plano do dia com consistencia.');
  setTextContent(document.getElementById('clinicalObservationNote'), state.dashboard?.goals?.observationNote || 'Sem observacoes clinicas registradas ate o momento.');
}

function renderMeals() {
  const container = document.getElementById('mealList');
  const meals = state.dashboard?.meals || [];

  if (!container) {
    return;
  }

  if (!meals.length) {
    container.innerHTML = `
      <article class="meal-item rounded-[24px] border border-dashed border-nutriflow-200 bg-white p-5 text-sm leading-7 text-nutriflow-600">
        Nenhuma refeicao registrada hoje. Use o botao "Nova refeicao" para registrar o proximo horario.
      </article>
    `;
    return;
  }

  container.innerHTML = meals.map((meal) => `
    <article class="meal-item rounded-[24px] border border-nutriflow-100 bg-white p-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-4">
          <span class="timeline-dot"></span>
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.16em] text-nutriflow-500">${escapeHtml(meal.timeLabel)} - ${escapeHtml(meal.mealType)}</p>
            <h3 class="mt-2 text-lg font-semibold tracking-[-0.03em] text-nutriflow-950">${escapeHtml(meal.title)}</h3>
            <p class="mt-2 text-sm text-nutriflow-600">${escapeHtml(meal.description)}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-nutriflow-700">
          <span class="rounded-full bg-nutriflow-100 px-3 py-2">${meal.calories} kcal</span>
          <span class="rounded-full bg-[#edf7e7] px-3 py-2">${meal.protein}g proteina</span>
          <span class="rounded-full bg-[#f3f8fd] px-3 py-2">${meal.carbs}g carbo</span>
        </div>
      </div>
    </article>
  `).join('');
}

function getHistoryPillClass(label) {
  const normalizedLabel = String(label || '').toLowerCase();

  if (normalizedLabel === 'completo' || normalizedLabel === 'excelente') {
    return 'bg-[#eef6e8] text-nutriflow-700';
  }

  if (normalizedLabel === 'parcial' || normalizedLabel === 'boa' || normalizedLabel === 'moderada') {
    return 'bg-[#fdf6e7] text-[#916a12]';
  }

  return 'bg-[#f5f6f7] text-nutriflow-600';
}

function renderHistory() {
  const container = document.getElementById('historyList');
  const history = state.dashboard?.history || [];

  if (!container) {
    return;
  }

  if (!history.length) {
    container.innerHTML = `
      <div class="px-4 py-5 text-sm text-nutriflow-600">
        Ainda nao ha historico suficiente para comparar seus dias alimentares.
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item) => `
    <div class="history-row grid grid-cols-[1.2fr_.8fr_.7fr_.7fr] items-center gap-3 px-4 py-4">
      <span class="font-medium text-nutriflow-950">${escapeHtml(item.dateLabel)}</span>
      <span class="text-nutriflow-700">${escapeHtml(item.planLabel)}</span>
      <span class="text-nutriflow-700">${escapeHtml(item.caloriesLabel)}</span>
      <span><span class="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${getHistoryPillClass(item.checkInLabel)}">${escapeHtml(item.checkInLabel)}</span></span>
    </div>
  `).join('');
}

function renderPlan() {
  const container = document.getElementById('planSections');
  const plan = state.dashboard?.plan;

  if (!container) {
    return;
  }

  if (!plan?.sections?.length) {
    container.innerHTML = '<div class="plan-row text-sm text-nutriflow-600">Nenhum plano alimentar ativo para exibir.</div>';
    return;
  }

  container.innerHTML = `
    <div class="rounded-[24px] border border-[#dbe9d0] bg-[#f6fbf1] p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-nutriflow-600">Plano atual</p>
      <p class="mt-2 text-lg font-semibold tracking-[-0.03em] text-nutriflow-950">${escapeHtml(plan.title)}</p>
    </div>
    ${plan.sections.map((section) => `
      <article class="plan-row">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-nutriflow-500">${escapeHtml(section.slotLabel)}</p>
        <h3 class="mt-3 text-lg font-semibold tracking-[-0.03em] text-nutriflow-950">${escapeHtml(section.title)}</h3>
        <p class="mt-2 text-sm leading-7 text-nutriflow-700">${escapeHtml(section.description)}</p>
      </article>
    `).join('')}
  `;
}

function renderWeightChart(labels, values) {
  const svg = document.getElementById('weightChart');

  if (!svg) {
    return;
  }

  if (!values?.length) {
    svg.innerHTML = '<text x="160" y="90" text-anchor="middle" fill="#7a8d70" font-size="13">Sem historico de peso suficiente</text>';
    return;
  }

  const maxValue = Math.max(...values) + 0.6;
  const minValue = Math.min(...values) - 0.6;
  const chartWidth = 280;
  const chartHeight = 112;
  const startX = 20;
  const endX = 300;
  const baseY = 150;
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = startX + (stepX * index);
    const progress = (value - minValue) / (maxValue - minValue || 1);
    const y = baseY - (progress * chartHeight);
    return { x, y, value };
  });
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${endX} ${baseY} L ${startX} ${baseY} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="patientWeightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7fb561" stop-opacity="0.34"></stop>
        <stop offset="100%" stop-color="#7fb561" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <g stroke="rgba(79,107,61,.12)" stroke-width="1">
      <line x1="12" y1="38" x2="308" y2="38"></line>
      <line x1="12" y1="74" x2="308" y2="74"></line>
      <line x1="12" y1="110" x2="308" y2="110"></line>
      <line x1="12" y1="146" x2="308" y2="146"></line>
    </g>
    <path d="${area}" fill="url(#patientWeightGradient)"></path>
    <path d="${line}" class="weight-chart-line"></path>
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#4f6b3d"></circle>`).join('')}
  `;

  const labelsContainer = document.getElementById('weightChartLabels');

  if (labelsContainer) {
    labelsContainer.innerHTML = labels.map((label) => `<span>${escapeHtml(label)}</span>`).join('');
  }
}

function renderWeight() {
  const weight = state.dashboard?.weight || {
    labels: [],
    values: [],
    variationLabel: '--',
    currentLabel: '--',
    targetLabel: '--',
    paceLabel: '--',
  };

  setTextContent(document.getElementById('weightVariationValue'), weight.variationLabel || '--');
  setTextContent(document.getElementById('currentWeightValue'), weight.currentLabel || '--');
  setTextContent(document.getElementById('targetWeightValue'), weight.targetLabel || '--');
  setTextContent(document.getElementById('paceValue'), weight.paceLabel || '--');
  renderWeightChart(weight.labels || [], weight.values || []);
}

function renderChat() {
  const chat = state.dashboard?.chat || {
    responseTimeLabel: 'Sem mensagens',
    quickReplies: [],
    messages: [],
  };
  const patient = getPatientData();
  const nutritionist = getNutritionistData();

  setTextContent(document.getElementById('chatResponseTime'), `Resposta media: ${chat.responseTimeLabel}`);

  if (chatMessages) {
    if (!chat.messages.length) {
      chatMessages.innerHTML = `
        <div class="rounded-[24px] border border-dashed border-nutriflow-200 bg-white p-5 text-sm leading-7 text-nutriflow-600">
          Nenhuma mensagem ainda. Use o chat para pedir ajustes no plano ou tirar duvidas.
        </div>
      `;
    } else {
      chatMessages.innerHTML = chat.messages.map((message) => {
        const isUserMessage = message.senderRole === 'PATIENT';

        return `
          <div class="chat-row${isUserMessage ? ' is-user' : ''}">
            ${isUserMessage ? '' : `<div class="chat-avatar">${escapeHtml(getInitials(nutritionist.name))}</div>`}
            <div class="chat-bubble${isUserMessage ? ' is-user' : ''}">
              <p class="${isUserMessage ? 'text-xs font-semibold uppercase tracking-[0.14em] text-white/60' : 'text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-500'}">
                ${escapeHtml(message.senderName || (isUserMessage ? patient.name : nutritionist.name))} - ${escapeHtml(message.timeLabel || 'agora')}
              </p>
              <p class="mt-2 text-sm leading-7">${escapeHtml(message.content)}</p>
            </div>
          </div>
        `;
      }).join('');

      window.requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
    }
  }

  const quickReplies = document.getElementById('quickReplies');

  if (quickReplies) {
    quickReplies.innerHTML = (chat.quickReplies || []).map((reply) => `
      <button class="quick-reply" type="button" data-chat-reply="${escapeHtml(reply)}">${escapeHtml(reply)}</button>
    `).join('');

    quickReplies.querySelectorAll('[data-chat-reply]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!chatInput) {
          return;
        }

        chatInput.value = button.dataset.chatReply || '';
        chatInput.focus();
      });
    });
  }
}

function renderClinical() {
  const clinical = state.dashboard?.clinical || {
    nextAppointment: null,
    checklist: [],
    insight: 'Sem insights disponiveis no momento.',
  };
  const checklist = clinical.checklist || [];
  const pendingItems = checklist.filter((item) => !item.done).length;

  if (clinical.nextAppointment) {
    setTextContent(document.getElementById('nextAppointmentTitle'), clinical.nextAppointment.dateLabel);
    setTextContent(document.getElementById('nextAppointmentDescription'), clinical.nextAppointment.description);
  } else {
    setTextContent(document.getElementById('nextAppointmentTitle'), 'Nenhuma consulta agendada');
    setTextContent(document.getElementById('nextAppointmentDescription'), 'Assim que sua nutricionista marcar um novo acompanhamento, ele vai aparecer aqui.');
  }

  const badgeText = pendingItems > 0
    ? `${pluralize(pendingItems, 'item pendente', 'itens pendentes')}`
    : 'Tudo em dia';
  setTextContent(document.getElementById('clinicalBadge'), badgeText);

  const checklistContainer = document.getElementById('checklistItems');
  if (checklistContainer) {
    if (!checklist.length) {
      checklistContainer.innerHTML = '<li class="text-sm text-nutriflow-600">Nenhum item de acompanhamento disponivel.</li>';
    } else {
      checklistContainer.innerHTML = checklist.map((item) => `
        <li class="flex items-start gap-3">
          <span class="check-dot${item.done ? ' is-done' : ''} mt-1"></span>
          <span class="leading-7">${escapeHtml(item.label)}</span>
        </li>
      `).join('');
    }
  }

  setTextContent(document.getElementById('weeklyInsightText'), clinical.insight || 'Sem insights disponiveis no momento.');
}

function renderDashboard() {
  renderHeader();
  renderHighlights();
  renderConnectionPanel();
  renderSidebar();
  renderOverview();
  renderGoals();
  renderMeals();
  renderHistory();
  renderPlan();
  renderWeight();
  renderChat();
  renderClinical();
}

async function refreshDashboard() {
  const payload = await getPatientDashboard();
  applyDashboardState(payload);
  renderDashboard();
}

function setMealButtonsLoading(isLoading) {
  const label = isLoading ? 'Registrando...' : 'Adicionar lanche';
  const quickLabel = isLoading ? 'Registrando...' : 'Nova refeicao';

  [addMealButton, quickAddMealButton].forEach((button) => {
    if (button) {
      button.disabled = isLoading;
    }
  });

  if (addMealButton) {
    addMealButton.textContent = label;
  }

  if (quickAddMealButton) {
    quickAddMealButton.textContent = quickLabel;
  }
}

async function handleAddMeal() {
  if (isSetupRequired()) {
    showToast('Conecte sua conta a um nutricionista antes de registrar refeicoes.');
    return;
  }

  if (state.isAddingMeal) {
    return;
  }

  state.isAddingMeal = true;
  setMealButtonsLoading(true);

  try {
    const result = await createMealEntry();
    await refreshDashboard();
    showToast(result.message || 'Refeicao registrada com sucesso.');
  } catch (error) {
    showToast(error.message || 'Nao foi possivel registrar a refeicao.');
  } finally {
    state.isAddingMeal = false;
    setMealButtonsLoading(false);
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();

  if (isSetupRequired()) {
    showToast('Conecte sua conta a um nutricionista antes de usar o chat.');
    return;
  }

  if (!chatInput || state.isSendingMessage) {
    return;
  }

  const content = chatInput.value.trim();

  if (!content) {
    showToast('Digite uma mensagem para enviar.');
    return;
  }

  state.isSendingMessage = true;
  chatInput.disabled = true;

  const submitButton = chatForm?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
  }

  try {
    const result = await sendPatientMessage({ content });
    chatInput.value = '';
    await refreshDashboard();
    showToast(result.message || 'Mensagem enviada para sua nutricionista.');
  } catch (error) {
    showToast(error.message || 'Nao foi possivel enviar sua mensagem.');
  } finally {
    state.isSendingMessage = false;
    chatInput.disabled = false;

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Enviar';
    }
  }
}

async function handleNutritionistLink(event) {
  event.preventDefault();

  if (state.isLinkingNutritionist) {
    return;
  }

  const nutritionistEmail = patientNutritionistEmail?.value.trim() || '';
  const age = patientConnectionAge?.value.trim() || '';
  const objective = patientConnectionObjective?.value.trim() || '';
  const restrictions = patientConnectionRestrictions?.value.trim() || '';

  if (!nutritionistEmail) {
    showToast('Informe o e-mail do nutricionista para concluir o vinculo.');
    return;
  }

  if (isSetupRequired() && (!age || !objective)) {
    showToast('Informe idade e objetivo para concluir a conexao inicial.');
    return;
  }

  state.isLinkingNutritionist = true;
  renderConnectionPanel();

  try {
    const result = await linkNutritionist({
      nutritionistEmail,
      age,
      objective,
      restrictions,
    });

    persistCurrentUser({
      ...state.currentUser,
      ...result.patient,
      nutritionist: result.patient?.nutritionist,
    });

    await refreshDashboard();
    showToast(result.message || 'Vinculo atualizado com sucesso.');
  } catch (error) {
    showToast(error.message || 'Nao foi possivel concluir o vinculo.');
  } finally {
    state.isLinkingNutritionist = false;
    renderConnectionPanel();
  }
}

function bindNavigationState() {
  document.querySelectorAll('.mobile-nav-pill').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-pill').forEach((item) => {
        item.classList.remove('is-active');
      });
      button.classList.add('is-active');
    });
  });
}

function bindEvents() {
  logoutButton?.addEventListener('click', clearSessionAndRedirect);
  addMealButton?.addEventListener('click', handleAddMeal);
  quickAddMealButton?.addEventListener('click', handleAddMeal);
  chatForm?.addEventListener('submit', handleChatSubmit);
  patientConnectionForm?.addEventListener('submit', handleNutritionistLink);
  bindNavigationState();
}

async function init() {
  if (!ensurePatientAccess()) {
    return;
  }

  renderHeader();
  bindEvents();
  window.NutriFlowUi?.setupSectionNavigation({ linkSelector: '.sidebar-link, .mobile-nav-pill' });

  try {
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Nao foi possivel carregar o dashboard do paciente.');
  }
}

init();
