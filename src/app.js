const http = require('http');
const { config } = require('./config');
const { createPrismaClient } = require('./infra/database');
const { UserRepository } = require('./repositories/userRepository');
const { NutritionistDashboardRepository } = require('./repositories/nutritionistDashboardRepository');
const { PasswordService } = require('./services/passwordService');
const { TokenService } = require('./services/tokenService');
const { AuthService } = require('./services/authService');
const { SessionService } = require('./services/sessionService');
const { NutritionistDashboardService } = require('./services/nutritionistDashboardService');
const { AuthController } = require('./controllers/authController');
const { NutritionistDashboardController } = require('./controllers/nutritionistDashboardController');
const { StaticFileHandler } = require('./http/staticFileHandler');
const { sendJson } = require('./http/response');

function createDependencies() {
  const prisma = createPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  const nutritionistDashboardRepository = new NutritionistDashboardRepository(prisma);
  const passwordService = new PasswordService();
  const tokenService = new TokenService(config.tokenSecret);
  const authService = new AuthService(userRepository, passwordService, tokenService);
  const sessionService = new SessionService(tokenService, userRepository);
  const nutritionistDashboardService = new NutritionistDashboardService(
    nutritionistDashboardRepository,
    passwordService,
  );
  const authController = new AuthController(authService);
  const nutritionistDashboardController = new NutritionistDashboardController(
    sessionService,
    nutritionistDashboardService,
  );
  const staticFileHandler = new StaticFileHandler(config.frontendDir);

  return {
    prisma,
    authController,
    nutritionistDashboardController,
    staticFileHandler,
  };
}

function createApp() {
  const { prisma, authController, nutritionistDashboardController, staticFileHandler } = createDependencies();

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

    if (request.method === 'GET' && request.url === '/api/nutritionist/dashboard') {
      await nutritionistDashboardController.getDashboard(request, response);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/nutritionist/meal-plans') {
      await nutritionistDashboardController.createMealPlan(request, response);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/nutritionist/assessments') {
      await nutritionistDashboardController.createAssessment(request, response);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/nutritionist/challenges') {
      await nutritionistDashboardController.createChallenge(request, response);
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
