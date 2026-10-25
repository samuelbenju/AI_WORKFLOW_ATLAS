import type { PrismaClient } from "../src/generated/prisma/client";

export async function seedDevelopment(db: PrismaClient) {
  const [database] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (process.env.NODE_ENV === "production" || !database || !/_(dev|test)$/.test(database.name)) {
    throw new Error("Development seed requires a database ending in _dev or _test and a non-production environment.");
  }
  return db.$transaction(async (tx) => {
    const category = await tx.category.upsert({ where: { slug: "development-examples" }, update: {},
      create: { slug: "development-examples", name: "Development examples", description: "Fictional fixtures. Not editorial recommendations." } });
    const tag = await tx.tag.upsert({ where: { slug: "development-only" }, update: {}, create: { slug: "development-only", name: "Development only" } });
    const user = await tx.user.upsert({ where: { email: "editor@seed.invalid" }, update: {},
      create: { email: "editor@seed.invalid", name: "Development editor (fictional)", role: "EDITOR", active: false } });
    const tool = await tx.tool.upsert({ where: { slug: "development-example-tool" }, update: {}, create: {
      slug: "development-example-tool", name: "Development example tool", summary: "Fictional development data, not a real product.",
      description: "Used to verify database relations. Never a published recommendation.", websiteUrl: "https://example.invalid",
      isDemo: true, categories: { connect: { id: category.id } }, tags: { connect: { id: tag.id } },
    } });
    const useCase = await tx.useCase.upsert({ where: { slug: "development-example-workflow" }, update: {}, create: {
      slug: "development-example-workflow", title: "Development workflow example", problem: "Verify fixture relationships.",
      instructions: [{ step: 1, text: "Inspect the local development database." }], limitations: "Fictional fixture only.",
      references: [{ url: "https://example.invalid", note: "Reserved invalid domain; not a verified source." }], isDemo: true,
      categories: { connect: { id: category.id } }, tags: { connect: { id: tag.id } }, tools: { connect: { id: tool.id } },
    } });
    await tx.article.upsert({ where: { slug: "development-example-article" }, update: {}, create: {
      slug: "development-example-article", title: "Development article example", excerpt: "Fictional draft for development.",
      body: { blocks: [{ type: "paragraph", text: "Development-only draft." }] }, isDemo: true, authorId: user.id, useCaseId: useCase.id,
      categories: { connect: { id: category.id } }, tags: { connect: { id: tag.id } }, tools: { connect: { id: tool.id } },
    } });
    const products = [
      ["homepage-featured-sponsor", "Homepage Featured Sponsor", "HOMEPAGE_FEATURED_SPONSOR"],
      ["newsletter-sponsorship", "Newsletter Sponsorship", "NEWSLETTER_SPONSORSHIP"],
      ["featured-tool-listing", "Featured Tool Listing", "FEATURED_TOOL_LISTING"],
      ["sponsored-article", "Sponsored Article", "SPONSORED_ARTICLE"],
    ] as const;
    for (const [slug, name, kind] of products) {
      await tx.sponsorshipPackage.upsert({ where: { kind }, update: {}, create: {
        slug, name, kind, description: "Inactive until reviewed and configured by the owner. No price or sale is implied.",
        active: false, amountMinor: null,
      } });
    }
    await tx.siteSetting.upsert({ where: { key: "development.seed" }, update: {},
      create: { key: "development.seed", value: { version: 1, fictional: true } } });
    return { categoryId: category.id, toolId: tool.id, useCaseId: useCase.id };
  });
}
