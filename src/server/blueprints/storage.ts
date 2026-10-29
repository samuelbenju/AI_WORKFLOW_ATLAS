import 'server-only';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import type { BlueprintFile } from '@/lib/blueprints';

export class BlueprintUnavailable extends Error {}
export const contentDigest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const placeholder = /^__CONFIGURE_[A-Z0-9_]+__$/;
const secretKey = /^(?:credentials?|password|passwd|secret|client[_-]?secret|(?:x[-_])?api[_-]?key|(?:api[_-]?|access[_-]?|refresh[_-]?)?token|authorization|cookie|private[_-]?key)$/i;

// Defense in depth, not a replacement for the mandatory human secrets review.
export function validateBlueprintBytes(bytes: Uint8Array, file: BlueprintFile) {
  if (bytes.byteLength !== file.size || contentDigest(bytes) !== file.sha256) throw new BlueprintUnavailable();
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new BlueprintUnavailable(); }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/.test(text)
    || /(?:password|secret|api[_-]?key|authorization|access[_-]?token)\s*[=:]\s*["']?(?!__CONFIGURE_)[A-Za-z0-9_/-]{8,}/i.test(text)
    || /\bBearer\s+(?!__CONFIGURE_)[A-Za-z0-9._-]{8,}/i.test(text)) throw new BlueprintUnavailable();
  for (const match of text.matchAll(/(?:https?|postgres(?:ql)?):\/\/[^\s"'<>\\]+/gi)) {
    try {
      const url = new URL(match[0]);
      if (url.username || url.password || [...url.searchParams].some(([key, value]) => secretKey.test(key) && value && !placeholder.test(value))) throw new BlueprintUnavailable();
    } catch { throw new BlueprintUnavailable(); }
  }
  if (file.format === 'markdown') {
    if (/<\/?[a-z!]|javascript\s*:|data\s*:|!\[/i.test(text)) throw new BlueprintUnavailable();
    return;
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new BlueprintUnavailable(); }
  let nodes = 0;
  function visit(v: unknown, depth: number) {
    if (++nodes > 30000 || depth > 30) throw new BlueprintUnavailable();
    if (Array.isArray(v)) return v.forEach(item => visit(item, depth + 1));
    if (v && typeof v === 'object') for (const [key, item] of Object.entries(v)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new BlueprintUnavailable();
      if (secretKey.test(key) && item !== null && item !== '' && !(typeof item === 'string' && placeholder.test(item))
        && !(typeof item === 'object' && Object.keys(item).length === 0)) throw new BlueprintUnavailable();
      visit(item, depth + 1);
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const fields = v as Record<string, unknown>;
      if (typeof fields.name === 'string' && secretKey.test(fields.name) && fields.value !== undefined && fields.value !== null && fields.value !== ''
        && !(typeof fields.value === 'string' && placeholder.test(fields.value))) throw new BlueprintUnavailable();
    }
  }
  visit(value, 0);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BlueprintUnavailable();
  const obj = value as Record<string, unknown>;
  if (file.platform === 'n8n' && (!Array.isArray(obj.nodes) || !obj.connections || typeof obj.connections !== 'object' || Array.isArray(obj.connections))) throw new BlueprintUnavailable();
  if (file.platform === 'make' && (!Array.isArray(obj.flow) || !obj.metadata || typeof obj.metadata !== 'object' || Array.isArray(obj.metadata))) throw new BlueprintUnavailable();
}

export function blueprintRoot() {
  const root = process.env.BLUEPRINT_STORAGE_ROOT ?? path.join(process.cwd(), '.private', 'blueprints');
  if (!path.isAbsolute(root)) throw new BlueprintUnavailable();
  const resolved = path.resolve(root), project = process.cwd();
  if (resolved === project || ['public', '.next', '.git', 'node_modules', 'src'].some(dir => {
    const forbidden = path.join(project, dir); return resolved === forbidden || resolved.startsWith(forbidden + path.sep);
  })) throw new BlueprintUnavailable();
  return resolved;
}

export async function readBlueprintFile(file: BlueprintFile): Promise<Uint8Array> {
  // No client filename/path reaches the filesystem. Only content-addressed objects.
  const root = blueprintRoot(), directory = path.join(root, 'objects');
  const target = path.join(directory, file.sha256 + (file.format === 'json' ? '.json' : '.md'));
  for (const entry of [root, directory]) {
    const stat = await lstat(entry);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || await realpath(entry) !== entry) throw new BlueprintUnavailable();
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
    if (await realpath(directory) !== directory) throw new BlueprintUnavailable();
    return result;
  } finally { await handle.close(); }
}
