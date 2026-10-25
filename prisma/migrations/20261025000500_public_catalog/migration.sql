ALTER TABLE "Tool" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UseCase" ADD COLUMN "solution" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UseCase" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Tool_featured_status_isDemo_publishedAt_idx" ON "Tool"("featured", "status", "isDemo", "publishedAt");
CREATE INDEX "UseCase_featured_status_isDemo_publishedAt_idx" ON "UseCase"("featured", "status", "isDemo", "publishedAt");
