const express = require('express');
const path = require('path');

const { config } = require('./config');
const { createPrismaClient } = require('./infra/database');
const { asyncHandler } = require('./middlewares/asyncHandler');
const { errorHandler } = require('./middlewares/errorHandler');

const { AuthController } = require('./controllers/authController');
const { PatientDashboardController } = require('./controllers/patientDashboardController');
const { NutritionistDashboardController } = require('./controllers/nutritionistDashboardController');
const { AdminController } = require('./controllers/adminController');
const { PlanoAlimentarController } = require('./controllers/planoAlimentarController');

const { UserRepository } = require('./repositories/userRepository');
const { PatientDashboardRepository } = require('./repositories/patientDashboardRepository');
const { NutritionistDashboardRepository } = require('./repositories/nutritionistDashboardRepository');
const { AdminRepository } = require('./repositories/adminRepository');
const { PlanoAlimentarRepository } = require('./repositories/planoAlimentarRepository');

const { AuthService } = require('./services/authService');
const { SessionService } = require('./services/sessionService');
const { PasswordService } = require('./services/passwordService');
const { TokenService } = require('./services/tokenService');
const { PatientDashboardService } = require('./services/patientDashboardService');
const { NutritionistDashboardService } = require('./services/nutritionistDashboardService');
const { AdminService } = require('./services/adminService');
const { PlanoAlimentarService } = require('./services/planoAlimentarService');

const { createAuthRoutes } = require('./routes/authRoutes');
const { createPatientRoutes } = require('./routes/patientRoutes');
const { createNutritionistRoutes } = require('./routes/nutritionistRoutes');
const { createAdminRoutes } = require('./routes/adminRoutes');
const { createPlanoAlimentarRoutes } = require('./routes/planoAlimentarRoutes');

const FRONTEND_ROUTE_ALIASES = new Map([
  ['/home', '/index.html'],
  ['/home/', '/index.html'],
  ['/home/index.html', '/index.html'],
  ['/home/styles.css', '/styles.css'],
  ['/home/scripts.js', '/scripts.js'],
  ['/home/api.js', '/api.js'],
  ['/home/ui.js', '/ui.js'],
  ['/dashboard', '/dashboard.html'],
  ['/dashboard/', '/dashboard.html'],
  ['/dashboard-nutricionista', '/dashboard-nutricionista.html'],
  ['/dashboard-nutricionista/', '/dashboard-nutricionista.html'],
  ['/dashboard-admin', '/dashboard-admin.html'],
  ['/dashboard-admin/', '/dashboard-admin.html'],
  ['/Nutricionista/dashboard-nutricionista.html', '/dashboard-nutricionista.html'],
  ['/Nutricionista/dashboard-nutricionista.js', '/dashboard-nutricionista.js'],
  ['/nutricionista/dashboard-nutricionista.html', '/dashboard-nutricionista.html'],
  ['/nutricionista/dashboard-nutricionista.js', '/dashboard-nutricionista.js'],
]);

function createCorsMiddleware() {
  return function corsMiddleware(request, response, next) {
    response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Vary', 'Origin');

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }

    next();
  };
}

function createFrontendRouteAliasMiddleware() {
  return function frontendRouteAliasMiddleware(request, response, next) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    const alias = FRONTEND_ROUTE_ALIASES.get(request.path);

    if (!alias) {
      next();
      return;
    }

    const queryIndex = request.originalUrl.indexOf('?');
    const search = queryIndex === -1 ? '' : request.originalUrl.slice(queryIndex);

    response.redirect(302, `${alias}${search}`);
  };
}

function createDependencies(appConfig, overrides = {}) {
  const prisma = overrides.prisma || createPrismaClient(appConfig.databaseUrl);

  const userRepository = new UserRepository(prisma);
  const patientDashboardRepository = new PatientDashboardRepository(prisma);
  const nutritionistDashboardRepository = new NutritionistDashboardRepository(prisma);
  const adminRepository = new AdminRepository(prisma);
  const planoAlimentarRepository = new PlanoAlimentarRepository(prisma);

  const passwordService = new PasswordService();
  const tokenService = new TokenService(appConfig.tokenSecret);
  const sessionService = new SessionService(tokenService, userRepository);

  const authService = new AuthService(userRepository, passwordService, tokenService);
  const patientDashboardService = new PatientDashboardService(patientDashboardRepository, userRepository);
  const nutritionistDashboardService = new NutritionistDashboardService(
    nutritionistDashboardRepository,
    userRepository,
  );
  const adminService = new AdminService(adminRepository);
  const planoAlimentarService = new PlanoAlimentarService(planoAlimentarRepository);

  return {
    prisma,
    authController: new AuthController(authService),
    patientDashboardController: new PatientDashboardController(sessionService, patientDashboardService),
    nutritionistDashboardController: new NutritionistDashboardController(
      sessionService,
      nutritionistDashboardService,
    ),
    adminController: new AdminController(sessionService, adminService),
    planoAlimentarController: new PlanoAlimentarController(planoAlimentarService),
  };
}

function createApp(options = {}) {
  const appConfig = {
    ...config,
    ...(options.config || {}),
  };
  const dependencies = createDependencies(appConfig, options);
  const app = express();
  const frontendDir = appConfig.frontendDir;

  app.disable('x-powered-by');
  app.locals.config = appConfig;
  app.locals.prisma = dependencies.prisma;

  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (request, response) => {
    response.status(200).json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  app.post('/api/contact', asyncHandler(async (request, response) => {
    const { name, email, message } = request.body || {};

    if (!name || !email || !message) {
      response.status(400).json({ message: 'Preencha nome, e-mail e mensagem.' });
      return;
    }

    response.status(201).json({ message: 'Mensagem recebida com sucesso.' });
  }));

  app.use('/api/auth', createAuthRoutes(dependencies.authController));
  app.use('/api/patient', createPatientRoutes(dependencies.patientDashboardController));
  app.use('/api/nutritionist', createNutritionistRoutes(dependencies.nutritionistDashboardController));
  app.use('/api/admin', createAdminRoutes(dependencies.adminController));
  app.use('/api/plano-alimentar', createPlanoAlimentarRoutes(dependencies.planoAlimentarController));

  app.use(createFrontendRouteAliasMiddleware());
  app.use(express.static(frontendDir));

  app.get('/', (request, response) => {
    response.sendFile(path.join(frontendDir, 'index.html'));
  });

  app.use('/api', (request, response) => {
    response.status(404).json({ message: 'Rota da API nao encontrada.' });
  });

  app.use((request, response) => {
    response.status(404).json({ message: 'Recurso nao encontrado.' });
  });

  app.use(errorHandler);

  app.start = (port = appConfig.port, host = appConfig.host) => {
    const server = app.listen(port, host, () => {
      const address = server.address();
      const resolvedHost = typeof address === 'object' && address ? address.address : host;
      const resolvedPort = typeof address === 'object' && address ? address.port : port;

      console.log(`NutriFlow rodando em: http://${resolvedHost}:${resolvedPort}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

    app.locals.server = server;
    return server;
  };

  app.stop = () => new Promise((resolve, reject) => {
    const server = app.locals.server;

    if (!server) {
      dependencies.prisma.$disconnect().then(resolve, reject);
      return;
    }

    server.close((error) => {
      dependencies.prisma.$disconnect().then(() => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      }, reject);
    });
  });

  return app;
}

module.exports = {
  createApp,
};
