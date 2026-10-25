import { z } from "zod";

const filterSlug = z.string().max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: filterSlug.optional(),
  tag: filterSlug.optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  sort: z.enum(["recent", "name", "name-desc"]).default("recent"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogSearchParams = Record<string, string | string[] | undefined>;
export const CATALOG_PAGE_SIZE = 6;

export function parseCatalogQuery(params: CatalogSearchParams) {
  const fields = ["q", "category", "tag", "difficulty", "sort", "page"] as const;
  return catalogQuerySchema.safeParse(Object.fromEntries(fields.map((key) => [key, params[key] === "" ? undefined : params[key]]).filter(([, value]) => value !== undefined)));
}

export function catalogHref(path: "/tools" | "/use-cases", query: Partial<CatalogQuery>, changes: Partial<CatalogQuery> = {}) {
  const merged = { ...query, ...changes };
  const params = new URLSearchParams();
  for (const key of ["q", "category", "tag", "difficulty", "sort", "page"] as const) {
    const value = merged[key];
    if (value !== undefined && value !== "" && !(key === "page" && value === 1) && !(key === "sort" && value === "recent")) params.set(key, String(value));
  }
  return `${path}${params.size ? `?${params.toString()}` : ""}`;
}
