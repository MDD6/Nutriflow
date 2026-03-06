const { AppError } = require('../errors/appError');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    createdAt: user.createdAt,
  };
}

class AuthService {
  constructor(userRepository, passwordService, tokenService) {
    this.userRepository = userRepository;
    this.passwordService = passwordService;
    this.tokenService = tokenService;
  }

  async register(payload) {
    const name = String(payload.name || '').trim();
    const email = normalizeEmail(payload.email);
    const profile = String(payload.profile || '').trim();
    const password = String(payload.password || '');

    if (!name || !email || !profile || !password) {
      throw new AppError('Preencha nome, e-mail, perfil e senha.', 400);
    }

    if (password.length < 8) {
      throw new AppError('A senha precisa ter pelo menos 8 caracteres.', 400);
    }

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('Ja existe uma conta com este e-mail.', 409);
    }

    const user = await this.userRepository.create({
      name,
      email,
      profile,
      passwordHash: this.passwordService.hash(password),
    });

    return {
      message: 'Cadastro realizado com sucesso.',
      token: this.tokenService.create(user),
      user: toPublicUser(user),
    };
  }

  async login(payload) {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || '');

    if (!email || !password) {
      throw new AppError('Informe e-mail e senha.', 400);
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user || !this.passwordService.verify(password, user.passwordHash)) {
      throw new AppError('E-mail ou senha invalidos.', 401);
    }

    return {
      message: 'Login realizado com sucesso.',
      token: this.tokenService.create(user),
      user: toPublicUser(user),
    };
  }
}

module.exports = {
  AuthService,
};
