import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {failedLocations} from './e2e-diagnostics.mjs';
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { withTestDatabase } from "./test-database.mjs";

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Public catalog validation failed.")));
  });
}

withTestDatabase(async (url) => {
  const env = { ...process.env, ADSENSE_ENABLED: "false", ADSENSE_SITE_APPROVED: "false", ADSENSE_CONSENT_READY: "false", ADSENSE_REPORT_ACCESS_TOKEN: "", PUBLIC_LAUNCH_CONFIRMED: "false", LEGAL_REVIEW_CONFIRMED: "false", SEO_INDEXING_ENABLED: "false", DATABASE_URL: url, TEST_DATABASE_URL: url, CATALOG_DEMO_MODE: "true", ATLAS_ISOLATED_E2E: "true", ANALYTICS_ENABLED:"true", ANALYTICS_ORIGIN:"http://127.0.0.1:3100", GA4_MODE:"disabled", AGENTS_ENABLED: "false", WOMPI_SANDBOX_ENABLED: "false", ADMIN_ORIGIN: "http://127.0.0.1:3100", ATLAS_TEST_PASSWORD: randomBytes(24).toString("base64url"), SPONSOR_FORM_SECRET: randomBytes(32).toString("hex"), SPONSOR_ORIGIN: "http://127.0.0.1:3100", NEWSLETTER_ORIGIN: "http://127.0.0.1:3100", NEWSLETTER_SECRET: randomBytes(32).toString("hex"), NEWSLETTER_MODE: "capture", ATLAS_NEWSLETTER_TEST_CAPTURE: "true", RESEND_FROM: "Atlas Tests <newsletter@fixture.invalid>" };
  await run(["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"], env);
  await run(["--conditions=react-server", "--import", "tsx", "prisma/seed-catalog.ts"], env);
  await run(["--conditions=react-server", "--import", "tsx", "prisma/seed-editorial.ts"], env);
  await run(["--conditions=react-server", "--import", "tsx", "prisma/seed-commercial.ts"], env);
  await run(["--conditions=react-server", "--import", "tsx", "scripts/seed-admin-test.ts"], env);
  const diagnostics=await mkdtemp(path.join(tmpdir(),'atlas-e2e-report-'));
  try {
    await run(["node_modules/@playwright/test/cli.js", "test", "--reporter=list,html,json", ...process.argv.slice(2)], {...env,PLAYWRIGHT_HTML_OPEN:'never',PLAYWRIGHT_JSON_OUTPUT_NAME:path.join(diagnostics,'report.json')});
  } catch(error) {
    if(process.env.GITHUB_ACTIONS==='true')try {
      const report=JSON.parse(await readFile(path.join(diagnostics,'report.json'),'utf8'));
      for(const row of failedLocations(report))console.log(`::warning file=${row.file},line=${row.line}::E2E ${row.status}; inspect authenticated logs for details.`);
    } catch { console.log('::warning::E2E failed; structured diagnostic report unavailable.'); }
    throw error;
  } finally {await rm(diagnostics,{recursive:true,force:true});}
}).catch(() => { console.error("Public tests failed. Check the reported checks and dedicated PostgreSQL test prerequisites. Connection values are not logged."); process.exitCode = 1; });
