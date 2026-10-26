import type { MetadataRoute } from "next";
import { indexingEnabled } from "@/lib/seo-policy";
import { absoluteUrl } from "@/lib/seo";
export const dynamic="force-dynamic";
export default function robots():MetadataRoute.Robots {
  return indexingEnabled()?{rules:{userAgent:"*",allow:"/",disallow:["/admin","/api/","/login","/payments/","/newsletter/confirm","/newsletter/unsubscribe"]},sitemap:absoluteUrl("/sitemap.xml")}:{rules:{userAgent:"*",disallow:"/"}};
}
