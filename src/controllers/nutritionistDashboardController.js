class NutritionistDashboardController {
  constructor(sessionService, nutritionistDashboardService) {
    this.sessionService = sessionService;
    this.nutritionistDashboardService = nutritionistDashboardService;
  }

  async getDashboard(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.getDashboard(nutritionist);
    response.status(200).json(result);
  }

  async createMealPlan(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.createMealPlan(nutritionist, request.body || {});
    response.status(201).json(result);
  }

  async createAssessment(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.createAssessment(nutritionist, request.body || {});
    response.status(201).json(result);
  }

  async createChallenge(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.createChallenge(nutritionist, request.body || {});
    response.status(201).json(result);
  }

  async linkPatient(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.linkPatient(nutritionist, request.body || {});
    response.status(200).json(result);
  }

  async getConversation(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.getConversation(
      nutritionist,
      request.query.patientId,
    );
    response.status(200).json(result);
  }

  async sendMessage(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.sendMessage(nutritionist, request.body || {});
    response.status(201).json(result);
  }
}

module.exports = {
  NutritionistDashboardController,
};
