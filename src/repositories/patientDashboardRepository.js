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

  async upsertWeeklyWeightEntry(data) {
    return this.prisma.$transaction(async (tx) => {
      const existingSnapshot = await tx.progressSnapshot.findFirst({
        where: {
          patientProfileId: data.patientProfileId,
          recordedAt: {
            gte: data.weekStart,
            lt: data.weekEnd,
          },
        },
        orderBy: {
          recordedAt: 'desc',
        },
      });

      let snapshot = null;
      let action = 'created';

      if (existingSnapshot) {
        snapshot = await tx.progressSnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            weight: data.weight,
            adherence: data.adherence,
            progress: data.progress,
            recordedAt: data.recordedAt,
          },
        });
        action = 'updated';
      } else {
        const snapshotsCount = await tx.progressSnapshot.count({
          where: {
            patientProfileId: data.patientProfileId,
          },
        });

        snapshot = await tx.progressSnapshot.create({
          data: {
            patientProfileId: data.patientProfileId,
            label: `S${snapshotsCount + 1}`,
            weight: data.weight,
            adherence: data.adherence,
            progress: data.progress,
            recordedAt: data.recordedAt,
          },
        });
      }

      await tx.patientProfile.update({
        where: { id: data.patientProfileId },
        data: {
          currentWeight: data.weight,
        },
      });

      return {
        action,
        snapshot,
      };
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
