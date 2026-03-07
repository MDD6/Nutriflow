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
  users: [],
  foods: [],
  isSavingFood: false,
};

const adminUserSearch = document.getElementById('adminUserSearch');
const adminRoleFilter = document.getElementById('adminRoleFilter');
const adminUsersList = document.getElementById('adminUsersList');
const adminEmptyUsers = document.getElementById('adminEmptyUsers');
const foodForm = document.getElementById('foodForm');
const foodSearch = document.getElementById('foodSearch');
const foodsList = document.getElementById('foodsList');
const foodSubmitButton = document.getElementById('foodSubmitButton');
const adminToast = document.getElementById('adminToast');
const adminLogoutButton = document.getElementById('adminLogoutButton');

function getSessionToken() {
  return localStorage.getItem('nutriflow.token');
}

function clearSessionAndRedirect() {
  localStorage.removeItem('nutriflow.token');
  localStorage.removeItem('nutriflow.user');
  localStorage.removeItem('nutriflow.lastAuthAt');
  window.location.replace('index.html');
}

function normalizeRole(profile) {
  const normalized = String(profile || '').trim().toLowerCase();

  if (normalized === 'administrador' || normalized === 'admin') {
    return 'ADMIN';
  }

  if (normalized === 'nutricionista' || normalized === 'nutritionist') {
    return 'NUTRITIONIST';
  }

  if (normalized === 'paciente' || normalized === 'patient') {
    return 'PATIENT';
  }

  return '';
}

function ensureAdminAccess() {
  if (!getSessionToken()) {
    clearSessionAndRedirect();
    return false;
  }

  return true;
}

function showToast(message) {
  if (!adminToast || !message) {
    return;
  }

  adminToast.textContent = message;
  adminToast.classList.remove('hidden');
  adminToast.classList.add('is-visible');

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    adminToast.classList.remove('is-visible');
    adminToast.classList.add('hidden');
  }, 2400);
}

function getInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '--';
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
    showToast(data.message || 'Sua sessao expirou.');
    window.setTimeout(clearSessionAndRedirect, 700);
    throw new Error(data.message || 'Sessao invalida.');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Nao foi possivel concluir a operacao.');
  }

  return data;
}

function setHeader(admin) {
  document.getElementById('adminGreeting').textContent = `Bem-vindo, ${admin.name || 'Administrador'}`;
  document.getElementById('adminName').textContent = admin.name || 'Conta admin';
  document.getElementById('adminEmail').textContent = admin.email || '--';
  document.getElementById('adminAvatar').textContent = getInitials(admin.name);
}

function renderSummary() {
  const summary = state.summary || {};

  document.getElementById('summaryTotalUsers').textContent = summary.totalUsers || 0;
  document.getElementById('summaryTotalPatients').textContent = summary.totalPatients || 0;
  document.getElementById('summaryTotalNutritionists').textContent = summary.totalNutritionists || 0;
  document.getElementById('summaryTotalFoods').textContent = summary.totalFoods || 0;
  document.getElementById('summaryActiveUsers').textContent = summary.activeUsers || 0;
  document.getElementById('summaryBlockedUsers').textContent = summary.blockedUsers || 0;
  document.getElementById('summaryFoodLogsToday').textContent = summary.foodLogsToday || 0;
  document.getElementById('summaryActiveMealPlans').textContent = summary.activeMealPlans || 0;
}

function getFilteredUsers() {
  const search = String(adminUserSearch?.value || '').trim().toLowerCase();
  const role = String(adminRoleFilter?.value || '').trim();

  return state.users.filter((user) => {
    const matchesSearch = !search
      || user.name.toLowerCase().includes(search)
      || user.email.toLowerCase().includes(search);
    const matchesRole = !role || user.role === role;

    return matchesSearch && matchesRole;
  });
}

function renderUsers() {
  const users = getFilteredUsers();
  adminUsersList.innerHTML = '';
  adminEmptyUsers.classList.toggle('hidden', users.length > 0);

  users.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'px-4 py-4';
    row.innerHTML = `
      <div class="hidden items-center gap-4 md:grid md:grid-cols-[1.2fr_.7fr_.55fr_.6fr_.8fr]">
        <div class="flex items-center gap-3">
          <div class="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef6e8] text-sm font-bold text-nutriflow-900">${getInitials(user.name)}</div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-nutriflow-950">${user.name}</p>
            <p class="truncate text-xs text-nutriflow-600">${user.email}</p>
          </div>
        </div>
        <span class="text-sm text-nutriflow-700">${user.profile}</span>
        <span><span class="${user.isActive ? 'status-pill is-active' : 'status-pill is-late'}">${user.isActive ? 'Ativo' : 'Bloqueado'}</span></span>
        <span class="text-sm text-nutriflow-700">${user.createdAt}</span>
        <div class="flex justify-end gap-2">
          <button class="rounded-full border border-nutriflow-200 px-3 py-2 text-xs font-semibold text-nutriflow-900" data-toggle-user="${user.id}" data-next-status="${user.isActive ? 'false' : 'true'}">${user.isActive ? 'Bloquear' : 'Reativar'}</button>
          <button class="rounded-full bg-[#fff1f1] px-3 py-2 text-xs font-semibold text-[#a74242]" data-delete-user="${user.id}">Remover</button>
        </div>
      </div>
      <div class="space-y-4 md:hidden">
        <div class="flex items-center gap-3">
          <div class="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef6e8] text-sm font-bold text-nutriflow-900">${getInitials(user.name)}</div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-nutriflow-950">${user.name}</p>
            <p class="truncate text-xs text-nutriflow-600">${user.email}</p>
          </div>
        </div>
        <div class="flex items-center justify-between text-sm text-nutriflow-700">
          <span>${user.profile}</span>
          <span class="${user.isActive ? 'status-pill is-active' : 'status-pill is-late'}">${user.isActive ? 'Ativo' : 'Bloqueado'}</span>
        </div>
        <p class="text-xs text-nutriflow-600">Criado em ${user.createdAt}</p>
        <div class="flex gap-2">
          <button class="flex-1 rounded-full border border-nutriflow-200 px-3 py-2 text-xs font-semibold text-nutriflow-900" data-toggle-user="${user.id}" data-next-status="${user.isActive ? 'false' : 'true'}">${user.isActive ? 'Bloquear' : 'Reativar'}</button>
          <button class="flex-1 rounded-full bg-[#fff1f1] px-3 py-2 text-xs font-semibold text-[#a74242]" data-delete-user="${user.id}">Remover</button>
        </div>
      </div>
    `;
    adminUsersList.appendChild(row);
  });

  adminUsersList.querySelectorAll('[data-toggle-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await apiRequest(`/api/admin/users/${button.dataset.toggleUser}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            isActive: button.dataset.nextStatus === 'true',
          }),
        });
        await refreshUsers();
        await refreshSummary();
        showToast('Status do usuario atualizado.');
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  adminUsersList.querySelectorAll('[data-delete-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await apiRequest(`/api/admin/users/${button.dataset.deleteUser}`, {
          method: 'DELETE',
        });
        await refreshUsers();
        await refreshSummary();
        showToast('Usuario removido com sucesso.');
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function getFilteredFoods() {
  const search = String(foodSearch?.value || '').trim().toLowerCase();

  return state.foods.filter((food) => !search || food.name.toLowerCase().includes(search));
}

function renderFoods() {
  const foods = getFilteredFoods();

  if (!foods.length) {
    foodsList.innerHTML = '<div class="rounded-[22px] border border-dashed border-nutriflow-200 bg-white p-4 text-sm text-nutriflow-600">Nenhum alimento cadastrado ainda.</div>';
    return;
  }

  foodsList.innerHTML = foods.map((food) => `
    <article class="rounded-[22px] border border-nutriflow-100 bg-white p-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-nutriflow-950">${food.name}</p>
          <p class="mt-2 text-xs uppercase tracking-[0.14em] text-nutriflow-500">${food.calories} kcal</p>
        </div>
        <div class="text-right text-xs text-nutriflow-600">
          <p>P ${food.protein}g</p>
          <p>C ${food.carbs}g</p>
          <p>G ${food.fat}g</p>
        </div>
      </div>
    </article>
  `).join('');
}

async function refreshSummary() {
  const payload = await apiRequest('/api/admin/summary');
  state.summary = payload.summary;
  state.currentUser = payload.admin;
  localStorage.setItem('nutriflow.user', JSON.stringify(payload.admin));
  setHeader(payload.admin);
  renderSummary();
}

async function refreshUsers() {
  const payload = await apiRequest('/api/admin/users');
  state.users = Array.isArray(payload.users) ? payload.users : [];
  renderUsers();
}

async function refreshFoods() {
  const payload = await apiRequest('/api/admin/foods');
  state.foods = Array.isArray(payload.foods) ? payload.foods : [];
  renderFoods();
}

async function handleFoodSubmit(event) {
  event.preventDefault();

  if (state.isSavingFood) {
    return;
  }

  const name = document.getElementById('foodName').value.trim();
  const calories = document.getElementById('foodCalories').value.trim();
  const protein = document.getElementById('foodProtein').value.trim();
  const carbs = document.getElementById('foodCarbs').value.trim();
  const fat = document.getElementById('foodFat').value.trim();

  if (!name) {
    showToast('Informe o nome do alimento.');
    return;
  }

  state.isSavingFood = true;
  if (foodSubmitButton) {
    foodSubmitButton.disabled = true;
    foodSubmitButton.textContent = 'Salvando...';
  }

  try {
    await apiRequest('/api/admin/foods', {
      method: 'POST',
      body: JSON.stringify({ name, calories, protein, carbs, fat }),
    });
    foodForm.reset();
    await refreshFoods();
    await refreshSummary();
    showToast('Alimento cadastrado com sucesso.');
  } catch (error) {
    showToast(error.message);
  } finally {
    state.isSavingFood = false;
    if (foodSubmitButton) {
      foodSubmitButton.disabled = false;
      foodSubmitButton.textContent = 'Cadastrar alimento';
    }
  }
}

function bindEvents() {
  adminUserSearch?.addEventListener('input', renderUsers);
  adminRoleFilter?.addEventListener('change', renderUsers);
  foodSearch?.addEventListener('input', renderFoods);
  foodForm?.addEventListener('submit', handleFoodSubmit);
  adminLogoutButton?.addEventListener('click', clearSessionAndRedirect);
}

async function init() {
  if (!ensureAdminAccess()) {
    return;
  }

  bindEvents();
  await refreshSummary();
  await refreshUsers();
  await refreshFoods();
}

void init();
