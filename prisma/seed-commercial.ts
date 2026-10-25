import {config} from "dotenv";
import {createDatabaseClient} from "../src/server/db/client";
import {requireDatabaseUrl} from "../src/server/db/url";
import {seedCommercialDevelopment} from "./seed-commercial-data";
config({path:[".env.local",".env"],quiet:true});
async function main(){const db=createDatabaseClient(requireDatabaseUrl(process.env.DATABASE_URL));try{await seedCommercialDevelopment(db);console.log("Four commercial packages prepared. Existing prices/settings preserved; no sponsors, inquiries, sales or campaigns seeded.");}finally{await db.$disconnect();}}
main().catch(()=>{console.error("Commercial seed failed; private connection values suppressed.");process.exitCode=1;});
