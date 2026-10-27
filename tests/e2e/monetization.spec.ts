import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import AxeBuilder from "@axe-core/playwright";
import { withAppServer } from "./test-server";

if (process.env.ATLAS_ISOLATED_E2E !== "true" || !/^\/atlas_run_[a-f0-9]{16}_test$/.test(new URL(process.env.TEST_DATABASE_URL!).pathname)) throw new Error("Use the isolated E2E runner");
const released = {
  SITE_URL: "https://atlas.example", CATALOG_DEMO_MODE: "false", SEO_INDEXING_ENABLED: "true", PUBLIC_LAUNCH_CONFIRMED: "true",
  LEGAL_REVIEW_CONFIRMED: "true", PUBLIC_OPERATOR_NAME: "Isolated operator", PUBLIC_OPERATOR_ADDRESS: "Isolated address",
  PUBLIC_CONTACT_EMAIL: "legal@fixture.invalid", LEGAL_EFFECTIVE_DATE: "2020-01-01",
};
const ads = {
  ADSENSE_ENABLED: "true", ADSENSE_SITE_APPROVED: "true", ADSENSE_CONSENT_READY: "true", ADSENSE_PLACEMENTS_REVIEWED: "true",
  ADSENSE_PUBLISHER_ID: "ca-pub-1234567890123456", ADSENSE_CMP_ID: "300",
  ADSENSE_CMP_SCRIPT_URL: "https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1",
  ADSENSE_SLOT_TOOLS: "1234567890",
};
test("default public, legal, login and sensitive pages make no advertising requests", async ({ page, request }) => {
  let requests = 0;
  await page.route(/googlesyndication|doubleclick|fundingchoicesmessages/, route => { requests++; return route.abort(); });
  for (const path of ["/", "/tools", "/use-cases", "/login", "/sponsor", "/newsletter", "/privacy", "/payments/return"]) {
    await page.goto(path); await expect(page.locator('script[src*="adsbygoogle"], script[src*="fundingchoicesmessages"]')).toHaveCount(0);
  }
  expect(requests).toBe(0); expect((await request.get("/ads.txt")).status()).toBe(404);
  expect((await request.post("/api/admin/analytics/adsense", { data: { days: 30, confirmation: true } })).status()).toBe(401);
});
test("missing and unpublished content returns real 404s instead of soft 404 pages", async ({ request }) => {
  for (const path of ["/tools/not-a-real-atlas-tool", "/use-cases/not-a-real-atlas-guide", "/blog/not-a-real-atlas-article", "/blog/business-automation-pilot"]) {
    const response = await request.get(path); expect(response.status()).toBe(404); expect(await response.text()).toContain("noindex");
  }
});
test("AdSense reports enforce administrator CSRF and display unconfigured state without a Google call", async ({ page }, info) => {
  const origin = "http://127.0.0.1:3100";
  expect((await page.request.post("/api/admin/login", { headers: { Origin: origin }, data: { email: `owner-${info.project.name}@e2e.invalid`, password: process.env.ATLAS_TEST_PASSWORD } })).status()).toBe(200);
  const session = await (await page.request.get("/api/admin/session")).json();
  expect((await page.request.post("/api/admin/analytics/adsense", { headers: { Origin: origin }, data: { days: 30, confirmation: true } })).status()).toBe(403);
  expect((await page.request.post("/api/admin/analytics/adsense", { headers: { Origin: origin, "x-csrf-token": session.csrfToken }, data: { days: 30, confirmation: true } })).status()).toBe(503);
  await page.goto("/admin/analytics"); await expect(page.getByRole("heading", { name: "AdSense y monetización", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar informe AdSense", exact: true })).toBeDisabled();
  await expect(page.getByText("AdSense: informes no configurados. Sin datos externos ni ingresos de sustitución.", { exact: true })).toBeVisible();
});
test("release and legal gates control robots while Google verification uses only owner-supplied public values", async ({ page }) => {
  await withAppServer({ ...released, ...ads, LEGAL_REVIEW_CONFIRMED: "false" }, async origin => {
    expect(await (await page.request.get(origin + "/robots.txt")).text()).toContain("Disallow: /");
    expect((await page.request.get(origin + "/ads.txt")).status()).toBe(404);
    await page.goto(origin + "/tools"); await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0);
  });
  await withAppServer({ ...released, ...ads, GSC_VERIFICATION_TOKEN: "isolated-verification-token" }, async origin => {
    // The normal E2E runner forces ATLAS_ISOLATED_E2E=true even with all flags.
    await page.goto(origin + "/tools");
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute("content", "isolated-verification-token");
    await expect(page.locator('meta[name="google-adsense-account"]')).toHaveAttribute("content", ads.ADSENSE_PUBLISHER_ID);
    await expect(page.locator('script[src*="adsbygoogle"], script[src*="fundingchoicesmessages"]')).toHaveCount(0);
    expect(await (await page.request.get(origin + "/ads.txt")).text()).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  });
});

async function withTools(callback: () => Promise<void>) {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect(); const ids: string[] = [];
  try {
    for (let n = 0; n < 6; n++) {
      const id = randomUUID(); ids.push(id);
      await db.query('INSERT INTO "Tool" (id,name,slug,summary,description,"websiteUrl",status,"publishedAt","updatedAt") VALUES ($1,$2,$3,$4::text,$4::text,$5,\'PUBLISHED\',NOW(),NOW())',
        [id, `Isolated advertising fixture ${n}`, `ads-fixture-${id}`, "Isolated browser fixture; no public listing or commercial claim.", "https://example.invalid"]);
    }
    await callback();
  } finally { await db.query('DELETE FROM "Tool" WHERE id=ANY($1::uuid[])', [ids]); await db.end(); }
}
async function stubBrowser(context: BrowserContext, origin: string) {
  const counts = { cmp: 0, ads: 0, unexpected: 0 };
  // EVERY request is intercepted. No real Google request, impression or click
  // can leave this browser, including iframe or dynamically inserted requests.
  await context.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (u.hostname === "atlas.example") {
      const request = route.request();
      const response = await fetch(origin + u.pathname + u.search, { method: request.method(), headers: request.headers(), redirect: "manual" });
      const headers = Object.fromEntries(response.headers); delete headers["content-encoding"]; delete headers["content-length"];
      return route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
    }
    if (u.hostname === "fundingchoicesmessages.google.com") {
      counts.cmp++;
      return route.fulfill({ contentType: "application/javascript", body: `
        window.__fixtureConsent = function(accept) {
          const data = {cmpId:300,cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,isServiceSpecific:true,
            tcString:'fixture-not-a-real-consent-string',listenerId:1,vendor:{consents:{755:accept}},
            purpose:{consents:{1:accept,2:accept,3:accept,4:accept,7:accept,9:accept,10:accept}}};
          window.__fixtureTcfData=data; if(window.__fixtureTcfCallback) window.__fixtureTcfCallback(data,true);
        };
        window.__tcfapi = function(command,version,callback) {
          if(command === 'addEventListener') {window.__fixtureTcfCallback=callback;callback(window.__fixtureTcfData || {cmpId:300,cmpStatus:'loading',listenerId:1},true);}
          if(command === 'removeEventListener') window.__fixtureTcfCallback=null;
        };
      ` });
    }
    if (u.hostname === "pagead2.googlesyndication.com" && u.pathname === "/pagead/js/adsbygoogle.js") {
      counts.ads++;
      return route.fulfill({ contentType: "application/javascript", body: "window.__fixtureAdUnits=0;window.adsbygoogle={push:function(){window.__fixtureAdUnits++}};" });
    }
    counts.unexpected++; return route.abort();
  });
  return counts;
}
for (const mode of ["manual", "auto"] as const) test(`consent fixture controls ${mode} delivery and withdrawal without contacting an ad network`, async ({ browser }) => {
  await withTools(() => withAppServer({ ...released, ...ads, ADSENSE_MODE: mode, ATLAS_ISOLATED_E2E: "false" }, async origin => {
    const context = await browser.newContext({ serviceWorkers: "block", viewport: test.info().project.name === "mobile-chromium" ? { width: 390, height: 844 } : { width: 1440, height: 900 } }), counts = await stubBrowser(context, origin);
    try {
      const page = await context.newPage(); await page.goto("https://atlas.example/tools");
      await page.waitForFunction(() => "__fixtureConsent" in window && typeof (window as unknown as { __fixtureTcfCallback?: unknown }).__fixtureTcfCallback === "function");
      expect(counts.cmp).toBe(1); expect(counts.ads).toBe(0);
      await expect(page.locator(".advertising-placement")).toHaveCount(mode === "manual" ? 1 : 0);
      await page.evaluate(() => (window as unknown as { __fixtureConsent: (accept: boolean) => void }).__fixtureConsent(true));
      await expect.poll(() => counts.ads).toBe(1);
      if (mode === "manual") await page.waitForFunction(() => (window as unknown as { __fixtureAdUnits: number }).__fixtureAdUnits === 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (mode === "manual") expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      await page.evaluate(() => (window as unknown as { __fixtureConsent: (accept: boolean) => void }).__fixtureConsent(true));
      expect(counts.ads).toBe(1); await expect(page.locator("#atlas-adsense")).toHaveCount(1);
      await Promise.all([page.waitForEvent("domcontentloaded"), page.evaluate(() => (window as unknown as { __fixtureConsent: (accept: boolean) => void }).__fixtureConsent(false))]);
      await page.waitForFunction(() => document.cookie.includes("atlas_ads_off=v1"));
      await page.waitForFunction(() => "__fixtureConsent" in window && typeof (window as unknown as { __fixtureTcfCallback?: unknown }).__fixtureTcfCallback === "function");
      await expect(page.locator("#atlas-adsense")).toHaveCount(0); expect(counts.ads).toBe(1);
      // A previously saved CMP choice cannot override this browser's opt-out.
      await page.evaluate(() => (window as unknown as { __fixtureConsent: (accept: boolean) => void }).__fixtureConsent(true));
      await expect(page.locator("#atlas-adsense")).toHaveCount(0); expect(counts.unexpected).toBe(0);
    } finally { await context.close(); }
  }));
});
test("ad-loaded SPA navigation uses a new document; DNT and GPC block both advertising and CMP requests", async ({ browser }) => {
  await withTools(() => withAppServer({ ...released, ...ads, ATLAS_ISOLATED_E2E: "false" }, async origin => {
    const context = await browser.newContext({ serviceWorkers: "block", viewport: test.info().project.name === "mobile-chromium" ? { width: 390, height: 844 } : { width: 1440, height: 900 } }), counts = await stubBrowser(context, origin);
    try {
      const page = await context.newPage(); await page.goto("https://atlas.example/tools"); await page.waitForFunction(() => "__fixtureConsent" in window && typeof (window as unknown as { __fixtureTcfCallback?: unknown }).__fixtureTcfCallback === "function");
      await page.evaluate(() => (window as unknown as { __fixtureConsent: (accept: boolean) => void }).__fixtureConsent(true));
      await page.waitForFunction(() => "__fixtureAdUnits" in window);
      if (test.info().project.name === "mobile-chromium") { await page.locator(".mobile-menu summary").click(); await page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link", { name: "Use cases", exact: true }).click(); } else await page.getByRole("link", { name: "Find your workflow", exact: true }).click(); await expect(page).toHaveURL("https://atlas.example/use-cases");
      expect(await page.evaluate(() => "__fixtureAdUnits" in window)).toBe(false);
      await page.goto("https://atlas.example/login"); await expect(page.locator("#atlas-adsense, #atlas-google-cmp")).toHaveCount(0);
      expect(counts.ads).toBe(1); expect(counts.unexpected).toBe(0);
    } finally { await context.close(); }
    for (const signal of ["dnt", "gpc"]) {
      const privateContext = await browser.newContext({ serviceWorkers: "block", viewport: test.info().project.name === "mobile-chromium" ? { width: 390, height: 844 } : { width: 1440, height: 900 } }), blocked = await stubBrowser(privateContext, origin);
      try {
        await privateContext.addInitScript(signal => { Object.defineProperty(navigator, signal === "dnt" ? "doNotTrack" : "globalPrivacyControl", { get: () => signal === "dnt" ? "1" : true }); }, signal);
        const page = await privateContext.newPage(); await page.goto("https://atlas.example/tools");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("#atlas-adsense, #atlas-google-cmp")).toHaveCount(0); expect(blocked.cmp).toBe(0); expect(blocked.ads).toBe(0);
      } finally { await privateContext.close(); }
    }
  }));
});
