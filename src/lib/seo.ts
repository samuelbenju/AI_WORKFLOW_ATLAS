import "server-only";
import type { Metadata } from "next";
import { site } from "./config/site";
import { indexingEnabled } from "./seo-policy";
import { coverPath } from "./editorial";
export const absoluteUrl = (path: string) => new URL(path,site.origin).href;
export function publicMetadata(title: string, description: string, path: string, options: { noindex?: boolean; image?: string } = {}): Metadata {
  return { title,description,alternates:{canonical:absoluteUrl(path)},robots:{index:indexingEnabled() && !options.noindex,follow:true},
    openGraph:{title,description,url:absoluteUrl(path),siteName:site.name,type:"website",locale:"en_US",images:[{url:absoluteUrl(options.image ?? coverPath("workflow")),width:1200,height:630,alt:title}]},
    twitter:{card:"summary_large_image",title,description,images:[absoluteUrl(options.image ?? coverPath("workflow"))]},
  };
}
