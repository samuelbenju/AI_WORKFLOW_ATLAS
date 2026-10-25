import { kindSchema } from "@/lib/admin-content";
import { getContent, saveContent, deleteContent } from "@/server/admin/content";
import { AccessError } from "@/server/auth/policy";
import { adminApi, privateJson, readJson, requireRequestActor } from "@/server/auth/request";

type Context = { params: Promise<{ kind: string; id: string }> };
export async function GET(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request); const params = await context.params;
    const record = await getContent(actor.id, kindSchema.parse(params.kind), params.id);
    if (!record) throw new AccessError(404, "El registro no existe.");
    return privateJson(record);
  });
}
export async function PUT(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request, "write"); const params = await context.params;
    return privateJson(await saveContent(actor.id, kindSchema.parse(params.kind), await readJson(request), params.id));
  });
}
export async function DELETE(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request, "delete"); const params = await context.params;
    return privateJson(await deleteContent(actor.id, kindSchema.parse(params.kind), params.id, await readJson(request, 4096)));
  });
}
