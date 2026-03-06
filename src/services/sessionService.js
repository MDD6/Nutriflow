const { AppError } = require('../errors/appError');

class SessionService {
  constructor(tokenService, userRepository) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
  }

  extractToken(request) {
    const header = request.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return null;
    }

    return header.slice('Bearer '.length).trim();
  }

  async requireAuthenticatedUser(request) {
    const token = this.extractToken(request);

    if (!token) {
      throw new AppError('Sessao invalida. Faca login novamente.', 401);
    }

    const payload = this.tokenService.verify(token);

    if (!payload?.sub) {
      throw new AppError('Sessao expirada ou invalida.', 401);
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new AppError('Usuario autenticado nao encontrado.', 401);
    }

    return user;
  }

  async requireNutritionist(request) {
    const user = await this.requireAuthenticatedUser(request);

    if (String(user.profile || '').trim().toLowerCase() !== 'nutricionista') {
      throw new AppError('Acesso permitido apenas para nutricionistas.', 403);
    }

    return user;
  }
}

module.exports = {
  SessionService,
};
