import "server-only";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { demand, AccessError, type Permission } from "@/server/auth/policy";
import { categorySchema, taxonomySchema, toolSchema, useCaseSchema, settingsSchema, defaultSettings, type ContentKind, type AdminListQuery, type ContentFormData } from "@/lib/admin-content";

type Db = PrismaClient | Prisma.TransactionClient;
export async function authorizeActor(userId: string, permission: Permission, db: Db) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, active: true } });
  const actor = user?.active ? user : null;
  demand(actor, permission); return actor;
}
const taxonomySelect = { id: true, name: true } as const;
const contentRelations = { categories: { select: { id: true } }, tags: { select: { id: true } } } as const;
export async function adminOptions(userId: string, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, "write", db);
  const [categories, tags, tools] = await db.$transaction([
    db.category.findMany({ select: taxonomySelect, orderBy: { name: "asc" }, take: 1000 }),
    db.tag.findMany({ select: taxonomySelect, orderBy: { name: "asc" }, take: 1000 }),
    db.tool.findMany({ select: taxonomySelect, orderBy: { name: "asc" }, take: 1000 }),
  ]);
  return { categories, tags, tools };
}

export async function listContent(userId: string, kind: ContentKind, query: AdminListQuery, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, "panel", db);
  const page = { take: 12, skip: (query.page - 1) * 12 };
  const match = { contains: query.q, mode: "insensitive" as const };
  const common = { ...(query.status ? { status: query.status } : {}) };
  if (kind === "tools") {
    const where: Prisma.ToolWhereInput = { ...common, OR: [{ name: match }, { slug: match }] };
    const [rows, total] = await db.$transaction([db.tool.findMany({ where, ...page, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, name: true, slug: true, status: true, isDemo: true, featured: true } }), db.tool.count({ where })]);
    return { rows, total };
  }
  if (kind === "use-cases") {
    const where: Prisma.UseCaseWhereInput = { ...common, OR: [{ title: match }, { slug: match }] };
    const [rows, total] = await db.$transaction([db.useCase.findMany({ where, ...page, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, title: true, slug: true, status: true, isDemo: true, featured: true } }), db.useCase.count({ where })]);
    return { rows: rows.map(({ title, ...row }) => ({ ...row, name: title })), total };
  }
  const where = { OR: [{ name: match }, { slug: match }] };
  if (kind === "categories") {
    const [rows, total] = await db.$transaction([db.category.findMany({ where, ...page, orderBy: [{ name: "asc" }, { id: "asc" }], select: { ...taxonomySelect, slug: true } }), db.category.count({ where })]);
    return { rows, total };
  }
  const [rows, total] = await db.$transaction([db.tag.findMany({ where, ...page, orderBy: [{ name: "asc" }, { id: "asc" }], select: { ...taxonomySelect, slug: true } }), db.tag.count({ where })]);
  return { rows, total };
}

async function readRecord(kind: ContentKind, id: string, db: Db): Promise<{ id: string; data: ContentFormData; linked: number } | null> {
  if (kind === "tools") {
    const row = await db.tool.findUnique({ where: { id }, include: { ...contentRelations, _count: { select: { useCases: true, articles: true, campaigns: true } } } });
    if (!row) return null;
    return { id, linked: row._count.useCases + row._count.articles + row._count.campaigns, data: { name: row.name, slug: row.slug, summary: row.summary, description: row.description, websiteUrl: row.websiteUrl, status: row.status, featured: row.featured, isDemo: row.isDemo, publishedAt: row.publishedAt?.toISOString() ?? null, categoryIds: row.categories.map((item) => item.id), tagIds: row.tags.map((item) => item.id) } };
  }
  if (kind === "use-cases") {
    const row = await db.useCase.findUnique({ where: { id }, include: { ...contentRelations, tools: { select: { id: true } }, _count: { select: { articles: true } } } });
    if (!row) return null;
    const steps = z.array(z.object({ step: z.number(), text: z.string() })).safeParse(row.instructions);
    const refs = z.array(z.object({ url: z.string(), note: z.string().optional() })).safeParse(row.references);
    return { id, linked: row._count.articles, data: { name: row.title, slug: row.slug, problem: row.problem, solution: row.solution, limitations: row.limitations, difficulty: row.difficulty, status: row.status, featured: row.featured, isDemo: row.isDemo, publishedAt: row.publishedAt?.toISOString() ?? null, instructions: steps.success ? steps.data : [], references: refs.success ? refs.data : [], categoryIds: row.categories.map((item) => item.id), tagIds: row.tags.map((item) => item.id), toolIds: row.tools.map((item) => item.id) } };
  }
  if (kind === "categories") {
    const row = await db.category.findUnique({ where: { id }, include: { _count: { select: { tools: true, useCases: true, articles: true } } } });
    return row ? { id, linked: row._count.tools + row._count.useCases + row._count.articles, data: { name: row.name, slug: row.slug, description: row.description ?? "" } } : null;
  }
  const row = await db.tag.findUnique({ where: { id }, include: { _count: { select: { tools: true, useCases: true, articles: true } } } });
  return row ? { id, linked: row._count.tools + row._count.useCases + row._count.articles, data: { name: row.name, slug: row.slug } } : null;
}

export async function getContent(userId: string, kind: ContentKind, id: string, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, "panel", db); z.uuid().parse(id); return readRecord(kind, id, db);
}
function publicationPermission(role: string, data: ContentFormData, previous?: ContentFormData) {
  if (role !== "EDITOR") return;
  if ((previous?.status && !["DRAFT", "IN_REVIEW"].includes(previous.status)) || !["DRAFT", "IN_REVIEW"].includes(data.status ?? "DRAFT") || Boolean(data.featured) !== Boolean(previous?.featured) || Boolean(data.isDemo) !== Boolean(previous?.isDemo)) {
    throw new AccessError(403, "Solo un administrador puede publicar, archivar, destacar o cambiar el tipo de ejemplo.");
  }
}
const connects = (ids: string[]) => [...new Set(ids)].map((id) => ({ id }));

export async function saveContent(userId: string, kind: ContentKind, input: unknown, id?: string, db: PrismaClient = getDatabase()) {
  if (id) z.uuid().parse(id);
  return db.$transaction(async (tx) => {
    const actor = await authorizeActor(userId, "write", tx);
    const previous = id ? await readRecord(kind, id, tx) : null;
    if (id && !previous) throw new AccessError(404, "El registro ya no existe.");
    let result: { id: string };
    if (kind === "tools") {
      const data = toolSchema.parse(input); publicationPermission(actor.role, data, previous?.data);
      const { categoryIds, tagIds, publishedAt, ...fields } = data;
      const attributes = { ...fields, publishedAt: publishedAt ? new Date(publishedAt) : data.status === "PUBLISHED" ? new Date() : null };
      const relations = id ? { categories: { set: connects(categoryIds) }, tags: { set: connects(tagIds) } } : { categories: { connect: connects(categoryIds) }, tags: { connect: connects(tagIds) } };
      result = id ? await tx.tool.update({ where: { id }, data: { ...attributes, ...relations }, select: { id: true } }) : await tx.tool.create({ data: { ...attributes, ...relations }, select: { id: true } });
    } else if (kind === "use-cases") {
      const data = useCaseSchema.parse(input); publicationPermission(actor.role, data, previous?.data);
      const { name, categoryIds, tagIds, toolIds, publishedAt, ...fields } = data;
      const attributes = { ...fields, title: name, publishedAt: publishedAt ? new Date(publishedAt) : data.status === "PUBLISHED" ? new Date() : null };
      const relations = id ? { categories: { set: connects(categoryIds) }, tags: { set: connects(tagIds) }, tools: { set: connects(toolIds) } } : { categories: { connect: connects(categoryIds) }, tags: { connect: connects(tagIds) }, tools: { connect: connects(toolIds) } };
      result = id ? await tx.useCase.update({ where: { id }, data: { ...attributes, ...relations }, select: { id: true } }) : await tx.useCase.create({ data: { ...attributes, ...relations }, select: { id: true } });
    } else if (kind === "categories") {
      const data = categorySchema.parse(input);
      result = id ? await tx.category.update({ where: { id }, data, select: { id: true } }) : await tx.category.create({ data, select: { id: true } });
    } else {
      const data = taxonomySchema.parse(input);
      result = id ? await tx.tag.update({ where: { id }, data, select: { id: true } }) : await tx.tag.create({ data, select: { id: true } });
    }
    await tx.auditLog.create({ data: { actorId: actor.id, action: id ? "content.updated" : "content.created", entityType: kind, entityId: result.id } });
    return result;
  }, { isolationLevel: "Serializable", timeout: 10000 });
}

export async function deleteContent(userId: string, kind: ContentKind, id: string, input: unknown, db: PrismaClient = getDatabase()) {
  z.uuid().parse(id);
  const { confirmation } = z.object({ confirmation: z.string().min(1).max(200) }).strict().parse(input);
  return db.$transaction(async (tx) => {
    const actor = await authorizeActor(userId, "delete", tx);
    const record = await readRecord(kind, id, tx);
    if (!record) throw new AccessError(404, "El registro ya no existe.");
    if (confirmation !== record.data.name) throw new AccessError(409, "La confirmación debe coincidir exactamente con el nombre actual.");
    if (record.linked) throw new AccessError(409, "El registro está relacionado con otros contenidos. Desvincúlalos antes de eliminarlo.");
    if (kind === "tools") await tx.tool.delete({ where: { id } });
    else if (kind === "use-cases") await tx.useCase.delete({ where: { id } });
    else if (kind === "categories") await tx.category.delete({ where: { id } });
    else await tx.tag.delete({ where: { id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "content.deleted", entityType: kind, entityId: id } });
    return { deleted: true };
  }, { isolationLevel: "Serializable", timeout: 10000 });
}

export async function readAdminSettings(userId: string, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, "panel", db);
  const record = await db.siteSetting.findUnique({ where: { key: "admin.contentDefaults" } });
  const parsed = settingsSchema.safeParse(record?.value); return parsed.success ? parsed.data : defaultSettings;
}
export async function saveAdminSettings(userId: string, input: unknown, db: PrismaClient = getDatabase()) {
  const value = settingsSchema.parse(input);
  return db.$transaction(async (tx) => {
    const actor = await authorizeActor(userId, "settings", tx);
    await tx.siteSetting.upsert({ where: { key: "admin.contentDefaults" }, create: { key: "admin.contentDefaults", value }, update: { value } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "settings.updated", entityType: "SiteSetting", entityId: "admin.contentDefaults" } });
    return { saved: true };
  }, { isolationLevel: "Serializable" });
}

export async function adminDashboard(userId: string, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, "panel", db);
  const [tools, demoTools, publishedTools, workflows, demoWorkflows, publishedWorkflows, categories, tags, recent, audit] = await db.$transaction([
    db.tool.count(), db.tool.count({ where: { isDemo: true } }), db.tool.count({ where: { status: "PUBLISHED", isDemo: false, publishedAt: { lte: new Date() } } }),
    db.useCase.count(), db.useCase.count({ where: { isDemo: true } }), db.useCase.count({ where: { status: "PUBLISHED", isDemo: false, publishedAt: { lte: new Date() } } }),
    db.category.count(), db.tag.count(),
    db.tool.findMany({ select: { id: true, name: true, slug: true, status: true, isDemo: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.auditLog.findMany({ select: { id: true, action: true, entityType: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 6 }),
  ], { isolationLevel: "RepeatableRead" });
  return { tools, demoTools, publishedTools, workflows, demoWorkflows, publishedWorkflows, categories, tags, recent, audit };
}

export async function auditEntries(userId: string, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, "settings", db);
  return db.auditLog.findMany({ select: { id: true, action: true, entityType: true, entityId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 });
}
