function safeParse(jsonValue) {
  try {
    return jsonValue ? JSON.parse(jsonValue) : null;
  } catch (error) {
    return null;
  }
}

const state = {
  currentUser: safeParse(localStorage.getItem('nutriflow.user')),
  summary: null,
  patients: [],
  selectedPatientId: null,
  conversation: null,
  conversationPatientId: null,
  messages: [],
  appointments: [],
  challenges: [],
  mealPlans: [],
  assessments: [],
  reports: null,
  isLoadingConversation: false,
  isSendingConversation: false,
  isLinkingPatient: false,
};

const patientNameFilter = document.getElementById('patientNameFilter');
const patientObjectiveFilter = document.getElementById('patientObjectiveFilter');
const patientStatusFilter = document.getElementById('patientStatusFilter');
const globalPatientSearch = document.getElementById('globalPatientSearch');
const patientsList = document.getElementById('patientsList');
const emptyPatientsState = document.getElementById('emptyPatientsState');
const mealPlanModal = document.getElementById('mealPlanModal');
const assessmentModal = document.getElementById('assessmentModal');
const mealPlanForm = document.getElementById('mealPlanForm');
const assessmentForm = document.getElementById('assessmentForm');
const mealPlanPatient = document.getElementById('mealPlanPatient');
const assessmentPatient = document.getElementById('assessmentPatient');
const assessmentWeight = document.getElementById('assessmentWeight');
const assessmentHeight = document.getElementById('assessmentHeight');
const assessmentImc = document.getElementById('assessmentImc');
const challengeForm = document.getElementById('challengeForm');
const patientLinkForm = document.getElementById('patientLinkForm');
const linkPatientEmail = document.getElementById('linkPatientEmail');
const linkPatientAge = document.getElementById('linkPatientAge');
const linkPatientObjective = document.getElementById('linkPatientObjective');
const linkPatientRestrictions = document.getElementById('linkPatientRestrictions');
const linkPatientSubmitButton = document.getElementById('linkPatientSubmitButton');
const conversationForm = document.getElementById('conversationForm');
const conversationInput = document.getElementById('conversationInput');
const conversationSubmitButton = document.getElementById('conversationSubmitButton');
const conversationStream = document.getElementById('conversationStream');
const toast = document.getElementById('nutritionistToast');

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

function isNutritionistProfile(profile) {
  return String(profile || '').trim().toLowerCase() === 'nutricionista';
}

function ensureNutritionistAccess() {
  if (!state.currentUser || !isNutritionistProfile(state.currentUser.profile) || !getSessionToken()) {
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatPrettyDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
}

function formatSidebarDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date());
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

async function getPatients() {
  return apiRequest('/api/nutritionist/dashboard');
}

async function getMessages() {
  return apiRequest('/api/nutritionist/dashboard');
}

async function getReports() {
  return apiRequest('/api/nutritionist/dashboard');
}

async function getConversation(patientId) {
  return apiRequest(`/api/nutritionist/conversation?patientId=${encodeURIComponent(patientId)}`);
}

async function sendNutritionistMessage(payload) {
  return apiRequest('/api/nutritionist/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function createMealPlan(payload) {
  return apiRequest('/api/nutritionist/meal-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function createAssessment(payload) {
  return apiRequest('/api/nutritionist/assessments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function createChallenge(payload) {
  return apiRequest('/api/nutritionist/challenges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function linkPatient(payload) {
  return apiRequest('/api/nutritionist/link-patient', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function updateFilterOptions(select, values) {
  if (!select) {
    return;
  }

  const currentValue = select.value;
  const uniqueValues = [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
  select.innerHTML = `<option value="">Todos</option>${uniqueValues
    .map((value) => `<option value="${value}">${value}</option>`)
    .join('')}`;

  if (uniqueValues.includes(currentValue)) {
    select.value = currentValue;
  }
}

function applyDashboardState(payload, preferredPatientId = state.selectedPatientId) {
  if (payload?.nutritionist) {
    persistCurrentUser({
      ...state.currentUser,
      ...payload.nutritionist,
    });
  }

  state.summary = payload?.summary || {
    activePatients: 0,
    activePlans: 0,
    monthlyAssessments: 0,
    pendingMessages: 0,
  };
  state.patients = Array.isArray(payload?.patients) ? payload.patients : [];
  state.messages = Array.isArray(payload?.messages) ? payload.messages : [];
  state.appointments = Array.isArray(payload?.appointments) ? payload.appointments : [];
  state.challenges = Array.isArray(payload?.challenges) ? payload.challenges : [];
  state.mealPlans = Array.isArray(payload?.mealPlans) ? payload.mealPlans : [];
  state.assessments = Array.isArray(payload?.assessments) ? payload.assessments : [];
  state.reports = payload?.reports || null;

  const hasSelectedPatient = state.patients.some((patient) => patient.id === preferredPatientId);
  state.selectedPatientId = hasSelectedPatient ? preferredPatientId : state.patients[0]?.id || null;

  updateFilterOptions(patientObjectiveFilter, state.patients.map((patient) => patient.objective));
  updateFilterOptions(patientStatusFilter, state.patients.map((patient) => patient.status));
}

function applyConversationState(payload, patientId = state.selectedPatientId) {
  state.conversation = payload || null;
  state.conversationPatientId = patientId || payload?.patient?.id || null;
}

async function refreshDashboard(preferredPatientId = state.selectedPatientId) {
  const payload = await getPatients();
  applyDashboardState(payload, preferredPatientId);
  renderHeader();
  renderSummaryCards();
  populatePatientSelects();
  await syncSelectedPatientView();
  renderMealPlans();
  renderAssessments();
  renderMessages();
  renderAppointments();
  renderReports();
  renderChallenges();
}

function getSelectedPatient() {
  return state.patients.find((patient) => patient.id === state.selectedPatientId) || state.patients[0] || null;
}

async function syncSelectedPatientView() {
  renderPatientsList();
  renderSelectedPatient();
  renderWorkspaceBanner();
  renderEvolution();
  await loadConversation(state.selectedPatientId);
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.classList.add('hidden');
  }, 2400);
}

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'ativo' || normalized === 'confirmado') return 'is-active';
  if (normalized === 'revisao' || normalized === 'a confirmar') return 'is-review';
  if (normalized === 'atrasado' || normalized === 'pendente') return 'is-late';
  return '';
}

function renderEmptyCard(message) {
  return `<article class="nutritionist-panel-card"><p class="text-sm text-nutriflow-600">${message}</p></article>`;
}

function renderHeader() {
  const currentUser = state.currentUser || { name: 'Nutricionista' };

  document.querySelectorAll('[data-nutritionist-name]').forEach((element) => {
    element.textContent = currentUser.name;
  });
  document.querySelectorAll('[data-nutritionist-initial]').forEach((element) => {
    element.textContent = getInitials(currentUser.name);
  });

  const greeting = document.querySelector('[data-header-greeting]');
  if (greeting) greeting.textContent = `${getGreeting()}, ${currentUser.name}`;

  const date = document.querySelector('[data-header-date]');
  if (date) date.textContent = `${formatPrettyDate()} - acompanhe pacientes, planos e mensagens em um unico fluxo.`;

  const sidebarDate = document.querySelector('[data-sidebar-date]');
  if (sidebarDate) sidebarDate.textContent = formatSidebarDate();
}

function renderSummaryCards() {
  const summary = state.summary || {
    activePatients: 0,
    activePlans: 0,
    monthlyAssessments: 0,
    pendingMessages: 0,
  };
  const plansToReview = state.mealPlans.filter((plan) => plan.status !== 'Ativo').length;

  document.getElementById('activePatientsCount').textContent = summary.activePatients;
  document.getElementById('activePlansCount').textContent = summary.activePlans;
  document.getElementById('monthlyAssessmentsCount').textContent = summary.monthlyAssessments;
  document.getElementById('pendingMessagesCount').textContent = summary.pendingMessages;
  document.getElementById('sidebarAppointmentsCount').textContent = state.appointments.length;
  document.getElementById('sidebarPlansReviewCount').textContent = plansToReview;
  document.getElementById('sidebarUnreadCount').textContent = summary.pendingMessages;
}

function renderWorkspaceBanner() {
  const summary = state.summary || {
    pendingMessages: 0,
  };
  const selectedPatient = getSelectedPatient();
  const plansToReview = state.mealPlans.filter((plan) => plan.status !== 'Ativo').length;

  document.getElementById('workspacePendingMessagesValue').textContent = `${summary.pendingMessages} pendencia(s)`;
  document.getElementById('workspacePendingMessagesMeta').textContent = summary.pendingMessages > 0
    ? 'Existe paciente aguardando retorno na inbox do dashboard.'
    : 'Nenhuma conversa critica aguardando resposta neste momento.';
  document.getElementById('workspaceTodayAppointmentsValue').textContent = `${state.appointments.length} acompanhamento(s)`;
  document.getElementById('workspaceTodayAppointmentsMeta').textContent = state.appointments.length
    ? 'A agenda ativa mostra consultas, retornos e revisoes da carteira.'
    : 'Sem acompanhamentos agendados para a janela atual.';
  document.getElementById('workspacePlansReviewValue').textContent = `${plansToReview} revisao(oes)`;
  document.getElementById('workspacePlansReviewMeta').textContent = plansToReview
    ? 'Pacientes com plano atrasado ou em revisao pedem ajuste de estrategia.'
    : 'Todos os planos principais estao ativos ou atualizados.';
  document.getElementById('workspaceSelectedPatientValue').textContent = selectedPatient?.name || 'Nenhum selecionado';
  document.getElementById('workspaceSelectedPatientMeta').textContent = selectedPatient
    ? `${selectedPatient.objective} • status ${selectedPatient.status.toLowerCase()}`
    : 'Ao abrir um paciente, este resumo acompanha o contexto clinico.';
}

function getFilteredPatients() {
  const nameTerm = String(patientNameFilter?.value || globalPatientSearch?.value || '').trim().toLowerCase();
  const objectiveTerm = patientObjectiveFilter?.value || '';
  const statusTerm = patientStatusFilter?.value || '';

  return state.patients.filter((patient) => {
    const matchesName = !nameTerm || patient.name.toLowerCase().includes(nameTerm);
    const matchesObjective = !objectiveTerm || patient.objective === objectiveTerm;
    const matchesStatus = !statusTerm || patient.status === statusTerm;
    return matchesName && matchesObjective && matchesStatus;
  });
}

function renderPatientsList() {
  const filteredPatients = getFilteredPatients();
  patientsList.innerHTML = '';
  emptyPatientsState.classList.toggle('hidden', filteredPatients.length > 0);

  filteredPatients.forEach((patient) => {
    const row = document.createElement('div');
    row.className = `patient-row ${patient.id === state.selectedPatientId ? 'is-active' : ''}`;
    row.innerHTML = `
      <div class="hidden items-center gap-3 md:grid md:grid-cols-[1.1fr_.45fr_.95fr_.85fr_.9fr_.7fr] md:px-4 md:py-4">
        <div class="flex items-center gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef6e8] text-sm font-bold text-nutriflow-900">${getInitials(patient.name)}</div>
          <div>
            <p class="font-semibold text-nutriflow-950">${patient.name}</p>
            <p class="text-xs text-nutriflow-600">${patient.currentPlan}</p>
          </div>
        </div>
        <span class="text-sm text-nutriflow-700">${patient.age}</span>
        <span class="text-sm text-nutriflow-700">${patient.objective}</span>
        <span class="text-sm text-nutriflow-700">${patient.lastAssessment}</span>
        <span><span class="status-pill ${getStatusClass(patient.status)}">${patient.status}</span></span>
        <div class="text-right"><button class="patient-action" data-select-patient="${patient.id}">Ver perfil</button></div>
      </div>
      <div class="space-y-4 px-4 py-4 md:hidden">
        <div class="flex items-center gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef6e8] text-sm font-bold text-nutriflow-900">${getInitials(patient.name)}</div>
          <div>
            <p class="font-semibold text-nutriflow-950">${patient.name}</p>
            <p class="text-xs text-nutriflow-600">${patient.age} anos - ${patient.objective}</p>
          </div>
        </div>
        <div class="flex items-center justify-between text-sm text-nutriflow-700">
          <span>Ultima avaliacao: ${patient.lastAssessment}</span>
          <span class="status-pill ${getStatusClass(patient.status)}">${patient.status}</span>
        </div>
        <button class="patient-action w-full justify-center" data-select-patient="${patient.id}">Ver perfil</button>
      </div>
    `;
    patientsList.appendChild(row);
  });

  patientsList.querySelectorAll('[data-select-patient]').forEach((button) => {
    button.addEventListener('click', () => {
      void handlePatientSelection(button.dataset.selectPatient);
    });
  });
}

function renderSelectedPatient() {
  const patient = getSelectedPatient();

  if (!patient) {
    document.getElementById('selectedPatientStatusBadge').textContent = 'Sem dados';
    document.getElementById('selectedPatientStatusBadge').className = 'rounded-full bg-[#eef6e8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-700';
    document.getElementById('selectedPatientInitials').textContent = '--';
    document.getElementById('selectedPatientName').textContent = 'Nenhum paciente selecionado';
    document.getElementById('selectedPatientGoal').textContent = 'Conecte pacientes para visualizar o resumo clinico.';
    document.getElementById('selectedPatientWeight').textContent = '--';
    document.getElementById('selectedPatientHeight').textContent = '--';
    document.getElementById('selectedPatientRestrictions').textContent = 'Sem informacoes disponiveis.';
    document.getElementById('selectedPatientMeal').textContent = 'Sem refeicao registrada.';
    document.getElementById('selectedPatientProgressLabel').textContent = '0%';
    document.getElementById('selectedPatientProgressBar').style.width = '0%';
    document.getElementById('selectedPatientLastAssessment').textContent = 'Nenhuma avaliacao registrada.';
    document.getElementById('selectedChartPatient').textContent = 'Sem paciente';
    return;
  }

  state.selectedPatientId = patient.id;
  document.getElementById('selectedPatientStatusBadge').textContent = patient.status;
  document.getElementById('selectedPatientStatusBadge').className = `status-pill ${getStatusClass(patient.status)} rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]`;
  document.getElementById('selectedPatientInitials').textContent = getInitials(patient.name);
  document.getElementById('selectedPatientName').textContent = patient.name;
  document.getElementById('selectedPatientGoal').textContent = patient.objective;
  document.getElementById('selectedPatientWeight').textContent = `${patient.weight.toFixed(1)}kg`;
  document.getElementById('selectedPatientHeight').textContent = `${patient.height.toFixed(2)}m`;
  document.getElementById('selectedPatientRestrictions').textContent = patient.restrictions;
  document.getElementById('selectedPatientMeal').textContent = patient.lastMeal;
  document.getElementById('selectedPatientProgressLabel').textContent = `${patient.progress}%`;
  document.getElementById('selectedPatientProgressBar').style.width = `${patient.progress}%`;
  document.getElementById('selectedPatientLastAssessment').textContent = `Ultima avaliacao em ${patient.lastAssessment}`;
  document.getElementById('selectedChartPatient').textContent = patient.name;
}

function setConversationFormState(disabled) {
  if (conversationInput) {
    conversationInput.disabled = disabled;
  }

  if (conversationSubmitButton) {
    conversationSubmitButton.disabled = disabled;
    conversationSubmitButton.textContent = disabled ? 'Enviando...' : 'Responder';
  }
}

function renderConversationPlaceholder(title, description, badgeText) {
  const badge = document.getElementById('conversationPendingBadge');

  document.getElementById('conversationPatientName').textContent = title;
  document.getElementById('conversationPatientMeta').textContent = description;

  if (badge) {
    badge.textContent = badgeText;
    badge.className = 'rounded-full bg-[#eef6e8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-700';
  }

  if (conversationStream) {
    conversationStream.innerHTML = `
      <div class="rounded-[24px] border border-dashed border-nutriflow-200 bg-white p-5 text-sm leading-7 text-nutriflow-600">
        ${escapeHtml(description)}
      </div>
    `;
  }
}

function renderConversation() {
  const selectedPatient = getSelectedPatient();
  const conversation = state.conversation;
  const badge = document.getElementById('conversationPendingBadge');

  if (!selectedPatient) {
    renderConversationPlaceholder(
      'Selecione um paciente',
      'Escolha um paciente da carteira para visualizar a conversa completa e responder com contexto.',
      'Sem conversa',
    );
    setConversationFormState(true);
    return;
  }

  if (state.isLoadingConversation) {
    renderConversationPlaceholder(
      selectedPatient.name,
      'Carregando historico da conversa deste paciente.',
      'Carregando',
    );
    setConversationFormState(true);
    return;
  }

  if (!conversation || state.conversationPatientId !== selectedPatient.id) {
    renderConversationPlaceholder(
      selectedPatient.name,
      'Nao foi possivel carregar a conversa deste paciente agora.',
      'Indisponivel',
    );
    setConversationFormState(true);
    return;
  }

  const pendingMessages = conversation.patient?.pendingMessages || 0;
  const latestMessageTime = conversation.patient?.latestMessageTime
    ? `Ultima mensagem ${conversation.patient.latestMessageTime}`
    : 'Sem mensagens recentes';

  document.getElementById('conversationPatientName').textContent = conversation.patient?.name || selectedPatient.name;
  document.getElementById('conversationPatientMeta').textContent = `${selectedPatient.objective} - ${selectedPatient.status} - ${latestMessageTime}`;

  if (badge) {
    badge.textContent = pendingMessages > 0
      ? pluralize(pendingMessages, 'pendencia', 'pendencias')
      : 'Em dia';
    badge.className = pendingMessages > 0
      ? 'status-pill is-review rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]'
      : 'status-pill is-active rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]';
  }

  if (conversationStream) {
    if (!conversation.messages?.length) {
      conversationStream.innerHTML = `
        <div class="rounded-[24px] border border-dashed border-nutriflow-200 bg-white p-5 text-sm leading-7 text-nutriflow-600">
          Esta conversa ainda nao tem mensagens. Voce pode iniciar o contato por aqui.
        </div>
      `;
    } else {
      conversationStream.innerHTML = conversation.messages.map((message) => {
        const isNutritionistMessage = message.senderRole === 'NUTRITIONIST';

        return `
          <div class="chat-row${isNutritionistMessage ? ' is-user' : ''}">
            ${isNutritionistMessage ? '' : `<div class="chat-avatar">${escapeHtml(getInitials(selectedPatient.name))}</div>`}
            <div class="chat-bubble${isNutritionistMessage ? ' is-user' : ''}">
              <p class="${isNutritionistMessage ? 'text-xs font-semibold uppercase tracking-[0.14em] text-white/60' : 'text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-500'}">
                ${escapeHtml(message.senderName)} - ${escapeHtml(message.timeLabel || 'agora')}
              </p>
              <p class="mt-2 text-sm leading-7">${escapeHtml(message.content)}</p>
            </div>
          </div>
        `;
      }).join('');

      window.requestAnimationFrame(() => {
        conversationStream.scrollTop = conversationStream.scrollHeight;
      });
    }
  }

  setConversationFormState(state.isSendingConversation);
}

async function loadConversation(patientId = state.selectedPatientId) {
  if (!patientId) {
    applyConversationState(null, null);
    state.isLoadingConversation = false;
    renderConversation();
    return;
  }

  state.isLoadingConversation = true;
  applyConversationState(null, patientId);
  renderConversation();

  try {
    const payload = await getConversation(patientId);
    applyConversationState(payload, patientId);
  } finally {
    state.isLoadingConversation = false;
    renderConversation();
  }
}

async function handlePatientSelection(patientId, focusConversation = false) {
  state.selectedPatientId = patientId;
  await syncSelectedPatientView();

  if (focusConversation) {
    document.getElementById('mensagens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderMealPlans() {
  const container = document.getElementById('latestMealPlans');

  if (!state.mealPlans.length) {
    container.innerHTML = renderEmptyCard('Nenhum plano alimentar registrado para esta carteira.');
    return;
  }

  container.innerHTML = '';
  state.mealPlans.slice(0, 3).forEach((plan) => {
    const card = document.createElement('article');
    card.className = 'nutritionist-panel-card';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-nutriflow-500">${plan.patient}</p>
          <h3 class="mt-2 text-lg font-semibold tracking-[-0.03em]">${plan.title}</h3>
          <p class="mt-2 text-sm text-nutriflow-700">${plan.calories} kcal - ${plan.startDate} ate ${plan.endDate}</p>
          <p class="mt-2 text-xs text-nutriflow-500">P ${plan.protein || '-'}g | C ${plan.carbs || '-'}g | G ${plan.fats || '-'}g</p>
        </div>
        <span class="status-pill ${getStatusClass(plan.status)}">${plan.status}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderAssessments() {
  const container = document.getElementById('latestAssessments');

  if (!state.assessments.length) {
    container.innerHTML = renderEmptyCard('Nenhuma avaliacao fisica registrada ate o momento.');
    return;
  }

  container.innerHTML = '';
  state.assessments.slice(0, 3).forEach((assessment) => {
    const card = document.createElement('article');
    card.className = 'nutritionist-panel-card';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-nutriflow-500">${assessment.patient}</p>
          <h3 class="mt-2 text-lg font-semibold tracking-[-0.03em]">${assessment.weight.toFixed(1)}kg - IMC ${assessment.imc.toFixed(1)}</h3>
          <p class="mt-2 text-sm text-nutriflow-700">${assessment.date} - ${assessment.notes}</p>
        </div>
        <span class="status-pill is-review">${assessment.bodyFat.toFixed(1)}% gordura</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderWeightChart(patient) {
  const svg = document.getElementById('weightEvolutionChart');
  if (!patient || !patient.weightHistory?.length) {
    svg.innerHTML = '';
    return;
  }

  const values = patient.weightHistory;
  const max = Math.max(...values) + 0.8;
  const min = Math.min(...values) - 0.8;
  const width = 360;
  const height = 200;
  const stepX = 75;
  const points = values.map((value, index) => {
    const x = 30 + index * stepX;
    const y = height - 32 - ((value - min) / (max - min || 1)) * 120;
    return { x, y, value };
  });

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${height - 24} L ${points[0].x} ${height - 24} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="nutritionistWeightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7fb561" stop-opacity="0.34"></stop>
        <stop offset="100%" stop-color="#7fb561" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <g stroke="rgba(79,107,61,.12)" stroke-width="1">
      <line x1="20" y1="30" x2="340" y2="30"></line>
      <line x1="20" y1="70" x2="340" y2="70"></line>
      <line x1="20" y1="110" x2="340" y2="110"></line>
      <line x1="20" y1="150" x2="340" y2="150"></line>
    </g>
    <path d="${area}" fill="url(#nutritionistWeightGradient)"></path>
    <path d="${line}" class="weight-chart-line"></path>
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#4f6b3d"></circle>`).join('')}
    ${points.map((point, index) => `<text x="${point.x}" y="188" text-anchor="middle" fill="#7a8d70" font-size="11">S${index + 1}</text>`).join('')}
  `;
}

function renderAdherenceChart(patient) {
  const container = document.getElementById('adherenceChart');
  if (!patient || !patient.adherence?.length) {
    container.innerHTML = '<p class="text-sm text-nutriflow-600">Sem dados de adesao para exibir.</p>';
    return;
  }

  const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
  container.innerHTML = '';

  patient.adherence.forEach((value, index) => {
    const item = document.createElement('div');
    item.className = 'nutritionist-bar-column';
    item.innerHTML = `<span style="height:${value}%"></span><small>${labels[index]}</small><strong>${value}%</strong>`;
    container.appendChild(item);
  });
}

function renderPeriodProgress(patient) {
  const container = document.getElementById('periodProgressList');
  if (!patient) {
    container.innerHTML = '<p class="text-sm text-nutriflow-600">Sem progresso para exibir.</p>';
    return;
  }

  const progressItems = [
    { label: 'Evolucao de peso', value: patient.progress },
    { label: 'Aderencia do plano', value: patient.adherence[patient.adherence.length - 1] },
    { label: 'Registro alimentar', value: Math.max(38, patient.progress - 6) },
  ];

  container.innerHTML = progressItems.map((item) => `
    <div>
      <div class="mb-2 flex items-center justify-between text-sm font-medium text-nutriflow-800"><span>${item.label}</span><span>${item.value}%</span></div>
      <div class="mini-progress"><span style="width:${item.value}%"></span></div>
    </div>
  `).join('');
}

function renderEvolution() {
  const patient = getSelectedPatient();
  renderWeightChart(patient);
  renderAdherenceChart(patient);
  renderPeriodProgress(patient);
}

function renderMessages() {
  const container = document.getElementById('messagesList');

  if (!state.messages.length) {
    container.innerHTML = renderEmptyCard('Sem mensagens recentes nesta conta.');
    return;
  }

  container.innerHTML = '';
  state.messages.forEach((message) => {
    const item = document.createElement('article');
    item.className = 'nutritionist-message-card';
    item.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-nutriflow-950">${message.patient}</p>
          <p class="mt-2 text-sm leading-7 text-nutriflow-700">${message.message}</p>
          <p class="mt-2 text-xs text-nutriflow-500">${message.time}</p>
        </div>
        <div class="flex flex-col items-end gap-3">
          ${message.pending ? '<span class="status-pill is-review">Pendente</span>' : '<span class="status-pill is-active">Respondida</span>'}
          <button class="patient-action" data-open-chat="${message.patientId}">Abrir conversa</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('[data-open-chat]').forEach((button) => {
    button.addEventListener('click', () => {
      void handlePatientSelection(button.dataset.openChat, true);
      showToast('Conversa aberta no contexto do paciente selecionado.');
    });
  });
}

function renderAppointments() {
  const container = document.getElementById('appointmentsList');

  if (!state.appointments.length) {
    container.innerHTML = renderEmptyCard('Nenhum acompanhamento agendado nesta semana.');
    return;
  }

  container.innerHTML = state.appointments.map((appointment) => `
    <article class="nutritionist-panel-card">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-nutriflow-950">${appointment.patient}</p>
          <p class="mt-2 text-sm text-nutriflow-700">${appointment.date}</p>
          <p class="mt-2 text-xs uppercase tracking-[0.14em] text-nutriflow-500">${appointment.type}</p>
        </div>
        <span class="status-pill ${getStatusClass(appointment.status)}">${appointment.status}</span>
      </div>
    </article>
  `).join('');
}

function renderReports() {
  const container = document.getElementById('reportsGrid');
  const reportsData = state.reports || {
    bestAdherence: 'Sem dados',
    lowFrequency: 'Sem dados',
    averageCalories: '0 kcal',
    monthAssessments: 0,
  };
  const reports = [
    { label: 'Melhor adesao', value: reportsData.bestAdherence },
    { label: 'Baixa frequencia', value: reportsData.lowFrequency },
    { label: 'Media calorica', value: reportsData.averageCalories },
    { label: 'Avaliacoes do mes', value: reportsData.monthAssessments },
  ];

  container.innerHTML = reports.map((report) => `
    <article class="report-card">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-nutriflow-500">${report.label}</p>
      <p class="mt-4 text-2xl font-bold tracking-[-0.05em] text-nutriflow-950">${report.value}</p>
    </article>
  `).join('');
}

function renderChallenges() {
  const container = document.getElementById('challengesList');

  if (!state.challenges.length) {
    container.innerHTML = renderEmptyCard('Nenhum desafio nutricional ativo para esta carteira.');
    return;
  }

  container.innerHTML = state.challenges.map((challenge) => `
    <article class="nutritionist-panel-card">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-nutriflow-950">${challenge.title}</p>
          <p class="mt-2 text-sm text-nutriflow-700">${challenge.target}</p>
          <p class="mt-2 text-xs text-nutriflow-500">${challenge.participants} participantes ativos</p>
        </div>
        <span class="status-pill is-active">${challenge.progress}%</span>
      </div>
      <div class="mini-progress mt-4"><span style="width:${challenge.progress}%"></span></div>
    </article>
  `).join('');
}

function populatePatientSelects() {
  const options = state.patients.length
    ? state.patients.map((patient) => `<option value="${patient.id}">${patient.name}</option>`).join('')
    : '<option value="">Nenhum paciente disponivel</option>';

  mealPlanPatient.innerHTML = options;
  assessmentPatient.innerHTML = options;
  mealPlanPatient.disabled = state.patients.length === 0;
  assessmentPatient.disabled = state.patients.length === 0;

  if (state.selectedPatientId) {
    mealPlanPatient.value = state.selectedPatientId;
    assessmentPatient.value = state.selectedPatientId;
  }
}

function openModal(type) {
  if (!state.patients.length) {
    showToast('Nenhum paciente disponivel para esta operacao.');
    return;
  }

  if (type === 'meal-plan') {
    mealPlanPatient.value = state.selectedPatientId || state.patients[0]?.id || '';
    mealPlanModal.classList.remove('hidden');
    mealPlanModal.classList.add('flex');
  }

  if (type === 'assessment') {
    assessmentPatient.value = state.selectedPatientId || state.patients[0]?.id || '';
    assessmentModal.classList.remove('hidden');
    assessmentModal.classList.add('flex');
  }

  document.body.classList.add('modal-open');
}

function closeModal(type) {
  if (type === 'meal-plan') {
    mealPlanModal.classList.add('hidden');
    mealPlanModal.classList.remove('flex');
  }

  if (type === 'assessment') {
    assessmentModal.classList.add('hidden');
    assessmentModal.classList.remove('flex');
  }

  if (mealPlanModal.classList.contains('hidden') && assessmentModal.classList.contains('hidden')) {
    document.body.classList.remove('modal-open');
  }
}

function syncImc() {
  const weight = Number(assessmentWeight.value);
  const height = Number(assessmentHeight.value);
  if (!weight || !height) return;
  assessmentImc.value = (weight / (height * height)).toFixed(1);
}

function bindModalEvents() {
  document.querySelectorAll('[data-open-modal]').forEach((button) => {
    button.addEventListener('click', () => openModal(button.dataset.openModal));
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  mealPlanModal.addEventListener('click', (event) => {
    if (event.target === mealPlanModal) closeModal('meal-plan');
  });

  assessmentModal.addEventListener('click', (event) => {
    if (event.target === assessmentModal) closeModal('assessment');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal('meal-plan');
      closeModal('assessment');
    }
  });
}

function bindFilters() {
  const rerender = () => renderPatientsList();
  patientNameFilter?.addEventListener('input', rerender);
  patientObjectiveFilter?.addEventListener('change', rerender);
  patientStatusFilter?.addEventListener('change', rerender);
  globalPatientSearch?.addEventListener('input', () => {
    patientNameFilter.value = globalPatientSearch.value;
    renderPatientsList();
  });
}

function bindActions() {
  document.getElementById('logoutButton')?.addEventListener('click', clearSessionAndRedirect);

  document.getElementById('profileButton')?.addEventListener('click', () => {
    showToast('Area de perfil preparada para futura integracao.');
  });

  document.getElementById('selectedPatientViewButton')?.addEventListener('click', () => {
    const patient = getSelectedPatient();
    if (patient) showToast(`Perfil completo de ${patient.name} preparado para futura rota detalhada.`);
  });

  assessmentWeight?.addEventListener('input', syncImc);
  assessmentHeight?.addEventListener('input', syncImc);
}

function resolveParticipantIds(participantsRaw) {
  const participantNames = String(participantsRaw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const participantIds = [];
  const missingParticipants = [];

  participantNames.forEach((name) => {
    const patient = state.patients.find((item) => {
      const normalizedPatientName = item.name.toLowerCase();
      const normalizedName = name.toLowerCase();
      return normalizedPatientName === normalizedName || normalizedPatientName.includes(normalizedName);
    });

    if (!patient) {
      missingParticipants.push(name);
      return;
    }

    if (!participantIds.includes(patient.id)) {
      participantIds.push(patient.id);
    }
  });

  return {
    participantIds,
    missingParticipants,
  };
}

function setPatientLinkFormState(isLoading) {
  if (linkPatientSubmitButton) {
    linkPatientSubmitButton.disabled = isLoading;
    linkPatientSubmitButton.textContent = isLoading ? 'Vinculando...' : 'Vincular paciente';
  }
}

function bindForms() {
  mealPlanForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const patientId = mealPlanPatient.value;

    if (!patientId) {
      showToast('Selecione um paciente para criar o plano.');
      return;
    }

    try {
      await createMealPlan({
        patientId,
        title: document.getElementById('mealPlanTitle').value.trim() || 'Plano sem titulo',
        startDate: document.getElementById('mealPlanStartDate').value || new Date().toISOString().slice(0, 10),
        endDate: document.getElementById('mealPlanEndDate').value || new Date().toISOString().slice(0, 10),
        calories: document.getElementById('mealPlanCalories').value || 2000,
        protein: document.getElementById('mealPlanProtein').value || 120,
        carbs: document.getElementById('mealPlanCarbs').value || 180,
        fats: document.getElementById('mealPlanFats').value || 60,
        notes: document.getElementById('mealPlanNotes').value.trim(),
      });

      await refreshDashboard(patientId);
      mealPlanForm.reset();
      populatePatientSelects();
      closeModal('meal-plan');
      showToast('Plano alimentar salvo com sucesso.');
    } catch (error) {
      showToast(error.message);
    }
  });

  assessmentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const patientId = assessmentPatient.value;

    if (!patientId) {
      showToast('Selecione um paciente para registrar a avaliacao.');
      return;
    }

    try {
      await createAssessment({
        patientId,
        date: document.getElementById('assessmentDate').value || new Date().toISOString().slice(0, 10),
        weight: document.getElementById('assessmentWeight').value,
        height: document.getElementById('assessmentHeight').value,
        imc: document.getElementById('assessmentImc').value,
        bodyFat: document.getElementById('assessmentBodyFat').value,
        notes: document.getElementById('assessmentNotes').value.trim() || 'Avaliacao registrada.',
      });

      await refreshDashboard(patientId);
      assessmentForm.reset();
      populatePatientSelects();
      closeModal('assessment');
      showToast('Avaliacao fisica salva com sucesso.');
    } catch (error) {
      showToast(error.message);
    }
  });

  challengeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('challengeTitle').value.trim();
    const target = document.getElementById('challengeTarget').value.trim();
    const participantsRaw = document.getElementById('challengeParticipants').value.trim();
    const { participantIds, missingParticipants } = resolveParticipantIds(participantsRaw);

    if (!title || !target) {
      showToast('Informe titulo e meta do desafio.');
      return;
    }

    if (participantsRaw && missingParticipants.length) {
      showToast(`Participantes nao encontrados: ${missingParticipants.join(', ')}.`);
      return;
    }

    try {
      await createChallenge({
        title,
        target,
        participantIds,
      });

      await refreshDashboard(state.selectedPatientId);
      challengeForm.reset();
      showToast('Desafio nutricional criado com sucesso.');
    } catch (error) {
      showToast(error.message);
    }
  });

  patientLinkForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (state.isLinkingPatient) {
      return;
    }

    const patientEmail = linkPatientEmail?.value.trim() || '';
    const age = linkPatientAge?.value.trim() || '';
    const objective = linkPatientObjective?.value.trim() || '';
    const restrictions = linkPatientRestrictions?.value.trim() || '';

    if (!patientEmail) {
      showToast('Informe o e-mail do paciente para concluir o vinculo.');
      return;
    }

    state.isLinkingPatient = true;
    setPatientLinkFormState(true);

    try {
      const result = await linkPatient({
        patientEmail,
        age,
        objective,
        restrictions,
      });

      patientLinkForm.reset();
      await refreshDashboard(state.selectedPatientId);
      showToast(result.message || 'Paciente vinculado com sucesso.');
    } catch (error) {
      showToast(error.message);
    } finally {
      state.isLinkingPatient = false;
      setPatientLinkFormState(false);
    }
  });

  conversationForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (state.isSendingConversation) {
      return;
    }

    const patientId = state.selectedPatientId;
    const content = conversationInput?.value.trim() || '';

    if (!patientId) {
      showToast('Selecione um paciente antes de responder.');
      return;
    }

    if (!content) {
      showToast('Digite uma mensagem para responder ao paciente.');
      return;
    }

    state.isSendingConversation = true;
    renderConversation();

    try {
      const result = await sendNutritionistMessage({
        patientId,
        content,
      });

      if (conversationInput) {
        conversationInput.value = '';
      }

      await refreshDashboard(patientId);
      showToast(result.message || 'Resposta enviada para o paciente.');
    } catch (error) {
      showToast(error.message);
    } finally {
      state.isSendingConversation = false;
      renderConversation();
    }
  });
}

async function init() {
  if (!ensureNutritionistAccess()) return;

  renderHeader();
  bindModalEvents();
  bindFilters();
  bindActions();
  bindForms();
  window.NutriFlowUi?.setupSectionNavigation({ linkSelector: '.sidebar-link, .mobile-nav-pill' });

  try {
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Nao foi possivel carregar o dashboard.');
  }
}

init();
