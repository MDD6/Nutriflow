const { AppError } = require('../errors/appError');
const { isNutritionistRole } = require('../constants/roles');

const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ALLOWED_MEAL_TYPES = new Set([
  'Cafe da manha',
  'Lanche da manha',
  'Almoco',
  'Lanche da tarde',
  'Jantar',
  'Ceia',
]);

const MEAL_NUMERIC_LIMITS = {
  calories: { label: 'Calorias', min: 0, max: 2500, defaultValue: 0 },
  protein: { label: 'Proteina', min: 0, max: 250, defaultValue: 0 },
  carbs: { label: 'Carboidrato', min: 0, max: 350, defaultValue: 0 },
  fats: { label: 'Gordura', min: 0, max: 180, defaultValue: 0 },
  fiber: { label: 'Fibra', min: 0, max: 80, defaultValue: 0 },
  waterMl: { label: 'Agua (ml)', min: 0, max: 2000, defaultValue: 0 },
};

const WEEKLY_WEIGHT_LIMITS = {
  min: 20,
  max: 350,
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function parseBoundedInteger(value, options) {
  const {
    label,
    min,
    max,
    defaultValue = 0,
  } = options;
  const fallbackValue = value === undefined || value === null || String(value).trim() === ''
    ? defaultValue
    : value;
  const parsed = Number(fallbackValue);

  if (!Number.isFinite(parsed)) {
    throw new AppError(`${label} precisa ser um numero valido.`, 400);
  }

  const rounded = Math.round(parsed);

  if (rounded < min || rounded > max) {
    throw new AppError(`${label} deve ficar entre ${min} e ${max}.`, 400);
  }

  return rounded;
}

function parseMealType(value) {
  const mealType = normalizeText(value);

  if (!mealType) {
    throw new AppError('Selecione o tipo da refeicao.', 400);
  }

  if (!ALLOWED_MEAL_TYPES.has(mealType)) {
    throw new AppError('Tipo de refeicao invalido.', 400);
  }

  return mealType;
}

function parseMealTitle(value) {
  const title = normalizeText(value);

  if (!title || title.length < 3 || title.length > 80) {
    throw new AppError('Informe um titulo de refeicao com 3 a 80 caracteres.', 400);
  }

  return title;
}

function parseMealDescription(value, mealType) {
  const description = normalizeText(value);

  if (description.length > 280) {
    throw new AppError('A descricao da refeicao deve ter ate 280 caracteres.', 400);
  }

  if (description) {
    return description;
  }

  return `Registro de ${mealType.toLowerCase()} feito no aplicativo.`;
}

function parseWeeklyWeight(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError('Informe um peso valido em kg.', 400);
  }

  const rounded = Number(parsed.toFixed(1));

  if (rounded < WEEKLY_WEIGHT_LIMITS.min || rounded > WEEKLY_WEIGHT_LIMITS.max) {
    throw new AppError(
      `O peso precisa ficar entre ${WEEKLY_WEIGHT_LIMITS.min}kg e ${WEEKLY_WEIGHT_LIMITS.max}kg.`,
      400,
    );
  }

  return rounded;
}

function parsePatientAge(value) {
  const age = Number.parseInt(String(value || '').trim(), 10);

  if (!Number.isInteger(age) || age <= 0 || age > 120) {
    throw new AppError('Informe uma idade valida para o paciente.', 400);
  }

  return age;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateTargetProgress(currentValue, targetValue) {
  if (!targetValue || targetValue <= 0) {
    return 0;
  }

  return clampPercentage((currentValue / targetValue) * 100);
}

function formatShortDate(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const day = String(instance.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS[instance.getMonth()];

  return `${day} ${month}`;
}

function formatHistoryDate(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(instance)
    .replace('.', '');
  const day = String(instance.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS[instance.getMonth()];

  return `${day} ${month}, ${weekday[0]?.toUpperCase()}${weekday.slice(1)}`;
}

function formatTime(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  return `${String(instance.getHours()).padStart(2, '0')}:${String(instance.getMinutes()).padStart(2, '0')}`;
}

function formatMessageTime(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const messageDay = new Date(instance.getFullYear(), instance.getMonth(), instance.getDate()).getTime();

  if (today === messageDay) {
    return formatTime(instance);
  }

  return formatShortDate(instance);
}

function formatAppointmentDate(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(instance);
  return `${weekday[0]?.toUpperCase()}${weekday.slice(1)}, ${formatTime(instance)}`;
}

function dateKey(date) {
  const instance = new Date(date);
  return `${instance.getFullYear()}-${String(instance.getMonth() + 1).padStart(2, '0')}-${String(instance.getDate()).padStart(2, '0')}`;
}

function sameDay(left, right) {
  return dateKey(left) === dateKey(right);
}

function getWeekRange(date) {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const currentDay = baseDate.getDay();
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return {
    weekStart,
    weekEnd,
  };
}

function sumMeals(meals) {
  return meals.reduce((totals, meal) => ({
    calories: totals.calories + meal.calories,
    protein: totals.protein + meal.protein,
    carbs: totals.carbs + meal.carbs,
    fats: totals.fats + meal.fats,
    fiber: totals.fiber + meal.fiber,
    waterMl: totals.waterMl + meal.waterMl,
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    waterMl: 0,
  });
}

function getActivePlan(patientProfile) {
  return patientProfile.mealPlans.find((plan) => plan.status === 'Ativo') || patientProfile.mealPlans[0] || null;
}

function getLatestAssessment(patientProfile) {
  return patientProfile.assessments[0] || null;
}

function getNextAppointment(patientProfile) {
  const now = Date.now();
  return patientProfile.appointments.find((appointment) => new Date(appointment.scheduledAt).getTime() >= now) || patientProfile.appointments[0] || null;
}

function getPlanStatusLabel(totalCalories, targetCalories) {
  if (!targetCalories) {
    return 'Sem plano';
  }

  const ratio = totalCalories / targetCalories;

  if (ratio >= 0.9 && ratio <= 1.1) {
    return 'Excelente';
  }

  if (ratio >= 0.75 && ratio <= 1.25) {
    return 'Boa';
  }

  if (ratio > 0) {
    return 'Moderada';
  }

  return 'Sem registro';
}

function getCheckInStatusLabel(mealCount) {
  if (mealCount >= 3) {
    return 'Completo';
  }

  if (mealCount > 0) {
    return 'Parcial';
  }

  return 'Pendente';
}

function getTargetWeight(currentWeight, objective) {
  const normalizedObjective = normalizeText(objective).toLowerCase();

  if (!currentWeight) {
    return 0;
  }

  if (normalizedObjective.includes('hipertrofia')) {
    return Number((currentWeight + 2.5).toFixed(1));
  }

  if (normalizedObjective.includes('reeducacao')) {
    return Number((currentWeight - 1.0).toFixed(1));
  }

  if (normalizedObjective.includes('saude')) {
    return Number((currentWeight - 4.0).toFixed(1));
  }

  return Number((currentWeight - 2.5).toFixed(1));
}

function getPaceLabel(objective) {
  const normalizedObjective = normalizeText(objective).toLowerCase();

  if (normalizedObjective.includes('hipertrofia')) {
    return '0.3kg/sem';
  }

  if (normalizedObjective.includes('reeducacao')) {
    return 'Estavel';
  }

  return '0.5kg/sem';
}

class PatientDashboardService {
  constructor(patientDashboardRepository, userRepository) {
    this.patientDashboardRepository = patientDashboardRepository;
    this.userRepository = userRepository;
  }

  async getDashboard(patientUser) {
    const patientProfile = await this.patientDashboardRepository.findByUserId(patientUser.id);

    if (!patientProfile) {
      return this.toSetupDto(patientUser);
    }

    return this.toDashboardDto(patientProfile);
  }

  async getChat(patientUser) {
    const patientProfile = await this.patientDashboardRepository.findByUserId(patientUser.id);

    if (!patientProfile) {
      return {
        setupRequired: true,
        chat: this.toChatDto(null),
      };
    }

    return {
      setupRequired: false,
      chat: this.toChatDto(patientProfile),
    };
  }

  async linkNutritionist(patientUser, payload) {
    const nutritionistEmail = normalizeEmail(payload.nutritionistEmail);

    if (!nutritionistEmail) {
      throw new AppError('Informe o e-mail do nutricionista para concluir o vinculo.', 400);
    }

    const nutritionist = await this.userRepository.findByEmail(nutritionistEmail);

    if (!nutritionist || !isNutritionistRole(nutritionist.profile)) {
      throw new AppError('Nutricionista nao encontrado com este e-mail.', 404);
    }

    const patientAccount = await this.userRepository.findByIdWithPatientProfile(patientUser.id);

    if (!patientAccount) {
      throw new AppError('Usuario paciente nao encontrado.', 404);
    }

    let patientProfile = patientAccount.patientProfile;

    if (patientProfile) {
      if (patientProfile.nutritionistId !== nutritionist.id) {
        throw new AppError(
          `Este paciente ja esta vinculado a ${patientProfile.nutritionist?.name || 'outro nutricionista'}.`,
          409,
        );
      }
    } else {
      const objective = normalizeText(payload.objective);

      if (!objective) {
        throw new AppError('Informe o objetivo nutricional para concluir o vinculo.', 400);
      }

      patientProfile = await this.userRepository.createPatientProfile({
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
    }

    return {
      message: `Paciente vinculado com sucesso a ${nutritionist.name}.`,
      setupRequired: false,
      patient: {
        id: patientUser.id,
        name: patientUser.name,
        email: patientUser.email,
        profile: patientUser.profile,
        objective: patientProfile.objective,
        nutritionist: {
          id: nutritionist.id,
          name: nutritionist.name,
          email: nutritionist.email,
        },
      },
    };
  }

  async createMealEntry(patientUser, payload) {
    const patientProfile = await this.requirePatientProfile(patientUser.id);
    const mealType = parseMealType(payload.mealType);
    const title = parseMealTitle(payload.title);
    const description = parseMealDescription(payload.description, mealType);
    const loggedAt = this.parseDateOrNow(payload.loggedAt);

    const mealEntry = await this.patientDashboardRepository.createMealEntry({
      patientProfileId: patientProfile.id,
      mealType,
      title,
      description,
      calories: parseBoundedInteger(payload.calories, MEAL_NUMERIC_LIMITS.calories),
      protein: parseBoundedInteger(payload.protein, MEAL_NUMERIC_LIMITS.protein),
      carbs: parseBoundedInteger(payload.carbs, MEAL_NUMERIC_LIMITS.carbs),
      fats: parseBoundedInteger(payload.fats, MEAL_NUMERIC_LIMITS.fats),
      fiber: parseBoundedInteger(payload.fiber, MEAL_NUMERIC_LIMITS.fiber),
      waterMl: parseBoundedInteger(payload.waterMl, MEAL_NUMERIC_LIMITS.waterMl),
      loggedAt,
    });

    return {
      message: 'Refeicao registrada com sucesso.',
      meal: this.toMealEntryDto(mealEntry),
    };
  }

  async createWeeklyWeightEntry(patientUser, payload) {
    const patientProfile = await this.requirePatientProfile(patientUser.id);
    const weight = parseWeeklyWeight(payload.weight);
    const recordedAt = this.parseWeightDateOrNow(payload.recordedAt);
    const { weekStart, weekEnd } = getWeekRange(recordedAt);
    const latestSnapshot = patientProfile.progressSnapshots[patientProfile.progressSnapshots.length - 1] || null;
    const adherence = latestSnapshot?.adherence ?? patientProfile.progress;
    const progress = latestSnapshot?.progress ?? patientProfile.progress;

    const result = await this.patientDashboardRepository.upsertWeeklyWeightEntry({
      patientProfileId: patientProfile.id,
      weight,
      recordedAt,
      weekStart,
      weekEnd,
      adherence,
      progress,
    });

    return {
      message: result.action === 'updated'
        ? 'Peso semanal atualizado com sucesso.'
        : 'Peso semanal registrado com sucesso.',
      weightEntry: {
        id: result.snapshot.id,
        label: result.snapshot.label,
        weight: result.snapshot.weight,
        dateLabel: formatShortDate(result.snapshot.recordedAt),
      },
    };
  }

  async sendMessage(patientUser, payload) {
    const patientProfile = await this.requirePatientProfile(patientUser.id);
    const content = normalizeText(payload.content);

    if (!content) {
      throw new AppError('Digite uma mensagem para enviar ao nutricionista.', 400);
    }

    const chatMessage = await this.patientDashboardRepository.createPatientMessage({
      patientProfileId: patientProfile.id,
      nutritionistId: patientProfile.nutritionistId,
      content,
      sentAt: new Date(),
    });

    return {
      message: 'Mensagem enviada para sua nutricionista.',
      chatMessage: this.toChatMessageDto(chatMessage, patientProfile.user.name, patientProfile.nutritionist.name),
    };
  }

  async requirePatientProfile(userId) {
    const patientProfile = await this.patientDashboardRepository.findByUserId(userId);

    if (!patientProfile) {
      throw new AppError('Perfil do paciente nao encontrado.', 404);
    }

    return patientProfile;
  }

  toSetupDto(patientUser) {
    return {
      setupRequired: true,
      patient: {
        id: patientUser.id,
        name: patientUser.name,
        email: patientUser.email,
        profile: patientUser.profile,
      },
      chat: this.toChatDto(null),
      connection: {
        linked: false,
        message: 'Conecte sua conta a um nutricionista para liberar plano alimentar, chat e acompanhamento.',
      },
    };
  }

  toChatDto(patientProfile) {
    if (!patientProfile) {
      return {
        responseTimeLabel: 'Sem historico',
        quickReplies: [
          'Hoje mantive todos os horarios do plano.',
          'Treinei no fim da tarde e senti mais fome no jantar.',
          'Quero trocar uma opcao do lanche da tarde.',
        ],
        messages: [],
      };
    }

    return {
      responseTimeLabel: patientProfile.messages.length
        ? (patientProfile.messages.some((message) => message.pending) ? 'Aguardando retorno' : 'Conversa em dia')
        : 'Sem historico',
      quickReplies: [
        'Hoje mantive todos os horarios do plano.',
        'Treinei no fim da tarde e senti mais fome no jantar.',
        'Quero trocar uma opcao do lanche da tarde.',
      ],
      messages: patientProfile.messages.map((message) => this.toChatMessageDto(
        message,
        patientProfile.user.name,
        patientProfile.nutritionist.name,
      )),
    };
  }

  toDashboardDto(patientProfile) {
    const activePlan = getActivePlan(patientProfile);
    const latestAssessment = getLatestAssessment(patientProfile);
    const nextAppointment = getNextAppointment(patientProfile);
    const todayMeals = patientProfile.mealEntries
      .filter((meal) => sameDay(meal.loggedAt, new Date()))
      .sort((left, right) => new Date(left.loggedAt) - new Date(right.loggedAt));
    const todayTotals = sumMeals(todayMeals);
    const calorieTarget = activePlan?.calories || 0;
    const proteinTarget = activePlan?.protein || 0;
    const carbTarget = activePlan?.carbs || 0;
    const fatTarget = activePlan?.fats || 0;
    const mealConsistencyTarget = 4;
    const dailySummaries = this.buildDailySummaries(patientProfile.mealEntries, calorieTarget);
    const snapshots = patientProfile.progressSnapshots.length
      ? patientProfile.progressSnapshots
      : patientProfile.currentWeight > 0
        ? [{
            label: 'Atual',
            weight: patientProfile.currentWeight,
            adherence: patientProfile.progress,
            progress: patientProfile.progress,
            recordedAt: new Date(),
          }]
        : [];
    const calorieProgress = calculateTargetProgress(todayTotals.calories, calorieTarget);
    const proteinProgress = calculateTargetProgress(todayTotals.protein, proteinTarget);
    const mealProgress = calculateTargetProgress(todayMeals.length, mealConsistencyTarget);
    const adherencePercent = activePlan
      ? clampPercentage((calorieProgress + proteinProgress + mealProgress) / 3)
      : 0;
    const goalItems = [];

    if (activePlan) {
      goalItems.push(
        {
          label: 'Bater proteina minima',
          valueLabel: `${todayTotals.protein} / ${proteinTarget}g`,
          percent: proteinProgress,
        },
        {
          label: 'Faixa calorica do dia',
          valueLabel: `${todayTotals.calories} / ${calorieTarget} kcal`,
          percent: calorieProgress,
        },
      );
    }

    goalItems.push(
      {
        label: 'Agua ao longo do dia',
        valueLabel: `${Number((todayTotals.waterMl / 1000).toFixed(1))} / 2.5L`,
        percent: calculateTargetProgress(todayTotals.waterMl, 2500),
      },
      {
        label: 'Regularidade das refeicoes',
        valueLabel: `${todayMeals.length} / ${mealConsistencyTarget}`,
        percent: mealProgress,
      },
    );

    return {
      patient: {
        id: patientProfile.user.id,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        profile: patientProfile.user.profile,
        objective: patientProfile.objective,
        nutritionist: {
          id: patientProfile.nutritionist.id,
          name: patientProfile.nutritionist.name,
          email: patientProfile.nutritionist.email,
        },
      },
      overview: {
        adherencePercent,
        caloriesConsumed: todayTotals.calories,
        caloriesTarget: calorieTarget,
        fiber: todayTotals.fiber,
        waterLiters: Number((todayTotals.waterMl / 1000).toFixed(1)),
        macros: [
          {
            label: 'Proteinas',
            value: todayTotals.protein,
            progress: proteinProgress,
            note: proteinTarget ? `${proteinProgress}% da meta diaria` : 'Sem meta diaria definida',
          },
          {
            label: 'Carboidratos',
            value: todayTotals.carbs,
            progress: calculateTargetProgress(todayTotals.carbs, carbTarget),
            note: carbTarget ? 'Combustivel estavel' : 'Sem meta diaria definida',
          },
          {
            label: 'Gorduras',
            value: todayTotals.fats,
            progress: calculateTargetProgress(todayTotals.fats, fatTarget),
            note: fatTarget ? 'Boa distribuicao' : 'Sem meta diaria definida',
          },
        ],
        weeklyCalories: dailySummaries.slice(-7).map((summary) => ({
          label: summary.weekdayLabel,
          percent: calculateTargetProgress(summary.calories, calorieTarget),
          calories: summary.calories,
        })),
      },
      goals: {
        items: goalItems,
        focusTitle: activePlan?.title
          ? `Seguir o plano ${activePlan.title.toLowerCase()} com constancia ao longo do dia.`
          : 'Nenhum plano alimentar ativo no momento.',
        observationNote: latestAssessment?.notes || activePlan?.notes || 'Sem observacoes clinicas registradas ate o momento.',
      },
      meals: todayMeals.map((meal) => this.toMealEntryDto(meal)),
      history: dailySummaries
        .filter((summary) => summary.calories > 0)
        .slice(-4)
        .reverse()
        .map((summary) => ({
          dateLabel: summary.dateLabel,
          planLabel: summary.planLabel,
          caloriesLabel: `${summary.calories.toLocaleString('pt-BR')} kcal`,
          checkInLabel: summary.checkInLabel,
        })),
      plan: {
        title: activePlan?.title || 'Sem plano alimentar ativo',
        sections: this.buildPlanSections(activePlan, patientProfile.objective),
      },
      weight: {
        labels: snapshots.slice(-5).map((snapshot) => formatShortDate(snapshot.recordedAt)),
        values: snapshots.slice(-5).map((snapshot) => snapshot.weight),
        variationLabel: this.getVariationLabel(snapshots),
        currentLabel: patientProfile.currentWeight ? `${patientProfile.currentWeight.toFixed(1)}kg` : '--',
        targetLabel: patientProfile.currentWeight ? `${getTargetWeight(patientProfile.currentWeight, patientProfile.objective).toFixed(1)}kg` : '--',
        paceLabel: patientProfile.currentWeight ? getPaceLabel(patientProfile.objective) : '--',
      },
      chat: this.toChatDto(patientProfile),
      clinical: {
        nextAppointment: nextAppointment
          ? {
              dateLabel: formatAppointmentDate(nextAppointment.scheduledAt),
              description: `Consulta de ${nextAppointment.type.toLowerCase()} com status ${nextAppointment.status.toLowerCase()}.`,
            }
          : null,
        checklist: this.buildChecklist(patientProfile, todayMeals, todayTotals.waterMl),
        insight: latestAssessment?.notes || activePlan?.notes || 'Sem insights disponiveis no momento.',
      },
    };
  }

  buildDailySummaries(mealEntries, calorieTarget) {
    const groupedSummaries = new Map();

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - index);

      groupedSummaries.set(dateKey(date), {
        date,
        dateLabel: formatHistoryDate(date),
        weekdayLabel: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
        calories: 0,
        mealCount: 0,
      });
    }

    mealEntries.forEach((meal) => {
      const key = dateKey(meal.loggedAt);
      const summary = groupedSummaries.get(key);

      if (!summary) {
        return;
      }

      summary.calories += meal.calories;
      summary.mealCount += 1;
    });

    return [...groupedSummaries.values()].map((summary) => ({
      ...summary,
      planLabel: getPlanStatusLabel(summary.calories, calorieTarget),
      checkInLabel: getCheckInStatusLabel(summary.mealCount),
    }));
  }

  buildPlanSections(activePlan, objective) {
    if (!activePlan) {
      return [];
    }

    const planTitle = activePlan?.title || 'Plano alimentar atual';
    const planNotes = activePlan?.notes || `Ajustes focados em ${objective.toLowerCase()}.`;

    return [
      {
        slotLabel: 'Cafe da manha - 07:00 - 08:30',
        title: `Base do ${planTitle.toLowerCase()}`,
        description: 'Comece o dia com proteina, carboidrato de digestao gradual e fibra para sustentar a manha.',
      },
      {
        slotLabel: 'Almoco - 12:00 - 13:30',
        title: 'Prato principal equilibrado',
        description: 'Mantenha proteina magra, fonte de carboidrato e vegetais para energia estavel durante a tarde.',
      },
      {
        slotLabel: 'Lanche - 16:00 - 17:30',
        title: 'Lanche com proteina e praticidade',
        description: 'Use um lanche simples para evitar longos jejuns e reduzir a fome no jantar.',
      },
      {
        slotLabel: 'Jantar - 19:30 - 21:00',
        title: 'Fechamento leve do dia',
        description: planNotes,
      },
    ];
  }

  buildChecklist(patientProfile, todayMeals, waterMl) {
    const challengeItems = patientProfile.challengeLinks
      .slice(0, 2)
      .map((link) => ({
        label: link.challenge.target,
        done: link.progress >= 70,
      }));
    const fallbackItems = [
      {
        label: 'Registrar pelo menos 3 refeicoes no dia',
        done: todayMeals.length >= 3,
      },
      {
        label: 'Manter agua acima de 2 litros',
        done: waterMl >= 2000,
      },
      {
        label: 'Atualizar medidas para a proxima consulta',
        done: Boolean(patientProfile.lastAssessmentAt),
      },
    ];

    return [...challengeItems, ...fallbackItems].slice(0, 3);
  }

  getVariationLabel(snapshots) {
    if (snapshots.length < 2) {
      return '--';
    }

    const firstWeight = snapshots[0].weight;
    const lastWeight = snapshots[snapshots.length - 1].weight;
    const variation = Number((lastWeight - firstWeight).toFixed(1));
    const prefix = variation > 0 ? '+' : '';

    return `${prefix}${variation}kg`;
  }

  toMealEntryDto(mealEntry) {
    return {
      id: mealEntry.id,
      timeLabel: formatTime(mealEntry.loggedAt),
      mealType: mealEntry.mealType,
      title: mealEntry.title,
      description: mealEntry.description,
      calories: mealEntry.calories,
      protein: mealEntry.protein,
      carbs: mealEntry.carbs,
      fats: mealEntry.fats,
    };
  }

  toChatMessageDto(message, patientName, nutritionistName) {
    return {
      id: message.id,
      senderRole: message.senderRole,
      senderName: message.senderRole === 'PATIENT' ? patientName : nutritionistName,
      timeLabel: formatMessageTime(message.sentAt),
      content: message.content,
    };
  }

  parseDateOrNow(value) {
    const normalized = normalizeText(value);

    if (!normalized) {
      return new Date();
    }

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      throw new AppError('Data invalida para o registro da refeicao.', 400);
    }

    const now = Date.now();
    const maxFutureMs = 5 * 60 * 1000;
    const maxPastMs = 120 * 24 * 60 * 60 * 1000;

    if (date.getTime() > now + maxFutureMs) {
      throw new AppError('Nao e permitido registrar refeicoes no futuro.', 400);
    }

    if (date.getTime() < now - maxPastMs) {
      throw new AppError('Data de refeicao muito antiga para este registro.', 400);
    }

    return date;
  }

  parseWeightDateOrNow(value) {
    const normalized = normalizeText(value);

    if (!normalized) {
      return new Date();
    }

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      throw new AppError('Data invalida para o registro de peso.', 400);
    }

    const now = Date.now();
    const maxFutureMs = 5 * 60 * 1000;
    const maxPastMs = 365 * 24 * 60 * 60 * 1000;

    if (date.getTime() > now + maxFutureMs) {
      throw new AppError('Nao e permitido registrar peso em uma data futura.', 400);
    }

    if (date.getTime() < now - maxPastMs) {
      throw new AppError('Data de registro muito antiga. Use uma data dentro do ultimo ano.', 400);
    }

    return date;
  }
}

module.exports = {
  PatientDashboardService,
};
