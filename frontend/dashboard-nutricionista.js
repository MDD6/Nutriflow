const storedUser = localStorage.getItem('nutriflow.user');
const user = storedUser ? JSON.parse(storedUser) : null;

const state = {
  patients: [],
  selectedPatientId: null,
  messages: [],
  appointments: [],
  challenges: [],
  mealPlans: [],
  assessments: [],
  reports: null,
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
const toast = document.getElementById('nutritionistToast');

const mockPatients = [
  {
    id: 'p1',
    name: 'Amanda Rocha',
    age: 34,
    objective: 'Emagrecimento',
    status: 'Ativo',
    weight: 78.4,
    height: 1.67,
    restrictions: 'Sem lactose, evita frituras e frutos do mar.',
    lastMeal: 'Almoco com frango, arroz integral e legumes.',
    progress: 72,
    lastAssessment: '03 Mar 2026',
    currentPlan: 'Plano anti-inflamatorio',
    bodyFat: 31.4,
    nextAppointment: '08 Mar 2026 - 16:30',
    adherence: [82, 86, 88, 91],
    weightHistory: [81.2, 80.5, 79.8, 79.1, 78.4],
  },
  {
    id: 'p2',
    name: 'Lucas Moreira',
    age: 28,
    objective: 'Hipertrofia',
    status: 'Revisao',
    weight: 84.1,
    height: 1.8,
    restrictions: 'Sem restricoes alimentares.',
    lastMeal: 'Lanche com iogurte, banana e pasta de amendoim.',
    progress: 58,
    lastAssessment: '01 Mar 2026',
    currentPlan: 'Hipertrofia com periodizacao',
    bodyFat: 18.8,
    nextAppointment: '09 Mar 2026 - 11:00',
    adherence: [74, 76, 79, 81],
    weightHistory: [82.8, 83.2, 83.5, 83.8, 84.1],
  },
  {
    id: 'p3',
    name: 'Fernanda Alves',
    age: 41,
    objective: 'Reeducacao alimentar',
    status: 'Ativo',
    weight: 67.3,
    height: 1.63,
    restrictions: 'Baixa tolerancia a lactose e prefere jantar leve.',
    lastMeal: 'Sopa cremosa de abobora com frango desfiado.',
    progress: 84,
    lastAssessment: '05 Mar 2026',
    currentPlan: 'Plano rotina executiva',
    bodyFat: 27.2,
    nextAppointment: '10 Mar 2026 - 14:15',
    adherence: [88, 86, 92, 90],
    weightHistory: [69.1, 68.6, 68.1, 67.8, 67.3],
  },
  {
    id: 'p4',
    name: 'Rafael Costa',
    age: 36,
    objective: 'Saude metabolica',
    status: 'Atrasado',
    weight: 93.7,
    height: 1.75,
    restrictions: 'Reduzir ultraprocessados e refrigerante.',
    lastMeal: 'Nao registrou refeicao nas ultimas 18 horas.',
    progress: 39,
    lastAssessment: '22 Fev 2026',
    currentPlan: 'Plano glicemico fase 1',
    bodyFat: 33.1,
    nextAppointment: '12 Mar 2026 - 09:00',
    adherence: [61, 55, 48, 42],
    weightHistory: [95.8, 95.1, 94.4, 94.1, 93.7],
  },
];

const mockMessages = [
  { id: 'm1', patientId: 'p1', patient: 'Amanda Rocha', message: 'Consegui manter o lanche da tarde e reduzi a fome noturna.', time: '09:14', pending: true },
  { id: 'm2', patientId: 'p2', patient: 'Lucas Moreira', message: 'Posso trocar o arroz do jantar por macarrao no pos-treino?', time: '08:45', pending: true },
  { id: 'm3', patientId: 'p3', patient: 'Fernanda Alves', message: 'Enviei as fotos do prato principal da semana.', time: 'Ontem', pending: false },
  { id: 'm4', patientId: 'p4', patient: 'Rafael Costa', message: 'Quero retomar os registros e revisar o plano.', time: 'Ontem', pending: true },
];

const mockAppointments = [
  { id: 'a1', patient: 'Amanda Rocha', date: '08 Mar 2026 - 16:30', type: 'Retorno semanal', status: 'Confirmado' },
  { id: 'a2', patient: 'Lucas Moreira', date: '09 Mar 2026 - 11:00', type: 'Ajuste de macros', status: 'A confirmar' },
  { id: 'a3', patient: 'Fernanda Alves', date: '10 Mar 2026 - 14:15', type: 'Revisao de rotina', status: 'Confirmado' },
  { id: 'a4', patient: 'Rafael Costa', date: '12 Mar 2026 - 09:00', type: 'Retomada de acompanhamento', status: 'Pendente' },
];

const mockChallenges = [
  { id: 'c1', title: 'Cafe da manha estruturado', target: '7 dias com proteina no cafe da manha', participants: 14, progress: 76 },
  { id: 'c2', title: 'Semana da hidratacao', target: 'Registrar agua em 5 dias da semana', participants: 22, progress: 63 },
  { id: 'c3', title: 'Prato colorido', target: '3 cores no almoco por 6 dias', participants: 11, progress: 81 },
];

const mockMealPlans = [
  { id: 'mp1', patientId: 'p1', patient: 'Amanda Rocha', title: 'Plano anti-inflamatorio', calories: 2000, status: 'Ativo', startDate: '2026-03-01', endDate: '2026-03-31' },
  { id: 'mp2', patientId: 'p2', patient: 'Lucas Moreira', title: 'Hipertrofia com periodizacao', calories: 2850, status: 'Revisao', startDate: '2026-02-26', endDate: '2026-03-26' },
];

const mockAssessments = [
  { id: 'as1', patientId: 'p1', patient: 'Amanda Rocha', date: '2026-03-03', weight: 78.4, height: 1.67, imc: 28.1, bodyFat: 31.4, notes: 'Boa adesao e melhora no lanche da tarde.' },
  { id: 'as2', patientId: 'p3', patient: 'Fernanda Alves', date: '2026-03-05', weight: 67.3, height: 1.63, imc: 25.3, bodyFat: 27.2, notes: 'Melhor regularidade e sono mais estavel.' },
];

function isNutritionistProfile(profile) {
  return String(profile || '').trim().toLowerCase() === 'nutricionista';
}

function ensureNutritionistAccess() {
  if (!user || !isNutritionistProfile(user.profile)) {
    window.location.replace('index.html');
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

async function getPatients() {
  return mockPatients.map((patient) => ({ ...patient }));
}

async function getMessages() {
  return mockMessages.map((message) => ({ ...message }));
}

async function getReports() {
  const patients = state.patients.length ? state.patients : mockPatients;
  const assessments = state.assessments.length ? state.assessments : mockAssessments;
  const bestAdherencePatient = [...patients].sort((left, right) => right.progress - left.progress)[0];
  const lowFrequencyPatient = [...patients].sort((left, right) => left.progress - right.progress)[0];
  const averageCalories = state.mealPlans.length
    ? Math.round(state.mealPlans.reduce((total, plan) => total + plan.calories, 0) / state.mealPlans.length)
    : Math.round(mockMealPlans.reduce((total, plan) => total + plan.calories, 0) / mockMealPlans.length);

  return {
    bestAdherence: bestAdherencePatient?.name || 'Sem dados',
    lowFrequency: lowFrequencyPatient?.name || 'Sem dados',
    averageCalories: `${averageCalories.toLocaleString('pt-BR')} kcal`,
    monthAssessments: assessments.length,
  };
}

async function createMealPlan(payload) {
  const plan = {
    id: `mp-${Date.now()}`,
    patientId: payload.patientId,
    patient: payload.patientName,
    title: payload.title,
    calories: Number(payload.calories),
    protein: Number(payload.protein),
    carbs: Number(payload.carbs),
    fats: Number(payload.fats),
    notes: payload.notes,
    status: 'Ativo',
    startDate: payload.startDate,
    endDate: payload.endDate,
  };

  state.mealPlans.unshift(plan);
  const patient = state.patients.find((item) => item.id === payload.patientId);
  if (patient) {
    patient.currentPlan = payload.title;
    patient.status = 'Ativo';
  }

  return plan;
}

async function createAssessment(payload) {
  const assessment = {
    id: `as-${Date.now()}`,
    patientId: payload.patientId,
    patient: payload.patientName,
    date: payload.date,
    weight: Number(payload.weight),
    height: Number(payload.height),
    imc: Number(payload.imc),
    bodyFat: Number(payload.bodyFat),
    notes: payload.notes,
  };

  state.assessments.unshift(assessment);
  const patient = state.patients.find((item) => item.id === payload.patientId);

  if (patient) {
    patient.weight = assessment.weight;
    patient.height = assessment.height;
    patient.bodyFat = assessment.bodyFat;
    patient.lastAssessment = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(assessment.date));
    patient.weightHistory = [...patient.weightHistory.slice(1), assessment.weight];
    patient.progress = Math.min(98, patient.progress + 4);
  }

  return assessment;
}

function getSelectedPatient() {
  return state.patients.find((patient) => patient.id === state.selectedPatientId) || state.patients[0] || null;
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

function renderHeader() {
  document.querySelectorAll('[data-nutritionist-name]').forEach((element) => {
    element.textContent = user.name;
  });
  document.querySelectorAll('[data-nutritionist-initial]').forEach((element) => {
    element.textContent = getInitials(user.name);
  });

  const greeting = document.querySelector('[data-header-greeting]');
  if (greeting) greeting.textContent = `${getGreeting()}, ${user.name}`;

  const date = document.querySelector('[data-header-date]');
  if (date) date.textContent = `${formatPrettyDate()} - acompanhe pacientes, planos e mensagens em um unico fluxo.`;

  const sidebarDate = document.querySelector('[data-sidebar-date]');
  if (sidebarDate) sidebarDate.textContent = formatSidebarDate();
}

function renderSummaryCards() {
  const activePatients = state.patients.filter((patient) => patient.status !== 'Atrasado').length;
  const activePlans = state.mealPlans.filter((plan) => plan.status === 'Ativo').length;
  const monthlyAssessments = state.assessments.length;
  const pendingMessages = state.messages.filter((message) => message.pending).length;

  document.getElementById('activePatientsCount').textContent = activePatients;
  document.getElementById('activePlansCount').textContent = activePlans;
  document.getElementById('monthlyAssessmentsCount').textContent = monthlyAssessments;
  document.getElementById('pendingMessagesCount').textContent = pendingMessages;
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
      state.selectedPatientId = button.dataset.selectPatient;
      renderPatientsList();
      renderSelectedPatient();
      renderEvolution();
    });
  });
}

function renderSelectedPatient() {
  const patient = getSelectedPatient();
  if (!patient) return;

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

function renderMealPlans() {
  const container = document.getElementById('latestMealPlans');
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
  if (!patient) return;
  renderWeightChart(patient);
  renderAdherenceChart(patient);
  renderPeriodProgress(patient);
}

function renderMessages() {
  const container = document.getElementById('messagesList');
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
      state.selectedPatientId = button.dataset.openChat;
      renderPatientsList();
      renderSelectedPatient();
      renderEvolution();
      showToast('Conversa aberta no contexto do paciente selecionado.');
    });
  });
}

function renderAppointments() {
  const container = document.getElementById('appointmentsList');
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
  const reports = [
    { label: 'Melhor adesao', value: state.reports.bestAdherence },
    { label: 'Baixa frequencia', value: state.reports.lowFrequency },
    { label: 'Media calorica', value: state.reports.averageCalories },
    { label: 'Avaliacoes do mes', value: state.reports.monthAssessments },
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
  const options = state.patients.map((patient) => `<option value="${patient.id}">${patient.name}</option>`).join('');
  mealPlanPatient.innerHTML = options;
  assessmentPatient.innerHTML = options;

  if (state.selectedPatientId) {
    mealPlanPatient.value = state.selectedPatientId;
    assessmentPatient.value = state.selectedPatientId;
  }
}

function openModal(type) {
  if (type === 'meal-plan') {
    mealPlanModal.classList.remove('hidden');
    mealPlanModal.classList.add('flex');
  }

  if (type === 'assessment') {
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
  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('nutriflow.token');
    localStorage.removeItem('nutriflow.user');
    localStorage.removeItem('nutriflow.lastAuthAt');
    window.location.assign('index.html');
  });

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

function bindForms() {
  mealPlanForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const patient = state.patients.find((item) => item.id === mealPlanPatient.value);
    if (!patient) return;

    await createMealPlan({
      patientId: patient.id,
      patientName: patient.name,
      title: document.getElementById('mealPlanTitle').value.trim() || 'Plano sem titulo',
      startDate: document.getElementById('mealPlanStartDate').value || new Date().toISOString().slice(0, 10),
      endDate: document.getElementById('mealPlanEndDate').value || new Date().toISOString().slice(0, 10),
      calories: document.getElementById('mealPlanCalories').value || 2000,
      protein: document.getElementById('mealPlanProtein').value || 120,
      carbs: document.getElementById('mealPlanCarbs').value || 180,
      fats: document.getElementById('mealPlanFats').value || 60,
      notes: document.getElementById('mealPlanNotes').value.trim(),
    });

    state.reports = await getReports();
    renderSummaryCards();
    renderPatientsList();
    renderSelectedPatient();
    renderMealPlans();
    renderReports();
    mealPlanForm.reset();
    populatePatientSelects();
    closeModal('meal-plan');
    showToast('Plano alimentar salvo com sucesso.');
  });

  assessmentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const patient = state.patients.find((item) => item.id === assessmentPatient.value);
    if (!patient) return;

    await createAssessment({
      patientId: patient.id,
      patientName: patient.name,
      date: document.getElementById('assessmentDate').value || new Date().toISOString().slice(0, 10),
      weight: document.getElementById('assessmentWeight').value || patient.weight,
      height: document.getElementById('assessmentHeight').value || patient.height,
      imc: document.getElementById('assessmentImc').value || (patient.weight / (patient.height * patient.height)).toFixed(1),
      bodyFat: document.getElementById('assessmentBodyFat').value || patient.bodyFat,
      notes: document.getElementById('assessmentNotes').value.trim() || 'Avaliacao registrada.',
    });

    state.selectedPatientId = patient.id;
    renderSummaryCards();
    renderPatientsList();
    renderSelectedPatient();
    renderAssessments();
    renderEvolution();
    assessmentForm.reset();
    populatePatientSelects();
    closeModal('assessment');
    showToast('Avaliacao fisica salva com sucesso.');
  });

  challengeForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('challengeTitle').value.trim();
    const target = document.getElementById('challengeTarget').value.trim();
    const participantsRaw = document.getElementById('challengeParticipants').value.trim();

    if (!title || !target) return;

    state.challenges.unshift({
      id: `c-${Date.now()}`,
      title,
      target,
      participants: participantsRaw ? participantsRaw.split(',').length : 0,
      progress: 0,
    });

    challengeForm.reset();
    renderChallenges();
    showToast('Desafio nutricional criado com sucesso.');
  });
}

async function init() {
  if (!ensureNutritionistAccess()) return;

  state.patients = await getPatients();
  state.messages = await getMessages();
  state.appointments = mockAppointments.map((item) => ({ ...item }));
  state.challenges = mockChallenges.map((item) => ({ ...item }));
  state.mealPlans = mockMealPlans.map((item) => ({ ...item }));
  state.assessments = mockAssessments.map((item) => ({ ...item }));
  state.reports = await getReports();
  state.selectedPatientId = state.patients[0]?.id || null;

  renderHeader();
  renderSummaryCards();
  populatePatientSelects();
  renderPatientsList();
  renderSelectedPatient();
  renderMealPlans();
  renderAssessments();
  renderEvolution();
  renderMessages();
  renderAppointments();
  renderReports();
  renderChallenges();
  bindModalEvents();
  bindFilters();
  bindActions();
  bindForms();
}

init();
