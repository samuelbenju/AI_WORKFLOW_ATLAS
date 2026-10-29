import { blueprintDownload } from '@/server/blueprints/download';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ blueprint: string; version: string; file: string }> };
export async function GET(request: Request, context: Context) {
  return blueprintDownload(request, await context.params);
}
export function HEAD() {
  return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
