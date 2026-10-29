import { adminApi, privateJson, readJson, requireRequestActor } from '@/server/auth/request';
import { adminBlueprint, changeBlueprint } from '@/server/blueprints/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ blueprint: string; version: string }> };
export async function GET(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request, 'write');
    const { blueprint, version } = await context.params;
    return privateJson(await adminBlueprint(actor.id, blueprint, version));
  });
}
export async function POST(request: Request, context: Context) {
  return adminApi(async () => {
    const { actor } = await requireRequestActor(request, 'write');
    const { blueprint, version } = await context.params;
    return privateJson(await changeBlueprint(actor.id, blueprint, version, await readJson(request, 64000)));
  });
}
