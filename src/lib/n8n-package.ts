import { z } from 'zod';

const name = z.string().min(1).max(120);
const connection = z.object({ node: name, type: z.literal('main'), index: z.number().int().min(0).max(8) }).strict();
const node = z.object({
  id: z.string().min(1).max(120), name, type: z.string().regex(/^n8n-nodes-base\.[A-Za-z][A-Za-z0-9]*$/),
  typeVersion: z.number().positive().max(100), position: z.tuple([z.number().finite(), z.number().finite()]),
  parameters: z.record(z.string(), z.unknown()), retryOnFail: z.boolean().optional(), maxTries: z.number().int().min(1).max(5).optional(),
  waitBetweenTries: z.number().int().min(0).max(60000).optional(), onError: z.enum(['stopWorkflow','continueRegularOutput','continueErrorOutput']).optional(),
  disabled: z.boolean().optional(), notes: z.string().max(4000).optional(), notesInFlow: z.boolean().optional(), webhookId: z.string().max(120).optional(),
}).strict();

// Operator-only MVP package checks; the actual n8n runtime remains the compatibility authority.
const exportSchema = z.object({
  name, active: z.literal(false), nodes: z.array(node).min(1).max(100),
  connections: z.record(name, z.object({ main: z.array(z.array(connection).max(100)).max(8) }).strict()),
  settings: z.record(z.string(), z.unknown()).optional(), staticData: z.null().optional(),
  pinData: z.record(z.string(), z.unknown()).refine(value => !Object.keys(value).length).optional(),
  tags: z.array(z.unknown()).max(0).optional(),
}).strict();

export function inspectN8nPackageExport(input: unknown) {
  const workflow = exportSchema.parse(input);
  const names = new Set(workflow.nodes.map(n => n.name)), ids = new Set(workflow.nodes.map(n => n.id));
  if (names.size !== workflow.nodes.length || ids.size !== workflow.nodes.length) throw Error('N8N_IDENTITIES_NOT_UNIQUE');
  let edges = 0;
  for (const [source, ports] of Object.entries(workflow.connections)) {
    if (!names.has(source)) throw Error('N8N_CONNECTION_SOURCE_INVALID');
    for (const outputs of ports.main) for (const target of outputs) {
      if (!names.has(target.node) || ++edges > 500) throw Error('N8N_CONNECTION_TARGET_INVALID');
    }
  }
  const webhooks = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
  if (webhooks.some(n => !['headerAuth','basicAuth','jwtAuth'].includes(String(n.parameters.authentication)))) throw Error('N8N_WEBHOOK_AUTH_REQUIRED');
  return { nodes: workflow.nodes.length, edges, declaredTypes: [...new Set(workflow.nodes.map(n => `${n.type}@${n.typeVersion}`))].sort(),
    active: false as const, runtimeImportVerified: false as const };
}
