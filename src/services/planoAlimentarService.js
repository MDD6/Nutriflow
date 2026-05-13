const { PlanoAlimentar } = require('../models/PlanoAlimentar');

class PlanoAlimentarService {
  constructor(planoAlimentarRepository) {
    this.planoAlimentarRepository = planoAlimentarRepository;
  }

  async buscarPlanoAlimentarPorId(id) {
    const mealPlan = await this.planoAlimentarRepository.buscarPlanoAlimentarPorId(id);
    return PlanoAlimentar.mapMealPlanToPlanoAlimentar(mealPlan);
  }
}

module.exports = { PlanoAlimentarService };