import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { createDatabaseClient } from '../src/server/db/client';
import { validateLibrary } from '../src/lib/catalog-import';
import { planImport, applyImport } from '../src/server/catalog-import/service';
import { queryTools, queryWorkflows } from '../src/server/data/public-catalog';
import { withAppServer } from '../tests/e2e/test-server';

async function main() {
  const url = process.env.ATLAS_PROFILE_DATABASE_URL ?? '', target = new URL(url);
  if (!['127.0.0.1','localhost'].includes(target.hostname) || !/^\/atlas_run_[a-f0-9]+_test$/.test(target.pathname)) throw Error();
  const label = process.argv[2]; if (!['before','after'].includes(label ?? '')) throw Error();
  const db = createDatabaseClient(url);
  try {
    const library = validateLibrary(JSON.parse(await readFile('data/catalog/library.json','utf8')),
      JSON.parse(await readFile('data/catalog/research.json','utf8')).findings);
    // Reuse the existing import service ONLY for this disposable fixture.
    await applyImport(db,library,target.pathname.slice(1),await planImport(db,library,target.pathname.slice(1)));
    const q = {q:'',sort:'name' as const,page:1};
    const tools = await queryTools(q,'published',db), guides = await queryWorkflows(q,'published',db);
    const report = { scope:'LOCAL_ISOLATED_LAB_NOT_FIELD_DATA',label, fixture:{tools:tools.total,guides:guides.total},
      selectedDtoBytes:{tools:Buffer.byteLength(JSON.stringify(tools.items)),guides:Buffer.byteLength(JSON.stringify(guides.items))},
      navigation:[] as {width:number;prefetchRequests:number}[],
      lighthouse:[] as {path:string;run:number;lcpMs:number;cls:number;tbtMs:number;performance:number}[] };
    const dir = `.cache/seo-profile/${label}`; await mkdir(dir,{recursive:true});
    await withAppServer({DATABASE_URL:url,CATALOG_DEMO_MODE:'false',ANALYTICS_ENABLED:'false',GA4_MODE:'disabled',
      ADSENSE_ENABLED:'false',WOMPI_SANDBOX_ENABLED:'false',NEWSLETTER_MODE:'disabled',AGENTS_ENABLED:'false',
      AGENTS_MONTHLY_BUDGET_USD_MICROS:'0',SEO_INDEXING_ENABLED:'false',PUBLIC_LAUNCH_CONFIRMED:'false',ATLAS_ISOLATED_E2E:'true'},async origin=>{
      const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium'});
      try {
        for (const width of [390,1440]) {
          const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(); let count=0;
          await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
          page.on('request',request=>{if(request.headers()['next-router-prefetch'])count++;});
          await page.goto(origin,{waitUntil:'networkidle'});
          for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=700){await page.evaluate(scroll=>scrollTo(0,scroll),y);await page.waitForTimeout(250);}
          await page.waitForTimeout(1200);report.navigation.push({width,prefetchRequests:count});await context.close();
        }
      } finally { await browser.close(); }
      if(process.env.ATLAS_LIGHTHOUSE_CLI) {
        // CLI is a trusted local QA dependency; target is always our loopback server.
        for(const path of ['/','/tools'])for(let run=1;run<=3;run++){
          const file=`${dir}/${path==='/'?'home':'tools'}-${run}.json`;
          const result=spawnSync(process.execPath,[process.env.ATLAS_LIGHTHOUSE_CLI,origin+path,'--quiet','--only-categories=performance',
            '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage','--output=json',`--output-path=${file}`],
            {encoding:'utf8',env:{...process.env,CHROME_PATH:'/usr/bin/chromium'},timeout:90000});
          if(result.status!==0)throw Error('Lighthouse unavailable; no score inferred.');
          const data=JSON.parse(await readFile(file,'utf8'));
          report.lighthouse.push({path,run,lcpMs:data.audits['largest-contentful-paint'].numericValue,cls:data.audits['cumulative-layout-shift'].numericValue,
            tbtMs:data.audits['total-blocking-time'].numericValue,performance:data.categories.performance.score});
          console.log(JSON.stringify({scope:report.scope,label,...report.lighthouse.at(-1)}));
        }
      }
    });
    await writeFile(`${dir}/summary.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(()=>{console.error('Isolated profiling failed; private connection and provider details withheld.');process.exitCode=1;});
