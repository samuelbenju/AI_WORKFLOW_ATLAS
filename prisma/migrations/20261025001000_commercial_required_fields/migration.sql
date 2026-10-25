-- CHECK must reject UNKNOWN as well as FALSE for these required values.
ALTER TABLE "CommercialLead" DROP CONSTRAINT "Public_lead_consent";
ALTER TABLE "CommercialLead" ADD CONSTRAINT "Public_lead_consent" CHECK ("submissionId" IS NULL OR COALESCE(
 ("reference" IS NOT NULL AND length(btrim("reference"))>0 AND "contactName" IS NOT NULL AND "websiteUrl" IS NOT NULL AND "consentAt" IS NOT NULL
 AND "consentVersion" IS NOT NULL AND length(btrim("consentVersion"))>0 AND "payloadDigest" IS NOT NULL AND "payloadDigest" ~ '^[a-f0-9]{64}$'),false));
ALTER TABLE "SponsorshipCampaign" DROP CONSTRAINT "Active_campaign_commercial_terms";
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "Active_campaign_commercial_terms" CHECK ("status"<>'ACTIVE' OR COALESCE(
 ("orderId" IS NOT NULL AND length(btrim("headline"))>0 AND length(btrim("message"))>0 AND "destinationUrl" IS NOT NULL AND "contractAmountMinor">0 AND "contractCurrency" IS NOT NULL AND "contractDurationDays" IS NOT NULL),false));
