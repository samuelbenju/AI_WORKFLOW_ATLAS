import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the homepage renders and navigation reaches real sections", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/AI Workflow Atlas/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Discover What AI Can Actually Do");
  await expect(page.getByRole("complementary", { name: "Development preview" })).toBeVisible();
  await expect(page.getByTestId("tool-card")).toHaveCount(3);
  await expect(page.getByTestId("workflow-card")).toHaveCount(3);
  await page.getByRole("link", { name: "Browse all tools", exact: true }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find useful AI tools.");
  await expect(page.locator("a[href='#']")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.goto("/");
  await page.screenshot({ path: test.info().outputPath("homepage.png"), fullPage: true, animations: "disabled" });
});

test("liveness and pre-launch security headers are served", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  expect(health.headers()["cache-control"]).toContain("no-store");
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});

test("the layout fits the viewport and keyboard users can skip navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test("navigation is operable at the current screen size", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    const menu = page.locator("summary");
    await menu.click();
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Our approach" }).click();
  } else {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Our approach" }).click();
  }
  await expect(page).toHaveURL(/#approach$/);
  await expect(page.getByRole("heading", { name: "Useful comes before impressive." })).toBeInViewport();
});

test("missing routes give a real 404 with a working return link", async ({ page }) => {
  const response = await page.goto("/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This path isn’t on the atlas." })).toBeVisible();
  await page.getByRole("link", { name: "Back to the atlas" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover What AI");
});

test("reduced motion is respected", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const settings = await page.locator(".workflow-map").evaluate((node) => ({ animation: getComputedStyle(node).animationName, scroll: getComputedStyle(document.documentElement).scrollBehavior }));
  expect(settings).toEqual({ animation: "none", scroll: "auto" });
});

test("the homepage and available navigation pass automated accessibility checks", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  if (isMobile) await page.locator("summary").click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
