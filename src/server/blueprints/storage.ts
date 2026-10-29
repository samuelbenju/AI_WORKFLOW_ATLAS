import 'server-only';
import { blueprintFileSchema, type BlueprintFile } from '@/lib/blueprints';
import { LocalPrivateStorage } from './local-storage';
import { NeonObjectStorage } from './neon-storage';
export { BlueprintUnavailable, contentDigest, validateBlueprintBytes } from './validation';
export { blueprintRoot } from './local-storage';
import { BlueprintUnavailable, contentDigest } from './validation';

export interface BlueprintStorageProvider {
  read(file: BlueprintFile): Promise<Uint8Array>;
  put(file: BlueprintFile, bytes: Uint8Array): Promise<'created' | 'existing'>;
  exists(file: BlueprintFile): Promise<boolean>;
  inspect(file: BlueprintFile): Promise<{ exists: boolean; integrity: 'verified' | 'missing' }>;
  operationalInfo(): { backend: 'local' | 'neon'; persistent: boolean };
}

let cached: { fingerprint: string; provider: NeonObjectStorage } | undefined;
export function blueprintStorage(env: Record<string, string | undefined> = process.env): BlueprintStorageProvider {
  const backend = env.BLUEPRINT_STORAGE_BACKEND ?? (env.NODE_ENV === 'production' && !env.BLUEPRINT_STORAGE_ROOT ? '' : 'local');
  if (backend === 'local') return new LocalPrivateStorage(env);
  if (backend === 'neon') {
    const fingerprint = contentDigest(JSON.stringify([env.BLUEPRINT_OBJECT_ENDPOINT, env.BLUEPRINT_OBJECT_REGION, env.BLUEPRINT_OBJECT_BUCKET,
      env.BLUEPRINT_OBJECT_ACCESS_KEY_ID, env.BLUEPRINT_OBJECT_SECRET_ACCESS_KEY]));
    if (cached?.fingerprint !== fingerprint) cached = { fingerprint, provider: new NeonObjectStorage(env) };
    return cached.provider;
  }
  throw new BlueprintUnavailable();
}

export async function readBlueprintFile(file: BlueprintFile): Promise<Uint8Array> {
  blueprintFileSchema.parse(file);
  return blueprintStorage().read(file);
}
