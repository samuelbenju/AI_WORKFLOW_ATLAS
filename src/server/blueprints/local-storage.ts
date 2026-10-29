import 'server-only';
import { constants } from 'node:fs';
import { lstat, open, realpath, mkdir, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { blueprintFileSchema, type BlueprintFile } from '@/lib/blueprints';
import type { BlueprintStorageProvider } from './storage';
import { BlueprintUnavailable, validateBlueprintBytes } from './validation';

export function blueprintRoot(env: Record<string, string | undefined> = process.env) {
  const root = env.BLUEPRINT_STORAGE_ROOT ?? path.join(/* turbopackIgnore: true */ process.cwd(), '.private', 'blueprints');
  if (!path.isAbsolute(root)) throw new BlueprintUnavailable();
  const resolved = path.resolve(/* turbopackIgnore: true */ root), project = process.cwd();
  if (resolved === project || ['public', '.next', '.git', 'node_modules', 'src'].some(dir => {
    const forbidden = path.join(/* turbopackIgnore: true */ project, dir); return resolved === forbidden || resolved.startsWith(forbidden + path.sep);
  })) throw new BlueprintUnavailable();
  return resolved;
}

async function readLocalFile(file: BlueprintFile, root: string): Promise<Uint8Array> {
  // No client filename/path reaches the filesystem. Only content-addressed objects.
  blueprintFileSchema.parse(file);
  const directory = path.join(root, 'objects');
  const target = path.join(directory, file.sha256 + (file.format === 'json' ? '.json' : '.md'));
  for (const entry of [root, directory]) {
    const stat = await lstat(entry);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || await realpath(/* turbopackIgnore: true */ entry) !== entry) throw new BlueprintUnavailable();
  }
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size !== file.size) throw new BlueprintUnavailable();
    const bytes = new Uint8Array(file.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = await handle.read(bytes, length, bytes.length - length, length);
      if (!read.bytesRead) break;
      length += read.bytesRead;
    }
    const result = bytes.slice(0, length);
    validateBlueprintBytes(result, file);
    if (await realpath(/* turbopackIgnore: true */ directory) !== directory) throw new BlueprintUnavailable();
    return result;
  } finally { await handle.close(); }
}

const missing = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ENOENT';
export class LocalPrivateStorage implements BlueprintStorageProvider {
  private readonly root: string;
  constructor(env: Record<string, string | undefined> = process.env) { this.root = blueprintRoot(env); }
  operationalInfo() { return { backend: 'local' as const, persistent: false }; }
  read(file: BlueprintFile) { return readLocalFile(file, this.root); }
  async exists(file: BlueprintFile) {
    blueprintFileSchema.parse(file);
    const directory = path.join(this.root, 'objects');
    try {
      for (const entry of [this.root, directory]) {
        const stat = await lstat(entry);
        if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || await realpath(/* turbopackIgnore: true */ entry) !== entry) throw new BlueprintUnavailable();
      }
      const stat = await lstat(path.join(directory, file.sha256 + (file.format === 'json' ? '.json' : '.md')));
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size !== file.size) throw new BlueprintUnavailable();
      return true;
    } catch (error) { if (missing(error)) return false; throw error; }
  }
  async inspect(file: BlueprintFile) {
    try { await this.read(file); return { exists: true, integrity: 'verified' as const }; }
    catch (error) { if (missing(error)) return { exists: false, integrity: 'missing' as const }; throw error; }
  }
  async put(file: BlueprintFile, bytes: Uint8Array) {
    validateBlueprintBytes(bytes, file);
    const directory = path.join(this.root, 'objects');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    for (const entry of [this.root, directory]) {
      const stat = await lstat(entry);
      if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || await realpath(/* turbopackIgnore: true */ entry) !== entry) throw new BlueprintUnavailable();
    }
    if ((await this.inspect(file)).exists) return 'existing' as const;
    const temporary = path.join(directory, `.upload-${randomUUID()}`);
    const target = path.join(directory, file.sha256 + (file.format === 'json' ? '.json' : '.md'));
    const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    let result: 'created' | 'existing' = 'created';
    try {
      try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
      // Atomic no-replace publication of fully written bytes. Never rename over a sealed object.
      try { await link(temporary, target); }
      catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error; result = 'existing'; }
    } finally { await unlink(temporary); }
    await this.read(file);
    return result;
  }
}
