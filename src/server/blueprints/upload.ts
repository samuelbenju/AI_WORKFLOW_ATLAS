import 'server-only';
import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@/generated/prisma/client';
import { authorizeActor } from '@/server/admin/content';
import { AccessError } from '@/server/auth/policy';
import { blueprintKey, blueprintId } from '@/lib/blueprints';
import { readRelease, manifestDigest } from './service';
import { blueprintStorage, type BlueprintStorageProvider } from './storage';
import { BlueprintUnavailable, validateBlueprintBytes } from './validation';

export async function uploadBlueprintFile(userId: string, key: { blueprint: string; version: string }, fileId: string,
  source: string, db: PrismaClient, provider: BlueprintStorageProvider = blueprintStorage()) {
  blueprintKey.parse(key); blueprintId.parse(fileId);
  await authorizeActor(userId, 'publish', db);
  const release = await readRelease(key.blueprint, key.version, db);
  if (!release || release.status !== 'DRAFT' || release.sealed) throw new AccessError(409, 'Carga permitida solo para un borrador sin sellar.');
  const file = release.manifest.files.find(f => f.id === fileId);
  if (!file || !path.isAbsolute(source) || await realpath(source) !== source) throw new BlueprintUnavailable();
  const handle = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let bytes: Uint8Array;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size !== file.size) throw new BlueprintUnavailable();
    const buffer = new Uint8Array(file.size + 1);
    let size = 0;
    while (size < buffer.length) { const part = await handle.read(buffer, size, buffer.length - size, size); if (!part.bytesRead) break; size += part.bytesRead; }
    bytes = buffer.slice(0, size);
    validateBlueprintBytes(bytes, file);
  } finally { await handle.close(); }
  await authorizeActor(userId, 'publish', db);
  const outcome = await provider.put(file, bytes);
  // Storage is separate from SQL. Failed/revoked audit leaves a private orphan, never a publication.
  await db.$transaction(async tx => {
    await authorizeActor(userId, 'publish', tx);
    const current = await readRelease(key.blueprint, key.version, tx);
    if (!current || current.revision !== release.revision || manifestDigest(current.manifest) !== manifestDigest(release.manifest)) throw new AccessError(409, 'El borrador cambió.');
    await tx.auditLog.create({ data: { actorId: userId, action: 'blueprint.object.store', entityType: 'BlueprintRelease',
      entityId: `${key.blueprint}@${key.version}`, metadata: { sha256: file.sha256, size: file.size, outcome, backend: provider.operationalInfo().backend } } });
  });
  return { stored: true as const, integrity: 'verified' as const, outcome };
}
