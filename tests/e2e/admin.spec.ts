import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import pg from "pg";
if (process.env.ATLAS_ISOLATED_E2E !== "true" || !process.env.ATLAS_TEST_PASSWORD) throw new Error("Use the isolated E2E wrapper.");
const origin = "http://127.0.0.1:3100";
const identity = (role: string, project: string) => `${role}-${project}@e2e.invalid`;
async function login(request: APIRequestContext, project: string, role = "owner") {
  const response = await request.post("/api/admin/login", { headers: { Origin: origin }, data: { email: identity(role,project), password: process.env.ATLAS_TEST_PASSWORD } });
  expect(response.status()).toBe(200);
  const session = await request.get("/api/admin/session"); expect(session.status()).toBe(200); return (await session.json()).csrfToken as string;
}
const jsonHeaders = (csrf: string) => ({ Origin: origin, "x-csrf-token": csrf });
async function loginUi(page: Page, project: string) {
  await page.goto("/login"); await page.getByLabel("Correo electrónico").fill(identity("owner",project)); await page.getByLabel("Contraseña", { exact: true }).fill(process.env.ATLAS_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click(); await expect(page).toHaveURL(/\/admin$/);
}
test("anonymous requests never receive private data and forged sessions do not authenticate", async ({ page, request }) => {
  await page.goto("/admin"); await expect(page).toHaveURL(/\/login$/); await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  for (const route of ["/api/admin/session", "/api/admin/content/tools", "/api/admin/settings"]) {
    const response = await request.get(route); expect(response.status()).toBe(401); expect(response.headers()["cache-control"]).toContain("no-store"); expect((await response.json()).error).toContain("iniciar sesión");
  }
  expect((await request.get("/api/admin/content/tools", { headers: { Cookie: `atlas_session=${"a".repeat(64)}` } })).status()).toBe(401);
});
test("login handles invalid credentials and valid sessions with safe cookies, then logout revokes the token", async ({ page, context, request }, info) => {
  await page.goto("/login"); await page.getByLabel("Correo electrónico").fill(`invalid-${info.project.name}@e2e.invalid`); await page.getByLabel("Contraseña",{exact:true}).fill("invalid-test-input");
  await page.getByRole("button",{name:"Iniciar sesión"}).click(); await expect(page.locator(".admin-alert")).toHaveText("Correo o contraseña incorrectos.");
  await loginUi(page,info.project.name); await expect(page.getByRole("heading",{name:"Tu atlas, bajo control"})).toBeVisible();
  const cookie = (await context.cookies()).find(c => c.name === "atlas_session")!; expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe("Lax");
  const html = await page.content(); expect(html).not.toContain(process.env.ATLAS_TEST_PASSWORD!); expect(html).not.toContain("scrypt-v1$");
  await page.getByRole("button",{name:"Cerrar sesión"}).click(); await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/admin/session",{headers:{Cookie:`atlas_session=${cookie.value}`}})).status()).toBe(401);
});
test("mutations reject missing CSRF, foreign origins, invalid bodies and mass assignment", async ({ request },info) => {
  expect((await request.post("/api/admin/login",{headers:{Origin:"https://evil.invalid"},data:{email:identity("owner",info.project.name),password:process.env.ATLAS_TEST_PASSWORD}})).status()).toBe(403);
  const csrf = await login(request,info.project.name);
  const data = { name:"Rejected",slug:`rejected-${info.project.name}` };
  expect((await request.post("/api/admin/content/tags",{headers:{Origin:origin},data})).status()).toBe(403);
  expect((await request.post("/api/admin/content/tags",{headers:{...jsonHeaders(csrf),Origin:"https://evil.invalid"},data})).status()).toBe(403);
  expect((await request.post("/api/admin/content/tags",{headers:jsonHeaders(csrf),data:{...data,role:"OWNER"}})).status()).toBe(422);
  expect((await request.post("/api/admin/content/tags",{headers:{...jsonHeaders(csrf),"Content-Type":"application/json"},data:Buffer.from("{")})).status()).toBe(400);
  expect((await request.post("/api/admin/content/tags",{headers:jsonHeaders(csrf),data:{...data,name:"x".repeat(65000)}})).status()).toBe(413);
});
test("viewer login is denied and editor permissions hold on pages and every mutation", async ({ page },info) => {
  expect((await page.request.post("/api/admin/login",{headers:{Origin:origin},data:{email:identity("viewer",info.project.name),password:process.env.ATLAS_TEST_PASSWORD}})).status()).toBe(403);
  const csrf=await login(page.request,info.project.name,"editor"); await page.goto("/admin/settings"); await expect(page.getByRole("heading",{name:"Acceso restringido"})).toBeVisible();
  const slug=`editor-${info.project.name}`; const data={name:slug,slug,summary:"Fixture",description:"Fixture",websiteUrl:"https://example.invalid",categoryIds:[],tagIds:[],status:"DRAFT"};
  const response=await page.request.post("/api/admin/content/tools",{headers:jsonHeaders(csrf),data}); expect(response.status()).toBe(201); const {id}=await response.json();
  expect((await page.request.put(`/api/admin/content/tools/${id}`,{headers:jsonHeaders(csrf),data:{...data,status:"PUBLISHED"}})).status()).toBe(403);
  expect((await page.request.delete(`/api/admin/content/tools/${id}`,{headers:jsonHeaders(csrf),data:{confirmation:slug}})).status()).toBe(403);
  expect((await page.request.put("/api/admin/settings",{headers:jsonHeaders(csrf),data:{editorialGuidelines:"Rejected",defaultStatus:"DRAFT"}})).status()).toBe(403);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL}); await db.connect();
  try { await db.query('DELETE FROM "Tool" WHERE id=$1',[id]); } finally { await db.end(); }
});
test("four CRUD interfaces create, persist, edit, filter and confirm deletion", async ({ page },info) => {
  await loginUi(page,info.project.name);
  for (const kind of ["categories","tags","tools","use-cases"]) {
    const name=`Fixture ${kind} ${info.project.name}`; const slug=`fixture-${kind}-${info.project.name}`;
    await page.goto(`/admin/${kind}/new`); await page.getByLabel("Nombre",{exact:true}).fill(name); await page.getByLabel("Slug",{exact:true}).fill(slug);
    if(kind==="categories" || kind==="tools") await page.getByLabel("Descripción",{exact:true}).fill("Isolated test fixture.");
    if(kind==="tools") { await page.getByLabel("Resumen",{exact:true}).fill("Isolated fixture."); await page.getByLabel("Enlace oficial").fill("https://example.invalid"); }
    if(kind==="use-cases") { for(const label of ["Problema","Solución","Limitaciones"]) await page.getByLabel(label,{exact:true}).fill("Isolated fixture."); await page.getByLabel("Pasos (uno por línea)").fill("First step\nSecond step"); }
    await page.getByRole("button",{name:"Guardar cambios"}).click(); await expect(page).toHaveURL(new RegExp(`/admin/${kind}/[a-f0-9-]{36}$`));
    await page.reload(); await expect(page.getByLabel("Nombre",{exact:true})).toHaveValue(name);
    await page.getByLabel("Nombre",{exact:true}).fill(`${name} editado`); await page.getByRole("button",{name:"Guardar cambios"}).click(); await expect(page.getByRole("status")).toHaveText("Cambios guardados.");
    await page.reload(); await expect(page.getByLabel("Nombre",{exact:true})).toHaveValue(`${name} editado`);
    await page.getByRole("button",{name:"Eliminar registro"}).click(); await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Nombre de confirmación").fill("Wrong name"); await page.getByRole("button",{name:"Eliminar definitivamente"}).click(); await expect(page.getByRole("dialog").getByRole("alert")).toContainText("coincidir");
    await page.getByLabel("Nombre de confirmación").fill(`${name} editado`); await page.getByRole("button",{name:"Eliminar definitivamente"}).click(); await expect(page).toHaveURL(new RegExp(`/admin/${kind}$`));
    await page.getByRole("searchbox").fill(slug); await page.getByRole("button",{name:"Filtrar",exact:true}).click(); await expect(page.getByRole("heading",{name:"No hay resultados"})).toBeVisible();
  }
});
test("related records cannot be deleted, duplicate slugs conflict and pagination is real", async ({ request },info) => {
  const csrf=await login(request,info.project.name); const headers=jsonHeaders(csrf); const slug=`rel-${info.project.name}`;
  const categoryResponse=await request.post("/api/admin/content/categories",{headers,data:{name:slug,slug,description:"Fixture"}}); const category=await categoryResponse.json(); expect(categoryResponse.status()).toBe(201);
  expect((await request.post("/api/admin/content/categories",{headers,data:{name:slug,slug}})).status()).toBe(409);
  const data={name:slug,slug,summary:"Fixture",description:"Fixture",websiteUrl:"https://example.invalid",categoryIds:[category.id],tagIds:[],status:"DRAFT"};
  const created=await request.post("/api/admin/content/tools",{headers,data}); expect(created.status()).toBe(201); const tool=await created.json();
  expect((await request.delete(`/api/admin/content/categories/${category.id}`,{headers,data:{confirmation:slug}})).status()).toBe(409);
  expect((await request.get("/api/admin/content/tools?q="+slug)).status()).toBe(200);
  expect((await (await request.get("/api/admin/content/tools?page=9999")).json()).rows).toEqual([]);
  expect((await request.delete(`/api/admin/content/tools/${tool.id}`,{headers,data:{confirmation:slug}})).status()).toBe(200);
  expect((await request.delete(`/api/admin/content/categories/${category.id}`,{headers,data:{confirmation:slug}})).status()).toBe(200);
});
test("fresh account revocation invalidates existing cookies immediately", async ({ request },info) => {
  const csrf=await login(request,info.project.name,"editor"); const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL}); await db.connect();
  // Dedicated extra account avoids altering a concurrently exercised editor identity.
  const email=`revocation-${randomUUID()}@e2e.invalid`; const id=randomUUID();
  try {
    await db.query('INSERT INTO "User" (id,email,role,active,"passwordHash","updatedAt") SELECT $1,$2,role,true,"passwordHash",NOW() FROM "User" WHERE email=$3',[id,email,identity("editor",info.project.name)]);
    expect((await request.post("/api/admin/login",{headers:{Origin:origin},data:{email,password:process.env.ATLAS_TEST_PASSWORD}})).status()).toBe(200);
    await db.query('UPDATE "User" SET active=false WHERE id=$1',[id]);
    expect((await request.get("/api/admin/session")).status()).toBe(401);
    expect((await request.post("/api/admin/content/tags",{headers:jsonHeaders(csrf),data:{name:"Denied",slug:"denied"}})).status()).toBe(401);
  } finally { await db.query('DELETE FROM "User" WHERE id=$1',[id]); await db.end(); }
});
test("admin screens fit mobile and pass automated accessibility checks", async ({ page },info) => {
  await page.emulateMedia({reducedMotion:"reduce"}); await page.goto("/login");
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze()).violations).toEqual([]);
  await loginUi(page,info.project.name);
  for(const route of ["/admin","/admin/tools","/admin/tools/new","/admin/settings","/admin/modules/commercial"]) {
    await page.goto(route); await expect(page.getByRole("heading",{level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze()).violations).toEqual([]);
  }
  await page.goto("/admin"); await expect(page.getByRole("heading",{name:"Tu atlas, bajo control"})).toBeVisible(); await page.screenshot({path:info.outputPath("admin-viewport.png"),fullPage:true,animations:"disabled"});
  await page.setViewportSize({width:320,height:850}); await page.goto("/admin"); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath("admin.png"),fullPage:true,animations:"disabled"});
});

test("editorial settings persist and become defaults in new content forms", async ({ page },info) => {
  await loginUi(page,info.project.name);
  await page.goto("/admin/settings");
  const previousGuidelines=await page.getByRole("textbox",{name:"Guía editorial",exact:true}).inputValue();
  const previousStatus=await page.getByLabel("Estado inicial del contenido").inputValue();
  try {
    await page.getByRole("textbox",{name:"Guía editorial",exact:true}).fill("Guía temporal comprobada por E2E.");
    await page.getByLabel("Estado inicial del contenido").selectOption("IN_REVIEW");
    await page.getByRole("button",{name:"Guardar configuración"}).click();
    await expect(page.getByRole("status")).toHaveText("Configuración guardada.");
    await page.reload(); await expect(page.getByRole("textbox",{name:"Guía editorial",exact:true})).toHaveValue("Guía temporal comprobada por E2E.");
    await page.goto("/admin/tools/new"); await expect(page.getByRole("combobox",{name:"Estado",exact:true})).toHaveValue("IN_REVIEW");
    await expect(page.getByText("Guía temporal comprobada por E2E.",{exact:true})).toBeVisible();
  } finally {
    await page.goto("/admin/settings"); await page.getByRole("textbox",{name:"Guía editorial",exact:true}).fill(previousGuidelines); await page.getByLabel("Estado inicial del contenido").selectOption(previousStatus);
    await page.getByRole("button",{name:"Guardar configuración"}).click(); await expect(page.getByRole("status")).toHaveText("Configuración guardada.");
  }
});
