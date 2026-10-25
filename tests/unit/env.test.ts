import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseSiteOrigin } from "../../src/lib/config/env";

test("local development works without credentials or environment files", () => {
  assert.equal(parseSiteOrigin(undefined), "http://localhost:3000");
});

test("deployment origins are normalized", () => {
  assert.equal(parseSiteOrigin("https://atlas.example/"), "https://atlas.example");
  assert.equal(parseSiteOrigin("http://127.0.0.1:3100"), "http://127.0.0.1:3100");
});

const invalidOrigins = [
  ["empty string", ""],
  ["malformed URL", "not-a-url"],
  ["JavaScript scheme", "javascript:alert(1)"],
  ["file scheme", "file:///tmp/atlas"],
  ["embedded credentials", "https://user:password@atlas.example"],
  ["path", "https://atlas.example/path"],
  ["query", "https://atlas.example/?key=secret"],
  ["fragment", "https://atlas.example/#fragment"],
] as const;

for (const [label, value] of invalidOrigins) {
  test(`rejects ${label} without leaking the configured value`, () => {
    assert.throws(() => parseSiteOrigin(value), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "Invalid SITE_URL. Set an HTTP(S) origin without credentials, path, query or fragment.");
      return true;
    });
  });
}
