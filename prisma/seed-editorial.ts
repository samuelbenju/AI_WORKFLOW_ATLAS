import { config } from "dotenv";
import { createDatabaseClient } from "../src/server/db/client";
import { requireDatabaseUrl } from "../src/server/db/url";
import { seedEditorialDevelopment } from "./seed-editorial-data";
config({path:[".env.local",".env"],quiet:true});
async function main(){const db=createDatabaseClient(requireDatabaseUrl(process.env.DATABASE_URL));try {const result=await seedEditorialDevelopment(db);console.log(`Editorial seed complete: ${result.created} drafts created; no articles reviewed or published.`);}finally {await db.$disconnect();}}
main().catch(()=>{console.error("Editorial seed failed. Check development database and migrations; connection values suppressed.");process.exitCode=1;});
