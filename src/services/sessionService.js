const { AppError } = require('../errors/appError');
const { isAdminRole, isNutritionistRole, isPatientRole } = require('../constants/roles');

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

    if (!user.isActive) {
      throw new AppError('Sua conta esta bloqueada. Procure o administrador da plataforma.', 403);
    }

    return user;
  }

  async requireNutritionist(request) {
    const user = await this.requireAuthenticatedUser(request);

    if (!isNutritionistRole(user.profile)) {
      throw new AppError('Acesso permitido apenas para nutricionistas.', 403);
    }

    return user;
  }

  async requirePatient(request) {
    const user = await this.requireAuthenticatedUser(request);

    if (!isPatientRole(user.profile)) {
      throw new AppError('Acesso permitido apenas para pacientes.', 403);
    }

    return user;
  }

  async requireAdmin(request) {
    const user = await this.requireAuthenticatedUser(request);

    if (!isAdminRole(user.profile)) {
      throw new AppError('Acesso permitido apenas para administradores.', 403);
    }

    return user;
  }
}

module.exports = {
  SessionService,
};
