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
      authSubheading.textContent = 'Faça login para acompanhar metas, refeições e evolução.';
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

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    loginMessage.classList.remove('hidden');
    loginMessage.textContent = 'Preencha e-mail e senha para continuar.';
    return;
  }

  loginMessage.classList.remove('hidden');
  loginMessage.textContent = `Login simulado realizado para ${email}. Integre este formulário com seu backend Node.js + Prisma.`;
  loginForm.reset();
});

registerForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const profile = document.getElementById('registerProfile').value;
  const password = document.getElementById('registerPassword').value.trim();
  const confirmPassword = document.getElementById('registerConfirm').value.trim();
  const acceptedTerms = document.getElementById('registerTerms').checked;

  if (!name || !email || !profile || !password || !confirmPassword) {
    registerMessage.classList.remove('hidden');
    registerMessage.textContent = 'Preencha todos os campos para concluir o cadastro.';
    return;
  }

  if (password.length < 8) {
    registerMessage.classList.remove('hidden');
    registerMessage.textContent = 'Sua senha precisa ter no minimo 8 caracteres.';
    return;
  }

  if (password !== confirmPassword) {
    registerMessage.classList.remove('hidden');
    registerMessage.textContent = 'As senhas nao conferem. Verifique e tente novamente.';
    return;
  }

  if (!acceptedTerms) {
    registerMessage.classList.remove('hidden');
    registerMessage.textContent = 'Aceite os termos de uso para criar sua conta.';
    return;
  }

  registerMessage.classList.remove('hidden');
  registerMessage.textContent = `Cadastro simulado criado para ${name} (${profile}). Agora conecte este fluxo ao backend Node.js.`;
  registerForm.reset();
});

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  contactMessage.textContent = 'Mensagem enviada com sucesso. Agora você pode integrar este formulário à sua API.';
  contactMessage.classList.remove('hidden');
  contactForm.reset();
});

setAuthView('login');
