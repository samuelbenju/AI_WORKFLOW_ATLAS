import { test,expect,type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { withAppServer } from "./test-server";
if(process.env.ATLAS_ISOLATED_E2E!=="true"||!process.env.ATLAS_TEST_PASSWORD)throw new Error("Use isolated E2E runner.");
const origin="http://127.0.0.1:3100";
async function login(request:APIRequestContext,project:string,role="owner") {
  expect((await request.post("/api/admin/login",{headers:{Origin:origin},data:{email:`${role}-${project}@e2e.invalid`,password:process.env.ATLAS_TEST_PASSWORD}})).status()).toBe(200);
  return (await (await request.get("/api/admin/session")).json()).csrfToken as string;
}
async function withPublishedFixtures(project:string,callback:(slugs:string[])=>Promise<void>) {
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();const ids:string[]=[];const category=randomUUID();const prefix=`journal-${project}`;
  try {
    await db.query('INSERT INTO "Category" (id,slug,name,"updatedAt") VALUES ($1,$2,$3,NOW())',[category,prefix,`Journal ${project}`]);
    for(let i=0;i<8;i++) {
      const id=randomUUID();ids.push(id);const title=`Journal ${project} guide ${i}`;
      await db.query('INSERT INTO "Article" (id,slug,title,excerpt,body,sources,status,"publishedAt","reviewedAt","metaTitle","metaDescription","coverKey","coverAlt",noindex,"updatedAt") VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,\'PUBLISHED\',NOW(),NOW(),$7,$8,\'data\',\'Connected workflow stages\',$9,NOW())',[id,`${prefix}-${i}`,title,"Isolated editorial fixture; no real business claim.",JSON.stringify({version:1,blocks:[{type:"heading",level:2,text:"A useful section"},{type:"paragraph",text:"Isolated editorial test content."},{type:"code",language:"text",text:"<script>window.fixtureInjected=true</script>"}]}),JSON.stringify([{title:"Fixture reference",url:"https://example.org",note:"Isolated E2E fixture, not an editorial endorsement.",status:"VERIFIED",checkedAt:new Date().toISOString()}]),`SEO ${title}`,"A dedicated SEO fixture description.",i===7]);
      await db.query('INSERT INTO "_ArticleToCategory" ("A","B") VALUES ($1,$2)',[id,category]);
    }
    await callback(ids.map((_,i)=>`${prefix}-${i}`));
  } finally {await db.query('DELETE FROM "Article" WHERE id=ANY($1::uuid[])',[ids]);await db.query('DELETE FROM "Category" WHERE id=$1',[category]);await db.end();}
}
test("editorial routes and operations remain private, with editor publication denied",async({page,request},info)=>{
  await page.goto("/admin/articles");await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/admin/articles")).status()).toBe(401);
  const csrf=await login(request,info.project.name,"editor");
  expect((await request.patch(`/api/admin/articles/${randomUUID()}`,{headers:{Origin:origin,"x-csrf-token":csrf},data:{action:"publish",expectedUpdatedAt:new Date().toISOString()}})).status()).toBe(403);
  expect((await request.post("/api/admin/articles",{headers:{Origin:origin},data:{}})).status()).toBe(403);
  const drafts=await request.get("/api/admin/articles?q=business-automation-pilot");expect((await drafts.json()).total).toBe(1);
  const publicDraft=await request.get("/blog/business-automation-pilot");expect(await publicDraft.text()).not.toContain("Design a business automation pilot");
});
test("CMS creates, edits, reviews, publishes and unpublishes a real article safely",async({page},info)=>{
  await login(page.request,info.project.name);await page.goto("/admin/articles/new");const title=`Browser editorial ${info.project.name}`;const slug=`browser-editorial-${info.project.name}`;
  await page.getByRole("textbox",{name:"Título",exact:true}).fill(title);await page.getByRole("textbox",{name:"Slug",exact:true}).fill(slug);await page.getByRole("textbox",{name:"Resumen",exact:true}).fill("Isolated browser fixture.");
  const literal='<script>window.editorialInjected=true</script>';
  await page.getByRole("textbox",{name:"Texto del bloque 1",exact:true}).fill(literal);
  await page.getByRole("button",{name:"Encabezado",exact:true}).click();await page.getByRole("textbox",{name:"Texto del bloque 2",exact:true}).fill("Practical section");
  await page.getByRole("textbox",{name:"Título SEO",exact:true}).fill(`SEO ${title}`);await page.getByRole("textbox",{name:"Descripción SEO",exact:true}).fill("A reviewed SEO fixture description.");
  await page.getByRole("group",{name:"Categorías",exact:true}).getByRole("checkbox",{name:"Productivity",exact:true}).check();
  await page.getByRole("button",{name:"Añadir fuente",exact:true}).click();await page.getByRole("textbox",{name:"Título de la fuente 1",exact:true}).fill("Fixture source");await page.getByRole("textbox",{name:"URL de la fuente 1",exact:true}).fill("https://example.org");await page.getByRole("textbox",{name:"Comprobación de la fuente 1",exact:true}).fill("Isolated fixture; no real-world factual claim.");await page.getByRole("checkbox",{name:"Fuente comprobada",exact:true}).check();
  await page.getByRole("combobox",{name:"Guardar como",exact:true}).selectOption("IN_REVIEW");await page.getByRole("button",{name:"Guardar artículo",exact:true}).click();await expect(page).toHaveURL(/\/admin\/articles\/[a-f0-9-]{36}$/);const editorUrl=page.url();
  await page.reload();await expect(page.getByRole("textbox",{name:"Título",exact:true})).toHaveValue(title);
  await page.getByRole("textbox",{name:"Resumen",exact:true}).fill("Edited and persisted fixture.");await page.getByRole("button",{name:"Guardar artículo",exact:true}).click();await expect(page.getByRole("status")).toContainText("Artículo guardado");
  await page.getByRole("link",{name:"Previsualizar guardado",exact:true}).click();await expect(page.getByRole("heading",{level:1})).toHaveText(title);await expect(page.locator(".article-prose")).toContainText(literal);expect(await page.evaluate(()=>"editorialInjected" in window)).toBe(false);
  await page.goto(editorUrl);await page.getByRole("checkbox",{name:"Verifiqué las afirmaciones y sus fuentes",exact:true}).check();await page.getByRole("button",{name:"Aprobar revisión",exact:true}).click();await expect(page.getByRole("button",{name:"Publicar artículo",exact:true})).toBeEnabled();await page.getByRole("button",{name:"Publicar artículo",exact:true}).click();await expect(page.getByRole("status")).toHaveText("Artículo publicado.");
  await page.goto(`/blog/${slug}`);await expect(page.getByRole("heading",{level:1})).toHaveText(title);await expect(page).toHaveTitle(new RegExp(`SEO ${title}`));await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href",new RegExp(`/blog/${slug}$`));await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content","article");await expect(page.locator(".article-prose")).toContainText(literal);expect(await page.evaluate(()=>"editorialInjected" in window)).toBe(false);
  const json=await page.locator('script[type="application/ld+json"]').textContent();expect(JSON.parse(json!)["@graph"][0]["@type"]).toBe("BlogPosting");
  await page.goto(editorUrl);await page.getByRole("button",{name:"Despublicar artículo",exact:true}).click();await expect(page.getByRole("status")).toHaveText("Artículo retirado de la publicación.");await page.goto(`/blog/${slug}`);await expect(page.getByRole("heading",{name:"This path isn’t on the atlas."})).toBeVisible();
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();try{await db.query('DELETE FROM "Article" WHERE slug=$1',[slug]);}finally{await db.end();}
});
test("blog searches PostgreSQL, filters categories, paginates and shows related articles",async({page},info)=>{
  await withPublishedFixtures(info.project.name,async(slugs)=>{
    await page.goto(`/blog?q=Journal+${info.project.name}`);await expect(page.getByTestId("article-card")).toHaveCount(6);
    await page.getByRole("combobox",{name:"Category",exact:true}).selectOption(`journal-${info.project.name}`);await page.getByRole("button",{name:"Apply filters"}).click();await expect(page.getByTestId("article-card")).toHaveCount(6);
    const first=await page.getByTestId("article-card").getByRole("heading").allTextContents();await page.getByRole("link",{name:"Next →",exact:true}).click();await expect(page.getByTestId("article-card")).toHaveCount(2);expect((await page.getByTestId("article-card").getByRole("heading").allTextContents()).every(title=>!first.includes(title))).toBe(true);
    await page.goto(`/blog/${slugs[0]}`);await expect(page.getByRole("heading",{name:"Related articles",exact:true})).toBeVisible();await expect(page.getByTestId("article-card")).toHaveCount(3);await expect(page.locator(".article-code code")).toHaveText("<script>window.fixtureInjected=true</script>");expect(await page.evaluate(()=>"fixtureInjected" in window)).toBe(false);
    await page.goto("/blog?q=unmatchable-article-search");await expect(page.getByRole("heading",{name:"Good guides take careful work."})).toBeVisible();await page.goto("/blog?page=0");await expect(page.getByRole("heading",{name:"Those filters need a quick check."})).toBeVisible();
  });
});
test("pre-launch SEO stays blocked and sitemap/metadata switch consistently for an explicit released configuration",async({page,request},info)=>{
  const robots=await request.get("/robots.txt");expect(await robots.text()).toContain("Disallow: /");expect(await (await request.get("/sitemap.xml")).text()).not.toContain("<loc>");
  await withPublishedFixtures(`seo-${info.project.name}`,async(slugs)=>{
    await withAppServer({SEO_INDEXING_ENABLED:"true",SITE_URL:"https://atlas.example",CATALOG_DEMO_MODE:"false"},async(url)=>{
      const robot=await page.request.get(`${url}/robots.txt`);expect(await robot.text()).toContain("Sitemap: https://atlas.example/sitemap.xml");expect(await robot.text()).toContain("Disallow: /admin");
      const sitemap=await page.request.get(`${url}/sitemap.xml`);const xml=await sitemap.text();expect(xml).toContain(`/blog/${slugs[0]}</loc>`);expect(xml).not.toContain(`/blog/${slugs[7]}</loc>`);expect(xml).not.toContain("/admin");expect(xml).not.toContain("business-automation-pilot");
      const response=await page.goto(`${url}/blog/${slugs[0]}`);expect(response?.headers()["x-robots-tag"]).toBeUndefined();await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","index, follow");await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href",`https://atlas.example/blog/${slugs[0]}`);
      await page.goto(`${url}/blog/${slugs[7]}`);await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, follow");
      const filtered=await page.goto(`${url}/blog?q=Journal`);expect(filtered?.headers()["x-robots-tag"]).toBe("noindex, follow");await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, follow");
      expect((await page.request.get(`${url}/admin/articles`)).headers()["x-robots-tag"]).toBe("noindex, nofollow");
      const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();try{await db.query('UPDATE "Article" SET status=\'DRAFT\',"publishedAt"=NULL WHERE slug=$1',[slugs[0]]);expect(await (await page.request.get(`${url}/sitemap.xml`)).text()).not.toContain(`/blog/${slugs[0]}</loc>`);}finally{await db.end();}
    });
  });
});
test("editorial screens fit mobile, use optimized images and pass axe",async({page},info)=>{
  await withPublishedFixtures(`a11y-${info.project.name}`,async(slugs)=>{
    await page.emulateMedia({reducedMotion:"reduce"});
    for(const path of ["/blog",`/blog/${slugs[0]}`]){await page.goto(path);await expect(page.getByRole("heading",{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze()).violations).toEqual([]);}
    const cover=page.locator(".article-cover");await expect(cover).toHaveAttribute("src",/^\/_next\/image\?/);await expect(cover).toHaveAttribute("srcset",/640w|1200w/);expect(await cover.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({path:info.outputPath("article.png"),fullPage:true,animations:"disabled"});
    await login(page.request,info.project.name);await page.goto("/admin/articles/new");expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze()).violations).toEqual([]);await page.setViewportSize({width:320,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  });
});
