import { parseSiteOrigin } from "./config/env";
import { legalConfiguration } from "./legal";
export function indexingEnabled(env: Record<string,string|undefined> = process.env) {
  // These are operator attestations, never inferred from a build or a seed.
  if(env.SEO_INDEXING_ENABLED !== "true" || env.PUBLIC_LAUNCH_CONFIRMED !== "true" || !legalConfiguration(env).reviewed || env.CATALOG_DEMO_MODE === "true" || !env.SITE_URL) return false;
  const url = new URL(parseSiteOrigin(env.SITE_URL));
  return url.protocol === "https:" && !["localhost","127.0.0.1","[::1]"].includes(url.hostname);
}
export const privatePath = (path: string) => path.startsWith("/newsletter/confirm") || path.startsWith("/newsletter/unsubscribe") || path.startsWith("/payments/") || path === "/login" || path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/");

// Only real directory pagination is a candidate for indexing. A page query on
// a detail/about URL does not create another public document.
export function indexableQuery(path:string,params:URLSearchParams){
  if(!params.size)return true;
  if(!['/tools','/use-cases','/blog'].includes(path)||[...params.keys()].some(key=>key!=='page'))return false;
  const values=params.getAll('page');
  return values.length===1&&/^\d+$/.test(values[0]!)&&Number(values[0])>=1&&Number(values[0])<=10000;
}
