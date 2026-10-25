CREATE TYPE "PackageAvailability" AS ENUM ('AVAILABLE','WAITLIST','UNAVAILABLE');
ALTER TABLE "SponsorshipPackage" ADD COLUMN "acceptingInquiries" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "durationDays" INTEGER, ADD COLUMN "availability" "PackageAvailability" NOT NULL DEFAULT 'WAITLIST';
ALTER TABLE "SponsorshipPackage" ADD CONSTRAINT "Package_duration" CHECK ("durationDays" IS NULL OR "durationDays" BETWEEN 1 AND 366);
ALTER TABLE "CommercialLead" ADD COLUMN "reference" VARCHAR(100), ADD COLUMN "submissionId" UUID,
  ADD COLUMN "payloadDigest" CHAR(64), ADD COLUMN "contactName" VARCHAR(160), ADD COLUMN "websiteUrl" VARCHAR(2048),
  ADD COLUMN "consentAt" TIMESTAMPTZ(3), ADD COLUMN "consentVersion" VARCHAR(100), ADD COLUMN "requestedStartsAt" TIMESTAMPTZ(3),
  ADD COLUMN "quotedAmountMinor" BIGINT, ADD COLUMN "quotedCurrency" "Currency", ADD COLUMN "quotedDurationDays" INTEGER, ADD COLUMN "quotedPackageName" VARCHAR(160);
CREATE UNIQUE INDEX "CommercialLead_reference_key" ON "CommercialLead"("reference");
CREATE UNIQUE INDEX "CommercialLead_submissionId_key" ON "CommercialLead"("submissionId");
CREATE INDEX "CommercialLead_payloadDigest_createdAt_idx" ON "CommercialLead"("payloadDigest","createdAt");
ALTER TABLE "CommercialLead" ADD CONSTRAINT "Public_lead_consent" CHECK ("submissionId" IS NULL OR
 ("reference" IS NOT NULL AND "contactName" IS NOT NULL AND "websiteUrl" IS NOT NULL AND "consentAt" IS NOT NULL AND "consentVersion" IS NOT NULL AND "payloadDigest" ~ '^[a-f0-9]{64}$'));
ALTER TABLE "CommercialLead" ADD CONSTRAINT "Lead_quote_amount" CHECK ("quotedAmountMinor" IS NULL OR "quotedAmountMinor">0);
ALTER TABLE "SponsorshipCampaign" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "SponsorshipCampaign" ADD COLUMN "headline" VARCHAR(160), ADD COLUMN "message" VARCHAR(500), ADD COLUMN "destinationUrl" VARCHAR(2048),
 ADD COLUMN "contractAmountMinor" BIGINT, ADD COLUMN "contractCurrency" "Currency", ADD COLUMN "contractDurationDays" INTEGER;
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "Campaign_contract_duration" CHECK ("contractDurationDays" IS NULL OR "contractDurationDays" BETWEEN 1 AND 366);
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "Active_campaign_commercial_terms" CHECK ("status"<>'ACTIVE' OR
 ("orderId" IS NOT NULL AND length(btrim("headline"))>0 AND length(btrim("message"))>0 AND "destinationUrl" IS NOT NULL AND "contractAmountMinor">0 AND "contractCurrency" IS NOT NULL AND "contractDurationDays" IS NOT NULL));
ALTER TABLE "ContentDraft" ADD COLUMN "leadId" UUID;
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CommercialLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ContentDraft_leadId_createdAt_idx" ON "ContentDraft"("leadId","createdAt");
CREATE TABLE "CommercialNote" ("id" UUID NOT NULL,"leadId" UUID NOT NULL,"authorId" UUID NOT NULL,"text" VARCHAR(5000) NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CommercialNote_pkey" PRIMARY KEY ("id"),CONSTRAINT "CommercialNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CommercialLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CommercialNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "CommercialNote_leadId_createdAt_idx" ON "CommercialNote"("leadId","createdAt");
CREATE INDEX "CommercialNote_authorId_idx" ON "CommercialNote"("authorId");
CREATE TABLE "CommercialRateLimit" ("keyHash" CHAR(64) NOT NULL,"attempts" INTEGER NOT NULL DEFAULT 1,"windowStarted" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CommercialRateLimit_pkey" PRIMARY KEY ("keyHash"),CONSTRAINT "CommercialRateLimit_attempts" CHECK ("attempts">0));
CREATE INDEX "CommercialRateLimit_windowStarted_idx" ON "CommercialRateLimit"("windowStarted");
