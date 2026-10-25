import { strict as assert } from "node:assert";
import { test } from "node:test";
import { requireDatabaseUrl } from "../../src/server/db/url";

test("PostgreSQL is required and the URL is not replaced with SQLite", () => {
  assert.equal(requireDatabaseUrl("postgresql://localhost/atlas_dev"), "postgresql://localhost/atlas_dev");
  assert.equal(requireDatabaseUrl("postgres://localhost/atlas_dev?sslmode=verify-full"), "postgres://localhost/atlas_dev?sslmode=verify-full");
  for (const value of [undefined, "", "file:local.db", "sqlite://local/db", "https://example.invalid/db", "postgresql://localhost"]) {
    assert.throws(() => requireDatabaseUrl(value), /DATABASE_URL must identify a PostgreSQL database/);
  }
});
