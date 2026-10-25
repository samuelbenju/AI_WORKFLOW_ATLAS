import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseCatalogQuery, catalogHref } from "../../src/lib/catalog-query";
import { safeExternalUrl, workflowSteps, workflowReferences } from "../../src/lib/catalog-content";

test("catalog query defaults and browser string values are validated", () => {
  const result = parseCatalogQuery({ q: "  notes  ", page: "2", category: "productivity", tag: "team-work", sort: "name", difficulty: "BEGINNER" });
  assert.ok(result.success); assert.equal(result.data.page, 2); assert.equal(result.data.q, "notes");
  assert.deepEqual(parseCatalogQuery({ q: "", page: "", category: "" }).data, { q: "", sort: "recent", page: 1 });
});

test("ambiguous, oversized and invalid catalog parameters are rejected", () => {
  for (const query of [{ page: "0" }, { page: "10001" }, { page: "1.5" }, { page: "wat" }, { q: ["one", "two"] }, { q: "x".repeat(101) }, { category: "../admin" }, { sort: "popularity" }, { difficulty: "EXPERT" }]) assert.equal(parseCatalogQuery(query).success, false);
});

test("pagination preserves filters and encodes input without URL injection", () => {
  const href = catalogHref("/tools", { q: "notes & ideas", category: "content", tag: "writing", sort: "name", page: 1 }, { page: 2 });
  const url = new URL(href, "https://example.invalid");
  assert.equal(url.pathname, "/tools"); assert.equal(url.searchParams.get("q"), "notes & ideas"); assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("category"), "content"); assert.equal(url.searchParams.get("tag"), "writing"); assert.equal(url.searchParams.get("sort"), "name");
});

test("external links reject executable protocols and embedded credentials", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,bad", "//example.invalid", "https://user:password@example.invalid", "not-a-url"]) assert.equal(safeExternalUrl(url), null);
  assert.equal(safeExternalUrl("https://example.invalid/path"), "https://example.invalid/path");
});

test("structured workflow data is bounded and rendered as text with safe references", () => {
  assert.deepEqual(workflowSteps([{ step: 2, text: "Second" }, { step: 1, text: "First" }]).map((s) => s.text), ["First", "Second"]);
  assert.deepEqual(workflowSteps({ html: "<script>bad</script>" }), []);
  assert.deepEqual(workflowReferences([{ url: "javascript:alert(1)" }, { url: "https://example.invalid", note: "Primary source" }]), [{ url: "https://example.invalid/", note: "Primary source" }]);
});
