import "server-only";
import type {PackageKind,PrismaClient} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {httpsUrl} from "@/lib/commercial";
export async function activePlacements(kind:PackageKind,targetId?:string,db:PrismaClient=getDatabase(),mode: "published"|"preview"=process.env.CATALOG_DEMO_MODE==="true"?"preview":"published") {
 if(mode==="preview"||kind==="NEWSLETTER_SPONSORSHIP")return [];
 const now=new Date();
 const rows=await db.sponsorshipCampaign.findMany({where:{status:"ACTIVE",approvedAt:{not:null},approvedById:{not:null},startsAt:{lte:now},endsAt:{gt:now},package:{kind,active:true},
  ...(targetId?(kind==="FEATURED_TOOL_LISTING"?{toolId:targetId}:{articleId:targetId}):{}),
  order:{status:"PAID",environment:"PRODUCTION",paidAt:{lte:now},transactions:{some:{status:"APPROVED",environment:"PRODUCTION",confirmedAt:{lte:now},events:{some:{verifiedAt:{lte:new Date()},processedAt:{lte:new Date()}}}}}},
  ...(kind==="FEATURED_TOOL_LISTING"?{tool:{status:"PUBLISHED",isDemo:false,publishedAt:{lte:now}}}:{}),...(kind==="SPONSORED_ARTICLE"?{article:{status:"PUBLISHED",isDemo:false,publishedAt:{lte:now},reviewedAt:{not:null}}}:{}),
 },select:{id:true,headline:true,message:true,destinationUrl:true,startsAt:true,endsAt:true,contractDurationDays:true,contractAmountMinor:true,contractCurrency:true,order:{select:{amountMinor:true,currency:true}},sponsor:{select:{name:true}},tool:{select:{slug:true}},article:{select:{slug:true}}},take:6,orderBy:{startsAt:"asc"}});
 return rows.filter(row=>row.headline&&row.message&&row.destinationUrl&&httpsUrl.safeParse(row.destinationUrl).success&&row.startsAt&&row.endsAt&&row.contractDurationDays&&row.endsAt.getTime()-row.startsAt.getTime()<=row.contractDurationDays*86400000&&row.contractAmountMinor!==null&&row.contractAmountMinor>0n&&row.order&&row.contractAmountMinor===row.order.amountMinor&&row.contractCurrency===row.order.currency).map(row=>({id:row.id,headline:row.headline!,message:row.message!,destinationUrl:row.destinationUrl!,sponsorName:row.sponsor.name,contentHref:row.tool?`/tools/${row.tool.slug}`:row.article?`/blog/${row.article.slug}`:null}));
}
