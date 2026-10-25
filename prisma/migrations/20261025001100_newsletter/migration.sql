-- Additive newsletter persistence. Existing subscriber and campaign rows remain intact.
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "newsletter_generation_positive" CHECK ("generation" > 0);
ALTER TABLE "NewsletterCampaign" ADD COLUMN "preheader" VARCHAR(250) NOT NULL DEFAULT '', ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "sourceArticleIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[], ADD COLUMN "preparedMode" VARCHAR(20);
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "newsletter_revision_positive" CHECK ("revision" > 0);
CREATE TABLE "NewsletterConsent" (
 "id" UUID NOT NULL PRIMARY KEY, "subscriberId" UUID NOT NULL REFERENCES "NewsletterSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "generation" INTEGER NOT NULL CHECK ("generation">0), "action" VARCHAR(20) NOT NULL CHECK ("action" IN ('SUBSCRIBE','CONFIRM','UNSUBSCRIBE')),
 "version" VARCHAR(100) NOT NULL, "source" VARCHAR(200) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("subscriberId","generation","action")
);
CREATE TABLE "NewsletterDelivery" (
 "id" UUID NOT NULL PRIMARY KEY, "subscriberId" UUID NOT NULL REFERENCES "NewsletterSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "campaignId" UUID REFERENCES "NewsletterCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "generation" INTEGER NOT NULL CHECK ("generation">0),
 "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('CONFIRMATION','CAMPAIGN')), "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK ("status" IN ('QUEUED','BLOCKED','CAPTURED','ACCEPTED','FAILED','UNKNOWN','CANCELLED')),
 "mode" VARCHAR(20) NOT NULL CHECK ("mode" IN ('disabled','capture','resend')), "idempotencyKey" VARCHAR(120) NOT NULL UNIQUE,
 "payload" TEXT NOT NULL, "providerMessageId" VARCHAR(200) UNIQUE, "errorCode" VARCHAR(80), "attemptedAt" TIMESTAMPTZ(3), "acceptedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "newsletter_delivery_scope" CHECK (("kind"='CAMPAIGN' AND "campaignId" IS NOT NULL) OR ("kind"='CONFIRMATION' AND "campaignId" IS NULL)),
 CONSTRAINT "newsletter_delivery_evidence" CHECK ("status"<>'ACCEPTED' OR ("providerMessageId" IS NOT NULL AND "acceptedAt" IS NOT NULL AND "mode"='resend')),
 CONSTRAINT "newsletter_capture_is_local" CHECK ("status"<>'CAPTURED' OR "mode"='capture')
);
CREATE INDEX "NewsletterDelivery_campaignId_status_idx" ON "NewsletterDelivery"("campaignId","status");
CREATE INDEX "NewsletterDelivery_subscriberId_createdAt_idx" ON "NewsletterDelivery"("subscriberId","createdAt");
CREATE TABLE "NewsletterRateLimit" ("keyHash" CHAR(64) NOT NULL PRIMARY KEY, "attempts" INTEGER NOT NULL CHECK ("attempts">0), "windowStarted" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
