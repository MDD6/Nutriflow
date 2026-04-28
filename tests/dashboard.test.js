const request = require('supertest');
const { createApp } = require('../src/app');
const bcrypt = require('bcrypt');

/* =========================
   MOCKS CORRETOS DO AUTH
========================= */

const userRepositoryMock = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  createPatient: jest.fn(),
};

const passwordServiceMock = {
  hash: jest.fn((p) => p),
  verify: jest.fn((password, hash) => password === hash),
};

const tokenServiceMock = {
  create: jest.fn(() => 'fake-token'),
};

/* =========================
   APP COM INJEÇÃO CORRETA
========================= */

const app = createApp({
  userRepository: userRepositoryMock,
  passwordService: passwordServiceMock,
  tokenService: tokenServiceMock,
});

describe('Dashboard API', () => {
  it('deve retornar 401 sem token', async () => {
    const res = await request(app)
      .get('/api/patient/dashboard');

    expect(res.status).toBe(401);
  });

  it('deve retornar OK no health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('deve retornar 400 se faltar dados no contact', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({});

    expect(res.status).toBe(400);
  });

  /* =========================
     TESTE DE LOGIN (CORRIGIDO)
  ========================= */

  it('deve fazer login com sucesso', async () => {
    const senha = '123456';

    passwordServiceMock.verify.mockImplementation(() => {
  console.log("🔴 VERIFY FOI CHAMADO");
  return true;
});

    userRepositoryMock.findByEmail.mockResolvedValue({
      id: '1',
      name: 'Teste',
      email: 'teste@email.com',
      passwordHash: '123456',
      profile: 'PATIENT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'teste@email.com',
        password: senha,
      });

    console.log('LOGIN RESPONSE:', res.body);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});