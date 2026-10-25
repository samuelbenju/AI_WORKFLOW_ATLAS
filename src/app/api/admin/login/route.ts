import { cookies } from "next/headers";
import { z } from "zod";
import { adminApi, checkOrigin, privateJson, readJson } from "@/server/auth/request";
import { authenticate } from "@/server/auth/service";
import { adminConfiguration } from "@/server/auth/config";

export async function POST(request: Request) {
  return adminApi(async () => {
    checkOrigin(request);
    const input = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(320)), password: z.string().min(1).max(128) }).strict().parse(await readJson(request, 4096));
    const config = adminConfiguration();
    const previous = (await cookies()).get(config.cookieName)?.value;
    const result = await authenticate(input.email, input.password, previous);
    const response = privateJson({ signedIn: true });
    response.cookies.set(config.cookieName, result.token, { httpOnly: true, secure: config.secure, sameSite: "lax", path: "/", maxAge: config.maxAge, expires: result.expiresAt, priority: "high" });
    return response;
  });
}
