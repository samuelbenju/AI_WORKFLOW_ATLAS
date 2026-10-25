import { test } from "node:test";
import { strict as assert } from "node:assert";
import { articleBodySchema,sourceSchema,articleInputSchema,blankArticle,serializeJsonLd,parseArticleQuery,articleHref } from "../../src/lib/editorial";
import { indexingEnabled,privatePath } from "../../src/lib/seo-policy";
test("structured editor accepts text as data and refuses executable blocks or arbitrary attributes",()=>{
  assert.ok(articleBodySchema.safeParse({version:1,blocks:[{type:"paragraph",text:'<script>alert("x")</script>'}]}).success);
  for(const block of [{type:"html",html:"<script>"},{type:"paragraph",text:"ok",onclick:"attack"},{type:"link",kind:"tools",id:"javascript:alert(1)",label:"x"},{type:"heading",level:1,text:"x"}]) assert.equal(articleBodySchema.safeParse({version:1,blocks:[block]}).success,false);
  assert.equal(articleBodySchema.safeParse({blocks:[]}).success,false);
});
test("editorial inputs reject unsafe sources, mass assignment and direct publication",()=>{
  const source={title:"Official documentation",url:"https://example.org",note:"Fixture",status:"VERIFIED",checkedAt:new Date().toISOString()};
  assert.ok(sourceSchema.safeParse(source).success);
  for(const url of ["invalid","javascript:alert(1)","https://user:pass@example.org","http://example.org"])assert.equal(sourceSchema.safeParse({...source,url}).success,false);
  assert.equal(sourceSchema.safeParse({...source,checkedAt:null}).success,false);
  const input={...blankArticle,title:"A",slug:"a",excerpt:"B",body:{version:1,blocks:[{type:"paragraph",text:"Fixture"}]}};
  assert.ok(articleInputSchema.safeParse(input).success);
  for(const extra of [{status:"PUBLISHED"},{reviewedAt:new Date().toISOString()},{authorId:"forged"},{coverKey:"../../secret"}])assert.equal(articleInputSchema.safeParse({...input,...extra}).success,false);
});
test("JSON-LD escapes script closing sequences while preserving the text value",()=>{
  const value={headline:'</script><img src=x onerror=alert(1)>',description:"\u2028\u2029"};const serialized=serializeJsonLd(value);
  assert.equal(serialized.includes("</script>"),false);assert.deepEqual(JSON.parse(serialized),value);
});
test("blog queries reject ambiguous inputs and preserve escaped pagination filters",()=>{
  assert.ok(parseArticleQuery({}).success);
  for(const query of [{q:["a","b"]},{page:"0"},{category:"BAD"},{q:"x".repeat(101)}])assert.equal(parseArticleQuery(query).success,false);
  assert.equal(articleHref({q:"a&b",category:"data"},2),"/blog?q=a%26b&category=data&page=2");
});
test("indexing requires explicit release configuration and always protects private paths",()=>{
  assert.equal(indexingEnabled({}),false);
  const env={SEO_INDEXING_ENABLED:"true",SITE_URL:"https://atlas.example",CATALOG_DEMO_MODE:"false"};assert.equal(indexingEnabled(env),true);
  for(const change of [{SEO_INDEXING_ENABLED:"false"},{SITE_URL:"http://localhost:3000"},{SITE_URL:undefined},{CATALOG_DEMO_MODE:"true"}])assert.equal(indexingEnabled({...env,...change}),false);
  for(const path of ["/login","/admin","/admin/articles","/api/admin/articles"])assert.equal(privatePath(path),true);
  assert.equal(privatePath("/blog/article"),false);
});
