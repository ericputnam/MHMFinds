-- CreateIndex
CREATE INDEX "user_collections" ON "collections"("userId", "isPublic");

-- CreateIndex
CREATE INDEX "featured_collections" ON "collections"("isFeatured", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "user_downloads" ON "downloads"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mod_downloads_count" ON "downloads"("modId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "download_timeline" ON "downloads"("createdAt");

-- CreateIndex
CREATE INDEX "user_favorites" ON "favorites"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mod_favorites_count" ON "favorites"("modId", "createdAt");

-- CreateIndex
CREATE INDEX "pending_submissions" ON "mod_submissions"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "submission_tracking" ON "mod_submissions"("submitterEmail");

-- CreateIndex
CREATE INDEX "verified_safe_newest" ON "mods"("isVerified", "isNSFW", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verified_safe_popular" ON "mods"("isVerified", "isNSFW", "downloadCount" DESC);

-- CreateIndex
CREATE INDEX "verified_safe_rated" ON "mods"("isVerified", "isNSFW", "rating" DESC);

-- CreateIndex
CREATE INDEX "category_verified_newest" ON "mods"("categoryId", "isVerified", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "creator_mods" ON "mods"("creatorId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "source_lookup" ON "mods"("source", "sourceId");

-- CreateIndex
CREATE INDEX "featured_mods" ON "mods"("isFeatured", "publishedAt");

-- CreateIndex
CREATE INDEX "legacy_category" ON "mods"("category");

-- CreateIndex
CREATE INDEX "mod_reviews" ON "reviews"("modId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_reviews" ON "reviews"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "rating_timeline" ON "reviews"("rating", "createdAt");

-- CreateIndex
CREATE INDEX "reindex_tracking" ON "search_index"("lastIndexed");

-- CreateIndex
CREATE INDEX "email_lookup" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_tiers" ON "users"("isCreator", "isPremium");
