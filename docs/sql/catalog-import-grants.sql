-- ONE-TIME, OPERATOR-REVIEWED privilege setup, NOT an application migration.
-- Run only in the confirmed Neon project cold-shadow-53495242 / atlas_staging.
-- No passwords here. Do not run as the web application or the import workflow.
-- The role starts NOLOGIN. A private psql \password prompt provisions its own
-- NEW credential, then the operator enables LOGIN separately. Existing roles
-- and credentials are never changed by this script.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'atlas_staging' THEN
    RAISE EXCEPTION 'CATALOG_WRONG_DATABASE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'atlas_staging_catalog') THEN
    RAISE EXCEPTION 'CATALOG_ROLE_ALREADY_EXISTS_REVIEW_WITH_OPERATOR';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) <> 16 THEN
    RAISE EXCEPTION 'CATALOG_MIGRATION_COUNT_UNEXPECTED';
  END IF;
END $$;
CREATE ROLE atlas_staging_catalog NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE atlas_staging TO atlas_staging_catalog;
GRANT USAGE ON SCHEMA public TO atlas_staging_catalog;
GRANT SELECT, INSERT ON TABLE
  public."Tool", public."Category", public."Tag", public."UseCase", public."Article",
  public."_CategoryToTool", public."_TagToTool", public."_CategoryToUseCase", public."_TagToUseCase",
  public."_ToolToUseCase", public."_ArticleToCategory", public."_ArticleToTag", public."_ArticleToTool"
  TO atlas_staging_catalog;
GRANT INSERT, SELECT (id) ON TABLE public."AuditLog" TO atlas_staging_catalog;
GRANT SELECT (migration_name, checksum, finished_at, rolled_back_at)
  ON TABLE public._prisma_migrations TO atlas_staging_catalog;
COMMIT;
-- The existing runtime/migrator roles receive no changes or memberships.
-- Do not grant UPDATE, DELETE, TRUNCATE, schema CREATE, private-table access,
-- default privileges or membership in atlas_staging_owner/neon_superuser.
