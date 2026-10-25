import { readAdminSettings, saveAdminSettings } from "@/server/admin/content";
import { adminApi, privateJson, readJson, requireRequestActor } from "@/server/auth/request";

export async function GET(request: Request) {
  return adminApi(async () => { const { actor } = await requireRequestActor(request, "settings"); return privateJson(await readAdminSettings(actor.id)); });
}
export async function PUT(request: Request) {
  return adminApi(async () => { const { actor } = await requireRequestActor(request, "settings"); return privateJson(await saveAdminSettings(actor.id, await readJson(request, 12000))); });
}
