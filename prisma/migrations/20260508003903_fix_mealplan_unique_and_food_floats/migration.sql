/*
  Warnings:

  - You are about to alter the column `calories` on the `Food` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `carbs` on the `Food` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `fat` on the `Food` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `fiber` on the `Food` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `protein` on the `Food` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `calories` on the `MealPlan` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `carbs` on the `MealPlan` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `fats` on the `MealPlan` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `protein` on the `MealPlan` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Food" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "calories" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "fiber" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Food" ("calories", "carbs", "createdAt", "fat", "fiber", "id", "name", "protein", "updatedAt") SELECT "calories", "carbs", "createdAt", "fat", "fiber", "id", "name", "protein", "updatedAt" FROM "Food";
DROP TABLE "Food";
ALTER TABLE "new_Food" RENAME TO "Food";
CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");
CREATE TABLE "new_MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "calories" REAL,
    "protein" REAL,
    "carbs" REAL,
    "fats" REAL,
    "notes" TEXT,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MealPlan_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealPlan_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MealPlan" ("calories", "carbs", "createdAt", "endDate", "fats", "id", "notes", "nutritionistId", "patientProfileId", "protein", "startDate", "status", "title", "updatedAt") SELECT "calories", "carbs", "createdAt", "endDate", "fats", "id", "notes", "nutritionistId", "patientProfileId", "protein", "startDate", "status", "title", "updatedAt" FROM "MealPlan";
DROP TABLE "MealPlan";
ALTER TABLE "new_MealPlan" RENAME TO "MealPlan";
CREATE UNIQUE INDEX "MealPlan_patientProfileId_title_key" ON "MealPlan"("patientProfileId", "title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
