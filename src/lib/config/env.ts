import { z } from "zod";

const siteOriginSchema = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      && !url.username && !url.password
      && url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}, "SITE_URL must be an HTTP(S) origin without credentials, path, query or fragment.");

export function parseSiteOrigin(value: string | undefined): string {
  const result = siteOriginSchema.safeParse(value ?? "http://localhost:3000");
  if (!result.success) {
    // Do not reflect potentially sensitive configuration values in build logs.
    throw new Error("Invalid SITE_URL. Set an HTTP(S) origin without credentials, path, query or fragment.");
  }
  return new URL(result.data).origin;
}
