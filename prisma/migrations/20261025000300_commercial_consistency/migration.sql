-- Keep campaign/order ownership and event/transaction provenance consistent.
CREATE UNIQUE INDEX "PaymentOrder_id_sponsorId_packageId_key" ON "PaymentOrder"("id", "sponsorId", "packageId");
CREATE UNIQUE INDEX "PaymentTransaction_id_provider_environment_key" ON "PaymentTransaction"("id", "provider", "environment");
ALTER TABLE "SponsorshipCampaign" DROP CONSTRAINT "SponsorshipCampaign_orderId_fkey";
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_orderId_sponsorId_packageId_fkey"
FOREIGN KEY ("orderId", "sponsorId", "packageId") REFERENCES "PaymentOrder"("id", "sponsorId", "packageId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaymentEvent" DROP CONSTRAINT "PaymentEvent_transactionId_fkey";
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_transactionId_provider_environment_fkey"
FOREIGN KEY ("transactionId", "provider", "environment") REFERENCES "PaymentTransaction"("id", "provider", "environment") ON DELETE RESTRICT ON UPDATE RESTRICT;
