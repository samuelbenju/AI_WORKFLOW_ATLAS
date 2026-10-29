import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDatabaseClient } from '../../src/server/db/client';
import { validateLibrary } from '../../src/lib/catalog-import';
import { planImport, applyImport } from '../../src/server/catalog-import/service';
import { catalogCategories, catalogEntryExists } from '../../src/server/data/public-catalog';
import { withAppServer } from '../e2e/test-server';
import { consentVersion } from '../../src/lib/growth';

test('published catalog SEO and discovery, isolated PostgreSQL and browser only',async t=>{
  const url=process.env.DATABASE_URL!,target=new URL(url);
  assert.ok(['localhost','127.0.0.1'].includes(target.hostname)&&/^\/atlas_run_[a-f0-9]+_test$/.test(target.pathname));
  const db=createDatabaseClient(url);
  try{
    const library=validateLibrary(JSON.parse(await readFile('data/catalog/library.json','utf8')),JSON.parse(await readFile('data/catalog/research.json','utf8')).findings);
    await applyImport(db,library,target.pathname.slice(1),await planImport(db,library,target.pathname.slice(1)));
    await db.category.create({data:{slug:'hidden-fixture-topic',name:'Unpublished fixture topic',tools:{create:{slug:'hidden-fixture-tool',name:'Unpublished fixture tool',summary:'Private fixture',description:'Private fixture',websiteUrl:'https://example.invalid'}}}});
    await t.test('topics require visible content and never disclose drafts',async()=>{
      const topics=await catalogCategories('published',db);
      assert.equal(topics.length,20);assert.ok(!topics.some(topic=>topic.slug==='hidden-fixture-topic'));
      assert.equal(await catalogEntryExists('categories','hidden-fixture-topic',db),false);
    });
    const canonical='https://atlas.example';
    await withAppServer({DATABASE_URL:url,CATALOG_DEMO_MODE:'false',SITE_URL:canonical,SEO_INDEXING_ENABLED:'true',
      PUBLIC_LAUNCH_CONFIRMED:'true',LEGAL_REVIEW_CONFIRMED:'true',PUBLIC_OPERATOR_NAME:'Isolated legal fixture, not a real operator',
      PUBLIC_OPERATOR_ADDRESS:'Isolated fixture address',PUBLIC_CONTACT_EMAIL:'fixture@example.invalid',LEGAL_EFFECTIVE_DATE:'2026-01-01',
      ANALYTICS_ENABLED:'false',GA4_MODE:'disabled',ADSENSE_ENABLED:'false',ATLAS_ISOLATED_E2E:'true',
      AGENTS_ENABLED:'false',AGENTS_MONTHLY_BUDGET_USD_MICROS:'0',WOMPI_SANDBOX_ENABLED:'false',NEWSLETTER_MODE:'disabled'},async origin=>{
      const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
      try{
        const context=await browser.newContext();
        const page=await context.newPage();
        await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
        await t.test('pagination has distinct titles and self-canonicals; empty and filtered views stay noindex',async()=>{
          await page.goto(origin+'/');await expect(page).toHaveTitle('AI Workflow Atlas — Discover What AI Can Actually Do');
          await page.goto(origin+'/tools?page=2');
          await expect(page).toHaveTitle(/Page 2/);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',canonical+'/tools?page=2');
          await page.goto(origin+'/tools?page=999');await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
          for(const path of ['/tools?q=Whisper','/tools?tag=human-review','/tools/whisper?page=2','/about?page=2']){
            const response=await page.goto(origin+path);assert.match(response?.headers()['x-robots-tag']??'',/noindex/);
          }
          await page.goto(origin+'/blog');await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
          await page.goto(origin+'/categories/scientific-research');await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
        });
        await t.test('real categories, cards and breadcrumbs work on mobile and desktop without ads',async()=>{
          for(const width of [390,1440]){
            await page.setViewportSize({width,height:900});await page.goto(origin+'/categories');
            await page.getByRole('link',{name:/Transcription & meetings/}).waitFor();assert.equal(await page.locator('h1').count(),1);
            await page.getByRole('link',{name:/Transcription & meetings/}).click();await page.waitForURL(/\/categories\/transcription$/);
            await expect(page.locator('h1')).toHaveText('Transcription & meetings');
            // Metadata can stream after the route's H1/cards on client navigation.
            await expect(page).toHaveTitle(/Transcription & meetings: AI tools and workflows/);
            await page.getByTestId('tool-card').first().waitFor();assert.ok(await page.getByTestId('tool-card').count()>0);
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
            const accessibility=await new AxeBuilder({page}).analyze();
            assert.deepEqual(accessibility.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
            const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();
            const parsed=schemas.map(text=>JSON.parse(text));assert.ok(parsed.some(schema=>schema['@type']==='BreadcrumbList'));
            assert.ok(parsed.some(schema=>schema['@type']==='CollectionPage'));
            assert.ok(!schemas.join('').includes('AggregateRating'));
            assert.equal(await page.locator('script[src*="googlesyndication"],ins.adsbygoogle').count(),0);
            await page.screenshot({path:`/tmp/atlas-topic-${width}.png`,fullPage:true});
          }
          assert.equal((await fetch(origin+'/categories/hidden-fixture-topic')).status,404);
          assert.equal((await fetch(origin+'/categories/missing-topic')).status,404);
          await expect(page.getByRole('region',{name:'Analytics privacy'})).toContainText('currently disabled');
          await expect(page.getByRole('button',{name:'Accept optional analytics'})).toHaveCount(0);
          const accepted=await context.request.post(origin+'/api/analytics/consent',{headers:{Origin:origin},data:{accept:true,version:consentVersion}});
          assert.equal(accepted.status(),200);await page.reload();
          await page.getByRole('button',{name:'Withdraw analytics consent'}).click();
          await expect(page.getByRole('button',{name:'Withdraw analytics consent'})).toHaveCount(0);
          assert.equal(await db.analyticsSession.count(),0);assert.equal(await db.analyticsEvent.count(),0);
        });
        await t.test('sitemap contains canonical published pages and excludes all draft articles and the empty journal',async()=>{
          const xml=await(await fetch(origin+'/sitemap.xml')).text();
          assert.ok(xml.includes(canonical+'/about</loc>')&&xml.includes(canonical+'/categories/transcription</loc>'));
          assert.ok(!xml.includes(canonical+'/blog</loc>')&&!xml.includes('hidden-fixture-topic'));
          assert.ok(!xml.includes(canonical+'/categories/scientific-research</loc>'));
          for(const article of library.articles){assert.ok(!xml.includes('/blog/'+article.slug));assert.equal((await fetch(origin+'/blog/'+article.slug)).status,404);}
          for(const tool of library.tools)assert.ok(xml.includes('/tools/'+tool.slug+'</loc>'));
          assert.ok(!(await(await fetch(origin+'/robots.txt')).text()).includes('Disallow: /\n'));
          assert.equal((await fetch(origin+'/api/admin/content/tools')).status,401);
        });
        await page.close();
      }finally{await browser.close();}
    });
  }finally{await db.$disconnect();}
});
