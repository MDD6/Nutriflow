const { AppError } = require('../errors/appError');
const { isPatientRole } = require('../constants/roles');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function parsePatientAge(value) {
  const age = Number.parseInt(String(value || '').trim(), 10);

  if (!Number.isInteger(age) || age <= 0 || age > 120) {
    throw new AppError('Informe uma idade valida para o paciente.', 400);
  }

  return age;
}

function formatShortDate(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const day = String(instance.getDate()).padStart(2, '0');
  const month = months[instance.getMonth()];
  const year = instance.getFullYear();

  return `${day} ${month} ${year}`;
}

function formatDateTime(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const hours = String(instance.getHours()).padStart(2, '0');
  const minutes = String(instance.getMinutes()).padStart(2, '0');

  return `${formatShortDate(instance)} - ${hours}:${minutes}`;
}

function formatMessageTime(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(instance.getFullYear(), instance.getMonth(), instance.getDate());
  const diffDays = Math.round((startOfToday - startOfMessageDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return `${String(instance.getHours()).padStart(2, '0')}:${String(instance.getMinutes()).padStart(2, '0')}`;
  }

  if (diffDays === 1) {
    return 'Ontem';
  }

  return formatShortDate(instance);
}

function toIsoDate(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  return instance.toISOString().slice(0, 10);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const APPOINTMENT_STATUSES = {
  SCHEDULED: 'agendada',
  CONFIRMED: 'confirmada',
  RESCHEDULED: 'remarcada',
  MISSED: 'faltou',
};

const ALLOWED_APPOINTMENT_STATUSES = new Set(Object.values(APPOINTMENT_STATUSES));

function normalizeAppointmentStatus(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return APPOINTMENT_STATUSES.SCHEDULED;
  }

  if (normalized === 'confirmado' || normalized === 'confirmada') {
    return APPOINTMENT_STATUSES.CONFIRMED;
  }

  if (normalized === 'a confirmar' || normalized === 'pendente') {
    return APPOINTMENT_STATUSES.SCHEDULED;
  }

  if (ALLOWED_APPOINTMENT_STATUSES.has(normalized)) {
    return normalized;
  }

  throw new AppError('Status de consulta invalido. Use: agendada, confirmada, remarcada ou faltou.', 400);
}

function buildAppointmentReminder(appointment) {
  const scheduledAt = new Date(appointment.scheduledAt);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const diffMs = scheduledAt.getTime() - Date.now();

  if (diffMs < 0 || diffMs > 24 * 60 * 60 * 1000) {
    return null;
  }

  return {
    due: true,
    minutesUntil: Math.max(0, Math.round(diffMs / 60000)),
    label: diffMs <= 60 * 60 * 1000
      ? 'Consulta em menos de 1 hora'
      : 'Consulta nas proximas 24 horas',
  };
}

function calculateAverage(numbers) {
  if (!numbers.length) {
    return 0;
  }

  return Math.round(numbers.reduce((total, value) => total + value, 0) / numbers.length);
}

function buildWeightTimeline(patientProfile) {
  if (patientProfile.weightEntries?.length) {
    return patientProfile.weightEntries;
  }

  if (patientProfile.progressSnapshots?.length) {
    return patientProfile.progressSnapshots;
  }

  return patientProfile.currentWeight
    ? [{ weight: patientProfile.currentWeight, recordedAt: new Date() }]
    : [];
}

function parseMealPlanItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const parsedItems = items
    .map((item) => {
      const hasFoodId = item.foodId && String(item.foodId).trim();
      const hasName = String(item.name || '').trim();
      
      return {
        foodId: hasFoodId ? String(item.foodId).trim() : undefined,
        name: hasName ? String(item.name).trim() : undefined,
        mealTime: normalizeText(item.mealTime) || 'Refeicao',
        quantity: Number(item.quantity),
        caloriesPer100: Number(item.caloriesPer100 || 0),
        proteinPer100: Number(item.proteinPer100 || 0),
        carbsPer100: Number(item.carbsPer100 || 0),
        fatPer100: Number(item.fatPer100 || 0),
        fiberPer100: Number(item.fiberPer100 || 0),
      };
    })
    .filter((item) => (item.foodId || item.name) && Number.isFinite(item.quantity));

  if (parsedItems.length > 40) {
    throw new AppError('O plano pode ter no maximo 40 alimentos.', 400);
  }

  for (const item of parsedItems) {
    if (!item.foodId && !item.name) {
      throw new AppError('Informe o alimento em todos os itens do plano.', 400);
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 2000) {
      throw new AppError('A quantidade dos alimentos deve ficar entre 1g e 2000g.', 400);
    }
  }

  return parsedItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity.toFixed(1)),
  }));
}

function calculateNutritionFromItems(items, foods) {
  const foodsById = new Map(foods.map((food) => [String(food.id), food]));
  const foodsByName = new Map(foods.map((food) => [food.name.toLowerCase(), food]));
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  };
  const detailedItems = [];
  const newFoods = [];

  for (const item of items) {
    let food = null;

    // Tentar buscar por ID primeiro (novo formato)
    if (item.foodId) {
      food = foodsById.get(String(item.foodId));
    }

    // Se não encontrou por ID, buscar por nome (compatibilidade com entrada manual)
    if (!food && item.name) {
      food = foodsByName.get(item.name.toLowerCase());
    }

    if (!food) {
      // Se ainda não encontrou e temos dados manuais, criar um novo alimento temporário
      if (item.name) {
        food = {
          id: `temp-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: item.name,
          calories: item.caloriesPer100,
          protein: item.proteinPer100,
          carbs: item.carbsPer100,
          fat: item.fatPer100,
          fiber: item.fiberPer100,
        };
        newFoods.push(food);
        foodsByName.set(item.name.toLowerCase(), food);
      } else {
        // Sem foodId nem nome, pular este item
        continue;
      }
    }

    const factor = item.quantity / 100;
    const calculated = {
      calories: Math.round(food.calories * factor),
      protein: Math.round(food.protein * factor),
      carbs: Math.round(food.carbs * factor),
      fats: Math.round(food.fat * factor),
      fiber: Math.round(food.fiber * factor),
    };

    totals.calories += calculated.calories;
    totals.protein += calculated.protein;
    totals.carbs += calculated.carbs;
    totals.fats += calculated.fats;
    totals.fiber += calculated.fiber;

    detailedItems.push({
      foodId: food.id,
      quantity: item.quantity,
      mealTime: item.mealTime,
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fats: calculated.fats,
      fiber: calculated.fiber,
    });
  }

  return { totals, items: detailedItems, newFoods };
}

class NutritionistDashboardService {
  constructor(nutritionistDashboardRepository, userRepository) {
    this.nutritionistDashboardRepository = nutritionistDashboardRepository;
    this.userRepository = userRepository;
  }

  async getDashboard(nutritionist) {
    await this.nutritionistDashboardRepository.ensureDefaultFoods();

    const [workspace, foods] = await Promise.all([
      this.nutritionistDashboardRepository.findDashboard(nutritionist.id),
      this.nutritionistDashboardRepository.findFoods(),
    ]);

    if (!workspace) {
      throw new AppError('Nutricionista nao encontrado.', 404);
    }

    return this.toDashboardDto(workspace, foods);
  }

  async createMealPlan(nutritionist, payload) {
    const patientProfileId = String(payload.patientId || '').trim();
    const title = String(payload.title || '').trim();
    const notes = String(payload.notes || '').trim();
    const status = String(payload.status || 'Ativo').trim() || 'Ativo';
    const startDate = this.parseDate(payload.startDate, 'Informe a data de inicio do plano.');
    const endDate = this.parseDate(payload.endDate, 'Informe a data de fim do plano.');
    const items = parseMealPlanItems(payload.items);

    if (!patientProfileId || !title) {
      throw new AppError('Informe paciente e titulo do plano alimentar.', 400);
    }

    if (endDate < startDate) {
      throw new AppError('A data final precisa ser maior ou igual a data inicial.', 400);
    }

    const patient = await this.nutritionistDashboardRepository.findPatientProfile(nutritionist.id, patientProfileId);

    if (!patient) {
      throw new AppError('Paciente nao encontrado para este nutricionista.', 404);
    }

    await this.nutritionistDashboardRepository.ensureDefaultFoods();

    let nutrition = null;
    if (items.length) {
      // Buscar alimentos por IDs (novo formato) e por nomes (compatibilidade)
      const foodIds = items.filter((item) => item.foodId).map((item) => item.foodId);
      const foodNames = items.filter((item) => item.name).map((item) => item.name);

      const foodsByIds = foodIds.length
        ? await this.nutritionistDashboardRepository.findFoodsByIds(foodIds)
        : [];
      const foodsByNames = foodNames.length
        ? await this.nutritionistDashboardRepository.findFoodsByNames(foodNames)
        : [];

      const allFoods = [...foodsByIds, ...foodsByNames];
      nutrition = calculateNutritionFromItems(items, allFoods);
    }
    const totals = nutrition?.totals || {
      calories: Math.max(0, Math.round(toNumber(payload.calories))),
      protein: Math.max(0, Math.round(toNumber(payload.protein))),
      carbs: Math.max(0, Math.round(toNumber(payload.carbs))),
      fats: Math.max(0, Math.round(toNumber(payload.fats))),
      fiber: Math.max(0, Math.round(toNumber(payload.fiber))),
    };

    const mealPlan = await this.nutritionistDashboardRepository.createMealPlan({
      nutritionistId: nutritionist.id,
      patientProfileId,
      title,
      startDate,
      endDate,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fats: totals.fats,
      fiber: totals.fiber,
      notes: notes || (items.length ? 'Macros calculados automaticamente pela base de alimentos.' : ''),
      status,
      items: nutrition?.items.map((item) => ({
        foodId: item.foodId,
        quantity: item.quantity,
        mealTime: item.mealTime,
      })) || [],
      newFoods: nutrition?.newFoods || [],
    });

    return {
      message: 'Plano alimentar salvo com sucesso.',
      mealPlan: this.toMealPlanDto(mealPlan),
    };
  }

async updateMealPlan(nutritionist, mealPlanId, payload) {
    const normalizedMealPlanId = String(mealPlanId || '').trim();
    if (!normalizedMealPlanId) {
      throw new AppError('Informe o ID do plano alimentar para atualizar.', 400);
    }

    const title = String(payload.title || '').trim();
    const notes = String(payload.notes || '').trim();
    const status = String(payload.status || 'Ativo').trim() || 'Ativo';
    const startDate = this.parseDate(payload.startDate, 'Informe a data de inicio do plano.');
    const endDate = this.parseDate(payload.endDate, 'Informe a data de fim do plano.');
    const items = parseMealPlanItems(payload.items);

    if (!title) {
      throw new AppError('Informe o titulo do plano alimentar.', 400);
    }

    if (endDate < startDate) {
      throw new AppError('A data final precisa ser maior ou igual a data inicial.', 400);
    }

    await this.nutritionistDashboardRepository.ensureDefaultFoods();

    let nutrition = null;
    if (items.length) {
      // Buscar alimentos por IDs e por nomes
      const foodIds = items.filter((item) => item.foodId).map((item) => item.foodId);
      const foodNames = items.filter((item) => item.name).map((item) => item.name);

      const foodsByIds = foodIds.length
        ? await this.nutritionistDashboardRepository.findFoodsByIds(foodIds)
        : [];
      const foodsByNames = foodNames.length
        ? await this.nutritionistDashboardRepository.findFoodsByNames(foodNames)
        : [];

      const allFoods = [...foodsByIds, ...foodsByNames];
      nutrition = calculateNutritionFromItems(items, allFoods);
    }

    const totals = nutrition?.totals || {
      calories: Math.max(0, Math.round(toNumber(payload.calories))),
      protein: Math.max(0, Math.round(toNumber(payload.protein))),
      carbs: Math.max(0, Math.round(toNumber(payload.carbs))),
      fats: Math.max(0, Math.round(toNumber(payload.fats))),
      fiber: Math.max(0, Math.round(toNumber(payload.fiber))),
    };

    // Aqui chamamos o repositório para fazer a atualização no banco de dados
    const updatedPlan = await this.nutritionistDashboardRepository.updateMealPlan(
      nutritionist.id, 
      normalizedMealPlanId, 
      {
        title,
        startDate,
        endDate,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fats: totals.fats,
        fiber: totals.fiber,
        notes: notes || (items.length ? 'Macros calculados automaticamente pela base de alimentos.' : ''),
        status,
        items: nutrition?.items.map((item) => ({
          foodId: item.foodId,
          quantity: item.quantity,
          mealTime: item.mealTime,
        })) || [],
        newFoods: nutrition?.newFoods || [],
      }
    );

    if (!updatedPlan) {
      throw new AppError('Plano alimentar nao encontrado para este nutricionista.', 404);
    }

    return {
      message: 'Plano alimentar atualizado com sucesso.',
      mealPlan: this.toMealPlanDto(updatedPlan),
    };
  }


  async createAssessment(nutritionist, payload) {
    const patientProfileId = String(payload.patientId || '').trim();

    if (!patientProfileId) {
      throw new AppError('Informe o paciente da avaliacao.', 400);
    }

    const patient = await this.nutritionistDashboardRepository.findPatientProfile(nutritionist.id, patientProfileId);

    if (!patient) {
      throw new AppError('Paciente nao encontrado para este nutricionista.', 404);
    }

    const date = this.parseDate(payload.date, 'Informe a data da avaliacao.');
    const weight = toNumber(payload.weight, patient.currentWeight);
    const height = toNumber(payload.height, patient.height);
    const imc = toNumber(payload.imc, weight && height ? weight / (height * height) : 0);
    const bodyFat = toNumber(payload.bodyFat, patient.bodyFat);
    const notes = String(payload.notes || '').trim() || 'Avaliacao registrada.';
    const lastSnapshot = patient.progressSnapshots[patient.progressSnapshots.length - 1];
    const adherenceBase = lastSnapshot ? lastSnapshot.adherence : patient.progress;
    const nextAdherence = Math.min(99, Math.max(0, Math.round(adherenceBase + 3)));
    const nextProgress = Math.min(99, Math.max(patient.progress, Math.round((patient.progress + nextAdherence) / 2)));
    const snapshotLabel = `S${patient.progressSnapshots.length + 1}`;

    const assessment = await this.nutritionistDashboardRepository.createAssessment({
      nutritionistId: nutritionist.id,
      patientProfileId,
      date,
      weight,
      height,
      imc,
      bodyFat,
      notes,
      adherence: nextAdherence,
      progress: nextProgress,
      status: nextProgress < 45 ? 'Atrasado' : 'Ativo',
      snapshotLabel,
    });

    return {
      message: 'Avaliacao fisica salva com sucesso.',
      assessment: this.toAssessmentDto(assessment),
    };
  }

  async createChallenge(nutritionist, payload) {
    const title = String(payload.title || '').trim();
    const target = String(payload.target || '').trim();
    const participantIds = Array.isArray(payload.participantIds)
      ? [...new Set(payload.participantIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [];

    if (!title || !target) {
      throw new AppError('Informe titulo e objetivo do desafio.', 400);
    }

    const participants = participantIds.length
      ? await this.nutritionistDashboardRepository.findPatientProfilesByIds(nutritionist.id, participantIds)
      : [];

    if (participants.length !== participantIds.length) {
      throw new AppError('Um ou mais pacientes informados nao pertencem a este nutricionista.', 400);
    }

    const challenge = await this.nutritionistDashboardRepository.createChallenge({
      nutritionistId: nutritionist.id,
      title,
      target,
      participants: participants.map((participant) => ({
        patientProfileId: participant.id,
        progress: 0,
      })),
    });

    return {
      message: 'Desafio nutricional criado com sucesso.',
      challenge: this.toChallengeDto(challenge),
    };
  }

  async linkPatient(nutritionist, payload) {
    const patientEmail = normalizeEmail(payload.patientEmail);

    if (!patientEmail) {
      throw new AppError('Informe o e-mail do paciente para concluir o vinculo.', 400);
    }

    const patientUser = await this.userRepository.findByEmail(patientEmail);

    if (!patientUser || !isPatientRole(patientUser.profile)) {
      throw new AppError('Paciente nao encontrado com este e-mail.', 404);
    }

    if (patientUser.patientProfile) {
      if (patientUser.patientProfile.nutritionistId !== nutritionist.id) {
        throw new AppError(
          `Este paciente ja esta vinculado a ${patientUser.patientProfile.nutritionist?.name || 'outro nutricionista'}.`,
          409,
        );
      }

      return {
        message: `${patientUser.name} ja esta vinculado a sua carteira.`,
        patient: {
          id: patientUser.patientProfile.id,
          name: patientUser.name,
          email: patientUser.email,
          objective: patientUser.patientProfile.objective,
        },
      };
    }

    const objective = normalizeText(payload.objective);

    if (!objective) {
      throw new AppError('Informe o objetivo nutricional para criar o vinculo do paciente.', 400);
    }

    const patientProfile = await this.userRepository.createPatientProfile({
      userId: patientUser.id,
      nutritionistId: nutritionist.id,
      age: parsePatientAge(payload.age),
      objective,
      status: 'Ativo',
      restrictions: normalizeText(payload.restrictions) || 'Sem restricoes informadas.',
      lastMeal: 'Nenhuma refeicao registrada.',
      currentWeight: 0,
      height: 0,
      bodyFat: 0,
      progress: 0,
    });

    return {
      message: `${patientUser.name} foi vinculado com sucesso a sua carteira.`,
      patient: {
        id: patientProfile.id,
        name: patientUser.name,
        email: patientUser.email,
        objective: patientProfile.objective,
      },
    };
  }

  async getConversation(nutritionist, patientProfileId) {
    const normalizedPatientProfileId = String(patientProfileId || '').trim();

    if (!normalizedPatientProfileId) {
      throw new AppError('Informe o paciente para carregar a conversa.', 400);
    }

    const patientProfile = await this.nutritionistDashboardRepository.findPatientConversation(
      nutritionist.id,
      normalizedPatientProfileId,
    );

    if (!patientProfile) {
      throw new AppError('Paciente nao encontrado para este nutricionista.', 404);
    }

    return this.toConversationDto(patientProfile);
  }

  async sendMessage(nutritionist, payload) {
    const patientProfileId = String(payload.patientId || '').trim();
    const content = String(payload.content || '').trim();

    if (!patientProfileId) {
      throw new AppError('Informe o paciente para enviar a mensagem.', 400);
    }

    if (!content) {
      throw new AppError('Digite uma mensagem para responder ao paciente.', 400);
    }

    const patientProfile = await this.nutritionistDashboardRepository.findPatientConversation(
      nutritionist.id,
      patientProfileId,
    );

    if (!patientProfile) {
      throw new AppError('Paciente nao encontrado para este nutricionista.', 404);
    }

    const chatMessage = await this.nutritionistDashboardRepository.createNutritionistMessage({
      patientProfileId,
      nutritionistId: nutritionist.id,
      content,
      sentAt: new Date(),
    });

    return {
      message: 'Resposta enviada para o paciente.',
      chatMessage: this.toConversationMessageDto(
        chatMessage,
        patientProfile.user.name,
        nutritionist.name,
      ),
    };
  }

  async createAppointment(nutritionist, payload) {
    const patientProfileId = String(payload.patientId || '').trim();
    const type = String(payload.type || 'Consulta').trim();
    const scheduledAt = new Date(payload.date || payload.scheduledAt);

    if (!patientProfileId || Number.isNaN(scheduledAt.getTime())) {
      throw new AppError('Informe o paciente e uma data válida para a consulta.', 400);
    }

    const patient = await this.nutritionistDashboardRepository.findPatientProfile(nutritionist.id, patientProfileId);

    if (!patient) {
      throw new AppError('Paciente nao encontrado para este nutricionista.', 404);
    }

    const appointment = await this.nutritionistDashboardRepository.createAppointment({
      nutritionistId: nutritionist.id,
      patientProfileId,
      scheduledAt,
      type,
      status: APPOINTMENT_STATUSES.SCHEDULED,
    });

    return {
      message: 'Consulta agendada com sucesso.',
      appointment: this.toAppointmentDto({
        ...appointment,
        patientProfile: {
          user: {
            name: patient.user.name,
          },
        },
      }),
    };
  }

  async updateAppointmentStatus(nutritionist, appointmentId, payload) {
    const normalizedAppointmentId = String(appointmentId || '').trim();
    const status = normalizeAppointmentStatus(payload.status);

    if (!normalizedAppointmentId) {
      throw new AppError('Informe a consulta para atualizar o status.', 400);
    }

    const appointment = await this.nutritionistDashboardRepository.updateAppointment(
      nutritionist.id,
      normalizedAppointmentId,
      { status },
    );

    if (!appointment) {
      throw new AppError('Consulta nao encontrada para este nutricionista.', 404);
    }

    return {
      message: 'Status da consulta atualizado com sucesso.',
      appointment: this.toAppointmentDto(appointment),
    };
  }

  async rescheduleAppointment(nutritionist, appointmentId, payload) {
    const normalizedAppointmentId = String(appointmentId || '').trim();
    const scheduledAt = this.parseDate(payload.date || payload.scheduledAt, 'Informe uma nova data valida.');

    if (!normalizedAppointmentId) {
      throw new AppError('Informe a consulta para remarcar.', 400);
    }

    const appointment = await this.nutritionistDashboardRepository.updateAppointment(
      nutritionist.id,
      normalizedAppointmentId,
      {
        scheduledAt,
        status: APPOINTMENT_STATUSES.RESCHEDULED,
      },
    );

    if (!appointment) {
      throw new AppError('Consulta nao encontrada para este nutricionista.', 404);
    }

    return {
      message: 'Consulta remarcada com sucesso.',
      appointment: this.toAppointmentDto(appointment),
    };
  }

  async deleteResource(nutritionist, resourceType, id) {
    const deletedCount = await this.nutritionistDashboardRepository.deleteResourceById(
      nutritionist.id,
      resourceType,
      id,
    );

    if (!deletedCount) {
      throw new AppError('Item nao encontrado para este nutricionista.', 404);
    }

    return { message: 'Item excluido com sucesso.' };
  }

  async addChallengeParticipant(nutritionist, challengeId, payload) {
    const normalizedChallengeId = String(challengeId || '').trim();
    const patientProfileId = String(payload.patientId || '').trim();

    if (!normalizedChallengeId) {
      throw new AppError('Informe o desafio.', 400);
    }

    if (!patientProfileId) {
      throw new AppError('Selecione um paciente.', 400);
    }

    const patient = await this.nutritionistDashboardRepository.findPatientProfile(nutritionist.id, patientProfileId);

    if (!patient) {
      throw new AppError('Paciente nao encontrado para este nutricionista.', 404);
    }

    const result = await this.nutritionistDashboardRepository.addChallengeParticipant(
      nutritionist.id,
      normalizedChallengeId,
      patientProfileId,
    );

    if (result.status === 'not_found') {
      throw new AppError('Desafio nao encontrado para este nutricionista.', 404);
    }

    if (result.status === 'exists') {
      return { message: 'Paciente ja participa deste desafio.' };
    }

    return { message: 'Paciente adicionado ao desafio.' };
  }

  toDashboardDto(workspace, foods = []) {
    const patientMessages = workspace.messages.filter((message) => message.senderRole === 'PATIENT');
    const patients = [...workspace.managedPatients]
      .sort((left, right) => left.user.name.localeCompare(right.user.name, 'pt-BR'))
      .map((patient) => this.toPatientDto(patient));
    const mealPlans = workspace.mealPlans.map((mealPlan) => this.toMealPlanDto(mealPlan));
    const assessments = workspace.assessments.map((assessment) => this.toAssessmentDto(assessment));
    const messages = patientMessages.map((message) => this.toMessageDto(message));
    const appointments = workspace.appointments.map((appointment) => this.toAppointmentDto(appointment));
    const reminders = appointments
      .filter((appointment) => appointment.reminder?.due)
      .sort((left, right) => left.reminder.minutesUntil - right.reminder.minutesUntil)
      .slice(0, 5);
    const challenges = workspace.challenges.map((challenge) => this.toChallengeDto(challenge));

    return {
      nutritionist: {
        id: workspace.id,
        name: workspace.name,
        email: workspace.email,
        profile: workspace.profile,
      },
      summary: {
        activePatients: patients.filter((patient) => patient.status !== 'Atrasado').length,
        activePlans: mealPlans.filter((plan) => plan.status === 'Ativo').length,
        monthlyAssessments: this.countCurrentMonthAssessments(workspace.assessments),
        pendingMessages: patientMessages.filter((message) => message.pending).length,
        pendingAppointments: appointments.filter((appointment) => appointment.status !== APPOINTMENT_STATUSES.MISSED).length,
      },
      patients,
      mealPlans,
      assessments,
      messages,
      appointments,
      reminders,
      challenges,
      foods: foods.map((food) => this.toFoodDto(food)),
      reports: this.buildReports(patients, mealPlans, workspace.assessments),
    };
  }

  toPatientDto(patientProfile) {
    const latestPlan = patientProfile.mealPlans[0];
    const latestAssessment = patientProfile.assessments[0];
    const latestMessage = patientProfile.messages[0];
    const pendingMessages = patientProfile.messages.filter(
      (message) => message.senderRole === 'PATIENT' && message.pending,
    ).length;
    const nextAppointment = patientProfile.appointments.find(
      (appointment) => new Date(appointment.scheduledAt).getTime() >= Date.now(),
    );
    const snapshots = patientProfile.progressSnapshots.length
      ? patientProfile.progressSnapshots
      : [
          {
            weight: patientProfile.currentWeight,
            adherence: patientProfile.progress,
            progress: patientProfile.progress,
          },
        ];
    const weightTimeline = buildWeightTimeline(patientProfile);

    return {
      id: patientProfile.id,
      userId: patientProfile.userId,
      name: patientProfile.user.name,
      email: patientProfile.user.email,
      age: patientProfile.age,
      objective: patientProfile.objective,
      status: patientProfile.status,
      weight: patientProfile.currentWeight,
      height: patientProfile.height,
      restrictions: patientProfile.restrictions,
      lastMeal: patientProfile.lastMeal,
      progress: patientProfile.progress,
      lastAssessment: patientProfile.lastAssessmentAt
        ? formatShortDate(patientProfile.lastAssessmentAt)
        : latestAssessment
          ? formatShortDate(latestAssessment.date)
          : 'Sem avaliacao',
      currentPlan: patientProfile.currentPlanTitle || latestPlan?.title || 'Sem plano alimentar',
      bodyFat: patientProfile.bodyFat,
      nextAppointment: nextAppointment ? formatDateTime(nextAppointment.scheduledAt) : 'Sem consulta agendada',
      adherence: snapshots.slice(-4).map((snapshot) => snapshot.adherence),
      weightHistory: weightTimeline.slice(-5).map((entry) => entry.weight),
      weightEntries: weightTimeline.slice(-6).map((entry) => ({
        weight: entry.weight,
        date: formatShortDate(entry.recordedAt),
        note: entry.note || '',
      })),
      lastMessagePreview: latestMessage?.content || 'Sem mensagens recentes.',
      lastMessageTime: latestMessage ? formatMessageTime(latestMessage.sentAt) : '',
      pendingMessages,
    };
  }

 toMealPlanDto(mealPlan) {
    return {
      id: mealPlan.id,
      patientId: mealPlan.patientProfileId,
      // 👇 Olha a mágica acontecendo nesta linha aqui:
      patient: mealPlan.patientProfile?.user?.name || 'Paciente',
      title: mealPlan.title,
      calories: mealPlan.calories,
      protein: mealPlan.protein,
      carbs: mealPlan.carbs,
      fats: mealPlan.fats,
      notes: mealPlan.notes,
      status: mealPlan.status,
      startDate: toIsoDate(mealPlan.startDate),
      endDate: toIsoDate(mealPlan.endDate),
      items: (mealPlan.items || []).map((item) => this.toMealPlanItemDto(item)),
    };
  }

  toMealPlanItemDto(item) {
    const factor = item.quantity / 100;

    return {
      id: item.id,
      foodId: item.foodId,
      food: item.food?.name || 'Alimento',
      quantity: item.quantity,
      mealTime: item.mealTime,
      calories: item.food ? Math.round(item.food.calories * factor) : 0,
      protein: item.food ? Math.round(item.food.protein * factor) : 0,
      carbs: item.food ? Math.round(item.food.carbs * factor) : 0,
      fats: item.food ? Math.round(item.food.fat * factor) : 0,
    };
  }

  toFoodDto(food) {
    return {
      id: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };
  }

  toAssessmentDto(assessment) {
    return {
      id: assessment.id,
      patientId: assessment.patientProfileId,
      patient: assessment.patientProfile.user.name,
      date: toIsoDate(assessment.date),
      weight: assessment.weight,
      height: assessment.height,
      imc: assessment.imc,
      bodyFat: assessment.bodyFat,
      notes: assessment.notes,
    };
  }

  toMessageDto(message) {
    return {
      id: message.id,
      patientId: message.patientProfileId,
      patient: message.patientProfile.user.name,
      message: message.content,
      time: formatMessageTime(message.sentAt),
      pending: message.pending,
    };
  }

  toConversationDto(patientProfile) {
    const pendingMessages = patientProfile.messages.filter(
      (message) => message.senderRole === 'PATIENT' && message.pending,
    ).length;
    const latestMessage = patientProfile.messages[patientProfile.messages.length - 1] || null;

    return {
      patient: {
        id: patientProfile.id,
        name: patientProfile.user.name,
        objective: patientProfile.objective,
        status: patientProfile.status,
        pendingMessages,
        latestMessageTime: latestMessage ? formatMessageTime(latestMessage.sentAt) : '',
      },
      messages: patientProfile.messages.map((message) => this.toConversationMessageDto(
        message,
        patientProfile.user.name,
        patientProfile.nutritionist.name,
      )),
    };
  }

  toConversationMessageDto(message, patientName, nutritionistName) {
    return {
      id: message.id,
      senderRole: message.senderRole,
      senderName: message.senderRole === 'PATIENT' ? patientName : nutritionistName,
      timeLabel: formatMessageTime(message.sentAt),
      content: message.content,
      pending: message.pending,
    };
  }

  toAppointmentDto(appointment) {
    const normalizedStatus = normalizeAppointmentStatus(appointment.status);
    const reminder = buildAppointmentReminder(appointment);

    return {
      id: appointment.id,
      patientId: appointment.patientProfileId,
      patient: appointment.patientProfile.user.name,
      date: formatDateTime(appointment.scheduledAt),
      type: appointment.type,
      status: normalizedStatus,
      reminder,
    };
  }

  toChallengeDto(challenge) {
    const participantProgress = challenge.participants.map((participant) => participant.progress);

    return {
      id: challenge.id,
      title: challenge.title,
      target: challenge.target,
      participants: challenge.participants.length,
      progress: calculateAverage(participantProgress),
    };
  }

  buildReports(patients, mealPlans, assessments) {
    const bestAdherencePatient = [...patients].sort((left, right) => right.progress - left.progress)[0];
    const lowFrequencyPatient = [...patients].sort((left, right) => left.progress - right.progress)[0];
    const averageCalories = mealPlans.length
      ? Math.round(mealPlans.reduce((total, plan) => total + plan.calories, 0) / mealPlans.length)
      : 0;

    return {
      bestAdherence: bestAdherencePatient?.name || 'Sem dados',
      lowFrequency: lowFrequencyPatient?.name || 'Sem dados',
      averageCalories: `${averageCalories.toLocaleString('pt-BR')} kcal`,
      monthAssessments: this.countCurrentMonthAssessments(assessments),
    };
  }

  countCurrentMonthAssessments(assessments) {
    const now = new Date();
    return assessments.filter((assessment) => {
      const date = new Date(assessment.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  }

  parseDate(value, errorMessage) {
    const date = new Date(String(value || '').trim());

    if (Number.isNaN(date.getTime())) {
      throw new AppError(errorMessage, 400);
    }

    return date;
  }
}

module.exports = {
  NutritionistDashboardService,
};
