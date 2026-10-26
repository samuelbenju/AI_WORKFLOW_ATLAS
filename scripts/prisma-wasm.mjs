// Offline-capable tooling using Prisma's official, pinned npm/WASM artifacts.
// The native Prisma CLI remains available separately; no binaries/checksums are patched.
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createRequire } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// These packages publish a working CommonJS entry; their ESM dependency graph
// currently contains extensionless imports incompatible with native Node ESM.
const require = createRequire(import.meta.url);
const { validate, getGenerators } = require("@prisma/internals");
const { PrismaClientTsGenerator } = require("@prisma/client-generator-ts");
const { SchemaEngine } = require("@prisma/schema-engine-wasm");
const { bindMigrationAwareSqlAdapterFactory } = require("@prisma/driver-adapter-utils");

config({ path: [".env.local", ".env"], quiet: true });
const filters = { externalTables: [], externalEnums: [] };

export async function readMigrations() {
  const baseDir = resolve("prisma/migrations");
  const directories = (await readdir(baseDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  return {
    baseDir,
    lockfile: { path: "migration_lock.toml", content: await readFile(resolve(baseDir, "migration_lock.toml"), "utf8") },
    shadowDbInitScript: "",
    migrationDirectories: await Promise.all(directories.map(async ({ name }) => ({
      path: name, migrationFile: { path: "migration.sql", content: { tag: "ok", value: await readFile(resolve(baseDir, name, "migration.sql"), "utf8") } },
    }))),
  };
}

export async function withSchemaEngine(url, callback) {
  const files = [{ path: "prisma/schema.prisma", content: await readFile("prisma/schema.prisma", "utf8") }];
  const pool = new pg.Pool({ ...(url ? { connectionString: url } : {}), max: 2, connectionTimeoutMillis: 5000 });
  let engine;
  try {
    engine = await SchemaEngine.new({ datamodels: files.map((file) => [file.path, file.content]) }, () => {},
      bindMigrationAwareSqlAdapterFactory(new PrismaPg(pool)));
    return await callback(engine, files);
  } finally {
    engine?.free();
    await pool.end();
  }
}

export async function deployMigrations(url) {
  if (!url) throw new Error("DATABASE_URL is required to apply migrations.");
  const migrationsList = await readMigrations();
  return withSchemaEngine(url, async (engine) => {
    const history = await engine.diagnoseMigrationHistory({ migrationsList, optInToShadowDatabase: false, filters });
    if (history.editedMigrationNames.length || history.failedMigrationNames.length || history.history?.diagnostic === "historiesDiverge" || history.history?.diagnostic === "migrationsDirectoryIsBehind") {
      throw new Error("Migration history requires review; no reset or checksum override is allowed.");
    }
    return engine.applyMigrations({ migrationsList, filters });
  });
}

async function main() {
  const action = process.argv[2];
  const schema = await readFile("prisma/schema.prisma", "utf8");
  if (action === "validate") {
    validate({ schemas: [["prisma/schema.prisma", schema]] });
    console.log("Prisma schema validation passed (official WASM parser).");
  } else if (action === "generate") {
    const generators = await getGenerators({ schemaPath: "prisma/schema.prisma", cliCommand: "npm run db:generate",
      registry: { "prisma-client": { type: "in-process", generator: new PrismaClientTsGenerator() } } });
    try { for (const generator of generators) await generator.generate(); }
    finally { for (const generator of generators) generator.stop(); }
    console.log("Prisma TypeScript client generated.");
  } else if (action === "diff") {
    await withSchemaEngine(undefined, async (engine, files) => {
      const result = await engine.diff({ from: { tag: "empty" }, to: { tag: "schemaDatamodel", files }, script: true, exitCode: false, filters });
      process.stdout.write(result.stdout ?? "");
    });
  } else if (action === "deploy") {
    const result = await deployMigrations(process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL);
    console.log("Applied migrations:", result.appliedMigrationNames.length ? result.appliedMigrationNames.join(", ") : "none (already current)");
  } else if (action === "status") {
    if (!(process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL)) throw new Error("A migration database URL is required.");
    await withSchemaEngine(process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL, async (engine) => {
      const history = await engine.diagnoseMigrationHistory({ migrationsList: await readMigrations(), optInToShadowDatabase: false, filters });
      if (!history.hasMigrationsTable || history.history || history.editedMigrationNames.length || history.failedMigrationNames.length) throw new Error("Database migration history is not current.");
      console.log("Migration history is current; no edited or failed migrations.");
    });
  } else throw new Error("Expected validate, generate, diff, deploy or status.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve("scripts/prisma-wasm.mjs")) {
  main().catch(() => { console.error("Prisma operation failed. Review schema, migration history and database configuration. Connection values are not logged."); process.exitCode = 1; });
}
