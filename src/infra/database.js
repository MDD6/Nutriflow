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

  function ensureColumn(tableName, columnName, definition) {
    const columns = sqlite.prepare(`PRAGMA table_info("${tableName}")`).all();
    const columnExists = columns.some((column) => column.name === columnName);

    if (!columnExists) {
      sqlite.exec(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
    }
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "profile" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS "NutritionistProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "crn" TEXT,
      "clinic" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NutritionistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "NutritionistProfile_userId_key" ON "NutritionistProfile"("userId");

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

    CREATE TABLE IF NOT EXISTS "Food" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "calories" INTEGER NOT NULL,
      "protein" INTEGER NOT NULL,
      "carbs" INTEGER NOT NULL,
      "fat" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "Food_name_key" ON "Food"("name");

    CREATE TABLE IF NOT EXISTS "MealPlanItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "mealPlanId" TEXT NOT NULL,
      "foodId" TEXT NOT NULL,
      "quantity" REAL NOT NULL,
      "mealTime" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MealPlanItem_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MealPlanItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "MealPlanItem_mealPlanId_idx" ON "MealPlanItem"("mealPlanId");

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
      "senderRole" TEXT NOT NULL DEFAULT 'PATIENT',
      "content" TEXT NOT NULL,
      "sentAt" DATETIME NOT NULL,
      "pending" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PatientMessage_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PatientMessage_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "PatientMessage_patientProfileId_idx" ON "PatientMessage"("patientProfileId");
    CREATE INDEX IF NOT EXISTS "PatientMessage_nutritionistId_idx" ON "PatientMessage"("nutritionistId");

    CREATE TABLE IF NOT EXISTS "MealEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "mealType" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "calories" INTEGER NOT NULL,
      "protein" INTEGER NOT NULL,
      "carbs" INTEGER NOT NULL,
      "fats" INTEGER NOT NULL,
      "fiber" INTEGER NOT NULL DEFAULT 0,
      "waterMl" INTEGER NOT NULL DEFAULT 0,
      "loggedAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MealEntry_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "MealEntry_patientProfileId_idx" ON "MealEntry"("patientProfileId");
    CREATE INDEX IF NOT EXISTS "MealEntry_patientProfileId_loggedAt_idx" ON "MealEntry"("patientProfileId", "loggedAt");

    CREATE TABLE IF NOT EXISTS "FoodLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "foodId" TEXT NOT NULL,
      "quantity" REAL NOT NULL,
      "loggedAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FoodLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "FoodLog_userId_loggedAt_idx" ON "FoodLog"("userId", "loggedAt");

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

    CREATE TABLE IF NOT EXISTS "Goal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientProfileId" TEXT NOT NULL,
      "targetCalories" INTEGER NOT NULL DEFAULT 0,
      "targetProtein" INTEGER NOT NULL DEFAULT 0,
      "targetCarbs" INTEGER NOT NULL DEFAULT 0,
      "targetFat" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Goal_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "Goal_patientProfileId_key" ON "Goal"("patientProfileId");
  `);
  ensureColumn('User', 'isActive', 'BOOLEAN NOT NULL DEFAULT 1');
  ensureColumn('PatientMessage', 'senderRole', `TEXT NOT NULL DEFAULT 'PATIENT'`);
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
