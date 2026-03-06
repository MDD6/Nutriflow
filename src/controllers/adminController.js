class AdminController {
  constructor(sessionService, adminService) {
    this.sessionService = sessionService;
    this.adminService = adminService;
  }

  async getSummary(request, response) {
    const admin = await this.sessionService.requireAdmin(request);
    const result = await this.adminService.getSummary(admin);
    response.status(200).json(result);
  }

  async getUsers(request, response) {
    await this.sessionService.requireAdmin(request);
    const result = await this.adminService.getUsers(request.query);
    response.status(200).json(result);
  }

  async updateUserStatus(request, response) {
    const admin = await this.sessionService.requireAdmin(request);
    const result = await this.adminService.updateUserStatus(
      request.params.userId,
      request.body || {},
      admin.id,
    );
    response.status(200).json(result);
  }

  async deleteUser(request, response) {
    const admin = await this.sessionService.requireAdmin(request);
    const result = await this.adminService.deleteUser(request.params.userId, admin.id);
    response.status(200).json(result);
  }

  async getFoods(request, response) {
    await this.sessionService.requireAdmin(request);
    const result = await this.adminService.getFoods(request.query.search);
    response.status(200).json(result);
  }

  async createFood(request, response) {
    await this.sessionService.requireAdmin(request);
    const result = await this.adminService.createFood(request.body || {});
    response.status(201).json(result);
  }
}

module.exports = {
  AdminController,
};
