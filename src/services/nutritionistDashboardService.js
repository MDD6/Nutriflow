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

function calculateAverage(numbers) {
  if (!numbers.length) {
    return 0;
  }

  return Math.round(numbers.reduce((total, value) => total + value, 0) / numbers.length);
}

class NutritionistDashboardService {
  constructor(nutritionistDashboardRepository, userRepository) {
    this.nutritionistDashboardRepository = nutritionistDashboardRepository;
    this.userRepository = userRepository;
  }

  async getDashboard(nutritionist) {
    const workspace = await this.nutritionistDashboardRepository.findDashboard(nutritionist.id);

    if (!workspace) {
      throw new AppError('Nutricionista nao encontrado.', 404);
    }

    return this.toDashboardDto(workspace);
  }

  async createMealPlan(nutritionist, payload) {
    const patientProfileId = String(payload.patientId || '').trim();
    const title = String(payload.title || '').trim();
    const notes = String(payload.notes || '').trim();
    const status = String(payload.status || 'Ativo').trim() || 'Ativo';
    const startDate = this.parseDate(payload.startDate, 'Informe a data de inicio do plano.');
    const endDate = this.parseDate(payload.endDate, 'Informe a data de fim do plano.');

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

    const mealPlan = await this.nutritionistDashboardRepository.createMealPlan({
      nutritionistId: nutritionist.id,
      patientProfileId,
      title,
      startDate,
      endDate,
      calories: Math.max(0, Math.round(toNumber(payload.calories))),
      protein: Math.max(0, Math.round(toNumber(payload.protein))),
      carbs: Math.max(0, Math.round(toNumber(payload.carbs))),
      fats: Math.max(0, Math.round(toNumber(payload.fats))),
      notes,
      status,
    });

    return {
      message: 'Plano alimentar salvo com sucesso.',
      mealPlan: this.toMealPlanDto(mealPlan),
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

  toDashboardDto(workspace) {
    const patientMessages = workspace.messages.filter((message) => message.senderRole === 'PATIENT');
    const patients = [...workspace.managedPatients]
      .sort((left, right) => left.user.name.localeCompare(right.user.name, 'pt-BR'))
      .map((patient) => this.toPatientDto(patient));
    const mealPlans = workspace.mealPlans.map((mealPlan) => this.toMealPlanDto(mealPlan));
    const assessments = workspace.assessments.map((assessment) => this.toAssessmentDto(assessment));
    const messages = patientMessages.map((message) => this.toMessageDto(message));
    const appointments = workspace.appointments.map((appointment) => this.toAppointmentDto(appointment));
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
      },
      patients,
      mealPlans,
      assessments,
      messages,
      appointments,
      challenges,
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

    return {
      id: patientProfile.id,
      userId: patientProfile.userId,
      name: patientProfile.user.name,
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
      weightHistory: snapshots.slice(-5).map((snapshot) => snapshot.weight),
      lastMessagePreview: latestMessage?.content || 'Sem mensagens recentes.',
      lastMessageTime: latestMessage ? formatMessageTime(latestMessage.sentAt) : '',
      pendingMessages,
    };
  }

  toMealPlanDto(mealPlan) {
    return {
      id: mealPlan.id,
      patientId: mealPlan.patientProfileId,
      patient: mealPlan.patientProfile.user.name,
      title: mealPlan.title,
      calories: mealPlan.calories,
      protein: mealPlan.protein,
      carbs: mealPlan.carbs,
      fats: mealPlan.fats,
      notes: mealPlan.notes,
      status: mealPlan.status,
      startDate: toIsoDate(mealPlan.startDate),
      endDate: toIsoDate(mealPlan.endDate),
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
    return {
      id: appointment.id,
      patientId: appointment.patientProfileId,
      patient: appointment.patientProfile.user.name,
      date: formatDateTime(appointment.scheduledAt),
      type: appointment.type,
      status: appointment.status,
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
