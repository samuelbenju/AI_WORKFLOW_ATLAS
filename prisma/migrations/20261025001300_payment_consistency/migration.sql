-- Bind attempts, orders and provider environments consistently.
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_id_orderId_provider_environment_key" UNIQUE ("id","orderId","provider","environment");
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_attemptId_fkey";
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_attempt_order_provider_fkey" FOREIGN KEY ("attemptId","orderId","provider","environment") REFERENCES "PaymentAttempt"("id","orderId","provider","environment") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaymentOrderHistory" ADD CONSTRAINT "PaymentOrderHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "sandbox_not_fulfilled" CHECK ("environment"<>'SANDBOX' OR "fulfillmentStatus"<>'FULFILLED');
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "managed_order_snapshot" CHECK ("creationKey" IS NULL OR COALESCE("environment"='SANDBOX' AND "currency"='COP' AND "commercialCurrency"='COP' AND "commercialAmountMinor"="amountMinor" AND "priceVersion" IS NOT NULL,FALSE));
