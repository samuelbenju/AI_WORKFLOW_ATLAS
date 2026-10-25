import { test,after } from "node:test";
import { strict as assert } from "node:assert";
import { createDatabaseClient } from "../../src/server/db/client";
import { saveArticle,adminArticle,adminArticles,transitionArticle } from "../../src/server/editorial/admin";
import { listPublicArticles,readPublicArticle } from "../../src/server/editorial/public";
import { sitemapEntries } from "../../src/server/editorial/sitemap";
import { blankArticle,type ArticleInput } from "../../src/lib/editorial";
import { seedEditorialDevelopment } from "../../prisma/seed-editorial-data";
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith("_test")||process.env.DATABASE_URL!==url)throw new Error("Use isolated test runner.");
const db=createDatabaseClient(url);after(()=>db.$disconnect());
let owner:string,editor:string,viewer:string,category:string,id:string;
let input:ArticleInput;
const current=async()=>{const record=await adminArticle(owner,id,db);assert.ok(record);return record;};
test("editorial seed is bounded, reproducible, preserves edits and never publishes",async()=>{
  assert.equal((await seedEditorialDevelopment(db)).created,6);assert.equal((await seedEditorialDevelopment(db)).created,0);
  assert.equal(await db.article.count({where:{slug:{in:["business-automation-pilot","ai-productivity-briefing-checklist","evaluate-ai-tools-with-task-fixtures","marketing-automation-approval-queue","ai-assisted-code-review-small-changes","data-analysis-filter-before-ai-summary"]},status:"IN_REVIEW",reviewedAt:null,publishedAt:null,isDemo:false}}),6);
  await db.article.update({where:{slug:"business-automation-pilot"},data:{excerpt:"Retain manual edit"}});await seedEditorialDevelopment(db);assert.equal((await db.article.findUniqueOrThrow({where:{slug:"business-automation-pilot"}})).excerpt,"Retain manual edit");
  assert.equal((await listPublicArticles({q:"business automation pilot",page:1},db)).total,0);
});
test("editors persist structured drafts with relations and historical snapshots",async()=>{
  owner=(await db.user.create({data:{email:"owner@editorial.invalid",active:true,role:"OWNER"}})).id;editor=(await db.user.create({data:{email:"editor@editorial.invalid",active:true,role:"EDITOR"}})).id;viewer=(await db.user.create({data:{email:"viewer@editorial.invalid",active:true,role:"VIEWER"}})).id;
  category=(await db.category.create({data:{name:"Editorial integration",slug:"editorial-integration"}})).id;
  input={...blankArticle,title:"Editorial integration",slug:"editorial-integration",excerpt:"Persistent article fixture",body:{version:1,blocks:[{type:"heading",level:2,text:"A section"},{type:"paragraph",text:"Original body"}]},sources:[{title:"Test fixture reference",url:"https://example.org",note:"Isolated editorial test; no verified business claim.",status:"PENDING",checkedAt:null}],categoryIds:[category],metaTitle:"Editorial SEO title",metaDescription:"Editorial SEO description",status:"IN_REVIEW"};
  id=(await saveArticle(editor,input,undefined,db)).id;const record=await current();assert.equal(record.data.body.blocks.length,2);assert.deepEqual(record.data.categoryIds,[category]);assert.equal(record.revisions.length,1);assert.equal((await adminArticles(owner,{q:"editorial-integration",page:1},db)).total,1);assert.equal(await readPublicArticle(input.slug,db),null);
  await assert.rejects(saveArticle(viewer,input,undefined,db),{status:403});
});
test("publication requires authorized review, verified sources and the current edit version",async()=>{
  await assert.rejects(transitionArticle(editor,id,{action:"review",expectedUpdatedAt:(await current()).data.expectedUpdatedAt,confirmation:true},db),{status:403});
  await assert.rejects(transitionArticle(owner,id,{action:"review",expectedUpdatedAt:(await current()).data.expectedUpdatedAt,confirmation:true},db),{status:422});
  let record=await current();const previous=record.data.expectedUpdatedAt;input={...record.data,sources:record.data.sources.map(source=>({...source,status:"VERIFIED",checkedAt:new Date().toISOString()}))};await saveArticle(editor,input,id,db);
  await assert.rejects(saveArticle(editor,{...input,expectedUpdatedAt:previous},id,db),{status:409});
  record=await current();await assert.rejects(transitionArticle(owner,id,{action:"publish",expectedUpdatedAt:record.data.expectedUpdatedAt},db),{status:409});
  await assert.rejects(transitionArticle(owner,id,{action:"review",expectedUpdatedAt:record.data.expectedUpdatedAt},db),{status:422});
  await transitionArticle(owner,id,{action:"review",expectedUpdatedAt:record.data.expectedUpdatedAt,confirmation:true},db);
  await transitionArticle(owner,id,{action:"publish",expectedUpdatedAt:(await current()).data.expectedUpdatedAt},db);
  const publicRecord=await readPublicArticle(input.slug,db);assert.ok(publicRecord);assert.equal(publicRecord.metaTitle,input.metaTitle);assert.equal((publicRecord as unknown as Record<string,unknown>).reviewedById,undefined);
  await assert.rejects(saveArticle(editor,{...(await current()).data},id,db),{status:403});
});
test("editing or unpublishing removes public content and invalidates approval atomically",async()=>{
  const record=await current();await saveArticle(owner,{...record.data,title:"Changed editorial integration",status:"IN_REVIEW"},id,db);
  assert.equal(await readPublicArticle(input.slug,db),null);assert.equal((await current()).reviewedAt,null);assert.equal(await db.auditLog.count({where:{entityId:id,action:"article.edited_and_unpublished"}}),1);
  await transitionArticle(owner,id,{action:"review",expectedUpdatedAt:(await current()).data.expectedUpdatedAt,confirmation:true},db);await transitionArticle(owner,id,{action:"publish",expectedUpdatedAt:(await current()).data.expectedUpdatedAt},db);
  await transitionArticle(owner,id,{action:"unpublish",expectedUpdatedAt:(await current()).data.expectedUpdatedAt},db);assert.equal(await readPublicArticle(input.slug,db),null);assert.equal((await current()).publishedAt,null);
});
test("internal links must exist and be public at review; later unpublication hides their href",async()=>{
  const tool=await db.tool.create({data:{name:"Internal link fixture",slug:"editorial-linked-tool",summary:"Fixture",description:"Fixture",websiteUrl:"https://example.org"}});
  await saveArticle(owner,{...(await current()).data,status:"IN_REVIEW",body:{version:1,blocks:[{type:"link",kind:"tools",id:tool.id,label:"Read the tool"}]}},id,db);
  await assert.rejects(transitionArticle(owner,id,{action:"review",expectedUpdatedAt:(await current()).data.expectedUpdatedAt,confirmation:true},db),{status:422});
  await db.tool.update({where:{id:tool.id},data:{status:"PUBLISHED",publishedAt:new Date()}});
  await transitionArticle(owner,id,{action:"review",expectedUpdatedAt:(await current()).data.expectedUpdatedAt,confirmation:true},db);await transitionArticle(owner,id,{action:"publish",expectedUpdatedAt:(await current()).data.expectedUpdatedAt},db);
  assert.equal((await readPublicArticle(input.slug,db))?.targets[tool.id],`/tools/${tool.slug}`);
  await db.tool.update({where:{id:tool.id},data:{status:"DRAFT",publishedAt:null}});assert.equal((await readPublicArticle(input.slug,db))?.targets[tool.id],undefined);
});
test("public pagination, categories and sitemap exclude drafts, demos, future dates and noindex",async()=>{
  await db.article.createMany({data:Array.from({length:7},(_,i)=>({slug:`editorial-page-${i}`,title:`Searchable editorial ${i}`,excerpt:"Fixture",body:{version:1,blocks:[{type:"paragraph",text:"Fixture"}]},sources:input.sources.map(source=>({...source,status:"VERIFIED",checkedAt:new Date().toISOString()})),reviewedAt:new Date(),status:"PUBLISHED",publishedAt:new Date(),noindex:i===6}))});
  const first=await listPublicArticles({q:"Searchable editorial",page:1},db),second=await listPublicArticles({q:"Searchable editorial",page:2},db);assert.equal(first.items.length,6);assert.equal(second.items.length,1);assert.ok(first.items.every(item=>!second.items.some(next=>next.id===item.id)));
  assert.equal((await listPublicArticles({category:"editorial-integration",page:1,q:""},db)).total,1);
  await db.article.update({where:{slug:"editorial-page-5"},data:{publishedAt:new Date(Date.now()+86400000)}});
  const sitemap=await sitemapEntries("https://atlas.example",db);const urls=sitemap.map(row=>row.url);assert.ok(urls.includes("https://atlas.example/blog/editorial-page-0"));assert.ok(!urls.some(url=>url.endsWith("editorial-page-6")||url.endsWith("editorial-page-5")||url.includes("business-automation-pilot")||url.includes("/admin")));
  await assert.rejects(db.article.create({data:{slug:"unreviewed-publication",title:"Bad",excerpt:"Bad",body:{version:1,blocks:[]},status:"PUBLISHED",publishedAt:new Date()}}));
});

test("legacy conversion preserves the original payload and relations in a historical snapshot",async()=>{
  const original={blocks:[{type:"paragraph",text:"Legacy text that must survive"}],legacyExtra:{preserve:true}};
  const legacy=await db.article.create({data:{slug:"legacy-editorial-conversion",title:"Legacy title",excerpt:"Legacy excerpt",body:original,categories:{connect:{id:category}}}});
  const record=await adminArticle(owner,legacy.id,db);assert.ok(record);assert.equal(record.legacy,true);assert.equal((record.data.body.blocks[0] as {text:string}).text,"Legacy text that must survive");
  await saveArticle(owner,record.data,legacy.id,db);
  const snapshots=await db.contentDraft.findMany({where:{articleId:legacy.id}});const preserved=snapshots.map(row=>row.body as {kind?:string;record?:{body:unknown};relations?:{categories:{id:string}[]}}).find(value=>value.kind==="legacy-article-snapshot");
  assert.deepEqual(preserved?.record?.body,original);assert.equal(preserved?.relations?.categories[0]?.id,category);assert.equal((await adminArticle(owner,legacy.id,db))?.legacy,false);
});
