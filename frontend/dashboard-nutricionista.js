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
  mealPlans: [], assessments: [], appointments: [], challenges: [], messages: [], foods: [], reminders: []
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

function buildFoodOptions(selectedFoodId = '') {
  if (!state.foods.length) {
    return '<option value="">Base de alimentos vazia</option>';
  }

  return '<option value="">Selecione um alimento</option>' + state.foods.map((food) => `
    <option value="${food.id}" ${food.id === selectedFoodId ? 'selected' : ''}>${escapeHtml(food.name)}</option>
  `).join('');
}

function buildMealTimeOptions(selectedMealTime = 'Almoco') {
  return MEAL_PLAN_MEAL_TIMES.map((mealTime) => `
    <option value="${mealTime}" ${mealTime === selectedMealTime ? 'selected' : ''}>${mealTime}</option>
  `).join('');
}

function getMealPlanItemsPayload(options = {}) {
  const allowIncomplete = options.allowIncomplete === true;

  return Array.from(document.querySelectorAll('[data-meal-plan-item-row]')).map((row) => {
    const foodId = row.querySelector('[data-plan-food]')?.value || '';
    const quantity = Number(row.querySelector('[data-plan-quantity]')?.value || 0);
    const mealTime = row.querySelector('[data-plan-meal-time]')?.value || 'Refeicao';

    return { foodId, quantity, mealTime };
  }).filter((item) => allowIncomplete || (item.foodId && Number.isFinite(item.quantity) && item.quantity > 0));
}

function updateMealPlanTotals() {
  const totals = getMealPlanItemsPayload({ allowIncomplete: true }).reduce((accumulator, item) => {
    const food = getFoodById(item.foodId);

    if (!food || !Number.isFinite(item.quantity)) {
      return accumulator;
    }

    const factor = item.quantity / 100;
    accumulator.calories += Math.round(food.calories * factor);
    accumulator.protein += Math.round(food.protein * factor);
    accumulator.carbs += Math.round(food.carbs * factor);
    accumulator.fats += Math.round(food.fat * factor);
    return accumulator;
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  document.getElementById('mealPlanCalories').value = totals.calories;
  document.getElementById('mealPlanProtein').value = totals.protein;
  document.getElementById('mealPlanCarbs').value = totals.carbs;
  document.getElementById('mealPlanFats').value = totals.fats;
}

function addMealPlanItemRow(item = {}) {
  const list = document.getElementById('mealPlanItemsList');

  if (!list) return;

  const row = document.createElement('div');
  row.className = 'grid gap-2 rounded-lg border border-white bg-white p-2 shadow-sm md:grid-cols-[1.1fr_120px_1fr_auto]';
  row.dataset.mealPlanItemRow = 'true';
  row.innerHTML = `
    <select class="rounded-lg border border-nutriflow-200 px-3 py-2 text-sm font-bold" data-plan-food required>
      ${buildFoodOptions(item.foodId || '')}
    </select>
    <input class="rounded-lg border border-nutriflow-200 px-3 py-2 text-sm font-bold" data-plan-quantity type="number" min="1" max="2000" step="1" value="${item.quantity || 100}" required />
    <select class="rounded-lg border border-nutriflow-200 px-3 py-2 text-sm font-bold" data-plan-meal-time required>
      ${buildMealTimeOptions(item.mealTime || 'Almoco')}
    </select>
    <button class="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-500" type="button" data-remove-plan-item>Remover</button>
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
    const agora = new Date();
    const limite24h = new Date(agora.getTime() + (24 * 60 * 60 * 1000));

    let allApps = [...state.appointments];
    if (pId) allApps = allApps.filter(a => a.patientId === pId);

    allApps.sort((a, b) => {
        const parse = (s) => s ? new Date(`${s.split(' - ')[0].split('/').reverse().join('-')}T${s.split(' - ')[1]}`) : new Date(0);
        return parse(a.date) - parse(b.date);
    });

    const list24h = [];
    const listGeral = [];
    const listHistorico = [];

    allApps.forEach(app => {
        const status = app.status ? app.status.toLowerCase() : 'agendada';
        if (status === 'confirmada' || status === 'faltou') {
            listHistorico.push(app);
            return;
        }

        if (!app.date) { listGeral.push(app); return; }

        const [d, h] = app.date.split(' - ');
        const dateObj = new Date(`${d.split('/').reverse().join('-')}T${h}`);

        if (dateObj >= agora && dateObj <= limite24h) {
            list24h.push(app);
        } else {
            listGeral.push(app);
        }
    });

    const cont24 = document.getElementById('appointmentRemindersList');
    const sec24 = document.getElementById('section24h');
    if (cont24) {
        if (list24h.length > 0) {
            sec24?.classList.remove('hidden');
            cont24.innerHTML = list24h.map(a => renderAppointmentItem(a, true)).join('');
        } else {
            sec24?.classList.add('hidden');
        }
    }

    const contGeral = document.getElementById('appointmentsList');
    if (contGeral) {
        contGeral.innerHTML = listGeral.length 
            ? listGeral.map(a => renderAppointmentItem(a, false)).join('')
            : '<p class="text-xs text-nutriflow-400 italic p-4">Nenhuma consulta agendada.</p>';
    }

    const contHist = document.getElementById('historyList');
    if (contHist) {
        contHist.innerHTML = listHistorico.map(a => renderAppointmentItem(a, false)).join('');
    }

  const plans = pId ? state.mealPlans.filter(p => p.patientId === pId) : state.mealPlans;
  const plansContainer = document.getElementById('latestMealPlans');
  if (plansContainer) {
    plansContainer.innerHTML = plans.length ? plans.map(plan => `
      <div class="bg-white border rounded-xl p-3 shadow-sm relative group">
        <p class="text-xs font-bold text-nutriflow-500 uppercase">${plan.patient}</p>
        <p class="text-sm font-bold text-nutriflow-950 mt-1 pr-12">${plan.title}</p>
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
           <button onclick="window.deleteResource('meal-plans', '${plan.id}')" class="p-1 text-red-400">🗑️</button>
        </div>
      </div>
    `).join('') : '<p class="text-xs p-2">Nenhum plano.</p>';
  }

  const asss = pId ? state.assessments.filter(a => a.patientId === pId) : state.assessments;
  const assContainer = document.getElementById('latestAssessments');
  if (assContainer) {
    assContainer.innerHTML = asss.length ? asss.map(ass => `
      <div class="bg-white border rounded-xl p-3 shadow-sm relative group">
        <p class="text-xs font-bold text-nutriflow-500 uppercase">${ass.patient}</p>
        <p class="text-sm font-bold text-nutriflow-950 mt-1">Peso: ${ass.weight}kg</p>
        <button onclick="window.deleteResource('assessments', '${ass.id}')" class="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover:opacity-100">🗑️</button>
      </div>
    `).join('') : '<p class="text-xs p-2">Nenhuma avaliação.</p>';
  }

  const challContainer = document.getElementById('challengesList');
  if (challContainer) {
    challContainer.innerHTML = state.challenges.length ? state.challenges.map(ch => `
      <div class="bg-white border rounded-xl p-3 shadow-sm mb-2">
        <p class="text-sm font-bold text-nutriflow-950">${ch.title}</p>
      </div>
    `).join('') : '<p class="text-xs p-2">Nenhum desafio.</p>';
  }
  renderOtherDashboardResources(pId);
}

function renderOtherDashboardResources(pId) {
    const plans = pId ? state.mealPlans.filter(p => p.patientId === pId) : state.mealPlans;
    const pCont = document.getElementById('latestMealPlans');
    if (pCont) pCont.innerHTML = plans.map(p => `<div class="bg-white border p-3 rounded-xl mb-2"><p class="text-xs font-bold">${p.title}</p></div>`).join('');
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

  const payload = {
    patientId: document.getElementById('mealPlanPatient').value,
    title: document.getElementById('mealPlanTitle').value,
    notes: document.getElementById('mealPlanNotes').value,
    items,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
  };
  try {
    await apiRequest('/api/nutritionist/meal-plans', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Plano salvo!'); closeModal('mealPlan'); await fetchDatabaseData();
  } catch(err) { showToast('Erro ao salvar plano.'); }
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

document.getElementById('addParticipantForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patientId = document.getElementById('addPartPatient').value;
  try {
    await apiRequest(`/api/nutritionist/challenges/${state.activeChallengeId}/participants`, { method: 'POST', body: JSON.stringify({ patientId }) });
    showToast('Paciente adicionado ao desafio!'); closeModal('addParticipant'); await fetchDatabaseData();
  } catch(err) { showToast('Erro ao adicionar paciente.'); }
});

function renderAppointmentItem(app, isHighPriority = false) {
  const displayDate = app.date || "Data não definida";
  const statusClean = app.status ? app.status.toLowerCase() : 'agendada';
  
  const isFinalizado = statusClean === 'confirmada' || statusClean === 'faltou';
  
  let statusBadge = '';
  if (statusClean === 'confirmada') {
    statusBadge = `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-full border border-emerald-200">✓ Confirmada</span>`;
  } else if (statusClean === 'faltou') {
    statusBadge = `<span class="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded-full border border-rose-200">✕ Faltou</span>`;
  }

  const priorityClass = isHighPriority 
    ? 'border-l-4 border-orange-500 bg-orange-50/40' 
    : 'border-l-4 border-nutriflow-100 bg-white';

  return `
    <div class="border rounded-2xl p-4 shadow-sm transition-all ${priorityClass}">
      <div class="flex justify-between items-start mb-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <p class="text-[10px] font-black text-nutriflow-400 uppercase tracking-tighter">${app.type || 'Consulta'}</p>
            ${isFinalizado ? statusBadge : ''} </div>
          <h4 class="text-base font-extrabold text-nutriflow-950">${app.patientName || app.patient}</h4>
        </div>
        <button onclick="window.openDeleteAppointmentModal('${app.id}')" class="text-gray-300 hover:text-red-500 transition">
          🗑️
        </button>
      </div>

      <div class="bg-nutriflow-50 rounded-xl p-3 border border-nutriflow-100 mb-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📅</span>
          <div>
            <p class="text-sm font-black text-nutriflow-900 leading-none">${displayDate.split(' - ')[1] || ''}</p>
            <p class="text-base font-bold text-nutriflow-500 uppercase mt-1">${displayDate.split(' - ')[0] || displayDate}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        ${!isFinalizado ? `
          <button onclick="window.updateAppointmentStatus('${app.id}', 'confirmada')" class="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-700 transition">Confirmar</button>
          <button onclick="window.openRescheduleModal('${app.id}')" class="flex-1 py-2 bg-white border border-nutriflow-200 text-nutriflow-700 rounded-lg text-[10px] font-black uppercase hover:bg-nutriflow-50 transition">Remarcar</button>
          <button onclick="window.updateAppointmentStatus('${app.id}', 'faltou')" class="flex-1 py-2 bg-white border border-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-50 transition">Faltou</button>
        ` : `
          <button onclick="window.openEditAppointmentModal('${app.id}')" class="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase hover:bg-gray-200 transition text-center">✏️ Alterar Status</button>
        `}
      </div>
    </div>
  `;
}

function getStatusStyle(status) {
  if (status === 'confirmada') return 'bg-emerald-100 text-emerald-700';
  if (status === 'faltou') return 'bg-rose-100 text-rose-700';
  return 'bg-blue-50 text-blue-600';
}

let currentEditingId = null;
window.openRescheduleModal = function(id) { currentEditingId = id; openModal('reschedule'); };

window.openEditAppointmentModal = function(id) {
  const app = state.appointments.find(a => a.id === id);
  if(!app) return;
  currentEditingId = id;
  document.getElementById('editAppointmentContent').innerHTML = `
    <p class="text-sm font-bold mb-2">Paciente: ${app.patient}</p>
    <label class="nf-field">
      <span>Mudar Status</span>
      <select id="editStatusField" class="font-bold">
        <option value="confirmada" ${app.status === 'confirmada' ? 'selected' : ''}>Confirmada</option>
        <option value="faltou" ${app.status === 'faltou' ? 'selected' : ''}>Faltou</option>
        <option value="agendada" ${app.status === 'agendada' ? 'selected' : ''}>Agendada</option>
      </select>
    </label>
    <button onclick="window.saveAppointmentEdit()" class="mt-4 bg-nutriflow-900 text-white py-2 rounded-lg font-bold w-full">Salvar</button>
  `;
  openModal('editAppointment');
};

window.saveAppointmentEdit = async function() {
  const status = document.getElementById('editStatusField').value;
  await window.updateAppointmentStatus(currentEditingId, status);
  closeModal('editAppointment');
};

document.getElementById('btnConfirmReschedule')?.addEventListener('click', async () => {
  const newDate = document.getElementById('rescheduleDate').value;
  if (!newDate) return showToast('Selecione uma data.');
  try {
    await apiRequest(`/api/nutritionist/appointments/${currentEditingId}/reschedule`, { method: 'PATCH', body: JSON.stringify({ scheduledAt: newDate }) });
    showToast('Consulta remarcada!');
    closeModal('reschedule');
    await fetchDatabaseData();
  } catch (error) { showToast('Erro ao remarcar.'); }
});

window.switchAgendaTab = function(tab) {
  const btnAtual = document.getElementById('btnTabAgenda');
  const btnHist = document.getElementById('btnTabHistorico');
  const contentAtual = document.getElementById('tabContentAtual');
  const contentHist = document.getElementById('tabContentHistorico');

  if (tab === 'atual') {
    contentAtual.classList.remove('hidden');
    contentHist.classList.add('hidden');
    btnAtual.className = "text-[10px] bg-nutriflow-950 text-white px-2 py-1 rounded-md font-bold transition";
    btnHist.className = "text-[10px] bg-nutriflow-100 text-nutriflow-900 px-2 py-1 rounded-md font-bold transition";
  } else {
    contentAtual.classList.add('hidden');
    contentHist.classList.remove('hidden');
    btnHist.className = "text-[10px] bg-nutriflow-950 text-white px-2 py-1 rounded-md font-bold transition";
    btnAtual.className = "text-[10px] bg-nutriflow-100 text-nutriflow-900 px-2 py-1 rounded-md font-bold transition";
  }
};

let idParaExcluir = null;

window.openDeleteAppointmentModal = function(id) {
    idParaExcluir = id;
    openModal('deleteConfirm');
};

document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
    if (!idParaExcluir) return;
    try {
        await apiRequest(`/api/nutritionist/appointments/${idParaExcluir}`, { method: 'DELETE' });
        showToast('Consulta removida com sucesso!');
        closeModal('deleteConfirm');
        await fetchDatabaseData();
    } catch (e) {
        showToast('Erro ao excluir consulta.');
    }
});

// START
async function init() {
  if (!ensureNutritionistAccess()) return;
  bindButtons(); 
  await fetchDatabaseData();
}
init();
