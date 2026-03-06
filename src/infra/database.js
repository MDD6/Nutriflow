const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { PrismaBetterSQLite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL invalida. Use o formato file:./caminho/do/banco.db');
  }

  const filePath = databaseUrl.slice(5);

  if (/^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith('/')) {
    return filePath;
  }

  return path.resolve(process.cwd(), filePath);
}

function ensureDatabaseSchema(databaseUrl) {
  const databasePath = resolveSqlitePath(databaseUrl);
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

function createPrismaClient(databaseUrl) {
  ensureDatabaseSchema(databaseUrl);

  const adapter = new PrismaBetterSQLite3({
    url: databaseUrl,
  });

  return new PrismaClient({
    adapter,
  });
}

module.exports = {
  createPrismaClient,
};
