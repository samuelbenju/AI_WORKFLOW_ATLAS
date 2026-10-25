import {test} from "node:test";
import {strict as assert} from "node:assert";
import {randomUUID} from "node:crypto";
import {inquirySchema,packageSchema,campaignSchema,formatPrice,consentVersion} from "../../src/lib/commercial";
import {can} from "../../src/server/auth/policy";
const input={submissionId:randomUUID(),token:"a".repeat(80),packageId:randomUUID(),packageUpdatedAt:new Date().toISOString(),companyName:"Fixture company",contactName:"Fixture contact",email:"OWNER@example.org",websiteUrl:"https://example.org",message:"A meaningful isolated campaign proposal.",consent:true,consentVersion,requestedStartsAt:null,websiteConfirmation:""};
test("commercial inquiries require consent and reject unsafe sites, price tampering and unknown fields",()=>{
 assert.equal(inquirySchema.parse(input).email,"owner@example.org");
 for(const change of [{consent:false},{consentVersion:"outdated"},{websiteUrl:"javascript:alert(1)"},{websiteUrl:"https://u:p@example.org"},{websiteUrl:"invalid"},{amountMinor:"1"},{status:"WON"},{message:"short"}])assert.equal(inquirySchema.safeParse({...input,...change}).success,false);
});
test("prices preserve integer minor units and packages need configured terms before campaigns",()=>{
 const data={name:"Package",description:"A real format description",amountMinor:null,currency:"USD",durationDays:null,active:false,acceptingInquiries:true,availability:"WAITLIST",expectedUpdatedAt:new Date().toISOString()};
 assert.ok(packageSchema.safeParse(data).success);assert.equal(packageSchema.safeParse({...data,active:true}).success,false);
 for(const amountMinor of ["0","1.20","-50","100000000000000"])assert.equal(packageSchema.safeParse({...data,amountMinor}).success,false);
 assert.equal(formatPrice("12345","USD"),"$123.45");assert.equal(formatPrice(null,"COP"),"Custom quote");
});
test("CRM permissions exclude editors and campaign inputs reject direct activation",()=>{
 assert.ok(can("OWNER","commercial"));assert.ok(can("ADMIN","commercial"));assert.equal(can("EDITOR","commercial"),false);assert.equal(can("VIEWER","commercial"),false);
 const data={name:"Fixture",sponsorId:randomUUID(),packageId:randomUUID(),orderId:null,headline:"Fixture headline",message:"Fixture content only",destinationUrl:"https://example.org",startsAt:"2026-01-01T00:00:00.000Z",endsAt:"2026-01-02T00:00:00.000Z",toolId:null,articleId:null};
 assert.ok(campaignSchema.safeParse(data).success);assert.equal(campaignSchema.safeParse({...data,status:"ACTIVE"}).success,false);assert.equal(campaignSchema.safeParse({...data,endsAt:data.startsAt}).success,false);
});
