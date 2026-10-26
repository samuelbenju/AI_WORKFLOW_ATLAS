import {config} from "dotenv";
config({path:".env.local",quiet:true});
async function main(){const {getDatabase}=await import("../src/server/db/client");const {tick}=await import("../src/server/agents/engine");const db=getDatabase();try{const result=await tick(process.env.AGENT_WORKER_ID??"manual-cli",db);console.log(JSON.stringify({worker:process.env.AGENT_WORKER_ID??"manual-cli",state:result.state}));}finally{await db.$disconnect();}}
main().catch(()=>{console.error("Agent worker cycle failed. Inspect private task history; credentials are not logged.");process.exitCode=1;});
