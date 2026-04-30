const { mapMealPlanToPlanoAlimentar } = require('../models/PlanoAlimentar');

class PlanoAlimentarRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async buscarPlanoAlimentarPorId(id) {
    if (!id) {
      return null;
    }

    const mealPlan = await this.prisma.mealPlan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            food: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return mapMealPlanToPlanoAlimentar(mealPlan);
  }
}

module.exports = {
  PlanoAlimentarRepository,
};
