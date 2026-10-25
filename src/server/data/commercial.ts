import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";

const leadSchema = z.object({
  email: z.email().max(320).transform((value) => value.trim().toLowerCase()),
  companyName: z.string().trim().min(1).max(200),
  message: z.string().trim().min(10).max(10_000),
  packageSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
}).strict();

// No public endpoint in Phase 2. Future callers must add rate limits and consent.
export async function createCommercialLead(input: z.input<typeof leadSchema>, db: PrismaClient = getDatabase()) {
  const { packageSlug, ...data } = leadSchema.parse(input);
  return db.$transaction(async (tx) => {
    const product = await tx.sponsorshipPackage.findUnique({ where: { slug: packageSlug } });
    if (!product?.active) throw new Error("Commercial package is unavailable.");
    const lead = await tx.commercialLead.create({ data: { ...data, packageId: product.id } });
    await tx.auditLog.create({ data: {
      action: "commercial_lead.created", entityType: "CommercialLead", entityId: lead.id,
      metadata: { packageId: product.id },
    } });
    return lead;
  });
}
