import 'server-only';
import { S3Client, GetBucketAclCommand, GetBucketPolicyCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, type S3ClientConfig } from '@aws-sdk/client-s3';
import { blueprintFileSchema, type BlueprintFile } from '@/lib/blueprints';
import type { BlueprintStorageProvider } from './storage';
import { BlueprintUnavailable, validateBlueprintBytes } from './validation';

const regions = ['us-east-1', 'us-east-2', 'eu-central-1', 'ap-southeast-1'];
export function neonStorageConfiguration(env: Record<string, string | undefined>) {
  try {
    const endpoint = new URL(env.BLUEPRINT_OBJECT_ENDPOINT ?? '');
    const region = env.BLUEPRINT_OBJECT_REGION ?? '';
    // Operator-only endpoint, constrained to Neon's documented branch storage hosts.
    if (!regions.includes(region) || endpoint.protocol !== 'https:' || endpoint.port || endpoint.username || endpoint.password
      || endpoint.pathname !== '/' || endpoint.search || endpoint.hash
      || !new RegExp(`^br-[a-z0-9-]+\\.storage\\.c-[0-9]+\\.${region}\\.aws\\.neon\\.tech$`).test(endpoint.hostname)) throw Error();
    const bucket = env.BLUEPRINT_OBJECT_BUCKET ?? '';
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || !env.BLUEPRINT_OBJECT_ACCESS_KEY_ID || !env.BLUEPRINT_OBJECT_SECRET_ACCESS_KEY) throw Error();
    return { endpoint: endpoint.origin, region, bucket,
      credentials: { accessKeyId: env.BLUEPRINT_OBJECT_ACCESS_KEY_ID, secretAccessKey: env.BLUEPRINT_OBJECT_SECRET_ACCESS_KEY } };
  } catch { throw new BlueprintUnavailable(); }
}

type ReadBody = AsyncIterable<Uint8Array> & { destroy?: () => void };
// Deliberately narrow transport injection: tests use an in-memory S3 fixture, not a Neon claim.
export type ObjectRequest = GetBucketAclCommand | GetBucketPolicyCommand | GetObjectCommand | HeadObjectCommand | PutObjectCommand;
export type ObjectResult = { Owner?: { ID?: string }; Grants?: { Grantee?: { Type?: string; ID?: string }; Permission?: string }[];
  Policy?: string; ContentLength?: number; Body?: ReadBody };
export type ObjectTransport = (command: ObjectRequest, signal: AbortSignal) => Promise<ObjectResult>;
const notFound = (error: unknown) => error instanceof Error && ['NoSuchKey', 'NotFound'].includes(error.name);
const objectKey = (file: BlueprintFile) => `objects/sha256/${file.sha256}`;

export class NeonObjectStorage implements BlueprintStorageProvider {
  private readonly bucket: string;
  private readonly send: ObjectTransport;
  constructor(env: Record<string, string | undefined> = process.env, transport?: ObjectTransport, private readonly timeoutMs = 8000) {
    const config = neonStorageConfiguration(env);
    this.bucket = config.bucket;
    const options: S3ClientConfig = { endpoint: config.endpoint, region: config.region, credentials: config.credentials,
      forcePathStyle: true, followRegionRedirects: false, maxAttempts: 1,
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
      requestHandler: { connectionTimeout: 3000, requestTimeout: timeoutMs, httpsAgent: { rejectUnauthorized: true } } };
    const client = transport ? null : new S3Client(options);
    this.send = transport ?? (async (command, signal) => {
      const options = { abortSignal: signal };
      if (command instanceof GetObjectCommand) return client!.send(command, options) as Promise<ObjectResult>;
      if (command instanceof PutObjectCommand) { await client!.send(command, options); return {}; }
      if (command instanceof HeadObjectCommand) return client!.send(command, options);
      if (command instanceof GetBucketPolicyCommand) return client!.send(command, options);
      return client!.send(command, options);
    });
  }
  operationalInfo() { return { backend: 'neon' as const, persistent: true }; }
  async exists(file: BlueprintFile) {
    blueprintFileSchema.parse(file);
    return this.bounded(async signal => {
      await this.privateBucket(signal);
      try {
        const result = await this.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey(file) }), signal);
        if (result.ContentLength !== file.size) throw new BlueprintUnavailable();
        return true;
      } catch (error) { if (notFound(error)) return false; throw error; }
    });
  }
  private async bounded<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new BlueprintUnavailable()); }, this.timeoutMs);
      })]);
    } catch { throw new BlueprintUnavailable(); }
    finally { clearTimeout(timer); controller.abort(); }
  }
  private async privateBucket(signal: AbortSignal) {
    const acl = await this.send(new GetBucketAclCommand({ Bucket: this.bucket }), signal);
    // No public groups, delegated grants or ambiguous ACL. No mutations of policy/ACL.
    if (!acl.Owner?.ID || !acl.Grants?.length || acl.Grants.some(g => g.Grantee?.Type !== 'CanonicalUser'
      || g.Grantee.ID !== acl.Owner!.ID || g.Permission !== 'FULL_CONTROL')) throw new BlueprintUnavailable();
    try {
      const result = await this.send(new GetBucketPolicyCommand({ Bucket: this.bucket }), signal);
      if (result.Policy) {
        const policy = JSON.parse(result.Policy);
        // Restrictive policies only; credentials already provide branch-scoped access.
        if (!Array.isArray(policy.Statement) || policy.Statement.some((s: { Effect?: string }) => s.Effect !== 'Deny')) throw new BlueprintUnavailable();
      }
    } catch (error) { if (!(error instanceof Error && error.name === 'NoSuchBucketPolicy')) throw error; }
  }
  private async object(file: BlueprintFile, signal: AbortSignal): Promise<Uint8Array | null> {
    let response: ObjectResult;
    try { response = await this.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey(file) }), signal); }
    catch (error) { if (notFound(error)) return null; throw error; }
    const body = response.Body;
    try {
      if (!body || response.ContentLength !== file.size) throw new BlueprintUnavailable();
      const chunks: Uint8Array[] = []; let size = 0;
      for await (const chunk of body) {
        size += chunk.byteLength;
        if (signal.aborted || size > file.size) throw new BlueprintUnavailable();
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks, size);
      validateBlueprintBytes(bytes, file);
      return bytes;
    } finally { body?.destroy?.(); }
  }
  async read(file: BlueprintFile) {
    blueprintFileSchema.parse(file);
    return this.bounded(async signal => {
      await this.privateBucket(signal);
      const bytes = await this.object(file, signal);
      if (!bytes) throw new BlueprintUnavailable();
      return bytes;
    });
  }
  async inspect(file: BlueprintFile) {
    blueprintFileSchema.parse(file);
    return this.bounded(async signal => {
      await this.privateBucket(signal);
      const bytes = await this.object(file, signal);
      return bytes ? { exists: true, integrity: 'verified' as const } : { exists: false, integrity: 'missing' as const };
    });
  }
  async put(file: BlueprintFile, bytes: Uint8Array) {
    validateBlueprintBytes(bytes, file);
    return this.bounded(async signal => {
      await this.privateBucket(signal);
      if (await this.object(file, signal)) return 'existing' as const;
      try {
        await this.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectKey(file), Body: bytes,
          ContentLength: bytes.length, ContentType: file.format === 'json' ? 'application/json' : 'text/markdown',
          CacheControl: 'private, no-store', IfNoneMatch: '*' }), signal);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'PreconditionFailed')) throw error;
        // A concurrent writer may have inserted the same content-addressed object.
        if (!await this.object(file, signal)) throw new BlueprintUnavailable();
        return 'existing' as const;
      }
      if (!await this.object(file, signal)) throw new BlueprintUnavailable();
      return 'created' as const;
    });
  }
}
