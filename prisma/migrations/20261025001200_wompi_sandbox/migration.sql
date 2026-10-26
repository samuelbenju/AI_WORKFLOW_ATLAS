-- Additive sandbox payment workflow. Preserve historical financial records.
ALTER TABLE "PaymentOrder" ADD COLUMN "commercialAmountMinor" BIGINT, ADD COLUMN "commercialCurrency" "Currency", ADD COLUMN "fulfillmentStatus" VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "payment_commercial_snapshot" CHECK (("commercialAmountMinor" IS NULL AND "commercialCurrency" IS NULL) OR ("commercialAmountMinor" IS NOT NULL AND "commercialCurrency" IS NOT NULL AND "commercialAmountMinor">0));
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "payment_fulfillment_status" CHECK ("fulfillmentStatus" IN ('NOT_STARTED','SANDBOX_ONLY','ON_HOLD','FULFILLED'));
CREATE TABLE "PaymentAttempt" (
 "id" UUID NOT NULL PRIMARY KEY, "reference" VARCHAR(100) NOT NULL UNIQUE, "provider" VARCHAR(50) NOT NULL, "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
 "orderId" UUID NOT NULL, "amountMinor" BIGINT NOT NULL CHECK ("amountMinor">0), "currency" "Currency" NOT NULL DEFAULT 'COP',
 "status" VARCHAR(30) NOT NULL DEFAULT 'PREPARED' CHECK ("status" IN ('PREPARED','PENDING','APPROVED','DECLINED','VOIDED','ERROR','EXPIRED','REVIEW')),
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 FOREIGN KEY ("orderId","amountMinor","currency","environment") REFERENCES "PaymentOrder"("id","amountMinor","currency","environment") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "wompi_attempt_sandbox" CHECK ("provider"<>'WOMPI' OR ("environment"='SANDBOX' AND "currency"='COP'))
);
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId","createdAt");
ALTER TABLE "PaymentTransaction" ADD COLUMN "attemptId" UUID REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "PaymentOrderHistory" ("id" UUID NOT NULL PRIMARY KEY, "orderId" UUID NOT NULL REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "actorId" UUID, "action" VARCHAR(80) NOT NULL, "details" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "PaymentOrderHistory_orderId_createdAt_idx" ON "PaymentOrderHistory"("orderId","createdAt");
ALTER TABLE "PaymentEvent" ADD COLUMN "source" VARCHAR(30) NOT NULL DEFAULT 'LEGACY', ADD COLUMN "processingStatus" VARCHAR(30) NOT NULL DEFAULT 'RECEIVED', ADD COLUMN "errorCode" VARCHAR(80), ADD COLUMN "summary" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "payment_event_processing" CHECK ("processingStatus" IN ('RECEIVED','PROCESSED','IGNORED','RETRYABLE','CONFLICT'));

ALTER TABLE "PaymentOrder" ADD COLUMN "creationKey" UUID UNIQUE, ADD COLUMN "priceVersion" TIMESTAMPTZ(3);
