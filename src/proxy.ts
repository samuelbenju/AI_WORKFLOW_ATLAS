import { NextResponse,type NextRequest } from "next/server";
import { indexingEnabled,privatePath } from "@/lib/seo-policy";
import { catalogEntryExists } from "@/server/data/public-catalog";
export async function proxy(request:NextRequest) {
  const match=request.nextUrl.pathname.match(/^\/(tools|use-cases|blog)\/([^/]+)$/);
  const missing=!!match&&!await catalogEntryExists(match[1] as "tools"|"use-cases"|"blog",match[2]!);
  // /404 uses the existing global not-found view. This runs before a loading
  // fallback can commit HTTP 200. DB failures still throw a sanitized error.
  const response=missing?NextResponse.rewrite(new URL('/404',request.url),{status:404}):NextResponse.next();
  if(missing)response.headers.set("X-Robots-Tag","noindex, nofollow");
  if(privatePath(request.nextUrl.pathname)||!indexingEnabled())response.headers.set("X-Robots-Tag","noindex, nofollow");
  else if([...request.nextUrl.searchParams.keys()].some(key=>key!=="page"))response.headers.set("X-Robots-Tag","noindex, follow");
  if(request.nextUrl.pathname.startsWith("/payments/")||request.nextUrl.pathname.startsWith("/newsletter/confirm")||request.nextUrl.pathname.startsWith("/newsletter/unsubscribe")){response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");}
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|editorial/).*)"]};
