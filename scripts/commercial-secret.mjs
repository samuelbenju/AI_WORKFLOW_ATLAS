import {readFile,writeFile,chmod} from "node:fs/promises";
import {randomBytes} from "node:crypto";
let original="";try{original=await readFile(".env.local","utf8");}catch(error){if(error.code!=="ENOENT")throw error;}
if(!/^SPONSOR_FORM_SECRET=/m.test(original)){await writeFile(".env.local",`${original}${original.endsWith("\n")||!original?"":"\n"}SPONSOR_FORM_SECRET=${randomBytes(32).toString("hex")}\n`,{mode:0o600});await chmod(".env.local",0o600);console.log("Private commercial form signing key prepared; value not logged.");}else console.log("Existing commercial form signing key preserved.");
