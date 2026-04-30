const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados antigos
  await prisma.mealPlanItem.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.food.deleteMany();

  // Criar nutricionista
  const nutritionist = await prisma.user.create({
    data: {
      name: 'Dra. Nutricionista',
      email: 'nutri@example.com',
      profile: 'nutritionist',
      passwordHash: 'hashed_password_123',
      isActive: true,
    },
  });

  console.log('✅ Nutricionista criado:', nutritionist.id);

  // Criar paciente
  const patient = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'joao@example.com',
      profile: 'patient',
      passwordHash: 'hashed_password_456',
      isActive: true,
    },
  });

  console.log('✅ Paciente criado:', patient.id);

  // Criar perfil do paciente
  const patientProfile = await prisma.patientProfile.create({
    data: {
      userId: patient.id,
      nutritionistId: nutritionist.id,
      age: 28,
      objective: 'Perder peso',
      status: 'active',
      restrictions: 'Sem restrições',
      lastMeal: 'Almoço',
      currentWeight: 85.5,
      height: 1.75,
      bodyFat: 25,
      progress: 10,
      currentPlanTitle: 'Plano Básico',
    },
  });

  console.log('✅ Perfil do paciente criado:', patientProfile.id);

  // Criar alimentos
  const foods = await Promise.all([
    prisma.food.create({
      data: {
        name: 'Peito de Frango',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
    }),
    prisma.food.create({
      data: {
        name: 'Arroz Integral',
        calories: 111,
        protein: 2.6,
        carbs: 23,
        fat: 0.9,
      },
    }),
    prisma.food.create({
      data: {
        name: 'Brócolis',
        calories: 34,
        protein: 2.8,
        carbs: 7,
        fat: 0.4,
      },
    }),
  ]);

  console.log('✅ Alimentos criados');

  // Criar plano alimentar
  const mealPlan = await prisma.mealPlan.create({
    data: {
      patientProfileId: patientProfile.id,
      nutritionistId: nutritionist.id,
      title: 'Plano de Emagrecimento - Semana 1',
      startDate: new Date('2026-04-29'),
      endDate: new Date('2026-05-06'),
      calories: 2000,
      protein: 150,
      carbs: 200,
      fats: 65,
      notes: 'Plano focado em emagrecimento com proteína alta',
      status: 'active',
      items: {
        create: [
          {
            foodId: foods[0].id,
            quantity: 200,
            mealTime: 'Almoço',
          },
          {
            foodId: foods[1].id,
            quantity: 150,
            mealTime: 'Almoço',
          },
          {
            foodId: foods[2].id,
            quantity: 100,
            mealTime: 'Almoço',
          },
        ],
      },
    },
  });

  console.log('✅ Plano alimentar criado:', mealPlan.id);
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log(`\nUse este ID para testar: ${mealPlan.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
