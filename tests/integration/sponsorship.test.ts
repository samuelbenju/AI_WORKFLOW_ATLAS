import {test,after} from "node:test";
import {strict as assert} from "node:assert";
import {randomBytes,randomUUID} from "node:crypto";
import {createDatabaseClient} from "../../src/server/db/client";
import {seedCommercialDevelopment} from "../../prisma/seed-commercial-data";
import {issueInquiryForm,verifyInquiryForm,commercialDigest} from "../../src/server/commercial/config";
import {submitInquiry,publicPackages} from "../../src/server/commercial/intake";
import {crmOverview,crmLead,savePackage,saveCompany,updateLead,addLeadNote,prepareProposal,saveCampaign,transitionCampaign,crmCampaigns} from "../../src/server/commercial/admin";
import {activePlacements} from "../../src/server/commercial/placements";
import {consentVersion} from "../../src/lib/commercial";
const url=process.env.TEST_DATABASE_URL;if(!url||!new URL(url).pathname.endsWith("_test")||process.env.DATABASE_URL!==url)throw new Error("Use isolated test runner.");
process.env.SPONSOR_FORM_SECRET=randomBytes(32).toString("hex");const db=createDatabaseClient(url);after(()=>db.$disconnect());
let owner:string,editor:string,productId:string,leadId:string,companyId:string,campaignId:string;
async function inquiry(email="inquiry@sponsorship.invalid",message="Isolated sponsorship fixture, not a real commercial campaign.") {const product=await db.sponsorshipPackage.findUniqueOrThrow({where:{kind:"HOMEPAGE_FEATURED_SPONSOR"}});return {...issueInquiryForm(),packageId:product.id,packageUpdatedAt:product.updatedAt.toISOString(),companyName:"Sponsorship fixture",contactName:"Test operator",email,websiteUrl:"https://example.org",message,consent:true,consentVersion,requestedStartsAt:null,websiteConfirmation:""};}
async function campaign(){return (await crmCampaigns(owner,db)).campaigns.find(row=>row.id===campaignId)!;}
async function phase(action:string,confirmation=true){const row=await campaign();return transitionCampaign(owner,row.id,{action,confirmation,expectedUpdatedAt:row.updatedAt},db);}
test("commercial seed preserves configured prices and creates no sales or companies",async()=>{
 const before=await Promise.all([db.sponsor.count(),db.commercialLead.count(),db.sponsorshipCampaign.count()]);await seedCommercialDevelopment(db);const rows=await publicPackages(db);assert.equal(rows.length,4);assert.ok(rows.every(row=>typeof row.id==="string"));
 await seedCommercialDevelopment(db);assert.deepEqual(await Promise.all([db.sponsor.count(),db.commercialLead.count(),db.sponsorshipCampaign.count()]),before);
 owner=(await db.user.create({data:{email:"owner@sponsorship.invalid",role:"OWNER",active:true}})).id;editor=(await db.user.create({data:{email:"editor@sponsorship.invalid",role:"EDITOR",active:true}})).id;productId=rows.find(row=>row.kind==="HOMEPAGE_FEATURED_SPONSOR")!.id;
});
test("form signatures expire and cannot be replayed with a different request identity",()=>{
 const form=issueInquiryForm();verifyInquiryForm(form.submissionId,form.token);assert.throws(()=>verifyInquiryForm(randomUUID(),form.token),{status:403});assert.throws(()=>verifyInquiryForm(form.submissionId,form.token,Date.now()+3600001),{status:403});
});
test("public request persists consent, reference and a price snapshot with idempotency and duplicate control",async()=>{
 const data=await inquiry();const before=await db.commercialLead.count();const result=await submitInquiry(data,db);assert.match(result.reference,/^ATLAS-[A-F0-9]{20}$/);
 assert.deepEqual(await submitInquiry(data,db),result);assert.deepEqual(await submitInquiry({...data,...issueInquiryForm()},db),result);assert.equal(await db.commercialLead.count(),before+1);
 const row=await db.commercialLead.findUniqueOrThrow({where:{reference:result.reference}});leadId=row.id;assert.equal(row.status,"NEW");assert.equal(row.consentVersion,consentVersion);assert.ok(row.consentAt);assert.equal(row.contactName,data.contactName);assert.equal(row.sponsorId,null);
 await assert.rejects(submitInquiry({...data,message:"A different campaign after the first was received."},db),{status:409});await assert.rejects(submitInquiry({...data,...issueInquiryForm(),consent:false},db));
 await assert.rejects(db.commercialLead.create({data:{submissionId:randomUUID(),companyName:"Invalid",email:"invalid@fixture.invalid",message:"Fixture",packageId:productId}}));
});
test("CRM authorizes each operation and persists states, company linkage, notes and proposal snapshots",async()=>{
 await assert.rejects(crmOverview(editor,{},db),{status:403});assert.equal((await crmOverview(owner,{q:(await db.commercialLead.findUniqueOrThrow({where:{id:leadId}})).reference},db)).total,1);
 companyId=(await saveCompany(owner,{name:"Verified fixture company",contactEmail:"company@fixture.invalid",websiteUrl:"https://example.org"},undefined,db)).id;
 let record=(await crmLead(owner,leadId,db))!;await updateLead(owner,leadId,{status:"CONTACTED",sponsorId:companyId,expectedUpdatedAt:record.updatedAt},db);
 await assert.rejects(updateLead(owner,leadId,{status:"WON",sponsorId:companyId,expectedUpdatedAt:record.updatedAt},db),{status:409});record=(await crmLead(owner,leadId,db))!;assert.equal(record.status,"CONTACTED");
 await addLeadNote(owner,leadId,{text:"Fixture note, no external contact performed."},db);await prepareProposal(owner,leadId,{title:"Fixture proposal",text:"Private proposed scope, not sent to any recipient.",validUntil:new Date(Date.now()+86400000).toISOString()},db);
 record=(await crmLead(owner,leadId,db))!;assert.equal(record.notes[0]?.text,"Fixture note, no external contact performed.");assert.equal(record.proposals[0]?.title,"Fixture proposal");assert.equal((await db.contentDraft.findUniqueOrThrow({where:{id:record.proposals[0]!.id}})).status,"DRAFT");
});
test("package prices are editable without changing past inquiry quotes and stale public terms are rejected",async()=>{
 const product=(await publicPackages(db)).find(row=>row.id===productId)!;const quote=(await crmLead(owner,leadId,db))!.quotedAmountMinor;
 const stale=await inquiry("stale@sponsorship.invalid");await savePackage(owner,productId,{name:product.name,description:product.description,amountMinor:"45000",currency:"USD",durationDays:7,active:true,acceptingInquiries:true,availability:"AVAILABLE",expectedUpdatedAt:product.updatedAt},db);
 assert.equal((await crmLead(owner,leadId,db))!.quotedAmountMinor,quote);await assert.rejects(submitInquiry(stale,db),{status:409});assert.equal((await publicPackages(db)).find(row=>row.id===productId)?.amountMinor,"45000");
});
test("public abuse counters persist and bound repeated submissions",async()=>{
 for(let i=0;i<3;i++)await submitInquiry(await inquiry("limited@sponsorship.invalid",`Limited fixture ${i}: this is an isolated rate-limit check.`),db);
 await assert.rejects(submitInquiry(await inquiry("limited@sponsorship.invalid","Fourth isolated fixture rejected by the persistent counter."),db),{status:429});
 await db.commercialRateLimit.update({where:{keyHash:commercialDigest("inquiry:email:limited@sponsorship.invalid")},data:{windowStarted:new Date(Date.now()-901000)}});assert.ok((await submitInquiry(await inquiry("limited@sponsorship.invalid","A later fixture after the explicit test window expiry."),db)).reference);
});
test("campaign drafts need no fake order and activation rejects unpaid and Sandbox records",async()=>{
 const startsAt=new Date(Date.now()-60000).toISOString(),endsAt=new Date(Date.now()+3600000).toISOString();
 campaignId=(await saveCampaign(owner,{name:"Fixture placement",sponsorId:companyId,packageId:productId,orderId:null,headline:"Fixture sponsorship",message:"A clearly labeled, isolated placement fixture.",destinationUrl:"https://example.org",startsAt,endsAt,toolId:null,articleId:null},undefined,db)).id;
 assert.equal((await campaign()).status,"DRAFT");await phase("request-review");await assert.rejects(phase("approve"),{status:422});assert.equal((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"published")).length,0);
 const order=await db.paymentOrder.create({data:{reference:`fixture-sandbox-${randomUUID()}`,sponsorId:companyId,packageId:productId,amountMinor:45000n,currency:"USD",status:"PAID",paidAt:new Date()}});
 const row=await campaign();await saveCampaign(owner,{name:row.name,sponsorId:companyId,packageId:productId,orderId:order.id,headline:row.headline,message:row.message,destinationUrl:row.destinationUrl,startsAt:row.startsAt,endsAt:row.endsAt,toolId:null,articleId:null,expectedUpdatedAt:row.updatedAt},row.id,db);await phase("request-review");await assert.rejects(phase("approve"),{status:422});
});
test("approved paid production fixtures show only inside their contract period and disappear on payment cancellation",async()=>{
 const order=await db.paymentOrder.create({data:{reference:`fixture-production-${randomUUID()}`,sponsorId:companyId,packageId:productId,amountMinor:45000n,currency:"USD",environment:"PRODUCTION",status:"PAID",paidAt:new Date(Date.now()-10000)}});
 const tx=await db.paymentTransaction.create({data:{orderId:order.id,amountMinor:order.amountMinor,currency:order.currency,environment:"PRODUCTION",provider:"isolated-fixture",providerTransactionId:randomUUID(),status:"APPROVED",confirmedAt:new Date(Date.now()-8000)}});
 await db.paymentEvent.create({data:{provider:"isolated-fixture",environment:"PRODUCTION",providerEventId:randomUUID(),transactionId:tx.id,eventType:"test.verified_fixture",payloadDigest:"f".repeat(64),verifiedAt:new Date(Date.now()-6000),processedAt:new Date(Date.now()-4000)}});
 const row=await campaign();await saveCampaign(owner,{name:row.name,sponsorId:companyId,packageId:productId,orderId:order.id,headline:row.headline,message:row.message,destinationUrl:row.destinationUrl,startsAt:row.startsAt,endsAt:row.endsAt,toolId:null,articleId:null,expectedUpdatedAt:row.updatedAt},row.id,db);
 await phase("request-review");await phase("approve");assert.equal((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"published")).length,0);await phase("activate");assert.ok((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"published")).some(item=>item.id===campaignId));assert.equal((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"preview")).length,0);
 await db.paymentOrder.update({where:{id:order.id},data:{status:"CANCELLED"}});assert.equal((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"published")).length,0);await db.paymentOrder.update({where:{id:order.id},data:{status:"PAID"}});
 await db.sponsorshipCampaign.update({where:{id:campaignId},data:{startsAt:new Date(Date.now()+60000),endsAt:new Date(Date.now()+120000)}});assert.equal((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"published")).length,0);
 await db.sponsorshipCampaign.update({where:{id:campaignId},data:{startsAt:new Date(Date.now()-120000),endsAt:new Date(Date.now()-60000)}});assert.equal((await activePlacements("HOMEPAGE_FEATURED_SPONSOR",undefined,db,"published")).length,0);
});
