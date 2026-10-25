import {readFile,writeFile,chmod} from "node:fs/promises";
import {randomBytes} from "node:crypto";
let original="";try{original=await readFile(".env.local","utf8");}catch(error){if(error.code!=="ENOENT")throw error;}
if(process.env.NEWSLETTER_SECRET){console.log("Injected newsletter key preserved; no local value written.");}else if(!/^NEWSLETTER_SECRET=/m.test(original)){await writeFile(".env.local",`${original}${original.endsWith("\n")||!original?"":"\n"}NEWSLETTER_SECRET=${randomBytes(32).toString("hex")}\n`,{mode:0o600});await chmod(".env.local",0o600);console.log("Private newsletter encryption/signing key prepared; value not logged.");}else console.log("Existing newsletter encryption/signing key preserved.");
