-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'SEARCH', 'DOWNLOAD_CLICK', 'AD_VIEW', 'AD_CLICK', 'MOD_VIEW', 'FAVORITE_ADD', 'FAVORITE_REMOVE', 'COLLECTION_ADD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "page" TEXT,
    "referrer" TEXT,
    "searchQuery" TEXT,
    "modId" TEXT,
    "categoryId" TEXT,
    "adId" TEXT,
    "timeOnPage" INTEGER,
    "scrollDepth" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "analytics_events_eventType_createdAt_idx" ON "analytics_events"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_userId_idx" ON "analytics_events"("userId");
CREATE INDEX IF NOT EXISTS "analytics_events_modId_idx" ON "analytics_events"("modId");
CREATE INDEX IF NOT EXISTS "analytics_events_page_idx" ON "analytics_events"("page");
