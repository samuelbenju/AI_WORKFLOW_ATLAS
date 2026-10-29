import 'server-only';
import { z } from 'zod';
import type { PrismaClient } from '@/generated/prisma/client';
import { getDatabase } from '@/server/db/client';
import { authorizeActor } from '@/server/admin/content';
import { AccessError } from '@/server/auth/policy';
import { blueprintActionSchema, blueprintKey, releaseSchema, type BlueprintManifest, type BlueprintRelease } from '@/lib/blueprints';
import { contentDigest, readBlueprintFile, validateBlueprintBytes } from './storage';

const settingKey = (id: string, version: string) => `blueprint.release.${id}@${version}`;
export const manifestDigest = (manifest: BlueprintManifest) => contentDigest(JSON.stringify(manifest));
const publicGuide = (slug: string) => ({ slug, status: 'PUBLISHED' as const, isDemo: false, publishedAt: { lte: new Date() } });
async function validateFiles(manifest: BlueprintManifest) {
  for (const file of manifest.files) await readBlueprintFile(file);
}

export async function readRelease(id: string, version: string, db: Pick<PrismaClient, 'siteSetting'> = getDatabase()) {
  blueprintKey.parse({ blueprint: id, version });
  const row = await db.siteSetting.findUnique({ where: { key: settingKey(id, version) } });
  if (!row) return null;
  const release = releaseSchema.parse(row.value);
  if (release.manifest.id !== id || release.manifest.version !== version) throw new Error('BLUEPRINT_REGISTRY_INVALID');
  return release;
}

export async function adminBlueprint(userId: string, id: string, version: string, db: PrismaClient = getDatabase()) {
  await authorizeActor(userId, 'write', db);
  return readRelease(id, version, db);
}

export async function changeBlueprint(userId: string, id: string, version: string, input: unknown, db: PrismaClient = getDatabase()) {
  blueprintKey.parse({ blueprint: id, version });
  const data = blueprintActionSchema.parse(input);
  const permission = data.action === 'publish' || data.action === 'withdraw' ? 'publish' : 'write';
  await authorizeActor(userId, permission, db);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${settingKey(id, version)}))`;
    await authorizeActor(userId, permission, tx);
    const previous = await readRelease(id, version, tx);
    if ((previous?.revision ?? 0) !== data.expectedRevision) throw new AccessError(409, 'La versión cambió; recarga el manifiesto.');
    let release: BlueprintRelease;
    if (data.action === 'save') {
      if (data.manifest.id !== id || data.manifest.version !== version) throw new AccessError(422, 'Identidad de versión inconsistente.');
      if (previous?.sealed) throw new AccessError(409, 'Una versión verificada es inmutable; crea otra versión.');
      if (!await tx.useCase.findUnique({ where: { slug: data.manifest.useCaseSlug }, select: { id: true } })) throw new AccessError(422, 'La guía no existe.');
      const bytes = Buffer.from(JSON.stringify(data.manifest));
      validateBlueprintBytes(bytes, { id: 'manifest', filename: 'manifest.json', platform: 'generic', format: 'json', size: bytes.length, sha256: contentDigest(bytes) });
      release = { manifest: data.manifest, status: 'DRAFT', revision: data.expectedRevision + 1, sealed: false, verification: null, publication: null };
    } else {
      if (!previous) throw new AccessError(404, 'Versión no disponible.');
      release = { ...previous, revision: previous.revision + 1 };
      if (data.action === 'withdraw') {
        if (previous.status === 'DRAFT') throw new AccessError(409, 'La versión ya está retirada.');
        release = { ...release, status: 'DRAFT', verification: null, publication: null };
      } else {
        await validateFiles(release.manifest);
        const guide = await tx.useCase.findUnique({ where: { slug: release.manifest.useCaseSlug }, select: { updatedAt: true, isDemo: true } });
        if (!guide || guide.isDemo) throw new AccessError(422, 'La guía no es elegible.');
        if (data.action === 'verify') {
          if (previous.status !== 'DRAFT') throw new AccessError(409, 'Solo se verifican borradores.');
          release = { ...release, sealed: true, status: 'VERIFIED', verification: { actorId: userId, at: new Date().toISOString(), digest: manifestDigest(release.manifest), guideUpdatedAt: guide.updatedAt.toISOString(), evidence: data.evidence }, publication: null };
        } else {
          if (previous.status !== 'VERIFIED' || !previous.verification || previous.verification.digest !== manifestDigest(release.manifest)
            || previous.verification.guideUpdatedAt !== guide.updatedAt.toISOString()) throw new AccessError(409, 'La revisión ya no es vigente.');
          if (!await tx.useCase.findFirst({ where: publicGuide(release.manifest.useCaseSlug), select: { id: true } })) throw new AccessError(422, 'La guía debe estar publicada y vigente.');
          release = { ...release, status: 'PUBLISHED', publication: { actorId: userId, at: new Date().toISOString() } };
        }
      }
    }
    await authorizeActor(userId, permission, tx);
    const value = releaseSchema.parse(release);
    await tx.siteSetting.upsert({ where: { key: settingKey(id, version) }, create: { key: settingKey(id, version), value }, update: { value } });
    await tx.auditLog.create({ data: { actorId: userId, action: `blueprint.${data.action}`, entityType: 'BlueprintRelease', entityId: `${id}@${version}`, metadata: { revision: value.revision, digest: manifestDigest(value.manifest), status: value.status } } });
    return value;
  }, { timeout: 10000 });
}

export async function authorizedBlueprint(id: string, version: string, db: PrismaClient = getDatabase()) {
  const release = await readRelease(id, version, db);
  if (!release || release.status !== 'PUBLISHED' || !release.verification || !release.publication) return null;
  const now = new Date();
  if (new Date(release.verification.at) > now || new Date(release.publication.at) > now || release.verification.digest !== manifestDigest(release.manifest)) return null;
  const guide = await db.useCase.findFirst({ where: publicGuide(release.manifest.useCaseSlug), select: { updatedAt: true } });
  return guide?.updatedAt.toISOString() === release.verification.guideUpdatedAt ? release : null;
}

// Contract for the next UI phase: no filesystem paths, reviewer identity or draft data.
export async function publicBlueprintDescriptor(id: string, version: string, db: PrismaClient = getDatabase()) {
  const release = await authorizedBlueprint(id, version, db);
  if (!release) return null;
  const m = release.manifest;
  return { id, version, status: 'PUBLISHED' as const, publishedAt: release.publication!.at,
    verification: { method: release.verification!.evidence.method, at: release.verification!.at },
    useCaseSlug: m.useCaseSlug, title: m.title, description: m.description, attribution: m.attribution,
    files: m.files.map(f => ({ id: f.id, filename: f.filename, format: f.format, platform: f.platform, size: f.size, sha256: f.sha256,
      href: `/api/blueprints/${id}/${version}/${f.id}` })) };
}

export const downloadParams = blueprintKey.extend({ file: z.string().max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });
