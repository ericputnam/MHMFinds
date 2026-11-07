-- CreateTable
CREATE TABLE "mod_uploads" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "submissionId" TEXT,
    "modId" TEXT,
    "blobPathname" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "downloadName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "containsScript" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending_upload',
    "validationError" TEXT,
    "inspection" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "blobDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mod_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mod_uploads_submissionId_key" ON "mod_uploads"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "mod_uploads_blobPathname_key" ON "mod_uploads"("blobPathname");

-- CreateIndex
CREATE INDEX "mod_uploads_uploaderId_createdAt_idx" ON "mod_uploads"("uploaderId", "createdAt");

-- CreateIndex
CREATE INDEX "mod_uploads_modId_status_idx" ON "mod_uploads"("modId", "status");

-- CreateIndex
CREATE INDEX "mod_uploads_sha256_idx" ON "mod_uploads"("sha256");

-- CreateIndex
CREATE INDEX "mod_uploads_status_createdAt_idx" ON "mod_uploads"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "mod_uploads" ADD CONSTRAINT "mod_uploads_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mod_uploads" ADD CONSTRAINT "mod_uploads_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "mod_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mod_uploads" ADD CONSTRAINT "mod_uploads_modId_fkey" FOREIGN KEY ("modId") REFERENCES "mods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

