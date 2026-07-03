-- AlterTable
ALTER TABLE "affiliate_offers" ADD COLUMN     "network" TEXT;

-- CreateTable
CREATE TABLE "affiliate_earnings" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "networkTransactionId" TEXT NOT NULL,
    "subId" TEXT,
    "clickId" TEXT,
    "offerId" TEXT,
    "saleAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "advertiserName" TEXT,
    "campaignId" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_sync_runs" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "networksSynced" TEXT[],
    "earningsCreated" INTEGER NOT NULL DEFAULT 0,
    "earningsUpdated" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "affiliate_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_earnings_offerId_eventDate_idx" ON "affiliate_earnings"("offerId", "eventDate" DESC);

-- CreateIndex
CREATE INDEX "affiliate_earnings_network_eventDate_idx" ON "affiliate_earnings"("network", "eventDate" DESC);

-- CreateIndex
CREATE INDEX "affiliate_earnings_status_idx" ON "affiliate_earnings"("status");

-- CreateIndex
CREATE INDEX "affiliate_earnings_clickId_idx" ON "affiliate_earnings"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_earnings_network_networkTransactionId_key" ON "affiliate_earnings"("network", "networkTransactionId");

-- CreateIndex
CREATE INDEX "affiliate_sync_runs_startedAt_idx" ON "affiliate_sync_runs"("startedAt" DESC);

-- AddForeignKey
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "affiliate_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_clickId_fkey" FOREIGN KEY ("clickId") REFERENCES "affiliate_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

