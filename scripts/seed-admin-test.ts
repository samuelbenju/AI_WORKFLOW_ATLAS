import { createDatabaseClient } from "../src/server/db/client";
import { hashPassword } from "../src/server/auth/password";
const url = process.env.TEST_DATABASE_URL;
const password = process.env.ATLAS_TEST_PASSWORD;
if (process.env.ATLAS_ISOLATED_E2E !== "true" || !url || !new URL(url).pathname.startsWith("/atlas_run_") || !new URL(url).pathname.endsWith("_test") || !password) throw new Error("Only the isolated E2E wrapper can seed these accounts.");
async function main() {
const db = createDatabaseClient(url!);
try {
  const passwordHash = await hashPassword(password!);
  for (const project of ["desktop-chromium", "mobile-chromium"]) {
    for (const role of ["OWNER", "EDITOR", "VIEWER"] as const) {
      await db.user.create({ data: { email: `${role.toLowerCase()}-${project}@e2e.invalid`, name: `Fixture ${role}`, role, active: true, passwordHash } });
    }
  }
  console.log("Ephemeral admin test accounts prepared; no credentials logged.");
} finally { await db.$disconnect(); }

}
main().catch(() => { console.error("Could not prepare isolated authentication fixtures."); process.exitCode = 1; });
