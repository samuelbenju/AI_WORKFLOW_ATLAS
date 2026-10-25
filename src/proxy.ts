import { NextResponse,type NextRequest } from "next/server";
import { indexingEnabled,privatePath } from "@/lib/seo-policy";
export function proxy(request:NextRequest) {
  const response=NextResponse.next();
  if(privatePath(request.nextUrl.pathname)||!indexingEnabled())response.headers.set("X-Robots-Tag","noindex, nofollow");
  else if([...request.nextUrl.searchParams.keys()].some(key=>key!=="page"))response.headers.set("X-Robots-Tag","noindex, follow");
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|editorial/).*)"]};
