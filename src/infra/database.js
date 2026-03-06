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
  sqlite.pragma('foreign_keys = ON');
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

    CREATE TABLE IF NOT EXISTS "PatientProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "nutritionistId" TEXT NOT NULL,
      "age" INTEGER NOT NULL,
      "objective" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "restrictions" TEXT NOT NULL,
      "lastMeal" TEXT NOT NULL,
      "currentWeight" REAL NOT NULL,
      "height" REAL NOT NULL,
      "bodyFat" REAL NOT NULL,
      "progress" INTEGER NOT NULL,
      "currentPlanTitle" TEXT,
      "lastAssessmentAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PatientProfile_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "PatientProfile_userId_key" ON "PatientProfile"("userId");
    CREATE INDEX IF NOT EXISTS "PatientProfile_nutritionistId_idx" ON "PatientProfile"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "MealPlan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "nutritionistId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "startDate" DATETIME NOT NULL,
      "endDate" DATETIME NOT NULL,
      "calories" INTEGER NOT NULL,
      "protein" INTEGER NOT NULL,
      "carbs" INTEGER NOT NULL,
      "fats" INTEGER NOT NULL,
      "notes" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MealPlan_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MealPlan_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "MealPlan_patientProfileId_idx" ON "MealPlan"("patientProfileId");
    CREATE INDEX IF NOT EXISTS "MealPlan_nutritionistId_idx" ON "MealPlan"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "Assessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "nutritionistId" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "weight" REAL NOT NULL,
      "height" REAL NOT NULL,
      "imc" REAL NOT NULL,
      "bodyFat" REAL NOT NULL,
      "notes" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Assessment_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Assessment_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "Assessment_patientProfileId_idx" ON "Assessment"("patientProfileId");
    CREATE INDEX IF NOT EXISTS "Assessment_nutritionistId_idx" ON "Assessment"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "PatientMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "nutritionistId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "sentAt" DATETIME NOT NULL,
      "pending" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PatientMessage_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PatientMessage_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "PatientMessage_patientProfileId_idx" ON "PatientMessage"("patientProfileId");
    CREATE INDEX IF NOT EXISTS "PatientMessage_nutritionistId_idx" ON "PatientMessage"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "Appointment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "nutritionistId" TEXT NOT NULL,
      "scheduledAt" DATETIME NOT NULL,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Appointment_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Appointment_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "Appointment_patientProfileId_idx" ON "Appointment"("patientProfileId");
    CREATE INDEX IF NOT EXISTS "Appointment_nutritionistId_idx" ON "Appointment"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "NutritionChallenge" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nutritionistId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "target" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NutritionChallenge_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "NutritionChallenge_nutritionistId_idx" ON "NutritionChallenge"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "ChallengeParticipant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "challengeId" TEXT NOT NULL,
      "patientProfileId" TEXT NOT NULL,
      "progress" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "NutritionChallenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ChallengeParticipant_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_patientProfileId_key" ON "ChallengeParticipant"("challengeId", "patientProfileId");
    CREATE INDEX IF NOT EXISTS "ChallengeParticipant_patientProfileId_idx" ON "ChallengeParticipant"("patientProfileId");

    CREATE TABLE IF NOT EXISTS "ProgressSnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "weight" REAL NOT NULL,
      "adherence" INTEGER NOT NULL,
      "progress" INTEGER NOT NULL,
      "recordedAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProgressSnapshot_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "ProgressSnapshot_patientProfileId_idx" ON "ProgressSnapshot"("patientProfileId");
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
