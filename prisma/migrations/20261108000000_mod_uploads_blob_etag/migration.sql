-- ETag of the exact object the verify step checked. Promotion to approved/
-- copies only that object (CopySourceIfMatch), so bytes swapped in after
-- verification can never be published.
ALTER TABLE "mod_uploads" ADD COLUMN "blobEtag" TEXT;
