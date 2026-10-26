import {config} from "dotenv";
config({path:".env.local",quiet:true});
async function main(){const {getDatabase}=await import("../src/server/db/client");const {initializeTeam}=await import("../src/server/agents/team-admin");const db=getDatabase();try{const result=await initializeTeam(null,db);console.log(`Business team profiles preserved/registered: ${result.agentIds.length}. New profiles and schedules are disabled with zero budgets. No AI call was made.`);}finally{await db.$disconnect();}}
main().catch(()=>{console.error("Team registration failed. Inspect schema/configuration; credentials are not logged.");process.exitCode=1;});
