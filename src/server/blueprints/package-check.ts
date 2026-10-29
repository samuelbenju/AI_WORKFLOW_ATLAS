import 'server-only';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { blueprintManifestSchema } from '@/lib/blueprints';
import { inspectN8nPackageExport } from '@/lib/n8n-package';
import { BlueprintUnavailable, contentDigest, validateBlueprintBytes } from './validation';
import { blueprintRoot } from './local-storage';

async function readPrivateFile(filename: string, maxSize: number) {
  const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size < 1 || stat.size > maxSize) throw new BlueprintUnavailable();
    const bytes = new Uint8Array(stat.size + 1); let size = 0;
    while (size < bytes.length) { const r = await handle.read(bytes,size,bytes.length-size,size); if (!r.bytesRead) break; size += r.bytesRead; }
    if (size !== stat.size) throw new BlueprintUnavailable();
    return bytes.slice(0,size);
  } finally { await handle.close(); }
}

export async function checkBlueprintPackage(directory: string) {
  const root = blueprintRoot({ BLUEPRINT_STORAGE_ROOT: directory });
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || await realpath(root) !== root) throw new BlueprintUnavailable();
  const raw = await readPrivateFile(path.join(root,'manifest.json'),65536);
  const manifest = blueprintManifestSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)));
  const expected = ['manifest.json',...manifest.files.map(f => f.filename)].sort();
  if (JSON.stringify((await readdir(root)).sort()) !== JSON.stringify(expected)) throw new BlueprintUnavailable();
  const files = [];
  for (const file of manifest.files) {
    const bytes = await readPrivateFile(path.join(root,file.filename),1048576);
    validateBlueprintBytes(bytes,file);
    const native = file.platform === 'n8n' ? inspectN8nPackageExport(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))) : undefined;
    files.push({ id:file.id, filename:file.filename, size:file.size, sha256:file.sha256, ...(native ? { native } : {}) });
  }
  return { blueprint:manifest.id, version:manifest.version, useCaseSlug:manifest.useCaseSlug, manifestSha256:contentDigest(raw),
    files, publication:'NOT_AUTHORIZED' as const, runtimeImportVerified:false as const };
}
