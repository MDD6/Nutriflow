class PatientDashboardRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findByUserId(userId) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        nutritionist: true,
        mealPlans: {
          orderBy: { createdAt: 'desc' },
        },
        assessments: {
          orderBy: { date: 'desc' },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
        },
        appointments: {
          orderBy: { scheduledAt: 'asc' },
        },
        mealEntries: {
          orderBy: { loggedAt: 'desc' },
        },
        progressSnapshots: {
          orderBy: { recordedAt: 'asc' },
        },
        challengeLinks: {
          include: {
            challenge: true,
          },
        },
      },
    });
  }

  async createMealEntry(data) {
    return this.prisma.$transaction(async (tx) => {
      const mealEntry = await tx.mealEntry.create({
        data: {
          patientProfileId: data.patientProfileId,
          mealType: data.mealType,
          title: data.title,
          description: data.description,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
          fiber: data.fiber,
          waterMl: data.waterMl,
          loggedAt: data.loggedAt,
        },
      });

      await tx.patientProfile.update({
        where: { id: data.patientProfileId },
        data: {
          lastMeal: `${data.mealType} com ${data.title}`,
        },
      });

      return mealEntry;
    });
  }

  createPatientMessage(data) {
    return this.prisma.patientMessage.create({
      data: {
        patientProfileId: data.patientProfileId,
        nutritionistId: data.nutritionistId,
        senderRole: 'PATIENT',
        content: data.content,
        sentAt: data.sentAt,
        pending: true,
      },
    });
  }
}

module.exports = {
  PatientDashboardRepository,
};
