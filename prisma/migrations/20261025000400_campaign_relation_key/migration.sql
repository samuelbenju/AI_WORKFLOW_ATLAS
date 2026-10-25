-- Prisma requires the complete defining tuple to be unique for a one-to-one relation.
CREATE UNIQUE INDEX "SponsorshipCampaign_orderId_sponsorId_packageId_key"
ON "SponsorshipCampaign"("orderId", "sponsorId", "packageId");
