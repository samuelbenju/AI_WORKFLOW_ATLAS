import { config } from "dotenv";
import { createDatabaseClient } from "../src/server/db/client";
import { requireDatabaseUrl } from "../src/server/db/url";
import { seedDevelopment } from "./seed-data";

config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  const db = createDatabaseClient(requireDatabaseUrl(process.env.DATABASE_URL));
  try {
    await seedDevelopment(db);
    console.log("Development seed complete: fictional drafts and inactive packages only.");
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => { console.error("Development seed failed. Check the documented development database prerequisites; no connection value is logged."); process.exitCode = 1; });
