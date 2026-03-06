const storedUser = localStorage.getItem('nutriflow.user');
const user = storedUser ? JSON.parse(storedUser) : null;

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const logoutButton = document.getElementById('logoutButton');
const addMealButton = document.getElementById('addMealButton');
const mealList = document.getElementById('mealList');
const quickReplyButtons = Array.from(document.querySelectorAll('[data-chat-reply]'));

function getInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function isPatientProfile(profile) {
  return String(profile || '').trim().toLowerCase() === 'paciente';
}

function getLinkedNutritionist() {
  return user?.nutritionist || {
    name: 'Dra. Helena',
    email: 'helena@nutriflow.com',
  };
}

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Paciente';
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

function hydrateUser() {
  const fullName = user?.name || 'Paciente NutriFlow';
  const profile = user?.profile || 'Paciente';
  const email = user?.email || 'paciente@nutriflow.com';
  const nutritionist = getLinkedNutritionist();

  document.querySelectorAll('[data-user-name]').forEach((element) => {
    element.textContent = fullName;
  });

  document.querySelectorAll('[data-user-profile]').forEach((element) => {
    element.textContent = profile;
  });

  document.querySelectorAll('[data-user-email]').forEach((element) => {
    element.textContent = email;
  });

  document.querySelectorAll('[data-user-initial]').forEach((element) => {
    element.textContent = getInitials(fullName);
  });

  document.querySelectorAll('[data-linked-nutritionist-name]').forEach((element) => {
    element.textContent = nutritionist.name;
  });

  document.querySelectorAll('[data-linked-nutritionist-initial]').forEach((element) => {
    element.textContent = getInitials(nutritionist.name);
  });

  const chatPlaceholder = document.querySelector('[data-chat-placeholder]');
  if (chatPlaceholder) {
    chatPlaceholder.placeholder = `Escreva uma mensagem para ${nutritionist.name}`;
  }

  const greetingElement = document.querySelector('[data-greeting]');
  if (greetingElement) {
    greetingElement.textContent = `${getGreeting()}, ${getFirstName(fullName)}`;
  }

  const dateElement = document.querySelector('[data-dashboard-date]');
  if (dateElement) {
    dateElement.textContent = `${formatLongDate()} - acompanhe metas, refeicoes e progresso em um unico lugar.`;
  }

  const shortDateElement = document.querySelector('[data-dashboard-date-short]');
  if (shortDateElement) {
    shortDateElement.textContent = formatShortDate();
  }
}

function createChatMessage(content, isUserMessage = false) {
  const nutritionist = getLinkedNutritionist();
  const row = document.createElement('div');
  row.className = `chat-row${isUserMessage ? ' is-user' : ''}`;

  if (!isUserMessage) {
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = getInitials(nutritionist.name);
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble${isUserMessage ? ' is-user' : ''}`;
  bubble.innerHTML = `
    <p class="${isUserMessage ? 'text-xs font-semibold uppercase tracking-[0.14em] text-white/60' : 'text-xs font-semibold uppercase tracking-[0.14em] text-nutriflow-500'}">
      ${isUserMessage ? 'Voce' : nutritionist.name} - agora
    </p>
    <p class="mt-2 text-sm leading-7">${content}</p>
  `;

  row.appendChild(bubble);
  return row;
}

function appendChatMessage(content, isUserMessage = false) {
  if (!chatMessages) {
    return;
  }

  const message = createChatMessage(content, isUserMessage);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendNutritionistReply() {
  const responses = [
    'Recebi sua mensagem. Vamos observar como seu nivel de fome responde ao ajuste de horario.',
    'Boa. Se quiser, posso te passar duas alternativas praticas para esse momento do dia.',
    'Perfeito. Mantenha o registro nas proximas refeicoes para eu ajustar seu plano com mais precisao.',
  ];

  const reply = responses[Math.floor(Math.random() * responses.length)];
  window.setTimeout(() => appendChatMessage(reply, false), 700);
}

function addMealCard() {
  if (!mealList) {
    return;
  }

  const card = document.createElement('article');
  card.className = 'meal-item rounded-[24px] border border-nutriflow-100 bg-white p-4';
  card.innerHTML = `
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex items-start gap-4">
        <span class="timeline-dot"></span>
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.16em] text-nutriflow-500">18:10 - Lanche extra</p>
          <h3 class="mt-2 text-lg font-semibold tracking-[-0.03em]">Shake de whey com cacau e morango</h3>
          <p class="mt-2 text-sm text-nutriflow-600">Opcao rapida para fechar o periodo da tarde com proteina e baixo volume.</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-nutriflow-700">
        <span class="rounded-full bg-nutriflow-100 px-3 py-2">230 kcal</span>
        <span class="rounded-full bg-[#edf7e7] px-3 py-2">25g proteina</span>
      </div>
    </div>
  `;

  mealList.appendChild(card);
  addMealButton.disabled = true;
  addMealButton.textContent = 'Lanche registrado';
}

function handleLogout() {
  localStorage.removeItem('nutriflow.token');
  localStorage.removeItem('nutriflow.user');
  localStorage.removeItem('nutriflow.lastAuthAt');
  window.location.assign('index.html');
}

function ensurePatientAccess() {
  if (!user || !isPatientProfile(user.profile)) {
    window.location.replace('index.html');
    return false;
  }

  return true;
}

chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  appendChatMessage(message, true);
  chatInput.value = '';
  appendNutritionistReply();
});

quickReplyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!chatInput) {
      return;
    }

    chatInput.value = button.dataset.chatReply || '';
    chatInput.focus();
  });
});

logoutButton?.addEventListener('click', handleLogout);
addMealButton?.addEventListener('click', addMealCard);

if (ensurePatientAccess()) {
  hydrateUser();
}
