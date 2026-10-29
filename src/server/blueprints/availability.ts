import 'server-only';
import type { BlueprintFile } from '@/lib/blueprints';
import { blueprintStorage, type BlueprintStorageProvider } from './storage';

export type FileAvailability = 'available' | 'missing' | 'unavailable';
// Metadata-only checks for the selected release, never the full file on a page view.
export async function blueprintAvailability(files: BlueprintFile[], storage?: BlueprintStorageProvider) {
  const result: Record<string, FileAvailability> = {};
  let provider: BlueprintStorageProvider;
  try { provider = storage ?? blueprintStorage(); }
  catch { for (const file of files) result[file.id] = 'unavailable'; return result; }
  for (let offset = 0; offset < files.length; offset += 4) {
    await Promise.all(files.slice(offset, offset + 4).map(async file => {
      // Public descriptors also carry href. Never pass that URL into the strict storage contract.
      const { id, filename, format, platform, size, sha256 } = file;
      try { result[file.id] = await provider.exists({ id, filename, format, platform, size, sha256 }) ? 'available' : 'missing'; }
      catch { result[file.id] = 'unavailable'; }
    }));
  }
  if (Object.values(result).includes('unavailable')) console.error(JSON.stringify({ stage: 'blueprint.availability', codes: ['STORAGE_METADATA_UNAVAILABLE'] }));
  return result;
}
