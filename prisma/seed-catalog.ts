import { config } from "dotenv";
import { createDatabaseClient } from "../src/server/db/client";
import { requireDatabaseUrl } from "../src/server/db/url";
import { seedCatalogDevelopment } from "./seed-catalog-data";

config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  const db = createDatabaseClient(requireDatabaseUrl(process.env.DATABASE_URL));
  try { const result = await seedCatalogDevelopment(db); console.log("Catalog development seed complete:", result.tools, "sample tools and", result.workflows, "sample workflows. No records published."); }
  finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Catalog seed failed. Check development database configuration; no connection values are logged."); process.exitCode = 1; });
