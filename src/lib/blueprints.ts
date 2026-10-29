import { z } from 'zod';

export const blueprintId = z.string().max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const blueprintVersion = z.string().max(32).regex(/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/);
export const blueprintKey = z.object({ blueprint: blueprintId, version: blueprintVersion }).strict();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const text = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\u0000-\u001f]/.test(v));
const source = z.url().max(1000).refine(value => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash;
  } catch { return false; }
});
export const blueprintFileSchema = z.object({
    id: blueprintId, filename: z.string().max(100).regex(/^[a-z0-9][a-z0-9_-]*\.(?:json|md)$/),
    format: z.enum(['json', 'markdown']), platform: z.enum(['generic', 'n8n', 'make']),
    size: z.number().int().min(1).max(1024 * 1024), sha256,
  }).strict().refine(f => f.filename.endsWith(f.format === 'json' ? '.json' : '.md'))
    .refine(f => f.format === 'json' || f.platform === 'generic');
// Optional, editorially reviewed metadata. No defaults: legacy sealed digests stay unchanged.
export const blueprintPresentationSchema = z.object({
  architecture: z.object({ kind: z.literal('conceptual'), steps: z.array(z.object({
    title: text(120), description: text(500).optional(),
  }).strict()).min(2).max(20) }).strict().optional(),
  requirements: z.object({
    prerequisites: z.array(text(400)).max(12), accounts: z.array(text(300)).max(12),
    credentialSetup: z.array(text(300)).max(12), limitations: z.array(text(500)).max(12), externalCosts: z.array(text(400)).max(12),
    compatibility: z.object({ description: text(400), source }).strict().optional(),
  }).strict().optional(),
  setupInstructions: z.array(text(600)).min(1).max(20).optional(),
}).strict();
export const blueprintManifestSchema = z.object({
  schemaVersion: z.literal(1), id: blueprintId, version: blueprintVersion,
  useCaseSlug: z.string().max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text(200), description: text(1000),
  attribution: z.object({ credit: text(200), license: text(160), sources: z.array(source).min(1).max(10) }).strict(),
  files: z.array(blueprintFileSchema).min(1).max(10),
  presentation: blueprintPresentationSchema.optional(),
}).strict().refine(m => new Set(m.files.map(f => f.id)).size === m.files.length)
  .refine(m => new Set(m.files.map(f => f.filename)).size === m.files.length)
  .refine(m => m.files.reduce((n, f) => n + f.size, 0) <= 4 * 1024 * 1024);
export type BlueprintManifest = z.infer<typeof blueprintManifestSchema>;
export type BlueprintFile = BlueprintManifest['files'][number];
export type PublicBlueprintDescriptor = Pick<BlueprintManifest, 'id' | 'version' | 'title' | 'description' | 'useCaseSlug' | 'attribution' | 'presentation'> & {
  status: 'PUBLISHED'; publishedAt: string; verification: { method: 'static-review' | 'isolated-execution'; at: string };
  files: (BlueprintFile & { href: string })[];
};
export const reviewSchema = z.object({
  summary: text(1000), method: z.enum(['static-review', 'isolated-execution']),
  formatChecked: z.literal(true), secretsReviewed: z.literal(true), licenseReviewed: z.literal(true),
}).strict();
export const releaseSchema = z.object({
  manifest: blueprintManifestSchema, revision: z.number().int().positive(), sealed: z.boolean(),
  status: z.enum(['DRAFT', 'VERIFIED', 'PUBLISHED']),
  verification: z.object({ actorId: z.uuid(), at: z.iso.datetime(), digest: sha256,
    guideUpdatedAt: z.iso.datetime(), evidence: reviewSchema }).strict().nullable(),
  publication: z.object({ actorId: z.uuid(), at: z.iso.datetime() }).strict().nullable(),
}).strict().refine(r => r.status === 'DRAFT' ? !r.verification && !r.publication
  : r.sealed && !!r.verification && (r.status === 'PUBLISHED' ? !!r.publication : !r.publication));
export type BlueprintRelease = z.infer<typeof releaseSchema>;
export const blueprintActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), expectedRevision: z.number().int().nonnegative(), manifest: blueprintManifestSchema }).strict(),
  z.object({ action: z.literal('verify'), expectedRevision: z.number().int().positive(), evidence: reviewSchema }).strict(),
  z.object({ action: z.literal('publish'), expectedRevision: z.number().int().positive(), confirmation: z.literal('PUBLISH') }).strict(),
  z.object({ action: z.literal('withdraw'), expectedRevision: z.number().int().positive(), confirmation: z.literal('WITHDRAW') }).strict(),
]);
