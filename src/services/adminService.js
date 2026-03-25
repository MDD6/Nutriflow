const { AppError } = require('../errors/appError');
const { normalizeRole, toRoleLabel } = require('../constants/roles');

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(date) {
  const instance = new Date(date);

  if (Number.isNaN(instance.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(instance);
}

class AdminService {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async getSummary(adminUser) {
    const [
      totalUsers,
      totalPatients,
      totalNutritionists,
      totalAdmins,
      activeUsers,
      blockedUsers,
      totalFoods,
      foodLogsToday,
      activeMealPlans,
    ] = await this.adminRepository.findAdminDashboardMetrics();

    return {
      admin: this.toPublicUser(adminUser),
      summary: {
        totalUsers,
        totalPatients,
        totalNutritionists,
        totalAdmins,
        activeUsers,
        blockedUsers,
        totalFoods,
        foodLogsToday,
        activeMealPlans,
      },
    };
  }

  async getUsers(filters) {
    const role = normalizeRole(filters.role);
    const users = await this.adminRepository.findUsers({
      search: filters.search,
      role,
    });

    return {
      users: users.map((user) => this.toManagedUser(user)),
    };
  }

  async updateUserStatus(userId, payload, currentAdminId) {
    const isActive = Boolean(payload.isActive);
    const user = await this.adminRepository.findUserById(userId);

    if (!user) {
      throw new AppError('Usuario nao encontrado.', 404);
    }

    if (user.id === currentAdminId && !isActive) {
      throw new AppError('O administrador logado nao pode bloquear a propria conta.', 400);
    }

    const updatedUser = await this.adminRepository.updateUserStatus(userId, isActive);

    return {
      message: isActive ? 'Usuario reativado com sucesso.' : 'Usuario bloqueado com sucesso.',
      user: this.toManagedUser(updatedUser),
    };
  }

  async deleteUser(userId, currentAdminId) {
    const user = await this.adminRepository.findUserById(userId);

    if (!user) {
      throw new AppError('Usuario nao encontrado.', 404);
    }

    if (user.id === currentAdminId) {
      throw new AppError('O administrador logado nao pode remover a propria conta.', 400);
    }

    await this.adminRepository.deleteUser(userId);

    return {
      message: 'Usuario removido com sucesso.',
    };
  }

  async getFoods(search) {
    const foods = await this.adminRepository.findFoods(search);

    return {
      foods: foods.map((food) => ({
        id: food.id,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      })),
    };
  }

  async createFood(payload) {
    const name = String(payload.name || '').trim();

    if (!name) {
      throw new AppError('Informe o nome do alimento.', 400);
    }

    const food = await this.adminRepository.createFood({
      name,
      calories: Math.max(0, Math.round(toNumber(payload.calories))),
      protein: Math.max(0, Math.round(toNumber(payload.protein))),
      carbs: Math.max(0, Math.round(toNumber(payload.carbs))),
      fat: Math.max(0, Math.round(toNumber(payload.fat))),
    });

    return {
      message: 'Alimento cadastrado com sucesso.',
      food: {
        id: food.id,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      },
    };
  }

  toManagedUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.profile),
      profile: toRoleLabel(user.profile),
      isActive: user.isActive,
      createdAt: formatDate(user.createdAt),
      patientProfile: user.patientProfile
        ? {
            objective: user.patientProfile.objective,
            status: user.patientProfile.status,
          }
        : null,
      nutritionistProfile: user.nutritionistProfile
        ? {
            crn: user.nutritionistProfile.crn,
            clinic: user.nutritionistProfile.clinic,
          }
        : null,
    };
  }

  toPublicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.profile),
      profile: toRoleLabel(user.profile),
      isActive: user.isActive,
    };
  }
}

module.exports = {
  AdminService,
};
