-- CreateTable
CREATE TABLE "affiliate_offers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "partnerLogo" TEXT,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "promoText" TEXT,
    "promoColor" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "modId" TEXT,
    "pageUrl" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_offers_isActive_priority_idx" ON "affiliate_offers"("isActive", "priority" DESC);

-- CreateIndex
CREATE INDEX "affiliate_offers_category_isActive_idx" ON "affiliate_offers"("category", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_offers_partner_idx" ON "affiliate_offers"("partner");

-- CreateIndex
CREATE INDEX "affiliate_clicks_offerId_clickedAt_idx" ON "affiliate_clicks"("offerId", "clickedAt" DESC);

-- CreateIndex
CREATE INDEX "affiliate_clicks_sourceType_clickedAt_idx" ON "affiliate_clicks"("sourceType", "clickedAt");

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "affiliate_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
