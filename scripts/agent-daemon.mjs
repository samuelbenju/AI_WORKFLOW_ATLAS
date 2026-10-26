// Dedicated worker service only. Never import this loop into a serverless handler.
import {spawn} from "node:child_process";
let stopping=false,child=null,timer=null,finishWait=null;
function stop(){stopping=true;if(timer)clearTimeout(timer);finishWait?.();child?.kill("SIGTERM");}
process.on("SIGTERM",stop);process.on("SIGINT",stop);
const delay=Math.max(5000,Math.min(60000,Number(process.env.AGENT_TICK_INTERVAL_MS)||15000));
while(!stopping){await new Promise(resolve=>{child=spawn(process.execPath,["--use-env-proxy","--conditions=react-server","--import","tsx","scripts/agent-worker.ts"],{stdio:"inherit",env:process.env});child.once("error",()=>resolve());child.once("exit",()=>resolve());});child=null;if(!stopping)await new Promise(resolve=>{finishWait=resolve;timer=setTimeout(resolve,delay);});finishWait=null;timer=null;}
