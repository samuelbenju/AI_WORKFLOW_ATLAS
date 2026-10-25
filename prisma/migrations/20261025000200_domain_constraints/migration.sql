-- SQL constraints intentionally supplement Prisma's declarative schema.
-- Do not remove them when generating later migrations.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email")) AND length("email") > 3);
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_email_normalized" CHECK ("contactEmail" = lower(btrim("contactEmail")));
ALTER TABLE "CommercialLead" ADD CONSTRAINT "Lead_email_normalized" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "Subscriber_email_normalized" CHECK ("email" = lower(btrim("email")));

ALTER TABLE "Tool" ADD CONSTRAINT "Tool_publication_date" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "UseCase" ADD CONSTRAINT "UseCase_publication_date" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "Article" ADD CONSTRAINT "Article_publication_date" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "UseCase" ADD CONSTRAINT "UseCase_structured_arrays" CHECK (jsonb_typeof("instructions") = 'array' AND jsonb_typeof("references") = 'array');
ALTER TABLE "Article" ADD CONSTRAINT "Article_body_object" CHECK (jsonb_typeof("body") = 'object');

ALTER TABLE "SponsorshipPackage" ADD CONSTRAINT "Package_positive_price" CHECK ("amountMinor" IS NULL OR "amountMinor" > 0);
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "Order_positive_amount" CHECK ("amountMinor" > 0);
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "Transaction_positive_amount" CHECK ("amountMinor" > 0);
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "Order_paid_date" CHECK ("status" <> 'PAID' OR "paidAt" IS NOT NULL);
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "Transaction_confirmation" CHECK ("status" <> 'APPROVED' OR "confirmedAt" IS NOT NULL);
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_digest" CHECK ("payloadDigest" ~ '^[a-f0-9]{64}$');
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_verified_before_processing" CHECK ("processedAt" IS NULL OR ("verifiedAt" IS NOT NULL AND "processedAt" >= "verifiedAt"));

ALTER TABLE "CommercialLead" ADD CONSTRAINT "Lead_approval" CHECK ("status" <> 'APPROVED' OR ("approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL));
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "Campaign_date_range" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt");
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "Campaign_approval" CHECK ("status" NOT IN ('APPROVED','ACTIVE','COMPLETED') OR ("approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL));
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "Active_campaign_dates" CHECK ("status" <> 'ACTIVE' OR ("startsAt" IS NOT NULL AND "endsAt" IS NOT NULL));
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "Subscriber_consent_version" CHECK (length(btrim("consentVersion")) > 0 AND length(btrim("consentSource")) > 0);
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "Subscriber_confirmation" CHECK ("status" <> 'CONFIRMED' OR "confirmedAt" IS NOT NULL);
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "Subscriber_unsubscription" CHECK ("status" <> 'UNSUBSCRIBED' OR "unsubscribedAt" IS NOT NULL);
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "Subscriber_hashed_token" CHECK (("tokenHash" IS NULL AND "tokenExpiresAt" IS NULL) OR ("tokenHash" ~ '^[a-f0-9]{64}$' AND "tokenExpiresAt" IS NOT NULL));
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "Newsletter_approval" CHECK ("status" NOT IN ('APPROVED','SENT') OR ("approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL));
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "Newsletter_sent_date" CHECK ("status" <> 'SENT' OR "sentAt" IS NOT NULL);

ALTER TABLE "Agent" ADD CONSTRAINT "Agent_budget" CHECK ("monthlyBudgetUsdMicros" >= 0 AND "promptVersion" > 0);
ALTER TABLE "AgentTask" ADD CONSTRAINT "Task_limits" CHECK ("attempts" >= 0 AND "maxAttempts" BETWEEN 1 AND 10 AND "attempts" <= "maxAttempts" AND "tokenBudget" >= 0 AND "budgetUsdMicros" >= 0);
ALTER TABLE "AgentTask" ADD CONSTRAINT "Task_approval" CHECK (NOT "requiresApproval" OR "status" <> 'COMPLETED' OR ("approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL));
ALTER TABLE "AgentExecution" ADD CONSTRAINT "Execution_consumption" CHECK ("attempt" > 0 AND "inputTokens" >= 0 AND "outputTokens" >= 0 AND "costUsdMicros" >= 0);
ALTER TABLE "AgentExecution" ADD CONSTRAINT "Execution_dates" CHECK (("finishedAt" IS NULL OR "finishedAt" >= "startedAt") AND ("status" = 'RUNNING' OR "finishedAt" IS NOT NULL));
