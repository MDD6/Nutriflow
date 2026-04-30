class PlanoAlimentarController {
  constructor(planoAlimentarService) {
    this.planoAlimentarService = planoAlimentarService;
  }

  async getPlanoAlimentarById(request, response) {
    const { id } = request.params;

    const planoAlimentar = await this.planoAlimentarService.buscarPlanoAlimentarPorId(id);

    if (!planoAlimentar) {
      response.status(404).json({ message: 'Plano alimentar não encontrado' });
      return;
    }

    response.status(200).json(planoAlimentar);
  }
}

module.exports = {
  PlanoAlimentarController,
};
