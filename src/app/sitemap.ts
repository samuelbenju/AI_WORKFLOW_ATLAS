import { indexingEnabled } from "@/lib/seo-policy";
import { site } from "@/lib/config/site";
import { sitemapEntries } from "@/server/editorial/sitemap";
export const dynamic="force-dynamic";
export default async function sitemap() {return indexingEnabled()?sitemapEntries(site.origin):[];}
