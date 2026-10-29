import 'server-only';
import type { PrismaClient } from '@/generated/prisma/client';
import { getDatabase } from '@/server/db/client';
import { consentVersion } from '@/lib/growth';
import { trackingContext, digest } from '@/server/growth/tracking';

// Preparation only. The existing AnalyticsEvent SQL CHECK excludes downloads.
// Never relabel them PAGE_VIEW/AFFILIATE_CLICK or write around that constraint.
export async function prepareDownloadMeasurement(request: Request, download: { blueprint: string; version: string; file: string; useCaseSlug: string }, db: PrismaClient = getDatabase()) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return null;
  const context = trackingContext(request);
  if (!context || context.path !== `/use-cases/${download.useCaseSlug}`) return null;
  const session = await db.analyticsSession.findUnique({ where: { tokenHash: digest(context.token) }, select: { id: true, expiresAt: true, consentVersion: true } });
  if (!session || session.expiresAt <= new Date() || session.consentVersion !== consentVersion) return null;
  return { kind: 'BLUEPRINT_DOWNLOAD_REQUEST' as const, path: context.path,
    deduplicationKey: digest(JSON.stringify([session.id, download.blueprint, download.version, download.file])),
    persistence: 'NOT_ENABLED' as const };
}
