import 'server-only';
import type { PrismaClient } from '@/generated/prisma/client';
import { getDatabase } from '@/server/db/client';
import { authorizedBlueprint, downloadParams, manifestDigest } from './service';
import { readBlueprintFile } from './storage';
import { prepareDownloadMeasurement } from './measurement';
type Observation = NonNullable<Awaited<ReturnType<typeof prepareDownloadMeasurement>>>;

const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; sandbox" };
let inFlight = 0;
export async function blueprintDownload(request: Request, params: unknown, db?: PrismaClient, observer?: (event: Observation) => Promise<void>) {
  const parsed = downloadParams.safeParse(params);
  const absent = () => Response.json({ error: 'Download unavailable.' }, { status: 404, headers });
  if (!parsed.success || new URL(request.url).search) return absent();
  // Disallow range/conditional responses: recheck authorization for every full transfer.
  if (request.headers.has('range')) return Response.json({ error: 'Partial downloads are not supported.' }, { status: 416, headers });
  if (inFlight >= 8) return Response.json({ error: 'Retry shortly.' }, { status: 429, headers: { ...headers, 'Retry-After': '5' } });
  inFlight++;
  try {
    const database = db ?? getDatabase();
    const { blueprint, version, file: fileId } = parsed.data;
    const release = await authorizedBlueprint(blueprint, version, database);
    const file = release?.manifest.files.find(f => f.id === fileId);
    if (!release || !file) return absent();
    const bytes = await readBlueprintFile(file);
    const current = await authorizedBlueprint(blueprint, version, database);
    if (!current || current.revision !== release.revision || manifestDigest(current.manifest) !== manifestDigest(release.manifest)) return absent();
    if (observer) try {
      const event = await prepareDownloadMeasurement(request, { blueprint, version, file: fileId, useCaseSlug: release.manifest.useCaseSlug }, database);
      if (event) await observer(event);
    } catch { console.error(JSON.stringify({ stage: 'blueprint.measurement', codes: ['OPTIONAL_OBSERVATION_UNAVAILABLE'] })); }
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': file.format === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file.filename}"`, 'Content-Length': String(bytes.length), 'Content-Digest': `sha-256=:${Buffer.from(file.sha256, 'hex').toString('base64')}:` } });
  } catch {
    console.error(JSON.stringify({ stage: 'blueprint.download', codes: ['BLUEPRINT_UNAVAILABLE'] }));
    return Response.json({ error: 'Download temporarily unavailable.' }, { status: 503, headers });
  } finally { inFlight--; }
}
