class NutritionistDashboardController {
  constructor(sessionService, nutritionistDashboardService, chatRealtimeService = null) {
    this.sessionService = sessionService;
    this.nutritionistDashboardService = nutritionistDashboardService;
    this.chatRealtimeService = chatRealtimeService;
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

  // Nova Função: Agendar Consulta
  async createAppointment(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.createAppointment(nutritionist, request.body || {});
    response.status(201).json(result);
  }

  async updateAppointmentStatus(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.updateAppointmentStatus(
      nutritionist,
      request.params.id,
      request.body || {},
    );
    response.status(200).json(result);
  }

  async rescheduleAppointment(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.rescheduleAppointment(
      nutritionist,
      request.params.id,
      request.body || {},
    );
    response.status(200).json(result);
  }

  // Nova Função: Adicionar ao Desafio
  async addChallengeParticipant(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.addChallengeParticipant(nutritionist, request.params.id, request.body || {});
    response.status(200).json(result);
  }

  // Nova Função: Excluir Recursos
  async deleteResource(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.deleteResource(nutritionist, request.params.resource, request.params.id);
    response.status(200).json(result);
  }

  async linkPatient(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.linkPatient(nutritionist, request.body || {});
    response.status(200).json(result);
  }

  async getConversation(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.getConversation(nutritionist, request.query.patientId);
    response.status(200).json(result);
  }

  async openConversationStream(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const context = await this.nutritionistDashboardService.getConversationStreamContext(
      nutritionist,
      request.query.patientId,
    );
    this.chatRealtimeService.subscribeToPatientProfile(request, response, context.patientProfileId);
  }

  async sendMessage(request, response) {
    const nutritionist = await this.sessionService.requireNutritionist(request);
    const result = await this.nutritionistDashboardService.sendMessage(nutritionist, request.body || {});
    response.status(201).json(result);
  }
}

module.exports = { NutritionistDashboardController };
