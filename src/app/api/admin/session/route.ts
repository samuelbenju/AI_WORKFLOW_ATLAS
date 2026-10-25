import { adminApi, privateJson, requireRequestActor } from "@/server/auth/request";
export async function GET(request: Request) {
  return adminApi(async () => {
    const session = await requireRequestActor(request);
    return privateJson({ user: session.actor, csrfToken: session.csrfToken, expiresAt: session.expiresAt.toISOString() });
  });
}
