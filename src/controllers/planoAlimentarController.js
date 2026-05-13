const { asyncHandler } = require('../middlewares/asyncHandler');

class PlanoAlimentarController {
  constructor(planoAlimentarService) {
    this.planoAlimentarService = planoAlimentarService;
  }

  async getPlanoAlimentarById(request, response) {
    const { id } = request.params;
    const plano = await this.planoAlimentarService.buscarPlanoAlimentarPorId(id);
    response.status(200).json(plano);
  }
}

module.exports = { PlanoAlimentarController };