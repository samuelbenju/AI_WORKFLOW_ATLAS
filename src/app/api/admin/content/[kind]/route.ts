import { kindSchema, adminListQuery } from "@/lib/admin-content";
import { listContent, saveContent } from "@/server/admin/content";
import { adminApi, privateJson, readJson, requireRequestActor } from "@/server/auth/request";

type Context = { params: Promise<{ kind: string }> };
export async function GET(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request);
    const kind = kindSchema.parse((await context.params).kind);
    const query = adminListQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    return privateJson(await listContent(actor.id, kind, query));
  });
}
export async function POST(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request, "write");
    return privateJson(await saveContent(actor.id, kindSchema.parse((await context.params).kind), await readJson(request)), 201);
  });
}
