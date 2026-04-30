class PlanoAlimentarService {
  constructor(planoAlimentarRepository) {
    this.planoAlimentarRepository = planoAlimentarRepository;
  }

  async buscarPlanoAlimentarPorId(id) {
    if (!id) {
      return null;
    }

    const planoAlimentar = await this.planoAlimentarRepository.buscarPlanoAlimentarPorId(id);
    return planoAlimentar || null;
  }
}

module.exports = {
  PlanoAlimentarService,
};
