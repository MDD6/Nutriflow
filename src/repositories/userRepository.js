class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  create(data) {
    return this.prisma.user.create({
      data,
    });
  }
}

module.exports = {
  UserRepository,
};
