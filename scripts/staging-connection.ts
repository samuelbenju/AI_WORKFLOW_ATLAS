import pg from 'pg';
import type { TLSSocket } from 'node:tls';
export const stagingTarget = 'cold-shadow-53495242/atlas_staging';
export function stagingConfiguration(value: string | undefined, roles: string[], expectedHost: string | undefined) {
  if (!value || !expectedHost) throw Error('STAGING_CONFIGURATION_MISSING');
  let url: URL;
  try { url = new URL(value); } catch { throw Error('STAGING_CONFIGURATION_INVALID'); }
  const role = decodeURIComponent(url.username), host = url.hostname.toLowerCase();
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !host.endsWith('.us-east-1.aws.neon.tech') || host.includes('-pooler') || host !== expectedHost
    || decodeURIComponent(url.pathname.slice(1)) !== 'atlas_staging' || !roles.includes(role) || !url.password || url.port && url.port !== '5432' || url.hash) throw Error('STAGING_DESTINATION_REJECTED');
  // Explicit pg fields ignore unsafe/overriding URL query parameters.
  url.search = ''; url.searchParams.set('sslmode', 'verify-full');
  return { host, role, canonical: url.toString(), client: { host, port: 5432, database: 'atlas_staging', user: role, password: decodeURIComponent(url.password), ssl: { rejectUnauthorized: true, servername: host, minVersion: 'TLSv1.2' as const }, connectionTimeoutMillis: 10000, query_timeout: 15000, options: '-c statement_timeout=10000 -c lock_timeout=2000 -c search_path=public,pg_catalog' } };
}
export async function stagingIdentity(client: pg.Client, role: string) {
  const socket = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
  if (!socket.encrypted || !socket.authorized || !['TLSv1.2', 'TLSv1.3'].includes(socket.getProtocol() ?? '')) throw Error('STAGING_TLS_REJECTED');
  const { rows: [row] } = await client.query(`SELECT current_database() AS database, current_user AS role, session_user AS session_role,
    current_setting('server_version_num')::int AS version,
    r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls AS privileged,
    has_schema_privilege(current_user,'public','CREATE') AS schema_create,
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS owns_tables,
    EXISTS(SELECT 1 FROM pg_roles x WHERE x.rolname<>current_user AND (x.rolsuper OR x.rolcreatedb OR x.rolcreaterole OR x.rolname IN ('atlas_staging_owner','neon_superuser')) AND pg_has_role(current_user,x.oid,'MEMBER')) AS owner_membership
    FROM pg_roles r WHERE r.rolname=current_user`);
  if (!row || row.database !== 'atlas_staging' || row.role !== role || row.session_role !== role || row.version < 170000 || row.version >= 180000
    || row.privileged || row.schema_create || row.owns_tables || row.owner_membership) throw Error('STAGING_IDENTITY_OR_PRIVILEGES_REJECTED');
}
