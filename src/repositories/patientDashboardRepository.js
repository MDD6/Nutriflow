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
          include: {
            items: {
              include: { food: true },
              orderBy: { createdAt: 'asc' },
            },
          },
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
        weightEntries: {
          orderBy: { recordedAt: 'asc' },
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

  getAllFoods() {
    return this.prisma.food.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findFoodsByIds(foodIds) {
    return this.prisma.food.findMany({
      where: {
        id: {
          in: foodIds,
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
          ...(data.items && data.items.length > 0 && {
            items: {
              create: data.items.map(item => ({
                foodId: item.foodId,
                quantity: item.quantity
              }))
            }
          })
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
      const existingWeightEntry = await tx.weightEntry.findFirst({
        where: {
          patientProfileId: data.patientProfileId,
          recordedAt: {
            gte: data.dayStart,
            lt: data.dayEnd,
          },
        },
        orderBy: {
          recordedAt: 'desc',
        },
      });
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

      const weightEntry = existingWeightEntry
        ? await tx.weightEntry.update({
            where: { id: existingWeightEntry.id },
            data: {
              weight: data.weight,
              note: data.note,
              recordedAt: data.recordedAt,
            },
          })
        : await tx.weightEntry.create({
            data: {
              patientProfileId: data.patientProfileId,
              weight: data.weight,
              note: data.note,
              recordedAt: data.recordedAt,
            },
          });

      let snapshot = null;
      let action = existingWeightEntry ? 'updated' : 'created';

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
        weightEntry,
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

  async updateProfile(userId, data) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: data.name,
        },
      });

      const existingProfile = await tx.patientProfile.findUnique({
        where: { userId },
      });

      if (!existingProfile || !data.patientProfile) {
        return null;
      }

      await tx.patientProfile.update({
        where: { id: existingProfile.id },
        data: data.patientProfile,
      });

      return tx.patientProfile.findUnique({
        where: { userId },
        include: {
          user: true,
          nutritionist: true,
          mealPlans: {
            include: {
              items: {
                include: { food: true },
                orderBy: { createdAt: 'asc' },
              },
            },
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
          weightEntries: {
            orderBy: { recordedAt: 'asc' },
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
    });
  }
  async completeChallenge(patientProfileId, challengeId) {
    return this.prisma.challengeParticipant.update({
      where: {
        challengeId_patientProfileId: { challengeId, patientProfileId }
      },
      data: { progress: 100 }
    });
  }
}

module.exports = {
  PatientDashboardRepository,
};
