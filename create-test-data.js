const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Criar usuário nutricionista
    const nutritionistUser = await prisma.user.upsert({
      where: { email: 'nutri@test.com' },
      update: {},
      create: {
        email: 'nutri@test.com',
        passwordHash: '$2b$10$hashedpassword', // senha: test123
        name: 'Nutricionista Teste',
        profile: 'Nutricionista especializada em emagrecimento',
        nutritionistProfile: {
          create: {
            crn: '12345',
            clinic: 'Clínica de Nutrição Teste',
          }
        }
      },
    });

    // Criar usuário paciente
    const patientUser = await prisma.user.upsert({
      where: { email: 'paciente@test.com' },
      update: {},
      create: {
        email: 'paciente@test.com',
        passwordHash: '$2b$10$hashedpassword', // senha: test123
        name: 'Paciente Teste',
        profile: 'Paciente em tratamento de emagrecimento',
      },
    });

    // Criar perfil do paciente
    const patientProfile = await prisma.patientProfile.upsert({
      where: { userId: patientUser.id },
      update: {},
      create: {
        userId: patientUser.id,
        nutritionistId: nutritionistUser.id,
        age: 30,
        objective: 'Emagrecimento saudável',
        status: 'Ativo',
        restrictions: 'Sem restrições',
        currentWeight: 80,
        height: 1.75,
        bodyFat: 25,
        progress: 50,
        lastMeal: 'Café da manhã',
      },
    });

    // Buscar um alimento existente
    const existingFood = await prisma.food.findFirst();
    if (!existingFood) {
      throw new Error('Nenhum alimento encontrado no banco. Execute o seed primeiro.');
    }

    // Criar plano alimentar
    const mealPlan = await prisma.mealPlan.create({
      data: {
        nutritionistId: nutritionistUser.id,
        patientProfileId: patientProfile.id,
        title: 'Plano de Emagrecimento',
        notes: 'Plano focado em déficit calórico saudável',
        status: 'Ativo',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        calories: 1800,
        protein: 120,
        carbs: 150,
        fats: 60,
        fiber: 25,
        items: {
          create: [
            {
              foodId: existingFood.id,
              quantity: 100,
              mealTime: 'Café da manhã',
            },
            {
              foodId: existingFood.id,
              quantity: 150,
              mealTime: 'Almoço',
            },
          ],
        },
      },
    });

    console.log('Dados de teste criados com sucesso!');
    console.log('MealPlan ID:', mealPlan.id);
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();