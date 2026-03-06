const { AppError } = require('../errors/appError');
const { parseJsonBody } = require('../http/bodyParser');
const { sendJson } = require('../http/response');

class NutritionistDashboardController {
  constructor(sessionService, nutritionistDashboardService) {
    this.sessionService = sessionService;
    this.nutritionistDashboardService = nutritionistDashboardService;
  }

  async getDashboard(request, response) {
    await this.execute(request, response, async () => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      return this.nutritionistDashboardService.getDashboard(nutritionist);
    }, 200);
  }

  async createMealPlan(request, response) {
    await this.execute(request, response, async (body) => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      return this.nutritionistDashboardService.createMealPlan(nutritionist, body);
    }, 201, true);
  }

  async createAssessment(request, response) {
    await this.execute(request, response, async (body) => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      return this.nutritionistDashboardService.createAssessment(nutritionist, body);
    }, 201, true);
  }

  async createChallenge(request, response) {
    await this.execute(request, response, async (body) => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      return this.nutritionistDashboardService.createChallenge(nutritionist, body);
    }, 201, true);
  }

  async linkPatient(request, response) {
    await this.execute(request, response, async (body) => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      return this.nutritionistDashboardService.linkPatient(nutritionist, body);
    }, 200, true);
  }

  async getConversation(request, response) {
    await this.execute(request, response, async () => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      const requestUrl = new URL(request.url, 'http://localhost');
      const patientId = requestUrl.searchParams.get('patientId');

      return this.nutritionistDashboardService.getConversation(nutritionist, patientId);
    }, 200);
  }

  async sendMessage(request, response) {
    await this.execute(request, response, async (body) => {
      const nutritionist = await this.sessionService.requireNutritionist(request);
      return this.nutritionistDashboardService.sendMessage(nutritionist, body);
    }, 201, true);
  }

  async execute(request, response, action, successStatusCode, parseBody = false) {
    try {
      const body = parseBody ? await parseJsonBody(request) : {};
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
  NutritionistDashboardController,
};
