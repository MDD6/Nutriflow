const { getRoleStorageValues } = require('../constants/roles');

class AdminRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAdminDashboardMetrics() {
    return Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { profile: { in: getRoleStorageValues('PATIENT') } } }),
      this.prisma.user.count({ where: { profile: { in: getRoleStorageValues('NUTRITIONIST') } } }),
      this.prisma.user.count({ where: { profile: { in: getRoleStorageValues('ADMIN') } } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.food.count(),
      this.prisma.foodLog.count({
        where: {
          loggedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.mealPlan.count({
        where: {
          status: 'Ativo',
        },
      }),
    ]);
  }

  findUsers(filters = {}) {
    const search = String(filters.search || '').trim();
    const role = String(filters.role || '').trim();

    return this.prisma.user.findMany({
      where: {
        ...(role ? { profile: { in: getRoleStorageValues(role) } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        patientProfile: true,
        nutritionistProfile: true,
      },
    });
  }

  findUserById(userId) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        nutritionistProfile: true,
      },
    });
  }

  updateUserStatus(userId, isActive) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: {
        patientProfile: true,
        nutritionistProfile: true,
      },
    });
  }

  deleteUser(userId) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  findFoods(search = '') {
    const normalizedSearch = String(search || '').trim();

    return this.prisma.food.findMany({
      where: normalizedSearch
        ? {
            name: {
              contains: normalizedSearch,
            },
          }
        : undefined,
      orderBy: {
        name: 'asc',
      },
    });
  }

  createFood(data) {
    return this.prisma.food.create({
      data,
    });
  }
}

module.exports = {
  AdminRepository,
};
