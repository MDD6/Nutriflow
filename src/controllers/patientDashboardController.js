class PatientDashboardController {
  constructor(sessionService, patientDashboardService) {
    this.sessionService = sessionService;
    this.patientDashboardService = patientDashboardService;
  }

  async getDashboard(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.getDashboard(patient);
    response.status(200).json(result);
  }

  async createMealEntry(request, response) {
    const patient = await this.sessionService.requirePatient(request);
    const result = await this.patientDashboardService.createMealEntry(patient, request.body || {});
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
}

module.exports = {
  PatientDashboardController,
};
