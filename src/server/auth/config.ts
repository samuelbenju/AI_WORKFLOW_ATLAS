import { parseSiteOrigin } from "@/lib/config/env";

export function adminConfiguration(value = process.env.ADMIN_ORIGIN ?? process.env.SITE_URL) {
  const origin = parseSiteOrigin(value);
  const url = new URL(origin);
  const secure = url.protocol === "https:";
  if (!secure && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Administration requires HTTPS, except on loopback development origins.");
  return { origin, secure, cookieName: secure ? "__Host-atlas_session" : "atlas_session", maxAge: 8 * 60 * 60 };
}
