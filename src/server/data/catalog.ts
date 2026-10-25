import "server-only";
import { z } from "zod";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";

const slug = z.string().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpUrl = z.url().refine((value) => {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch { return false; }
}, "Use an HTTP(S) URL without embedded credentials.");
const draftSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(50_000),
  websiteUrl: httpUrl.max(2048),
  categoryIds: z.array(z.uuid()).max(20).default([]),
  tagIds: z.array(z.uuid()).max(30).default([]),
}).strict();
const searchSchema = z.object({
  search: z.string().trim().max(100).default(""),
  category: slug.optional(),
  tag: slug.optional(),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
}).strict();

// Internal repository operation; callers added in Phase 4 must authorize first.
export async function createToolDraft(input: z.input<typeof draftSchema>, db: PrismaClient = getDatabase()) {
  const { categoryIds, tagIds, ...data } = draftSchema.parse(input);
  return db.tool.create({ data: {
    ...data,
    categories: { connect: [...new Set(categoryIds)].map((id) => ({ id })) },
    tags: { connect: [...new Set(tagIds)].map((id) => ({ id })) },
  }, include: { categories: true, tags: true } });
}

export async function listPublishedTools(input: z.input<typeof searchSchema> = {}, db: PrismaClient = getDatabase()) {
  const query = searchSchema.parse(input);
  const where: Prisma.ToolWhereInput = {
    status: "PUBLISHED", isDemo: false, publishedAt: { lte: new Date() },
    ...(query.search ? { OR: [
      { name: { contains: query.search, mode: "insensitive" } },
      { summary: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
    ...(query.category ? { categories: { some: { slug: query.category } } } : {}),
    ...(query.tag ? { tags: { some: { slug: query.tag } } } : {}),
  };
  const [items, total] = await db.$transaction([
    db.tool.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      include: { categories: true, tags: true } }),
    db.tool.count({ where }),
  ], { isolationLevel: "RepeatableRead" });
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getPublishedUseCase(value: string, db: PrismaClient = getDatabase()) {
  return db.useCase.findFirst({ where: { slug: slug.parse(value), status: "PUBLISHED", isDemo: false, publishedAt: { lte: new Date() } },
    include: { categories: true, tags: true,
      tools: { where: { status: "PUBLISHED", isDemo: false, publishedAt: { lte: new Date() } } } } });
}

export async function getPublishedArticle(value: string, db: PrismaClient = getDatabase()) {
  // Do not return User.email or any administrative fields to public callers.
  return db.article.findFirst({ where: { slug: slug.parse(value), status: "PUBLISHED", isDemo: false, publishedAt: { lte: new Date() } },
    include: { author: { select: { name: true } }, categories: true, tags: true } });
}
