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
    const atTime = (date, hours, minutes = 0) => {
      const instance = new Date(date);
      instance.setHours(hours, minutes, 0, 0);
      return instance;
    };
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
            senderRole: 'NUTRITIONIST',
            content: 'Bom dia. Vi que sua adesao ao almoco melhorou bastante. Vamos observar o lanche da tarde.',
            sentAt: atTime(daysAgo(0), 9, 14),
            pending: false,
          },
          {
            senderRole: 'PATIENT',
            content: 'Consegui manter o lanche da tarde e reduzi a fome noturna.',
            sentAt: atTime(daysAgo(0), 9, 19),
            pending: true,
          },
          {
            senderRole: 'NUTRITIONIST',
            content: 'Otimo. Se sentir fome a noite, adicione fruta com iogurte em vez de repetir o jantar.',
            sentAt: atTime(daysAgo(0), 9, 22),
            pending: false,
          },
        ],
        mealEntries: [
          { mealType: 'Cafe da manha', title: 'Iogurte grego, aveia, banana e chia', description: 'Alta saciedade com proteina e fibra no inicio do dia.', calories: 420, protein: 28, carbs: 46, fats: 11, fiber: 9, waterMl: 350, loggedAt: atTime(daysAgo(0), 7, 30) },
          { mealType: 'Almoco', title: 'Frango grelhado, arroz integral, feijao e legumes', description: 'Prato principal equilibrado para sustentar a tarde.', calories: 620, protein: 46, carbs: 63, fats: 16, fiber: 11, waterMl: 500, loggedAt: atTime(daysAgo(0), 12, 40) },
          { mealType: 'Lanche', title: 'Sanduiche integral com cottage e tomate', description: 'Lanche pratico para reduzir a fome noturna.', calories: 310, protein: 20, carbs: 29, fats: 9, fiber: 5, waterMl: 250, loggedAt: atTime(daysAgo(0), 16, 20) },
          { mealType: 'Cafe da manha', title: 'Omelete com fruta e torrada integral', description: 'Cafe da manha com proteina e carboidrato de baixo volume.', calories: 395, protein: 30, carbs: 34, fats: 12, fiber: 7, waterMl: 300, loggedAt: atTime(daysAgo(1), 7, 20) },
          { mealType: 'Almoco', title: 'Peixe assado, pure de batata-doce e salada', description: 'Almoco rico em proteina e fibras.', calories: 590, protein: 42, carbs: 54, fats: 18, fiber: 10, waterMl: 450, loggedAt: atTime(daysAgo(1), 12, 35) },
          { mealType: 'Jantar', title: 'Sopa de legumes com frango desfiado', description: 'Jantar leve com boa digestao.', calories: 360, protein: 28, carbs: 24, fats: 11, fiber: 6, waterMl: 400, loggedAt: atTime(daysAgo(1), 19, 45) },
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
            senderRole: 'PATIENT',
            content: 'Posso trocar o arroz do jantar por macarrao no pos-treino?',
            sentAt: atTime(daysAgo(0), 8, 45),
            pending: true,
          },
        ],
        mealEntries: [
          { mealType: 'Cafe da manha', title: 'Panqueca proteica com banana', description: 'Cafe da manha voltado para energia e saciedade.', calories: 540, protein: 34, carbs: 58, fats: 17, fiber: 7, waterMl: 300, loggedAt: atTime(daysAgo(0), 7, 10) },
          { mealType: 'Almoco', title: 'Carne magra, arroz, feijao e salada', description: 'Base alimentar com bom aporte proteico.', calories: 760, protein: 48, carbs: 78, fats: 23, fiber: 10, waterMl: 450, loggedAt: atTime(daysAgo(0), 13, 0) },
          { mealType: 'Pos-treino', title: 'Iogurte, banana e pasta de amendoim', description: 'Reposicao pratica no fim da tarde.', calories: 420, protein: 22, carbs: 41, fats: 18, fiber: 4, waterMl: 250, loggedAt: atTime(daysAgo(0), 17, 50) },
          { mealType: 'Jantar', title: 'Frango, macarrao e legumes salteados', description: 'Jantar de recuperacao muscular.', calories: 640, protein: 38, carbs: 72, fats: 16, fiber: 6, waterMl: 350, loggedAt: atTime(daysAgo(1), 20, 10) },
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
            senderRole: 'PATIENT',
            content: 'Enviei as fotos do prato principal da semana.',
            sentAt: atTime(daysAgo(1), 18, 5),
            pending: false,
          },
        ],
        mealEntries: [
          { mealType: 'Cafe da manha', title: 'Overnight oats com iogurte e frutas', description: 'Opcao pratica para rotina corrida.', calories: 380, protein: 24, carbs: 42, fats: 10, fiber: 8, waterMl: 300, loggedAt: atTime(daysAgo(0), 7, 45) },
          { mealType: 'Almoco', title: 'Frango desfiado, quinoa e legumes', description: 'Almoco leve com boa distribuicao de macros.', calories: 510, protein: 36, carbs: 48, fats: 14, fiber: 9, waterMl: 400, loggedAt: atTime(daysAgo(0), 12, 25) },
          { mealType: 'Jantar', title: 'Sopa cremosa de abobora com frango', description: 'Jantar leve para o fim do dia.', calories: 320, protein: 24, carbs: 26, fats: 9, fiber: 6, waterMl: 350, loggedAt: atTime(daysAgo(0), 19, 35) },
          { mealType: 'Lanche', title: 'Mix de castanhas com iogurte sem lactose', description: 'Lanche compacto para tarde de trabalho.', calories: 280, protein: 16, carbs: 17, fats: 15, fiber: 4, waterMl: 200, loggedAt: atTime(daysAgo(1), 16, 10) },
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
            senderRole: 'PATIENT',
            content: 'Quero retomar os registros e revisar o plano.',
            sentAt: atTime(daysAgo(1), 10, 0),
            pending: true,
          },
        ],
        mealEntries: [
          { mealType: 'Cafe da manha', title: 'Cafe preto e pao frances', description: 'Cafe da manha incompleto e com baixa saciedade.', calories: 260, protein: 8, carbs: 34, fats: 9, fiber: 2, waterMl: 150, loggedAt: atTime(daysAgo(0), 8, 10) },
          { mealType: 'Almoco', title: 'Arroz, feijao, bife e salada simples', description: 'Almoco principal do dia.', calories: 710, protein: 34, carbs: 68, fats: 27, fiber: 7, waterMl: 300, loggedAt: atTime(daysAgo(0), 13, 20) },
          { mealType: 'Jantar', title: 'Lanche rapido na rua', description: 'Opcao com baixa qualidade nutricional no fim do dia.', calories: 590, protein: 18, carbs: 54, fats: 31, fiber: 3, waterMl: 200, loggedAt: atTime(daysAgo(1), 20, 30) },
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

        for (const mealEntry of seed.mealEntries || []) {
          await tx.mealEntry.create({
            data: {
              patientProfileId: profile.id,
              ...mealEntry,
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
