const http = require('http');
const { config } = require('./config');
const { createPrismaClient } = require('./infra/database');
const { UserRepository } = require('./repositories/userRepository');
const { PasswordService } = require('./services/passwordService');
const { TokenService } = require('./services/tokenService');
const { AuthService } = require('./services/authService');
const { AuthController } = require('./controllers/authController');
const { StaticFileHandler } = require('./http/staticFileHandler');
const { sendJson } = require('./http/response');

function createDependencies() {
  const prisma = createPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  const passwordService = new PasswordService();
  const tokenService = new TokenService(config.tokenSecret);
  const authService = new AuthService(userRepository, passwordService, tokenService);
  const authController = new AuthController(authService);
  const staticFileHandler = new StaticFileHandler(config.frontendDir);

  return {
    prisma,
    authController,
    staticFileHandler,
  };
}

function createApp() {
  const { prisma, authController, staticFileHandler } = createDependencies();

  const server = http.createServer(async (request, response) => {
    if (!request.url) {
      sendJson(response, 400, { message: 'Requisicao invalida.' });
      return;
    }

    if (request.method === 'POST' && request.url === '/api/auth/register') {
      await authController.register(request, response);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/auth/login') {
      await authController.login(request, response);
      return;
    }

    if (request.method === 'GET') {
      staticFileHandler.handle(request, response);
      return;
    }

    sendJson(response, 404, { message: 'Rota nao encontrada.' });
  });

  async function shutdown() {
    await prisma.$disconnect();
    process.exit(0);
  }

  function start() {
    server.listen(config.port, config.host, () => {
      console.log(`Nutriflow iniciado em http://${config.host}:${config.port}`);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return {
    start,
  };
}

module.exports = {
  createApp,
};
