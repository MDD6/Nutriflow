require('dotenv/config');

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { PrismaBetterSQLite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'nutriflow-dev-secret-change-me';
const DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/dev.db';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL invalida. Use o formato file:./caminho/do/banco.db');
  }

  const filePath = databaseUrl.slice(5);

  if (/^[A-Za-z]:[\\/]/.test(filePath)) {
    return filePath;
  }

  if (filePath.startsWith('/')) {
    return filePath;
  }

  return path.resolve(__dirname, filePath);
}

function ensureDatabaseSchema() {
  const databasePath = resolveSqlitePath(DATABASE_URL);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "profile" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  `);
  sqlite.close();
}

ensureDatabaseSchema();

const adapter = new PrismaBetterSQLite3({
  url: DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  if (!filePath.startsWith(FRONTEND_DIR)) {
    sendJson(response, 403, { message: 'Acesso negado.' });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, 404, { message: 'Arquivo nao encontrado.' });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    });
    response.end(data);
  });
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1e6) {
        request.destroy();
        reject(new Error('Payload muito grande.'));
      }
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('JSON invalido.'));
      }
    });

    request.on('error', reject);
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, originalHash] = String(storedPassword || '').split(':');

  if (!salt || !originalHash) {
    return false;
  }

  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');

  if (originalBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(originalBuffer, candidateBuffer);
}

function createToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      profile: user.profile,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    }),
    'utf-8',
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function createUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    createdAt: user.createdAt,
  };
}

async function handleRegister(request, response) {
  try {
    const body = await parseBody(request);
    const name = String(body.name || '').trim();
    const email = normalizeEmail(body.email);
    const profile = String(body.profile || '').trim();
    const password = String(body.password || '');

    if (!name || !email || !profile || !password) {
      sendJson(response, 400, { message: 'Preencha nome, e-mail, perfil e senha.' });
      return;
    }

    if (password.length < 8) {
      sendJson(response, 400, { message: 'A senha precisa ter pelo menos 8 caracteres.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      sendJson(response, 409, { message: 'Ja existe uma conta com este e-mail.' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        profile,
        passwordHash: hashPassword(password),
      },
    });

    sendJson(response, 201, {
      message: 'Cadastro realizado com sucesso.',
      token: createToken(user),
      user: createUserResponse(user),
    });
  } catch (error) {
    const statusCode = error.message === 'JSON invalido.' ? 400 : 500;
    sendJson(response, statusCode, { message: error.message || 'Erro ao criar conta.' });
  }
}

async function handleLogin(request, response) {
  try {
    const body = await parseBody(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!email || !password) {
      sendJson(response, 400, { message: 'Informe e-mail e senha.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      sendJson(response, 401, { message: 'E-mail ou senha invalidos.' });
      return;
    }

    sendJson(response, 200, {
      message: 'Login realizado com sucesso.',
      token: createToken(user),
      user: createUserResponse(user),
    });
  } catch (error) {
    const statusCode = error.message === 'JSON invalido.' ? 400 : 500;
    sendJson(response, statusCode, { message: error.message || 'Erro ao fazer login.' });
  }
}

function serveStatic(request, response) {
  const requestPath = request.url === '/' ? '/index.html' : request.url;
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(FRONTEND_DIR, safePath);
  sendFile(response, filePath);
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { message: 'Requisicao invalida.' });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/auth/register') {
    await handleRegister(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/auth/login') {
    await handleLogin(request, response);
    return;
  }

  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }

  sendJson(response, 404, { message: 'Rota nao encontrada.' });
});

server.listen(PORT, HOST, () => {
  console.log(`Nutriflow iniciado em http://${HOST}:${PORT}`);
});

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
