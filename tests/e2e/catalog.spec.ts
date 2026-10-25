import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { withAppServer } from "./test-server";

if (process.env.ATLAS_ISOLATED_E2E !== "true" || !process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw new Error("Use npm run test:e2e to create an isolated PostgreSQL test database.");

test("home search reaches a real filtered tool directory and official detail link", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search AI tools" }).fill("chatgpt");
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\?q=chatgpt/);
  await expect(page.getByTestId("tool-card")).toHaveCount(1);
  await page.getByRole("link", { name: "ChatGPT", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChatGPT");
  await expect(page.getByRole("link", { name: /Official website/ })).toHaveAttribute("href", "https://chatgpt.com/");
  await expect(page.getByRole("link", { name: /Official website/ })).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByRole("heading", { name: "Related workflows" })).toBeVisible();
  await expect(page.getByTestId("workflow-card").first()).toBeVisible();
});

test("tools support category/tag filters, sorting, pagination and clear filters", async ({ page }) => {
  await page.goto("/tools");
  await page.getByLabel("Category", { exact: true }).selectOption("automation");
  await page.getByLabel("Tag", { exact: true }).selectOption("no-code");
  await page.getByLabel("Sort by").selectOption("name");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByTestId("tool-card")).toHaveCount(3);
  await expect(page.getByTestId("tool-card").first().getByRole("heading")).toHaveText("Make");
  await page.getByRole("link", { name: "Clear all", exact: true }).click();
  await expect(page.getByTestId("tool-card")).toHaveCount(6);
  await page.goto("/tools?sort=name");
  const first = await page.getByTestId("tool-card").getByRole("heading").allTextContents();
  await page.getByRole("link", { name: "Next →", exact: true }).click();
  await expect(page).toHaveURL(/sort=name&page=2/);
  await expect(page.getByRole("link", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page");
  const second = await page.getByTestId("tool-card").getByRole("heading").allTextContents();
  expect(second.length).toBeGreaterThan(0); expect(second.every((name) => !first.includes(name))).toBe(true);
  await page.getByRole("link", { name: "← Previous", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\?sort=name$/);
});

test("workflows filter by difficulty and show complete, related database content", async ({ page }) => {
  await page.goto("/use-cases");
  await page.getByLabel("Difficulty", { exact: true }).selectOption("BEGINNER");
  await page.getByLabel("Category", { exact: true }).selectOption("content");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByTestId("workflow-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Create a better first content outline", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create a better first content outline");
  for (const name of ["The problem", "The solution", "Step by step", "Limitations & considerations", "References", "Tools for this workflow"]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator(".workflow-steps li")).toHaveCount(4);
  await expect(page.getByTestId("tool-card")).toHaveCount(2);
  await expect(page.locator(".references-panel a").first()).toHaveAttribute("href", /^https:\/\//);
});

test("unknown slugs, empty searches, invalid filters and missing pages are honest", async ({ page }) => {
  await page.goto("/tools?q=unmatchable-catalog-search");
  await expect(page.getByRole("heading", { name: "No tools match just yet." })).toBeVisible();
  await page.goto("/use-cases?difficulty=INVALID");
  await expect(page.getByRole("heading", { name: "Those filters need a quick check." })).toBeVisible();
  await page.goto("/tools?page=9999");
  await expect(page.getByRole("link", { name: "Back to first page" })).toBeVisible();
  for (const path of ["/tools/this-does-not-exist", "/use-cases/this-does-not-exist", "/tools/BadSlug"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "This path isn’t on the atlas." })).toBeVisible();
  }
});

test("catalog changes in PostgreSQL appear on a fresh request", async ({ page }, info) => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect();
  const id = randomUUID(); const slug = `e2e-live-${info.project.name}`; const title = `Zzz live database ${info.project.name}`;
  try {
    await page.goto(`/tools?q=${encodeURIComponent(title)}`);
    await expect(page.getByTestId("tool-card")).toHaveCount(0);
    await db.query('INSERT INTO "Tool" (id,slug,name,summary,description,"websiteUrl","isDemo","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,true,NOW())', [id, slug, title, "Isolated persistence fixture, not a real product.", "Isolated persistence fixture, not a real product.", "https://example.invalid"]);
    await page.reload();
    await expect(page.getByTestId("tool-card")).toHaveCount(1);
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  } finally { await db.query('DELETE FROM "Tool" WHERE id=$1', [id]); await db.end(); }
});

test("directories and detail pages fit narrow/mobile layouts and pass axe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/tools", "/use-cases", "/tools/demo-n8n", "/use-cases/demo-meeting-notes"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/tools");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("tools.png"), fullPage: true, animations: "disabled" });
});

test("a database outage shows a retryable error, never a fabricated empty catalog", async ({ page }) => {
  const unavailable = new URL(process.env.TEST_DATABASE_URL!); unavailable.port = "1";
  await withAppServer({ DATABASE_URL: unavailable.toString() }, async (origin) => {
    await page.goto(`${origin}/tools`);
    await expect(page.getByRole("heading", { name: "The atlas is temporarily unavailable." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByText("No tools match just yet.")).toHaveCount(0);
    const content = await page.content();
    expect(content.includes(new URL(process.env.TEST_DATABASE_URL!).password)).toBe(false);
  });
});

test("published mode hides demo and draft listings while serving published records", async ({ page }, info) => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect();
  const id = randomUUID(); const slug = `e2e-published-${info.project.name}`;
  try {
    await db.query('INSERT INTO "Tool" (id,slug,name,summary,description,"websiteUrl",status,"publishedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())', [id, slug, "Published E2E fixture", "Isolated test data.", "Isolated test data.", "https://example.invalid", "PUBLISHED"]);
    await withAppServer({ CATALOG_DEMO_MODE: "false" }, async (origin) => {
      await page.goto(`${origin}/tools?q=ChatGPT`);
      await expect(page.getByTestId("tool-card")).toHaveCount(0);
      await expect(page.getByRole("complementary", { name: "Development preview" })).toHaveCount(0);
      await page.goto(`${origin}/tools/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Published E2E fixture");
      await expect(page.getByText("Official link unavailable.")).toBeVisible();
      await page.goto(`${origin}/tools/demo-chatgpt`);
      await expect(page.getByRole("heading", { name: "This path isn’t on the atlas." })).toBeVisible();
    });
  } finally { await db.query('DELETE FROM "Tool" WHERE id=$1', [id]); await db.end(); }
});

test("a slow PostgreSQL read exposes the real loading state before results", async ({ page }) => {
  const lock = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); await lock.connect();
  let navigation: ReturnType<typeof page.goto> | undefined;
  try {
    await lock.query('BEGIN; LOCK TABLE "Tool" IN ACCESS EXCLUSIVE MODE');
    navigation = page.goto("/tools", { waitUntil: "commit" });
    await expect(page.getByRole("status")).toHaveText("Finding your next direction…");
  } finally { await lock.query("ROLLBACK"); await lock.end(); }
  await navigation;
  await expect(page.getByRole("heading", { name: "Explore the tools", exact: true })).toBeVisible();
  await expect(page.getByTestId("tool-card")).toHaveCount(6);
});
