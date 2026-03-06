const http = require('http');
const express = require('express');
const { config } = require('./config');
const { createPrismaClient } = require('./infra/database');
const { AdminRepository } = require('./repositories/adminRepository');
const { UserRepository } = require('./repositories/userRepository');
const { NutritionistDashboardRepository } = require('./repositories/nutritionistDashboardRepository');
const { PatientDashboardRepository } = require('./repositories/patientDashboardRepository');
const { PasswordService } = require('./services/passwordService');
const { TokenService } = require('./services/tokenService');
const { AuthService } = require('./services/authService');
const { SessionService } = require('./services/sessionService');
const { AdminService } = require('./services/adminService');
const { NutritionistDashboardService } = require('./services/nutritionistDashboardService');
const { PatientDashboardService } = require('./services/patientDashboardService');
const { AuthController } = require('./controllers/authController');
const { AdminController } = require('./controllers/adminController');
const { NutritionistDashboardController } = require('./controllers/nutritionistDashboardController');
const { PatientDashboardController } = require('./controllers/patientDashboardController');
const { createAuthRoutes } = require('./routes/authRoutes');
const { createAdminRoutes } = require('./routes/adminRoutes');
const { createNutritionistRoutes } = require('./routes/nutritionistRoutes');
const { createPatientRoutes } = require('./routes/patientRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

function createDependencies() {
  const prisma = createPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const nutritionistDashboardRepository = new NutritionistDashboardRepository(prisma);
  const patientDashboardRepository = new PatientDashboardRepository(prisma);
  const passwordService = new PasswordService();
  const tokenService = new TokenService(config.tokenSecret);
  const authService = new AuthService(userRepository, passwordService, tokenService);
  const sessionService = new SessionService(tokenService, userRepository);
  const adminService = new AdminService(adminRepository);
  const nutritionistDashboardService = new NutritionistDashboardService(
    nutritionistDashboardRepository,
    userRepository,
  );
  const patientDashboardService = new PatientDashboardService(patientDashboardRepository, userRepository);
  const authController = new AuthController(authService);
  const adminController = new AdminController(sessionService, adminService);
  const nutritionistDashboardController = new NutritionistDashboardController(
    sessionService,
    nutritionistDashboardService,
  );
  const patientDashboardController = new PatientDashboardController(
    sessionService,
    patientDashboardService,
  );

  return {
    prisma,
    authController,
    adminController,
    nutritionistDashboardController,
    patientDashboardController,
  };
}

function createApp() {
  const {
    prisma,
    authController,
    adminController,
    nutritionistDashboardController,
    patientDashboardController,
  } = createDependencies();

  const expressApp = express();

  expressApp.use((request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  });

  expressApp.use(express.json({ limit: '1mb' }));

  expressApp.use('/api/auth', createAuthRoutes(authController));
  expressApp.use('/api/patient', createPatientRoutes(patientDashboardController));
  expressApp.use('/api/nutritionist', createNutritionistRoutes(nutritionistDashboardController));
  expressApp.use('/api/admin', createAdminRoutes(adminController));
  expressApp.use(express.static(config.frontendDir));

  expressApp.use('/api', (request, response) => {
    response.status(404).json({
      message: 'Rota nao encontrada.',
    });
  });

  expressApp.use(errorHandler);

  const server = http.createServer(expressApp);

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
