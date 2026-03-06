const loginModal = document.getElementById('loginModal');
const openButtons = Array.from(document.querySelectorAll('[data-open-auth]'));
const authViewButtons = Array.from(document.querySelectorAll('[data-auth-view]'));
const authPanels = Array.from(document.querySelectorAll('[data-auth-panel]'));
const authSwitchButtons = Array.from(document.querySelectorAll('[data-switch-auth]'));
const closeLogin = document.getElementById('closeLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const authHeading = document.getElementById('authHeading');
const authSubheading = document.getElementById('authSubheading');
const contactForm = document.getElementById('contactForm');
const contactMessage = document.getElementById('contactMessage');

function resetAuthMessages() {
  loginMessage?.classList.add('hidden');
  registerMessage?.classList.add('hidden');
}

function showMessage(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove('hidden');
  element.classList.toggle('bg-red-100', isError);
  element.classList.toggle('text-red-700', isError);
  element.classList.toggle('bg-nutriflow-100', !isError);
  element.classList.toggle('text-nutriflow-800', !isError);
}

function setAuthView(view) {
  const selectedView = view === 'register' ? 'register' : 'login';

  authViewButtons.forEach((button) => {
    const isActive = button.dataset.authView === selectedView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  authPanels.forEach((panel) => {
    const isVisible = panel.dataset.authPanel === selectedView;
    panel.classList.toggle('hidden', !isVisible);
  });

  if (authHeading && authSubheading) {
    if (selectedView === 'register') {
      authHeading.textContent = 'Crie sua conta NutriFlow';
      authSubheading.textContent = 'Cadastre-se para iniciar seu acompanhamento nutricional.';
    } else {
      authHeading.textContent = 'Acesse sua area NutriFlow';
      authSubheading.textContent = 'Faca login para acompanhar metas, refeicoes e evolucao.';
    }
  }

  resetAuthMessages();
}

function openModal(view = 'login') {
  if (!loginModal) {
    return;
  }

  setAuthView(view);
  loginModal.classList.remove('hidden');
  loginModal.classList.add('flex');
  document.body.classList.add('modal-open');
}

function closeModal() {
  if (!loginModal) {
    return;
  }

  loginModal.classList.add('hidden');
  loginModal.classList.remove('flex');
  document.body.classList.remove('modal-open');
}

async function sendAuthRequest(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({
    message: 'Resposta invalida do servidor.',
  }));

  if (!response.ok) {
    throw new Error(data.message || 'Erro na autenticacao.');
  }

  return data;
}

function saveSession(data) {
  if (!data?.token || !data?.user) {
    return;
  }

  localStorage.setItem('nutriflow.token', data.token);
  localStorage.setItem('nutriflow.user', JSON.stringify(data.user));
}

openButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    openModal(button.dataset.openAuth || 'login');
  });
});

authViewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setAuthView(button.dataset.authView);
  });
});

authSwitchButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setAuthView(button.dataset.switchAuth);
  });
});

closeLogin?.addEventListener('click', closeModal);

loginModal?.addEventListener('click', (event) => {
  if (event.target === loginModal) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && loginModal && !loginModal.classList.contains('hidden')) {
    closeModal();
  }
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    showMessage(loginMessage, 'Preencha e-mail e senha para continuar.', true);
    return;
  }

  try {
    const data = await sendAuthRequest('/api/auth/login', { email, password });
    saveSession(data);
    showMessage(loginMessage, `${data.message} Bem-vindo, ${data.user.name}.`);
    loginForm.reset();
    setTimeout(closeModal, 1000);
  } catch (error) {
    showMessage(loginMessage, error.message, true);
  }
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const profile = document.getElementById('registerProfile').value;
  const password = document.getElementById('registerPassword').value.trim();
  const confirmPassword = document.getElementById('registerConfirm').value.trim();
  const acceptedTerms = document.getElementById('registerTerms').checked;

  if (!name || !email || !profile || !password || !confirmPassword) {
    showMessage(registerMessage, 'Preencha todos os campos para concluir o cadastro.', true);
    return;
  }

  if (password.length < 8) {
    showMessage(registerMessage, 'Sua senha precisa ter no minimo 8 caracteres.', true);
    return;
  }

  if (password !== confirmPassword) {
    showMessage(registerMessage, 'As senhas nao conferem. Verifique e tente novamente.', true);
    return;
  }

  if (!acceptedTerms) {
    showMessage(registerMessage, 'Aceite os termos de uso para criar sua conta.', true);
    return;
  }

  try {
    const data = await sendAuthRequest('/api/auth/register', {
      name,
      email,
      profile,
      password,
    });

    saveSession(data);
    showMessage(registerMessage, `${data.message} Conta criada para ${data.user.name}.`);
    registerForm.reset();
    setTimeout(closeModal, 1000);
  } catch (error) {
    showMessage(registerMessage, error.message, true);
  }
});

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  contactMessage.textContent = 'Mensagem enviada com sucesso. Agora voce pode integrar este formulario a sua API.';
  contactMessage.classList.remove('hidden');
  contactForm.reset();
});

setAuthView('login');
