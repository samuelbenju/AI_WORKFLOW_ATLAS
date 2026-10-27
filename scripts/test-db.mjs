import { spawn } from "node:child_process";
import { withTestDatabase } from "./test-database.mjs";

withTestDatabase(async (url) => {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "--test", "--test-concurrency=1", "tests/integration/database.test.ts", "tests/integration/admin.test.ts", "tests/integration/editorial.test.ts", "tests/integration/sponsorship.test.ts", "tests/integration/subscriptions.test.ts", "tests/integration/transactions.test.ts", "tests/integration/zz-agents.test.ts", "tests/integration/zzz-business-agents.test.ts", "tests/integration/zzzz-growth.test.ts", "tests/integration/zzzzz-launch.test.ts", "tests/integration/adsense.test.ts"], {
      env: { ...process.env, ADSENSE_ENABLED: "false", ADSENSE_SITE_APPROVED: "false", ADSENSE_CONSENT_READY: "false", ADSENSE_REPORT_ACCESS_TOKEN: "", DATABASE_URL: url, TEST_DATABASE_URL: url }, stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Database integration tests failed.")));
  });
}).catch(() => { console.error("Database test run failed. Check the reported checks and dedicated PostgreSQL test prerequisites. Connection values are not logged."); process.exitCode = 1; });
