const { AppError } = require('../errors/appError');
const { parseJsonBody } = require('../http/bodyParser');
const { sendJson } = require('../http/response');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async register(request, response) {
    await this.execute(request, response, (body) => this.authService.register(body), 201);
  }

  async login(request, response) {
    await this.execute(request, response, (body) => this.authService.login(body), 200);
  }

  async execute(request, response, action, successStatusCode) {
    try {
      const body = await parseJsonBody(request);
      const result = await action(body);
      sendJson(response, successStatusCode, result);
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      sendJson(response, statusCode, {
        message: error.message || 'Erro interno do servidor.',
      });
    }
  }
}

module.exports = {
  AuthController,
};
