import type {PrismaClient} from "../src/generated/prisma/client";
export async function seedCommercialDevelopment(db:PrismaClient) {
 const [actual]=await db.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;
 if(process.env.NODE_ENV==="production"||!actual||!/(?:_dev|_test)$/.test(actual.name))throw new Error("Commercial seed requires a development/test database.");
 const products=[
  {slug:"homepage-featured-sponsor",kind:"HOMEPAGE_FEATURED_SPONSOR",name:"Homepage Featured Sponsor",description:"A clearly labeled sponsor placement on the homepage, with a reviewed message and a link to your product. Scope and dates are confirmed in the proposal; no audience or traffic guarantee."},
  {slug:"newsletter-sponsorship",kind:"NEWSLETTER_SPONSORSHIP",name:"Newsletter Sponsorship",description:"A proposed, clearly labeled sponsorship in a future newsletter edition. We can record your interest now; delivery depends on newsletter readiness and a separate commercial agreement."},
  {slug:"featured-tool-listing",kind:"FEATURED_TOOL_LISTING",name:"Featured Tool Listing",description:"A paid placement for a published tool, visually separated from independent listings and labeled Sponsored. Placement does not change editorial conclusions or imply a product endorsement."},
  {slug:"sponsored-article",kind:"SPONSORED_ARTICLE",name:"Sponsored Article",description:"A commercial placement associated with a reviewed, published article, with an explicit sponsorship disclosure. Claims and sources remain subject to editorial review before delivery."},
 ] as const;
 return db.$transaction(async tx=>{for(const item of products){await tx.sponsorshipPackage.upsert({where:{kind:item.kind},update:{},create:item});await tx.sponsorshipPackage.updateMany({where:{kind:item.kind,description:"Inactive until reviewed and configured by the owner. No price or sale is implied."},data:{description:item.description}});}return {products:4};});
}
