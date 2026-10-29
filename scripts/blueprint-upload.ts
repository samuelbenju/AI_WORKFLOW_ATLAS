import { config } from 'dotenv';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import pg from 'pg';
import { createDatabaseClient } from '../src/server/db/client';
import { authenticate, resolveSession, revokeSession } from '../src/server/auth/service';
import { uploadBlueprintFile } from '../src/server/blueprints/upload';
import { stagingConfiguration, stagingIdentity } from './staging-connection';
import { readPassword } from './private-password';

config({ path: ['.env.local', '.env'], quiet: true });
async function main() {
  const { values } = parseArgs({ options: { blueprint: { type: 'string' }, version: { type: 'string' }, 'file-id': { type: 'string' },
    source: { type: 'string' }, email: { type: 'string' }, target: { type: 'string' }, 'confirm-upload': { type: 'boolean' } }, strict: true });
  if (!values['confirm-upload'] || !values.blueprint || !values.version || !values['file-id'] || !values.source) throw Error();
  let databaseUrl = process.env.DATABASE_URL;
  if (values.target === 'staging') {
    if (process.env.BLUEPRINT_STORAGE_BACKEND !== 'neon') throw Error();
    const cfg = stagingConfiguration(databaseUrl, ['atlas_staging_app'], process.env.NEON_STAGING_EXPECTED_HOST);
    const probe = new pg.Client(cfg.client); probe.on('error', () => {});
    try { await probe.connect(); await stagingIdentity(probe, cfg.role); } finally { await probe.end(); }
    databaseUrl = cfg.canonical;
  } else {
    const url = new URL(databaseUrl ?? '');
    if (values.target !== 'local-test' || !['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw Error();
  }
  const email = z.email().max(320).parse(values.email).toLowerCase();
  const password = await readPassword('Contraseña del operador autorizado (sin eco): ');
  const db = createDatabaseClient(databaseUrl!);
  let login: Awaited<ReturnType<typeof authenticate>> | undefined;
  let session: Awaited<ReturnType<typeof resolveSession>> = null;
  try {
    login = await authenticate(email, password, undefined, db);
    session = await resolveSession(login.token, db);
    if (!session) throw Error();
    const result = await uploadBlueprintFile(session.actor.id, { blueprint: values.blueprint, version: values.version }, values['file-id'], values.source, db);
    console.log(JSON.stringify({ stage: 'blueprint.object.upload', ...result, published: false }));
  } finally {
    try { if (login && session) await revokeSession(login.token, session.actor, db); } finally { await db.$disconnect(); }
  }
}
main().catch(() => { console.error(JSON.stringify({ stage: 'blueprint.object.upload', codes: ['UPLOAD_NOT_CONFIRMED'], published: false,
  note: 'Una operación remota fallida puede dejar un objeto privado sin referencia. Revisa antes de reintentar; no se publica ni se borra automáticamente.' })); process.exitCode = 1; });
