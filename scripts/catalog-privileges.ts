import type pg from 'pg';

// Shared by the guarded CLI and real isolated PostgreSQL regression tests.
const catalogTables = ['Tool','Category','Tag','UseCase','Article','_CategoryToTool','_TagToTool','_CategoryToUseCase','_TagToUseCase','_ToolToUseCase','_ArticleToCategory','_ArticleToTag','_ArticleToTool'];
export async function assertCatalogPrivileges(client: pg.Client) {
  // has_table_privilege alone misses grants made on individual columns.
  // The two tables with intentional column grants need explicit allowlists.
  const { rows: [privileges] } = await client.query(`
    WITH relations AS (
      SELECT tablename,format('%I.%I',schemaname,tablename) AS qualified
      FROM pg_tables WHERE schemaname='public'
    )
    SELECT
      EXISTS(SELECT 1 FROM relations WHERE NOT (tablename=ANY($1::text[]) OR tablename='AuditLog')
        AND (has_any_column_privilege(current_user,qualified,'INSERT')
          OR has_any_column_privilege(current_user,qualified,'UPDATE')
          OR has_table_privilege(current_user,qualified,'DELETE'))) AS outside_writes,
      EXISTS(SELECT 1 FROM relations WHERE has_any_column_privilege(current_user,qualified,'UPDATE')
        OR has_any_column_privilege(current_user,qualified,'REFERENCES')
        OR has_table_privilege(current_user,qualified,'DELETE')
        OR has_table_privilege(current_user,qualified,'TRUNCATE')
        OR has_table_privilege(current_user,qualified,'TRIGGER')) AS mutating_privileges,
      EXISTS(SELECT 1 FROM relations WHERE NOT (tablename=ANY($1::text[]) OR tablename IN ('AuditLog','_prisma_migrations'))
        AND has_any_column_privilege(current_user,qualified,'SELECT')) AS outside_reads,
      EXISTS(SELECT 1 FROM relations WHERE tablename=ANY($1::text[])
        AND (NOT has_table_privilege(current_user,qualified,'SELECT')
          OR NOT has_table_privilege(current_user,qualified,'INSERT'))) AS missing_catalog_privileges,
      EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
          AND ((c.relname='AuditLog' AND a.attname<>'id')
            OR (c.relname='_prisma_migrations' AND a.attname NOT IN ('migration_name','checksum','finished_at','rolled_back_at')))
          AND has_column_privilege(current_user,c.oid,a.attname,'SELECT')) AS unexpected_column_reads`, [catalogTables]);
  const { rows: [audit] } = await client.query(`SELECT has_table_privilege(current_user,'public."AuditLog"','INSERT') AND has_column_privilege(current_user,'public."AuditLog"','id','SELECT') AS permitted`);
  if (privileges.outside_writes || privileges.mutating_privileges || privileges.outside_reads || privileges.missing_catalog_privileges || privileges.unexpected_column_reads || !audit.permitted) throw Error('IMPORT_PRIVILEGES_REJECTED');
}
