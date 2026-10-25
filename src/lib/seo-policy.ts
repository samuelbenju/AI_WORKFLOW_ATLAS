import { parseSiteOrigin } from "./config/env";
export function indexingEnabled(env: Record<string,string|undefined> = process.env) {
  if(env.SEO_INDEXING_ENABLED !== "true" || env.CATALOG_DEMO_MODE === "true" || !env.SITE_URL) return false;
  const url = new URL(parseSiteOrigin(env.SITE_URL));
  return url.protocol === "https:" && !["localhost","127.0.0.1","[::1]"].includes(url.hostname);
}
export const privatePath = (path: string) => path === "/login" || path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/");
