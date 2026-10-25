import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { deployMigrations, readMigrations } from "./prisma-wasm.mjs";

config({ path: [".env.local", ".env"], quiet: true });
export async function withTestDatabase(callback) {
  if (process.env.NODE_ENV === "production") throw new Error("Test database creation is disabled in production.");
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.pathname.endsWith("_test")) throw new Error("A dedicated TEST_DATABASE_URL ending in _test is required.");
  const admin = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  await admin.connect();
  const target = `atlas_run_${randomBytes(8).toString("hex")}_test`;
  let created = false;
  try {
    const actual = await admin.query("SELECT current_database() AS name");
    if (!actual.rows[0].name.endsWith("_test")) throw new Error("Actual test connection is not a test database.");
    await admin.query(`CREATE DATABASE "${target}"`); created = true;
    const isolated = new URL(url); isolated.pathname = `/${target}`;
    const initial = await deployMigrations(isolated.toString());
    if (initial.appliedMigrationNames.length !== (await readMigrations()).migrationDirectories.length) throw new Error("Not all migrations were applied.");
    if ((await deployMigrations(isolated.toString())).appliedMigrationNames.length) throw new Error("Migration deployment is not idempotent.");
    console.log("Versioned migrations applied to an isolated test database; second deployment made no changes.");
    return await callback(isolated.toString());
  } finally {
    if (created) await admin.query(`DROP DATABASE "${target}" WITH (FORCE)`);
    await admin.end();
  }
}
