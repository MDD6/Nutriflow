const { AppError } = require('../errors/appError');
const { parseJsonBody } = require('../http/bodyParser');
const { sendJson } = require('../http/response');

class PatientDashboardController {
  constructor(sessionService, patientDashboardService) {
    this.sessionService = sessionService;
    this.patientDashboardService = patientDashboardService;
  }

  async getDashboard(request, response) {
    await this.execute(request, response, async () => {
      const patient = await this.sessionService.requirePatient(request);
      return this.patientDashboardService.getDashboard(patient);
    }, 200);
  }

  async createMealEntry(request, response) {
    await this.execute(request, response, async (body) => {
      const patient = await this.sessionService.requirePatient(request);
      return this.patientDashboardService.createMealEntry(patient, body);
    }, 201, true);
  }

  async linkNutritionist(request, response) {
    await this.execute(request, response, async (body) => {
      const patient = await this.sessionService.requirePatient(request);
      return this.patientDashboardService.linkNutritionist(patient, body);
    }, 200, true);
  }

  async sendMessage(request, response) {
    await this.execute(request, response, async (body) => {
      const patient = await this.sessionService.requirePatient(request);
      return this.patientDashboardService.sendMessage(patient, body);
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
  PatientDashboardController,
};
