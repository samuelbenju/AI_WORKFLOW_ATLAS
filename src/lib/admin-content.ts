import { z } from "zod";

export const kindSchema = z.enum(["tools", "categories", "use-cases", "tags"]);
export type ContentKind = z.infer<typeof kindSchema>;
export const contentLabels = {
  tools: { plural: "Herramientas", singular: "Herramienta" },
  categories: { plural: "Categorías", singular: "Categoría" },
  "use-cases": { plural: "Casos de uso", singular: "Caso de uso" },
  tags: { plural: "Etiquetas", singular: "Etiqueta" },
} as const;
export const statusLabels = { DRAFT: "Borrador", IN_REVIEW: "En revisión", PUBLISHED: "Publicado", ARCHIVED: "Archivado" } as const;
const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones.");
const name = z.string().trim().min(1, "El nombre es obligatorio.").max(160);
const ids = z.array(z.uuid()).max(30);
const link = z.url().max(2048).refine((value) => {
  try { const parsed = new URL(value); return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { return false; }
}, "Usa una URL HTTP(S) sin credenciales.");
const publication = {
  status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.iso.datetime().nullable().default(null),
  isDemo: z.boolean().default(false), featured: z.boolean().default(false),
};
export const taxonomySchema = z.object({ name: name.max(100), slug }).strict();
export const categorySchema = z.object({ name: name.max(120), slug, description: z.string().max(10000).default("") }).strict();
export const toolSchema = z.object({ name, slug, summary: z.string().trim().min(1).max(500), description: z.string().trim().min(1).max(30000), websiteUrl: link,
  categoryIds: ids.max(20), tagIds: ids, ...publication }).strict().refine((value) => !(value.isDemo && value.status === "PUBLISHED"), { message: "Los ejemplos de desarrollo no se publican.", path: ["status"] });
export const useCaseSchema = z.object({ name: name.max(200), slug, problem: z.string().trim().min(1).max(10000), solution: z.string().trim().min(1).max(10000), limitations: z.string().trim().min(1).max(10000),
  instructions: z.array(z.object({ step: z.number().int().positive(), text: z.string().trim().min(1).max(2000) }).strict()).min(1).max(30),
  references: z.array(z.object({ url: link, note: z.string().max(500).optional() }).strict()).max(30),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]), categoryIds: ids.max(20), tagIds: ids, toolIds: ids,
  ...publication }).strict().refine((value) => !(value.isDemo && value.status === "PUBLISHED"), { message: "Los ejemplos de desarrollo no se publican.", path: ["status"] });
export const settingsSchema = z.object({ editorialGuidelines: z.string().max(5000), defaultStatus: z.enum(["DRAFT", "IN_REVIEW"]) }).strict();
export const defaultSettings = { editorialGuidelines: "Comprueba fuentes, limitaciones y enlaces. Los ejemplos deben seguir identificados como tales. Publica únicamente contenido revisado.", defaultStatus: "DRAFT" as const };
export const adminListQuery = z.object({ q: z.string().trim().max(100).default(""), page: z.coerce.number().int().min(1).max(10000).default(1), status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]).optional() });
export type AdminListQuery = z.infer<typeof adminListQuery>;
export type ContentFormData = {
  name: string; slug: string; description?: string; summary?: string; websiteUrl?: string;
  problem?: string; solution?: string; limitations?: string; instructions?: { step: number; text: string }[]; references?: { url: string; note?: string }[];
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; status?: keyof typeof statusLabels; publishedAt?: string | null;
  featured?: boolean; isDemo?: boolean; categoryIds?: string[]; tagIds?: string[]; toolIds?: string[];
};
