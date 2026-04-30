const {
  createApiClient,
  createSessionManager,
  createToastController,
  escapeHtml,
  formatSidebarDate: formatCoreSidebarDate,
  getInitials,
} = window.NutriFlowCore;

const session = createSessionManager({ redirectTo: 'index.html' });

const apiRequest = createApiClient({
  getToken: session.getToken,
  onUnauthorized(message) {
    showToast(message || 'Sua sessão expirou.');
    window.setTimeout(session.clear, 800);
  }
});

const state = {
  currentUser: session.getUser(),
  patients: [],
  selectedPatientId: null,
  activeFilterId: null, // Novo: Guarda se estamos filtrando a tela por um paciente
  activeChallengeId: null, // Para adicionar pacientes a desafios
  mealPlans: [], assessments: [], appointments: [], challenges: [], messages: [], foods: [], reminders: [], selectedMealPlan: null
};

const APPOINTMENT_STATUS_LABELS = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  remarcada: 'Remarcada',
  faltou: 'Faltou',
};

const toast = document.getElementById('nutritionistToast');
const toastController = createToastController(toast, { duration: 3000 });
function showToast(message) { toastController.show(message); }
function ensureNutritionistAccess() { return session.ensureAuthenticated(); }

// BUSCANDO DADOS 
async function fetchDatabaseData() {
  try {
    const data = await apiRequest('/api/nutritionist/dashboard');
    state.patients = data.patients || [];
    state.mealPlans = data.mealPlans || [];
    state.assessments = data.assessments || [];
    state.appointments = data.appointments || [];
    state.reminders = data.reminders || [];
    state.challenges = data.challenges || [];
    state.messages = data.messages || [];
    state.foods = data.foods || [];

    if (state.patients.length > 0 && !state.selectedPatientId) {
      state.selectedPatientId = state.patients[0].id;
    }
    renderAll();
  } catch (error) { showToast('Erro ao conectar ao banco de dados.'); }
}

function renderAll() {
  renderHeader();
  renderPatientsList();
  renderSelectedPatient();
  renderGeneralLists();
  populatePatientSelects();
}

function renderHeader() {
  const currentUser = state.currentUser || session.getUser() || { name: 'Nutricionista' };
  document.querySelectorAll('[data-nutritionist-name]').forEach(el => el.textContent = currentUser.name);
  document.querySelectorAll('[data-nutritionist-initial]').forEach(el => el.textContent = getInitials(currentUser.name));
  document.querySelector('[data-sidebar-date]').textContent = formatCoreSidebarDate();
  document.querySelector('[data-header-greeting]').textContent = `Olá, ${currentUser.name}`;
}

function renderPatientsList() {
  const list = document.getElementById('patientsList');
  if (!list) return;
  list.innerHTML = '';
  
  if (state.patients.length === 0) {
    document.getElementById('emptyPatientsState').classList.remove('hidden');
    return;
  } else { document.getElementById('emptyPatientsState').classList.add('hidden'); }

  state.patients.forEach((patient) => {
    const patientName = patient.name || 'Paciente';
    const isSelected = patient.id === state.selectedPatientId;
    const isFiltered = patient.id === state.activeFilterId;
    
    const row = document.createElement('div');
    row.className = `p-4 flex items-center justify-between hover:bg-nutriflow-50 cursor-pointer transition ${isSelected ? 'bg-nutriflow-50 border-l-4 border-nutriflow-500' : ''} ${isFiltered ? 'ring-2 ring-nutriflow-200' : ''}`;
    
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-xl bg-nutriflow-100 text-sm font-bold text-nutriflow-900">${getInitials(patientName)}</div>
        <div>
          <p class="font-bold text-nutriflow-950 text-sm">${patientName}</p>
          <p class="text-xs text-nutriflow-600">${patient.objective || 'Em avaliação'}</p>
        </div>
      </div>
      <button class="text-xs bg-nutriflow-950 text-white px-3 py-1 rounded-lg font-bold" onclick="window.openPatientProfile('${patient.id}')">Perfil</button>
    `;
    
    row.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        state.selectedPatientId = patient.id;
        state.activeFilterId = patient.id; // Ativa o filtro para este paciente!
        renderAll(); // Re-renderiza a tela para aplicar o filtro
      }
    });
    list.appendChild(row);
  });
}

function renderSelectedPatient() {
  const patient = state.patients.find(p => p.id === state.selectedPatientId);
  if (!patient) return;
  
  document.getElementById('selectedPatientName').textContent = patient.name;
  document.getElementById('selectedPatientWeight').textContent = patient.weight ? `${patient.weight}kg` : '--';
  document.getElementById('selectedPatientHeight').textContent = patient.height ? `${patient.height}m` : '--';
  document.getElementById('selectedPatientViewButton').onclick = () => window.openPatientProfile(patient.id);

  const clearBtn = document.getElementById('btnClearSelection');
  if (clearBtn) {
    if (state.activeFilterId) {
      clearBtn.classList.remove('hidden');
      clearBtn.onclick = () => { state.activeFilterId = null; renderAll(); };
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

function renderPatientProfileModal(patient) {
  if (!patient) return;
  document.getElementById('patientProfileName').textContent = patient.name;
  document.getElementById('patientProfileMeta').textContent = `${patient.age || '--'} anos • ${patient.objective || 'Em avaliação'} • ${patient.restrictions || 'Sem restrições'}`;
  
  const patientPlans = state.mealPlans.filter(p => p.patientId === patient.id);
  document.getElementById('patientProfilePlanTitle').textContent = patientPlans[0]?.title || 'Sem plano ativo';

  const historyContainer = document.getElementById('patientProfileWeightHistory');
  const patientAssessments = state.assessments.filter(a => a.patientId === patient.id);
  const patientWeights = patient.weightEntries || [];
  if (historyContainer) {
    historyContainer.innerHTML = patientWeights.length
      ? patientWeights.slice(-5).reverse().map(entry => `<span class="bg-white border px-3 py-1 rounded-lg text-sm font-bold text-nutriflow-950">${entry.weight}kg <small class="text-nutriflow-500">${entry.date}</small></span>`).join('')
      : patientAssessments.length
        ? patientAssessments.slice(0, 3).map(a => `<span class="bg-white border px-3 py-1 rounded-lg text-sm font-bold text-nutriflow-950">${a.weight}kg</span>`).join('')
      : '<span class="text-xs text-nutriflow-500 font-bold">Sem registros</span>';
  }

  const mealsList = document.getElementById('patientProfileMealsList');
  if (mealsList) {
    if (patient.mealEntries && patient.mealEntries.length > 0) {
      mealsList.innerHTML = patient.mealEntries.map(meal => `
        <div class="border-b pb-2 mb-2">
          <p class="text-xs font-bold text-nutriflow-500 uppercase">${meal.mealType} - ${new Date(meal.loggedAt).toLocaleDateString()}</p>
          <p class="text-sm font-bold text-nutriflow-950">${meal.title}</p>
          <p class="text-xs text-nutriflow-600">${meal.calories} kcal • ${meal.protein}g Prot • ${meal.carbs}g Carb</p>
        </div>
      `).join('');
    } else {
      mealsList.innerHTML = '<p class="text-xs text-nutriflow-500">O paciente ainda não registrou refeições no painel dele.</p>';
    }
  }
}

function renderMealPlanModal(plan) {
  if (!plan) return;

  const titleEl = document.getElementById('viewMealPlanTitle');
  const datesEl = document.getElementById('viewMealPlanDates');
  const macrosEl = document.getElementById('viewMealPlanMacros');
  const statusSelect = document.getElementById('viewMealPlanStatusSelect');
  const patientEl = document.getElementById('viewMealPlanPatient');
  const createdAtEl = document.getElementById('viewMealPlanCreatedAt');
  const itemsList = document.getElementById('viewMealPlanItems');

  if (!titleEl || !datesEl || !macrosEl || !statusSelect || !patientEl || !createdAtEl || !itemsList) {
    showToast('Erro ao abrir o modal de visualização do plano. Atualize a página e tente novamente.');
    return;
  }

  titleEl.textContent = plan.title || 'Plano Alimentar';
  datesEl.textContent = `${new Date(plan.startDate).toLocaleDateString()} → ${new Date(plan.endDate).toLocaleDateString()}`;
  macrosEl.innerHTML = `
    <div class="grid gap-3 text-sm font-semibold text-nutriflow-950">
      <div>${plan.calories || 0} kcal</div>
      <div class="grid grid-cols-2 gap-2 text-xs text-nutriflow-700">
        <span>Proteína: ${plan.protein || 0}g</span>
        <span>Carboidrato: ${plan.carbs || 0}g</span>
        <span>Gordura: ${plan.fats || 0}g</span>
        <span>Fibra: ${plan.fiber || 0}g</span>
      </div>
    </div>
  `;
  statusSelect.value = plan.status === 'Inativo' ? 'Inativo' : 'Ativo';
  statusSelect.onchange = () => {
    if (state.selectedMealPlan) {
      state.selectedMealPlan.status = statusSelect.value;
    }
  };
  patientEl.textContent = plan.patientProfileId || 'N/A';
  createdAtEl.textContent = new Date(plan.createdAt).toLocaleString();

  itemsList.innerHTML = plan.items?.length ? plan.items.map(item => {
    const foodName = typeof item.food === 'string' ? item.food : item.food?.name || 'Alimento desconhecido';
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const calories = Number.isFinite(item.calories) ? item.calories : 0;
    const protein = Number.isFinite(item.protein) ? item.protein : 0;
    const carbs = Number.isFinite(item.carbs) ? item.carbs : 0;
    const fats = Number.isFinite(item.fats) ? item.fats : 0;
    const fiber = Number.isFinite(item.fiber) ? item.fiber : 0;

    return `
      <div class="rounded-xl border border-nutriflow-200 p-4 bg-white">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm font-bold text-nutriflow-950">${escapeHtml(foodName)}</p>
            <p class="text-xs text-nutriflow-600">${escapeHtml(item.mealTime || 'Refeição')} • ${quantity}g</p>
          </div>
          <p class="text-sm font-semibold text-nutriflow-950">${calories} kcal</p>
        </div>
        <div class="flex flex-wrap gap-4 text-xs text-nutriflow-700">
          <span>Prot: ${protein}g</span>
          <span>Carb: ${carbs}g</span>
          <span>Gord: ${fats}g</span>
          <span>Fibra: ${fiber}g</span>
        </div>
      </div>
    `;
  }).join('') : '<p class="text-sm text-nutriflow-500">Nenhum item cadastrado.</p>';
}

window.openMealPlanDetails = async function(planId) {
  try {
    const plan = await apiRequest(`/api/plano-alimentar/${planId}`);
    state.selectedMealPlan = plan;
    renderMealPlanModal(plan);
    openModal('viewMealPlan');
  } catch (err) {
    showToast(err.message || 'Não foi possível carregar o plano.');
  }
};

// RENDERIZAÇÃO DAS LISTAS COM FILTRO E BOTÕES DE AÇÃO
const MEAL_PLAN_MEAL_TIMES = [
  'Cafe da manha',
  'Lanche da manha',
  'Almoco',
  'Lanche da tarde',
  'Jantar',
  'Ceia',
];

function getFoodById(foodId) {
  return state.foods.find((food) => food.id === foodId) || null;
}



function buildMealTimeOptions(selectedMealTime = 'Almoco') {
  return MEAL_PLAN_MEAL_TIMES.map((mealTime) => `
    <option value="${mealTime}" ${mealTime === selectedMealTime ? 'selected' : ''}>${mealTime}</option>
  `).join('');
}

function getMealPlanItemsPayload(options = {}) {
  const allowIncomplete = options.allowIncomplete === true;

  return Array.from(document.querySelectorAll('[data-meal-plan-item-row]')).map((row) => {
    const name = row.querySelector('[data-plan-food-name]')?.value || '';
    const quantity = Number(row.querySelector('[data-plan-quantity]')?.value || 0);
    const caloriesPer100 = Number(row.querySelector('[data-plan-calories-per-100]')?.value || 0);
    const proteinPer100 = Number(row.querySelector('[data-plan-protein-per-100]')?.value || 0);
    const carbsPer100 = Number(row.querySelector('[data-plan-carbs-per-100]')?.value || 0);
    const fatPer100 = Number(row.querySelector('[data-plan-fat-per-100]')?.value || 0);
    const fiberPer100 = Number(row.querySelector('[data-plan-fiber-per-100]')?.value || 0);
    const mealTime = row.querySelector('[data-plan-meal-time]')?.value || 'Almoco';

    return { name, quantity, caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100, mealTime };
  }).filter((item) => allowIncomplete || (item.name && Number.isFinite(item.quantity) && item.quantity > 0));
}

function updateMealPlanTotals() {
  const totals = getMealPlanItemsPayload({ allowIncomplete: true }).reduce((accumulator, item) => {
    if (!Number.isFinite(item.quantity) || !Number.isFinite(item.caloriesPer100)) {
      return accumulator;
    }

    const factor = item.quantity / 100;
    accumulator.calories += Math.round(item.caloriesPer100 * factor);
    accumulator.protein += Math.round(item.proteinPer100 * factor);
    accumulator.carbs += Math.round(item.carbsPer100 * factor);
    accumulator.fats += Math.round(item.fatPer100 * factor);
    accumulator.fiber += Math.round(item.fiberPer100 * factor * 10) / 10;
    return accumulator;
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  });

  document.getElementById('mealPlanCalories').value = totals.calories;
  document.getElementById('mealPlanProtein').value = totals.protein;
  document.getElementById('mealPlanCarbs').value = totals.carbs;
  document.getElementById('mealPlanFats').value = totals.fats;
  document.getElementById('mealPlanFiber').value = totals.fiber;
}

function addMealPlanItemRow(item = {}) {
  const list = document.getElementById('mealPlanItemsList');

  if (!list) return;

  const row = document.createElement('div');
  row.className = 'rounded-[28px] border border-[rgba(188,210,179,0.45)] bg-white/95 p-4 shadow-[0_18px_38px_rgba(18,29,21,0.08)]';
  row.dataset.mealPlanItemRow = 'true';
  row.innerHTML = `
    <div class="grid gap-3 md:grid-cols-[1.5fr_0.9fr]">
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618] placeholder:text-[#8b997e]" data-plan-food-name type="text" placeholder="Nome do alimento" value="${item.name || ''}" required />
      <select class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-meal-time required>
        ${buildMealTimeOptions(item.mealTime || 'Almoco')}
      </select>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.85fr]">
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-quantity type="number" min="1" max="2000" step="1" placeholder="Qtd(g)" value="${item.quantity || 100}" required />
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-calories-per-100 type="number" min="0" step="0.1" placeholder="Kcal/100g" value="${item.caloriesPer100 || ''}" required />
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-protein-per-100 type="number" min="0" step="0.1" placeholder="Prot/100g" value="${item.proteinPer100 || ''}" required />
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-carbs-per-100 type="number" min="0" step="0.1" placeholder="Carb/100g" value="${item.carbsPer100 || ''}" required />
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.9fr] items-end">
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-fat-per-100 type="number" min="0" step="0.1" placeholder="Gord/100g" value="${item.fatPer100 || ''}" required />
      <input class="rounded-2xl border border-[rgba(188,210,179,0.65)] bg-[rgba(246,250,244,0.95)] px-4 py-3 text-sm font-semibold text-[#1c2618]" data-plan-fiber-per-100 type="number" min="0" step="0.1" placeholder="Fib/100g" value="${item.fiberPer100 || ''}" required />
      <button class="w-full rounded-full border border-[#f5d3d3] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#bf3b3b] transition hover:bg-[#feecec]" type="button" data-remove-plan-item>Remover</button>
    </div>
  `;

  row.querySelectorAll('select, input').forEach((field) => {
    field.addEventListener('input', updateMealPlanTotals);
    field.addEventListener('change', updateMealPlanTotals);
  });
  row.querySelector('[data-remove-plan-item]')?.addEventListener('click', () => {
    row.remove();

    if (!document.querySelectorAll('[data-meal-plan-item-row]').length) {
      addMealPlanItemRow();
      return;
    }

    updateMealPlanTotals();
  });

  list.appendChild(row);
  updateMealPlanTotals();
}

function resetMealPlanBuilder(plan = null) {
  const list = document.getElementById('mealPlanItemsList');
  if (!list) return;

  list.innerHTML = '';
  const items = plan?.items?.length ? plan.items : [{ mealTime: 'Almoco', quantity: 100 }];
  items.forEach((item) => addMealPlanItemRow(item));
  document.getElementById('mealPlanNotes').value = plan?.notes || '';
  updateMealPlanTotals();
}

function renderGeneralLists() {
  const pId = state.activeFilterId;

  // Filtra as listas se um paciente estiver selecionado
  const plans = pId ? state.mealPlans.filter(p => p.patientId === pId) : state.mealPlans;
  const asss = pId ? state.assessments.filter(a => a.patientId === pId) : state.assessments;
  const apps = pId ? state.appointments.filter(a => a.patientId === pId) : state.appointments;

  const plansContainer = document.getElementById('latestMealPlans');
  plansContainer.innerHTML = plans.length ? plans.map(plan => `
      <div class="bg-white border rounded-xl p-3 shadow-sm relative group">
        <p class="text-xs font-bold text-nutriflow-500 uppercase">${plan.patient}</p>
        <p class="text-sm font-bold text-nutriflow-950 mt-1 pr-12">${plan.title}</p>
        <p class="text-xs font-semibold text-nutriflow-600">${plan.calories} kcal - ${plan.protein}g prot - ${plan.carbs || 0}g carb - ${plan.fats || 0}g gord</p>
        <p class="mt-1 text-xs text-nutriflow-500">${plan.items?.length ? `${plan.items.length} alimentos cadastrados` : 'Sem alimentos detalhados'}</p>
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
           <button onclick="window.openMealPlanDetails('${plan.id}')" title="Ver Plano" class="p-1 text-nutriflow-500 hover:text-nutriflow-900">👁️</button>
           <button onclick="window.duplicatePlan('${plan.id}')" title="Reaproveitar Plano" class="p-1 text-nutriflow-500 hover:text-nutriflow-900">📋</button>
           <button onclick="window.deleteResource('meal-plans', '${plan.id}')" title="Excluir" class="p-1 text-red-400 hover:text-red-600">🗑️</button>
        </div>
      </div>
    `).join('') : '<p class="text-sm text-nutriflow-500">Nenhum plano encontrado.</p>';

  const assContainer = document.getElementById('latestAssessments');
  assContainer.innerHTML = asss.length ? asss.map(ass => `
      <div class="bg-white border rounded-xl p-3 shadow-sm relative group">
        <p class="text-xs font-bold text-nutriflow-500 uppercase">${ass.patient}</p>
        <p class="text-sm font-bold text-nutriflow-950 mt-1">Peso: ${ass.weight}kg</p>
        <p class="text-xs font-semibold text-nutriflow-600">${new Date(ass.date).toLocaleDateString()}</p>
        <button onclick="window.deleteResource('assessments', '${ass.id}')" class="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">🗑️</button>
      </div>
    `).join('') : '<p class="text-sm text-nutriflow-500">Nenhuma avaliação.</p>';

  const agendaContainer = document.getElementById('appointmentsList');
  const remindersContainer = document.getElementById('appointmentRemindersList');

  if (remindersContainer) {
    remindersContainer.innerHTML = state.reminders.length
      ? state.reminders.map((reminder) => `
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">${escapeHtml(reminder.reminder?.label || 'Lembrete')}</p>
          <p class="mt-1 text-sm font-bold text-nutriflow-950">${escapeHtml(reminder.patient)} - ${escapeHtml(reminder.type)}</p>
          <p class="text-xs text-nutriflow-700">${escapeHtml(reminder.date)} (${escapeHtml(String(reminder.reminder?.minutesUntil || 0))} min)</p>
        </div>
      `).join('')
      : '<p class="text-sm text-nutriflow-500">Sem lembretes de consulta nas próximas 24h.</p>';
  }

  agendaContainer.innerHTML = apps.length ? apps.map(app => `
      <div class="bg-white border rounded-xl p-3 shadow-sm flex justify-between items-center relative group">
        <div>
          <p class="text-sm font-bold text-nutriflow-950">${app.patient}</p>
          <p class="text-xs font-bold text-nutriflow-500">${app.type}</p>
          <p class="text-[11px] font-bold text-nutriflow-700 mt-1">Status: ${escapeHtml(APPOINTMENT_STATUS_LABELS[app.status] || app.status)}</p>
        </div>
        <div class="flex items-center gap-2">
          <p class="text-xs font-bold bg-nutriflow-50 px-2 py-1 rounded-lg">${app.date}</p>
          <button onclick="window.updateAppointmentStatus('${app.id}', 'confirmada')" class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Confirmar</button>
          <button onclick="window.rescheduleAppointment('${app.id}')" class="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Remarcar</button>
          <button onclick="window.updateAppointmentStatus('${app.id}', 'faltou')" class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">Faltou</button>
          <button onclick="window.deleteResource('appointments', '${app.id}')" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">🗑️</button>
        </div>
      </div>
    `).join('') : '<p class="text-sm text-nutriflow-500">Sem agenda.</p>';

  const challContainer = document.getElementById('challengesList');
  if (challContainer) {
    challContainer.innerHTML = state.challenges.length ? state.challenges.map(ch => `
      <div class="bg-white border rounded-xl p-3 shadow-sm relative group mb-2">
        <p class="text-sm font-bold text-nutriflow-950 pr-16">${ch.title}</p>
        <p class="text-xs font-semibold text-nutriflow-600">${ch.target}</p>
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
           <button onclick="window.openAddParticipant('${ch.id}')" title="Adicionar Paciente" class="p-1 bg-nutriflow-100 rounded text-xs font-bold">➕ Pct</button>
           <button onclick="window.deleteResource('challenges', '${ch.id}')" title="Excluir" class="p-1 text-red-400 hover:text-red-600">🗑️</button>
        </div>
      </div>
    `).join('') : '<p class="text-sm text-nutriflow-600">Nenhum desafio ativo.</p>';
  }
}

function populatePatientSelects() {
  const options = state.patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  ['mealPlanPatient', 'assessmentPatient', 'appointmentPatient', 'chatPatientSelect', 'challengePatient', 'addPartPatient'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      if (id === 'chatPatientSelect') el.innerHTML = '<option value="">Selecione um paciente...</option>' + options;
      else if (id === 'challengePatient') el.innerHTML = '<option value="">Todos os pacientes (Geral)</option>' + options;
      else el.innerHTML = options;
      
      if (state.selectedPatientId && id !== 'chatPatientSelect' && id !== 'challengePatient' && id !== 'addPartPatient') el.value = state.selectedPatientId;
    }
  });
}

// FUNÇÕES GLOBAIS DE AÇÃO (Excluir, Duplicar, Adicionar Participante)
window.deleteResource = async function(resourceType, id) {
  if(!confirm('Tem certeza que deseja excluir este item permanentemente?')) return;
  try {
    await apiRequest(`/api/nutritionist/${resourceType}/${id}`, { method: 'DELETE' });
    showToast('Excluído com sucesso!');
    await fetchDatabaseData();
  } catch(e) { showToast('Erro ao excluir item.'); }
};

window.duplicatePlan = function(planId) {
  const plan = state.mealPlans.find(p => p.id === planId);
  if(!plan) return;
  document.getElementById('mealPlanTitle').value = plan.title + ' (Cópia)';
  if (plan.patientId) document.getElementById('mealPlanPatient').value = plan.patientId;
  resetMealPlanBuilder(plan);
  openModal('mealPlan');
};

window.openAddParticipant = function(challengeId) {
  state.activeChallengeId = challengeId;
  openModal('addParticipant');
};

window.updateAppointmentStatus = async function(appointmentId, status) {
  try {
    await apiRequest(`/api/nutritionist/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast('Status da consulta atualizado.');
    await fetchDatabaseData();
  } catch (error) {
    showToast(error.message || 'Erro ao atualizar status da consulta.');
  }
};

window.rescheduleAppointment = async function(appointmentId) {
  const newDate = window.prompt('Nova data/hora (formato: 2026-12-30T14:30):');

  if (!newDate) {
    return;
  }

  try {
    await apiRequest(`/api/nutritionist/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduledAt: newDate }),
    });
    showToast('Consulta remarcada com sucesso.');
    await fetchDatabaseData();
  } catch (error) {
    showToast(error.message || 'Erro ao remarcar consulta.');
  }
};

// MODAIS
function openModal(modalId) {
  document.querySelectorAll('.nf-modal-overlay').forEach(m => { m.classList.add('hidden'); m.classList.remove('flex'); });
  const modal = document.getElementById(`${modalId}Modal`);
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); document.body.classList.add('modal-open'); }
}
function closeModal(modalId) {
  const modal = document.getElementById(`${modalId}Modal`);
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  document.body.classList.remove('modal-open');
}

window.openPatientProfile = function(patientId) {
  state.selectedPatientId = patientId;
  renderSelectedPatient();
  renderPatientProfileModal(state.patients.find(p => p.id === patientId));
  openModal('patientProfile');
};

function bindButtons() {
  document.getElementById('btnOpenLinkPatient')?.addEventListener('click', () => openModal('linkPatient'));
  document.getElementById('btnOpenMealPlan')?.addEventListener('click', () => {
    document.getElementById('mealPlanForm').reset();
    if (state.selectedPatientId) document.getElementById('mealPlanPatient').value = state.selectedPatientId;
    resetMealPlanBuilder();
    openModal('mealPlan');
  });
  document.getElementById('btnOpenAssessment')?.addEventListener('click', () => { document.getElementById('assessmentForm').reset(); openModal('assessment'); });
  document.getElementById('btnOpenAppointment')?.addEventListener('click', () => { document.getElementById('appointmentForm').reset(); openModal('appointment'); });
  document.getElementById('btnOpenChallenge')?.addEventListener('click', () => { document.getElementById('challengeForm').reset(); openModal('challenge'); });
  
  document.getElementById('btnProfileNewPlan')?.addEventListener('click', () => {
    document.getElementById('mealPlanForm').reset();
    if (state.selectedPatientId) document.getElementById('mealPlanPatient').value = state.selectedPatientId;
    resetMealPlanBuilder();
    openModal('mealPlan');
  });
  document.getElementById('btnAddMealPlanItem')?.addEventListener('click', () => addMealPlanItemRow());
  document.getElementById('btnProfileNewAssessment')?.addEventListener('click', () => { document.getElementById('assessmentForm').reset(); openModal('assessment'); });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); closeModal(e.target.dataset.close); });
  });
  document.getElementById('logoutButton')?.addEventListener('click', () => { session.clear(); window.location.href = 'index.html'; });
}

// INTEGRAÇÕES REAIS
document.getElementById('linkPatientForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('linkPatientEmail').value;
  const age = document.getElementById('linkPatientAge').value;
  const objective = document.getElementById('linkPatientObjective').value;
  try {
    await apiRequest('/api/nutritionist/link-patient', { method: 'POST', body: JSON.stringify({ patientEmail: email, age, objective }) });
    showToast('Paciente vinculado com sucesso!');
    closeModal('linkPatient');
    await fetchDatabaseData();
  } catch(err) { showToast(err.message || 'Erro ao vincular paciente.'); }
});

document.getElementById('mealPlanForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const items = getMealPlanItemsPayload();

  if (!items.length) {
    showToast('Adicione pelo menos um alimento ao plano.');
    return;
  }

  // Validação adicional: verificar se todos os itens têm nome
  for (const item of items) {
    if (!item.name || item.name.trim() === '') {
      showToast('Preencha o nome de todos os alimentos.');
      return;
    }
  }

  const payload = {
    patientId: document.getElementById('mealPlanPatient').value,
    title: document.getElementById('mealPlanTitle').value,
    notes: document.getElementById('mealPlanNotes').value,
    items,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
  };

  console.log('Payload enviado:', JSON.stringify(payload, null, 2));

  try {
    await apiRequest('/api/nutritionist/meal-plans', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Plano salvo!'); closeModal('mealPlan'); await fetchDatabaseData();
  } catch(err) {
    console.error('Erro ao salvar plano:', err);
    showToast('Erro ao salvar plano: ' + (err.message || 'Verifique os dados e tente novamente.'));
  }
});

document.getElementById('assessmentForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    patientId: document.getElementById('assessmentPatient').value,
    weight: document.getElementById('assessmentWeight').value,
    height: document.getElementById('assessmentHeight').value,
    bodyFat: document.getElementById('assessmentBodyFat').value,
    date: new Date().toISOString()
  };
  try {
    await apiRequest('/api/nutritionist/assessments', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Avaliação salva!'); closeModal('assessment'); await fetchDatabaseData();
  } catch(err) { showToast('Erro ao salvar avaliação.'); }
});

// AQUI É A AGENDA SALVANDO DE VERDADE
document.getElementById('appointmentForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    patientId: document.getElementById('appointmentPatient').value,
    date: document.getElementById('appointmentDate').value,
    type: document.getElementById('appointmentType').value
  };
  try {
    await apiRequest('/api/nutritionist/appointments', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Consulta Agendada!'); closeModal('appointment'); await fetchDatabaseData();
  } catch(err) { showToast('Erro ao agendar.'); }
});

document.getElementById('challengeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('challengeTitle').value;
  const target = document.getElementById('challengeTarget').value;
  const prize = document.getElementById('challengePrize').value;
  const patientId = document.getElementById('challengePatient').value;
  const finalTarget = prize ? `${target} | 🎁 Prêmio: ${prize}` : target;
  const participantIds = patientId ? [patientId] : state.patients.map(p => p.id);

  try {
    await apiRequest('/api/nutritionist/challenges', { method: 'POST', body: JSON.stringify({ title, target: finalTarget, participantIds }) });
    showToast('Desafio salvo!'); closeModal('challenge'); await fetchDatabaseData();
  } catch(err) { showToast('Erro ao criar desafio.'); }
});

// ADICIONAR PACIENTE A DESAFIO EXISTENTE
document.getElementById('addParticipantForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patientId = document.getElementById('addPartPatient').value;
  try {
    await apiRequest(`/api/nutritionist/challenges/${state.activeChallengeId}/participants`, { method: 'POST', body: JSON.stringify({ patientId }) });
    showToast('Paciente adicionado ao desafio!'); closeModal('addParticipant'); await fetchDatabaseData();
  } catch(err) { showToast('Erro ao adicionar paciente.'); }
});

// START
async function init() {
  if (!ensureNutritionistAccess()) return;
  bindButtons(); 
  await fetchDatabaseData();
}
init();
