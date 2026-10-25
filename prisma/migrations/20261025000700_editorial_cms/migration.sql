ALTER TABLE "Article"
  ADD COLUMN "sources" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "coverKey" VARCHAR(30),
  ADD COLUMN "coverAlt" VARCHAR(250),
  ADD COLUMN "reviewedAt" TIMESTAMPTZ(3),
  ADD COLUMN "reviewedById" UUID;
ALTER TABLE "Article" ADD CONSTRAINT "Article_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_sources_array" CHECK (jsonb_typeof("sources") = 'array' AND jsonb_array_length("sources") <= 30);
ALTER TABLE "Article" ADD CONSTRAINT "Article_cover_key" CHECK ("coverKey" IS NULL OR "coverKey" IN ('workflow','writing','tools','marketing','code','data'));
-- Legacy body formats remain preserved. The new CMS format must be reviewed before publication.
ALTER TABLE "Article" ADD CONSTRAINT "Article_editorial_publication" CHECK (
  "status" <> 'PUBLISHED' OR "body"->>'version' IS DISTINCT FROM '1' OR
  ("reviewedAt" IS NOT NULL AND NOT "isDemo" AND jsonb_array_length("sources") > 0)
);
ALTER TABLE "ContentDraft" ADD COLUMN "articleId" UUID;
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Article_reviewedById_idx" ON "Article"("reviewedById");
CREATE INDEX "Article_noindex_status_isDemo_publishedAt_idx" ON "Article"("noindex", "status", "isDemo", "publishedAt");
CREATE INDEX "ContentDraft_articleId_createdAt_idx" ON "ContentDraft"("articleId", "createdAt");
