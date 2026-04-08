-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('PROPOSED', 'BASELINE_CAPTURE', 'RUNNING', 'EVALUATING', 'KEPT', 'REVERTED', 'EXTENDED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AgentRunType" ADD VALUE 'EXPERIMENT_EVAL';

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'PROPOSED',
    "catalogKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "targetPages" TEXT[],
    "opportunityId" TEXT,
    "actionId" TEXT,
    "baselineStartDate" TIMESTAMP(3),
    "baselineEndDate" TIMESTAMP(3),
    "experimentStartDate" TIMESTAMP(3),
    "experimentEndDate" TIMESTAMP(3),
    "maxDurationDays" INTEGER NOT NULL DEFAULT 14,
    "baselineRpm" DECIMAL(10,4),
    "baselineViewability" DECIMAL(5,2),
    "baselineRevenue" DECIMAL(10,2),
    "baselinePageviews" INTEGER,
    "baselinePagesPerSession" DECIMAL(5,2),
    "treatmentRpm" DECIMAL(10,4),
    "treatmentViewability" DECIMAL(5,2),
    "treatmentRevenue" DECIMAL(10,2),
    "treatmentPageviews" INTEGER,
    "treatmentPagesPerSession" DECIMAL(5,2),
    "rpmLiftPercent" DECIMAL(5,2),
    "bayesianProbability" DECIMAL(5,4),
    "daysOfData" INTEGER NOT NULL DEFAULT 0,
    "decision" TEXT,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "rollbackData" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiments_status_idx" ON "experiments"("status");

-- CreateIndex
CREATE INDEX "experiments_catalogKey_idx" ON "experiments"("catalogKey");

-- CreateIndex
CREATE INDEX "experiments_createdAt_idx" ON "experiments"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "monetization_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "monetization_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

