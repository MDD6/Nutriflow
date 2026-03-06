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
}

module.exports = {
  UserRepository,
};
