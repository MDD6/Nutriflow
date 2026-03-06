const { AppError } = require('../errors/appError');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isPatientProfile(profile) {
  return normalizeText(profile).toLowerCase() === 'paciente';
}

function isNutritionistProfile(profile) {
  return normalizeText(profile).toLowerCase() === 'nutricionista';
}

function parsePatientAge(value) {
  const age = Number.parseInt(String(value || '').trim(), 10);

  if (!Number.isInteger(age) || age <= 0 || age > 120) {
    throw new AppError('Informe uma idade valida para o paciente.', 400);
  }

  return age;
}

function getLinkedNutritionist(user) {
  const nutritionist = user?.patientProfile?.nutritionist;

  if (!nutritionist) {
    return null;
  }

  return {
    id: nutritionist.id,
    name: nutritionist.name,
    email: nutritionist.email,
  };
}

function toPublicUser(user) {
  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    createdAt: user.createdAt,
  };

  const linkedNutritionist = getLinkedNutritionist(user);

  if (linkedNutritionist) {
    publicUser.nutritionist = linkedNutritionist;
  }

  return publicUser;
}

class AuthService {
  constructor(userRepository, passwordService, tokenService) {
    this.userRepository = userRepository;
    this.passwordService = passwordService;
    this.tokenService = tokenService;
  }

  async register(payload) {
    const name = normalizeText(payload.name);
    const email = normalizeEmail(payload.email);
    const profile = normalizeText(payload.profile);
    const password = String(payload.password || '');

    if (!name || !email || !profile || !password) {
      throw new AppError('Preencha nome, e-mail, perfil e senha.', 400);
    }

    if (password.length < 8) {
      throw new AppError('A senha precisa ter pelo menos 8 caracteres.', 400);
    }

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('Ja existe uma conta com este e-mail.', 409);
    }

    let user;

    if (isPatientProfile(profile)) {
      const nutritionistEmail = normalizeEmail(payload.nutritionistEmail);
      const objective = normalizeText(payload.objective);

      if (nutritionistEmail) {
        if (!objective) {
          throw new AppError('Informe o objetivo nutricional do paciente.', 400);
        }

        const nutritionist = await this.userRepository.findByEmail(nutritionistEmail);

        if (!nutritionist || !isNutritionistProfile(nutritionist.profile)) {
          throw new AppError('Nutricionista nao encontrado com este e-mail.', 404);
        }

        user = await this.userRepository.createPatient({
          name,
          email,
          profile,
          passwordHash: this.passwordService.hash(password),
          patientProfile: {
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
          },
        });
      } else {
        user = await this.userRepository.create({
          name,
          email,
          profile,
          passwordHash: this.passwordService.hash(password),
        });
      }
    } else {
      user = await this.userRepository.create({
        name,
        email,
        profile,
        passwordHash: this.passwordService.hash(password),
      });
    }

    return {
      message: 'Cadastro realizado com sucesso.',
      token: this.tokenService.create(user),
      user: toPublicUser(user),
    };
  }

  async login(payload) {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || '');

    if (!email || !password) {
      throw new AppError('Informe e-mail e senha.', 400);
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user || !this.passwordService.verify(password, user.passwordHash)) {
      throw new AppError('E-mail ou senha invalidos.', 401);
    }

    return {
      message: 'Login realizado com sucesso.',
      token: this.tokenService.create(user),
      user: toPublicUser(user),
    };
  }
}

module.exports = {
  AuthService,
};
