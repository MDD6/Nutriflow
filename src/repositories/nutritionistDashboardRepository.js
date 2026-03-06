class NutritionistDashboardRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  countManagedPatients(nutritionistId) {
    return this.prisma.patientProfile.count({
      where: { nutritionistId },
    });
  }

  async seedWorkspace(nutritionistId, passwordHash) {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysAgo = (days) => new Date(now.getTime() - days * dayMs);
    const daysFromNow = (days, hours = 9, minutes = 0) => {
      const date = new Date(now.getTime() + days * dayMs);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const patientSeeds = [
      {
        key: 'amanda',
        name: 'Amanda Rocha',
        email: `amanda.${nutritionistId.slice(0, 8)}@nutriflow.local`,
        age: 34,
        objective: 'Emagrecimento',
        status: 'Ativo',
        restrictions: 'Sem lactose, evita frituras e frutos do mar.',
        lastMeal: 'Almoco com frango, arroz integral e legumes.',
        currentWeight: 78.4,
        height: 1.67,
        bodyFat: 31.4,
        progress: 72,
        currentPlanTitle: 'Plano anti-inflamatorio',
        lastAssessmentAt: daysAgo(3),
        mealPlan: {
          title: 'Plano anti-inflamatorio',
          startDate: daysAgo(5),
          endDate: daysFromNow(25),
          calories: 2000,
          protein: 120,
          carbs: 190,
          fats: 60,
          notes: 'Priorizar fibras, proteina magra e distribuicao estavel dos lanches.',
          status: 'Ativo',
        },
        assessment: {
          date: daysAgo(3),
          weight: 78.4,
          height: 1.67,
          imc: 28.1,
          bodyFat: 31.4,
          notes: 'Boa adesao e melhora no lanche da tarde.',
        },
        appointment: {
          scheduledAt: daysFromNow(2, 16, 30),
          type: 'Retorno semanal',
          status: 'Confirmado',
        },
        messages: [
          {
            content: 'Consegui manter o lanche da tarde e reduzi a fome noturna.',
            sentAt: daysAgo(0),
            pending: true,
          },
        ],
        progressSnapshots: [
          { label: 'S1', weight: 81.2, adherence: 82, progress: 58, recordedAt: daysAgo(28) },
          { label: 'S2', weight: 80.5, adherence: 86, progress: 63, recordedAt: daysAgo(21) },
          { label: 'S3', weight: 79.8, adherence: 88, progress: 68, recordedAt: daysAgo(14) },
          { label: 'S4', weight: 79.1, adherence: 91, progress: 72, recordedAt: daysAgo(7) },
          { label: 'S5', weight: 78.4, adherence: 93, progress: 72, recordedAt: daysAgo(3) },
        ],
      },
      {
        key: 'lucas',
        name: 'Lucas Moreira',
        email: `lucas.${nutritionistId.slice(0, 8)}@nutriflow.local`,
        age: 28,
        objective: 'Hipertrofia',
        status: 'Revisao',
        restrictions: 'Sem restricoes alimentares.',
        lastMeal: 'Lanche com iogurte, banana e pasta de amendoim.',
        currentWeight: 84.1,
        height: 1.8,
        bodyFat: 18.8,
        progress: 58,
        currentPlanTitle: 'Hipertrofia com periodizacao',
        lastAssessmentAt: daysAgo(5),
        mealPlan: {
          title: 'Hipertrofia com periodizacao',
          startDate: daysAgo(8),
          endDate: daysFromNow(22),
          calories: 2850,
          protein: 180,
          carbs: 330,
          fats: 75,
          notes: 'Ajustar refeicoes em torno do treino e manter superavit controlado.',
          status: 'Revisao',
        },
        assessment: {
          date: daysAgo(5),
          weight: 84.1,
          height: 1.8,
          imc: 26.0,
          bodyFat: 18.8,
          notes: 'Boa evolucao de carga, revisar distribuicao de carboidratos no pos-treino.',
        },
        appointment: {
          scheduledAt: daysFromNow(3, 11, 0),
          type: 'Ajuste de macros',
          status: 'A confirmar',
        },
        messages: [
          {
            content: 'Posso trocar o arroz do jantar por macarrao no pos-treino?',
            sentAt: daysAgo(0),
            pending: true,
          },
        ],
        progressSnapshots: [
          { label: 'S1', weight: 82.8, adherence: 74, progress: 47, recordedAt: daysAgo(28) },
          { label: 'S2', weight: 83.2, adherence: 76, progress: 50, recordedAt: daysAgo(21) },
          { label: 'S3', weight: 83.5, adherence: 79, progress: 53, recordedAt: daysAgo(14) },
          { label: 'S4', weight: 83.8, adherence: 81, progress: 56, recordedAt: daysAgo(7) },
          { label: 'S5', weight: 84.1, adherence: 83, progress: 58, recordedAt: daysAgo(5) },
        ],
      },
      {
        key: 'fernanda',
        name: 'Fernanda Alves',
        email: `fernanda.${nutritionistId.slice(0, 8)}@nutriflow.local`,
        age: 41,
        objective: 'Reeducacao alimentar',
        status: 'Ativo',
        restrictions: 'Baixa tolerancia a lactose e prefere jantar leve.',
        lastMeal: 'Sopa cremosa de abobora com frango desfiado.',
        currentWeight: 67.3,
        height: 1.63,
        bodyFat: 27.2,
        progress: 84,
        currentPlanTitle: 'Plano rotina executiva',
        lastAssessmentAt: daysAgo(1),
        mealPlan: {
          title: 'Plano rotina executiva',
          startDate: daysAgo(6),
          endDate: daysFromNow(26),
          calories: 1850,
          protein: 105,
          carbs: 180,
          fats: 58,
          notes: 'Concentrar praticidade no almoco e jantar leve com baixo volume.',
          status: 'Ativo',
        },
        assessment: {
          date: daysAgo(1),
          weight: 67.3,
          height: 1.63,
          imc: 25.3,
          bodyFat: 27.2,
          notes: 'Melhor regularidade e sono mais estavel.',
        },
        appointment: {
          scheduledAt: daysFromNow(4, 14, 15),
          type: 'Revisao de rotina',
          status: 'Confirmado',
        },
        messages: [
          {
            content: 'Enviei as fotos do prato principal da semana.',
            sentAt: daysAgo(1),
            pending: false,
          },
        ],
        progressSnapshots: [
          { label: 'S1', weight: 69.1, adherence: 88, progress: 71, recordedAt: daysAgo(28) },
          { label: 'S2', weight: 68.6, adherence: 86, progress: 76, recordedAt: daysAgo(21) },
          { label: 'S3', weight: 68.1, adherence: 92, progress: 80, recordedAt: daysAgo(14) },
          { label: 'S4', weight: 67.8, adherence: 90, progress: 82, recordedAt: daysAgo(7) },
          { label: 'S5', weight: 67.3, adherence: 94, progress: 84, recordedAt: daysAgo(1) },
        ],
      },
      {
        key: 'rafael',
        name: 'Rafael Costa',
        email: `rafael.${nutritionistId.slice(0, 8)}@nutriflow.local`,
        age: 36,
        objective: 'Saude metabolica',
        status: 'Atrasado',
        restrictions: 'Reduzir ultraprocessados e refrigerante.',
        lastMeal: 'Nao registrou refeicao nas ultimas 18 horas.',
        currentWeight: 93.7,
        height: 1.75,
        bodyFat: 33.1,
        progress: 39,
        currentPlanTitle: 'Plano glicemico fase 1',
        lastAssessmentAt: daysAgo(12),
        mealPlan: {
          title: 'Plano glicemico fase 1',
          startDate: daysAgo(12),
          endDate: daysFromNow(18),
          calories: 2100,
          protein: 130,
          carbs: 170,
          fats: 72,
          notes: 'Diminuir picos glicemicos e reforcar cafe da manha com proteina.',
          status: 'Atrasado',
        },
        assessment: {
          date: daysAgo(12),
          weight: 93.7,
          height: 1.75,
          imc: 30.6,
          bodyFat: 33.1,
          notes: 'Baixa frequencia de registros e necessidade de retomar rotina.',
        },
        appointment: {
          scheduledAt: daysFromNow(6, 9, 0),
          type: 'Retomada de acompanhamento',
          status: 'Pendente',
        },
        messages: [
          {
            content: 'Quero retomar os registros e revisar o plano.',
            sentAt: daysAgo(1),
            pending: true,
          },
        ],
        progressSnapshots: [
          { label: 'S1', weight: 95.8, adherence: 61, progress: 54, recordedAt: daysAgo(28) },
          { label: 'S2', weight: 95.1, adherence: 55, progress: 49, recordedAt: daysAgo(21) },
          { label: 'S3', weight: 94.4, adherence: 48, progress: 45, recordedAt: daysAgo(14) },
          { label: 'S4', weight: 94.1, adherence: 42, progress: 41, recordedAt: daysAgo(7) },
          { label: 'S5', weight: 93.7, adherence: 39, progress: 39, recordedAt: daysAgo(12) },
        ],
      },
    ];

    const challengeSeeds = [
      {
        title: 'Cafe da manha estruturado',
        target: '7 dias com proteina no cafe da manha',
        participants: [
          { patientKey: 'amanda', progress: 76 },
          { patientKey: 'fernanda', progress: 82 },
          { patientKey: 'rafael', progress: 70 },
        ],
      },
      {
        title: 'Semana da hidratacao',
        target: 'Registrar agua em 5 dias da semana',
        participants: [
          { patientKey: 'amanda', progress: 68 },
          { patientKey: 'lucas', progress: 63 },
          { patientKey: 'fernanda', progress: 71 },
          { patientKey: 'rafael', progress: 50 },
        ],
      },
      {
        title: 'Prato colorido',
        target: '3 cores no almoco por 6 dias',
        participants: [
          { patientKey: 'amanda', progress: 85 },
          { patientKey: 'fernanda', progress: 81 },
        ],
      },
    ];

    await this.prisma.$transaction(async (tx) => {
      const profilesByKey = new Map();

      for (const seed of patientSeeds) {
        const patientUser = await tx.user.create({
          data: {
            name: seed.name,
            email: seed.email,
            profile: 'Paciente',
            passwordHash,
          },
        });

        const profile = await tx.patientProfile.create({
          data: {
            userId: patientUser.id,
            nutritionistId,
            age: seed.age,
            objective: seed.objective,
            status: seed.status,
            restrictions: seed.restrictions,
            lastMeal: seed.lastMeal,
            currentWeight: seed.currentWeight,
            height: seed.height,
            bodyFat: seed.bodyFat,
            progress: seed.progress,
            currentPlanTitle: seed.currentPlanTitle,
            lastAssessmentAt: seed.lastAssessmentAt,
          },
        });

        profilesByKey.set(seed.key, {
          profile,
        });

        await tx.mealPlan.create({
          data: {
            patientProfileId: profile.id,
            nutritionistId,
            ...seed.mealPlan,
          },
        });

        await tx.assessment.create({
          data: {
            patientProfileId: profile.id,
            nutritionistId,
            ...seed.assessment,
          },
        });

        await tx.appointment.create({
          data: {
            patientProfileId: profile.id,
            nutritionistId,
            ...seed.appointment,
          },
        });

        for (const message of seed.messages) {
          await tx.patientMessage.create({
            data: {
              patientProfileId: profile.id,
              nutritionistId,
              ...message,
            },
          });
        }

        for (const snapshot of seed.progressSnapshots) {
          await tx.progressSnapshot.create({
            data: {
              patientProfileId: profile.id,
              ...snapshot,
            },
          });
        }
      }

      for (const challengeSeed of challengeSeeds) {
        const challenge = await tx.nutritionChallenge.create({
          data: {
            nutritionistId,
            title: challengeSeed.title,
            target: challengeSeed.target,
          },
        });

        for (const participant of challengeSeed.participants) {
          const profile = profilesByKey.get(participant.patientKey)?.profile;

          if (!profile) {
            continue;
          }

          await tx.challengeParticipant.create({
            data: {
              challengeId: challenge.id,
              patientProfileId: profile.id,
              progress: participant.progress,
            },
          });
        }
      }
    });
  }

  findDashboard(nutritionistId) {
    return this.prisma.user.findUnique({
      where: { id: nutritionistId },
      include: {
        managedPatients: {
          include: {
            user: true,
            mealPlans: {
              orderBy: { createdAt: 'desc' },
            },
            assessments: {
              orderBy: { date: 'desc' },
            },
            messages: {
              orderBy: { sentAt: 'desc' },
            },
            appointments: {
              orderBy: { scheduledAt: 'asc' },
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
        },
        mealPlans: {
          include: {
            patientProfile: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        assessments: {
          include: {
            patientProfile: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        messages: {
          include: {
            patientProfile: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { sentAt: 'desc' },
        },
        appointments: {
          include: {
            patientProfile: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        challenges: {
          include: {
            participants: {
              include: {
                patientProfile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  findPatientProfile(nutritionistId, patientProfileId) {
    return this.prisma.patientProfile.findFirst({
      where: {
        id: patientProfileId,
        nutritionistId,
      },
      include: {
        user: true,
        progressSnapshots: {
          orderBy: { recordedAt: 'asc' },
        },
      },
    });
  }

  findPatientProfilesByIds(nutritionistId, patientProfileIds) {
    return this.prisma.patientProfile.findMany({
      where: {
        id: {
          in: patientProfileIds,
        },
        nutritionistId,
      },
      include: {
        user: true,
      },
    });
  }

  async createMealPlan(data) {
    return this.prisma.$transaction(async (tx) => {
      const mealPlan = await tx.mealPlan.create({
        data: {
          patientProfileId: data.patientProfileId,
          nutritionistId: data.nutritionistId,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
          notes: data.notes,
          status: data.status,
        },
      });

      await tx.patientProfile.update({
        where: { id: data.patientProfileId },
        data: {
          currentPlanTitle: data.title,
          status: data.status === 'Atrasado' ? 'Atrasado' : 'Ativo',
        },
      });

      return tx.mealPlan.findUnique({
        where: { id: mealPlan.id },
        include: {
          patientProfile: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  }

  async createAssessment(data) {
    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          patientProfileId: data.patientProfileId,
          nutritionistId: data.nutritionistId,
          date: data.date,
          weight: data.weight,
          height: data.height,
          imc: data.imc,
          bodyFat: data.bodyFat,
          notes: data.notes,
        },
      });

      await tx.patientProfile.update({
        where: { id: data.patientProfileId },
        data: {
          currentWeight: data.weight,
          height: data.height,
          bodyFat: data.bodyFat,
          progress: data.progress,
          status: data.status,
          lastAssessmentAt: data.date,
        },
      });

      await tx.progressSnapshot.create({
        data: {
          patientProfileId: data.patientProfileId,
          label: data.snapshotLabel,
          weight: data.weight,
          adherence: data.adherence,
          progress: data.progress,
          recordedAt: data.date,
        },
      });

      return tx.assessment.findUnique({
        where: { id: assessment.id },
        include: {
          patientProfile: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  }

  createChallenge(data) {
    return this.prisma.nutritionChallenge.create({
      data: {
        nutritionistId: data.nutritionistId,
        title: data.title,
        target: data.target,
        participants: {
          create: data.participants.map((participant) => ({
            patientProfileId: participant.patientProfileId,
            progress: participant.progress,
          })),
        },
      },
      include: {
        participants: {
          include: {
            patientProfile: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }
}

module.exports = {
  NutritionistDashboardRepository,
};
