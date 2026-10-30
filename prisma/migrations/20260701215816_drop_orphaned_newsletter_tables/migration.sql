-- Drop orphaned newsletter tables left in prod by a `db push` of the
-- half-finished newsletter service (code removed in 3633b6e / 04c8415).
-- Verified 2026-07-01: NewsletterSend and NewsletterRecipientLog have 0 rows;
-- users.newsletterOptIn is default-true for 100% of users (no real consent
-- signal). Future newsletter capture goes through the `waitlist` table via
-- /api/waitlist (NewsletterSignup footer component).

-- DropForeignKey
ALTER TABLE "NewsletterRecipientLog" DROP CONSTRAINT "NewsletterRecipientLog_sendId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterRecipientLog" DROP CONSTRAINT "NewsletterRecipientLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterSend" DROP CONSTRAINT "NewsletterSend_sentById_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "newsletterOptIn";

-- DropTable
DROP TABLE "NewsletterRecipientLog";

-- DropTable
DROP TABLE "NewsletterSend";
