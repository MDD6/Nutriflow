class PlanoAlimentarRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async buscarPlanoAlimentarPorId(id) {
    return await this.prisma.mealPlan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            food: true,
          },
        },
        patientProfile: {
          include: {
            user: true,
          },
        },
        nutritionist: true,
      },
    });
  }
}

module.exports = { PlanoAlimentarRepository };