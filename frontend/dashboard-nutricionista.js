const {
  createApiClient,
  createSessionManager,
  createToastController,
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
  mealPlans: [], assessments: [], appointments: [], challenges: [], messages: []
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
    state.challenges = data.challenges || [];
    state.messages = data.messages || [];

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
  if (historyContainer) {
    historyContainer.innerHTML = patientAssessments.length 
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
        <p class="text-xs font-semibold text-nutriflow-600">${plan.calories} kcal</p>
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
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
  agendaContainer.innerHTML = apps.length ? apps.map(app => `
      <div class="bg-white border rounded-xl p-3 shadow-sm flex justify-between items-center relative group">
        <div>
          <p class="text-sm font-bold text-nutriflow-950">${app.patient}</p>
          <p class="text-xs font-bold text-nutriflow-500">${app.type}</p>
        </div>
        <div class="flex items-center gap-2">
          <p class="text-xs font-bold bg-nutriflow-50 px-2 py-1 rounded-lg">${app.date}</p>
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
  document.getElementById('mealPlanCalories').value = plan.calories;
  document.getElementById('mealPlanProtein').value = plan.protein;
  openModal('mealPlan');
};

window.openAddParticipant = function(challengeId) {
  state.activeChallengeId = challengeId;
  openModal('addParticipant');
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
  document.getElementById('btnOpenMealPlan')?.addEventListener('click', () => { document.getElementById('mealPlanForm').reset(); openModal('mealPlan'); });
  document.getElementById('btnOpenAssessment')?.addEventListener('click', () => { document.getElementById('assessmentForm').reset(); openModal('assessment'); });
  document.getElementById('btnOpenAppointment')?.addEventListener('click', () => { document.getElementById('appointmentForm').reset(); openModal('appointment'); });
  document.getElementById('btnOpenChallenge')?.addEventListener('click', () => { document.getElementById('challengeForm').reset(); openModal('challenge'); });
  
  document.getElementById('btnProfileNewPlan')?.addEventListener('click', () => { document.getElementById('mealPlanForm').reset(); openModal('mealPlan'); });
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
  const payload = {
    patientId: document.getElementById('mealPlanPatient').value,
    title: document.getElementById('mealPlanTitle').value,
    calories: document.getElementById('mealPlanCalories').value,
    protein: document.getElementById('mealPlanProtein').value,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
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