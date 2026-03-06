class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        patientProfile: {
          include: {
            nutritionist: true,
          },
        },
      },
    });
  }

  findById(id) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByIdWithPatientProfile(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        patientProfile: {
          include: {
            nutritionist: true,
          },
        },
      },
    });
  }

  create(data) {
    return this.prisma.user.create({
      data,
    });
  }

  createPatient(data) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        profile: data.profile,
        passwordHash: data.passwordHash,
        patientProfile: {
          create: data.patientProfile,
        },
      },
      include: {
        patientProfile: {
          include: {
            nutritionist: true,
          },
        },
      },
    });
  }

  createPatientProfile(data) {
    return this.prisma.patientProfile.create({
      data: {
        userId: data.userId,
        nutritionistId: data.nutritionistId,
        age: data.age,
        objective: data.objective,
        status: data.status,
        restrictions: data.restrictions,
        lastMeal: data.lastMeal,
        currentWeight: data.currentWeight,
        height: data.height,
        bodyFat: data.bodyFat,
        progress: data.progress,
      },
      include: {
        user: true,
        nutritionist: true,
      },
    });
  }

  linkPatientProfileToNutritionist(patientProfileId, nutritionistId) {
    return this.prisma.patientProfile.update({
      where: { id: patientProfileId },
      data: {
        nutritionistId,
      },
      include: {
        user: true,
        nutritionist: true,
      },
    });
  }
}

module.exports = {
  UserRepository,
};
