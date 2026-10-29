import 'server-only';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { blueprintFileSchema, type BlueprintFile } from '@/lib/blueprints';

export class BlueprintUnavailable extends Error {}
export const contentDigest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const placeholder = /^__CONFIGURE_[A-Z0-9_]+__$/;
const secretKey = /^(?:credentials?|password|passwd|secret|(?:aws[_-]?|s3[_-]?)?(?:secret[_-]?access[_-]?key|access[_-]?key[_-]?id)|client[_-]?secret|(?:x[-_])?api[_-]?key|(?:api[_-]?|access[_-]?|refresh[_-]?)?token|authorization|cookie|private[_-]?key)$/i;

function assertSafeText(text: string) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:n(?:sk|ak|t)_live_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/.test(text)
    || /(?:password|secret|api[_-]?key|authorization|access[_-]?token)\s*[=:]\s*["']?(?!__CONFIGURE_)[A-Za-z0-9_/-]{8,}/i.test(text)
    || /\bBearer\s+(?!__CONFIGURE_)[A-Za-z0-9._-]{8,}/i.test(text)) throw new BlueprintUnavailable();
  for (const match of text.matchAll(/(?:https?|postgres(?:ql)?):\/\/[^\s"'<>\\]+/gi)) {
    try {
      const url = new URL(match[0]);
      if (url.username || url.password || [...url.searchParams].some(([key, value]) => secretKey.test(key) && value && !placeholder.test(value))) throw new BlueprintUnavailable();
    } catch { throw new BlueprintUnavailable(); }
  }
}

// Defense in depth, not a replacement for the mandatory human secrets review.
export function validateBlueprintBytes(bytes: Uint8Array, file: BlueprintFile) {
  blueprintFileSchema.parse(file);
  if (bytes.byteLength !== file.size || contentDigest(bytes) !== file.sha256) throw new BlueprintUnavailable();
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new BlueprintUnavailable(); }
  assertSafeText(text);
  if (file.format === 'markdown') {
    if (/<\/?[a-z!]|javascript\s*:|data\s*:|!\[/i.test(text)) throw new BlueprintUnavailable();
    return;
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new BlueprintUnavailable(); }
  let nodes = 0;
  function visit(v: unknown, depth: number) {
    if (++nodes > 30000 || depth > 30) throw new BlueprintUnavailable();
    if (typeof v === 'string') { assertSafeText(v); return; }
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

