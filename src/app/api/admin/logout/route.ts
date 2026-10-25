import { cookies } from "next/headers";
import { adminApi, privateJson, requireRequestActor } from "@/server/auth/request";
import { adminConfiguration } from "@/server/auth/config";
import { revokeSession } from "@/server/auth/service";

export async function POST(request: Request) {
  return adminApi(async () => {
    const session = await requireRequestActor(request);
    const config = adminConfiguration();
    const token = (await cookies()).get(config.cookieName)?.value;
    if (token) await revokeSession(token, session.actor);
    const response = privateJson({ signedOut: true });
    response.cookies.set(config.cookieName, "", { httpOnly: true, secure: config.secure, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0) });
    return response;
  });
}
