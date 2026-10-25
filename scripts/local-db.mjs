import { randomBytes } from "node:crypto";
import { readFile, appendFile, mkdir, stat } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { config, parse } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });
const action = process.argv[2] ?? "start";
const dockerEnv = { ...process.env };
for (const key of ["DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"]) delete dockerEnv[key];
const dockerArgs = ["--host=unix:///var/run/docker.sock", "compose", "--env-file", ".env.local"];

async function run(args, { input, output } = {}) {
  const child = spawn("docker", [...dockerArgs, ...args], {
    env: dockerEnv, stdio: [input ? "pipe" : "ignore", output ? "pipe" : "inherit", "inherit"],
  });
  const completion = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Local Docker database command failed.")));
  });
  await Promise.all([completion,
    ...(input ? [pipeline(input, child.stdin)] : []),
    ...(output ? [pipeline(child.stdout, output)] : []),
  ]);
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Local database tools are for development only.");
  if (action === "start" && !process.env.DATABASE_URL) {
    let existing = "";
    try { existing = await readFile(".env.local", "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (parse(existing).DATABASE_URL) throw new Error("Existing database binding must not be overwritten.");
    const password = process.env.DEV_POSTGRES_PASSWORD || randomBytes(24).toString("hex");
    const connection = `postgresql://atlas:${encodeURIComponent(password)}@127.0.0.1:55432/atlas_dev`;
    const additions = [
      ...(!process.env.DEV_POSTGRES_PASSWORD ? [`DEV_POSTGRES_PASSWORD=${password}`] : []),
      `DATABASE_URL=${connection}`,
      ...(!process.env.TEST_DATABASE_URL ? [`TEST_DATABASE_URL=${connection.replace("/atlas_dev", "/atlas_test")}`] : []),
    ];
    await appendFile(".env.local", `\n# Local PostgreSQL only. Generated credentials; never commit.\n${additions.join("\n")}\n`, { mode: 0o600 });
    config({ path: ".env.local", quiet: true });
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/atlas_dev" || url.username !== "atlas") {
    throw new Error("Local helper only manages atlas_dev at 127.0.0.1:55432. Use DATABASE_URL and Prisma commands for external PostgreSQL.");
  }
  if (!process.env.DEV_POSTGRES_PASSWORD || url.password !== encodeURIComponent(process.env.DEV_POSTGRES_PASSWORD)) {
    throw new Error("Local PostgreSQL credential binding is missing or inconsistent; no values were changed.");
  }
  if (action === "stop") { await run(["stop", "db"]); return; }
  if (action === "start") await run(["up", "-d", "--wait", "--wait-timeout", "60", "db"]);
  const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    if (action === "start") {
      const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["atlas_test"]);
      if (!result.rowCount) await client.query('CREATE DATABASE "atlas_test"');
      console.log("Local PostgreSQL ready; development and test databases available. Credentials remain in ignored .env.local.");
    } else if (action === "backup") {
      await mkdir(".cache/backups", { recursive: true, mode: 0o700 });
      const target = `.cache/backups/atlas-dev-${Date.now()}.dump`;
      await run(["exec", "-T", "db", "pg_dump", "-U", "atlas", "-d", "atlas_dev", "-Fc"],
        { output: createWriteStream(target, { flags: "wx", mode: 0o600 }) });
      console.log("Development backup written:", target);
    } else if (action === "restore-check") {
      const source = process.argv[3];
      if (!source || !(await stat(source)).isFile()) throw new Error("Pass an existing development backup file.");
      const target = `atlas_restore_${randomBytes(6).toString("hex")}_test`;
      await client.query(`CREATE DATABASE "${target}"`);
      let restored;
      try {
        await run(["exec", "-T", "db", "pg_restore", "-U", "atlas", "-d", target, "--no-owner", "--no-acl", "--exit-on-error"],
          { input: createReadStream(source) });
        const restoredUrl = new URL(url); restoredUrl.pathname = `/${target}`;
        restored = new pg.Client({ connectionString: restoredUrl.toString() }); await restored.connect();
        const tables = await restored.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
        if (!tables.rowCount) throw new Error("Restored backup contains no tables.");
        for (const { tablename } of tables.rows) {
          // Identifiers originate in the catalog; still quote them correctly.
          const quoted = '"' + tablename.replaceAll('"', '""') + '"';
          const expected = await client.query(`SELECT count(*)::text AS n FROM ${quoted}`);
          const actual = await restored.query(`SELECT count(*)::text AS n FROM ${quoted}`);
          if (expected.rows[0].n !== actual.rows[0].n) throw new Error("Backup count differs from current development data. Use a quiet database and a fresh backup.");
        }
        console.log("Backup restored into an isolated temporary database; all table row counts match development.");
      } finally {
        if (restored) await restored.end();
        await client.query(`DROP DATABASE "${target}" WITH (FORCE)`);
      }
    } else throw new Error("Unknown local database command.");
  } finally { await client.end(); }
}

main().catch(() => {
  // Connection strings and driver error details must not enter logs.
  console.error("Local database operation failed. Check Docker, local bindings and the documented database prerequisites; credentials are not printed.");
  process.exitCode = 1;
});
