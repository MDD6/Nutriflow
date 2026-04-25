class PatientDashboardController {
  constructor(sessionService, patientDashboardService, chatRealtimeService = null) {
    this.sessionService = sessionService;
    this.patientDashboardService = patientDashboardService;
    this.chatRealtimeService = chatRealtimeService;
  }

  async getDashboard(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.getDashboard(patient);
    response.status(200).json(result);
  }

  async getChat(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.getChat(patient);
    response.status(200).json(result);
  }

  async openChatStream(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const context = await this.patientDashboardService.getChatStreamContext(patient);
    this.chatRealtimeService.subscribeToPatientProfile(request, response, context.patientProfileId);
  }

  async createMealEntry(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.createMealEntry(patient, request.body || {});
    response.status(201).json(result);
  }

  async createWeeklyWeightEntry(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.createWeeklyWeightEntry(patient, request.body || {});
    response.status(201).json(result);
  }

  async linkNutritionist(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.linkNutritionist(patient, request.body || {});
    response.status(200).json(result);
  }

  async sendMessage(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.sendMessage(patient, request.body || {});
    response.status(201).json(result);
  }

  async updateProfile(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.updateProfile(patient, request.body || {});
    response.status(200).json(result);
  }
  async completeChallenge(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.completeChallenge(patient, request.params.id);
    response.status(200).json(result);
  }
}

module.exports = {
  PatientDashboardController,
};
