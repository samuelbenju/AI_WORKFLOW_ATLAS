import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { can, demand } from "../../src/server/auth/policy";
import { adminConfiguration } from "../../src/server/auth/config";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";
import { toolSchema, useCaseSchema, settingsSchema } from "../../src/lib/admin-content";

test("password hashes use independent scrypt salts and reject wrong, absent and malformed hashes", async () => {
  const password = randomBytes(24).toString("base64url");
  const first = await hashPassword(password); const second = await hashPassword(password);
  assert.notEqual(first, second); assert.match(first, /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.ok(!first.includes(password)); assert.ok(await verifyPassword(password, first));
  assert.equal(await verifyPassword(`${password}x`, first), false);
  assert.equal(await verifyPassword(password, null), false); assert.equal(await verifyPassword(password, "malformed"), false);
  await assert.rejects(hashPassword("short")); await assert.rejects(hashPassword("x".repeat(129)));
});
test("role matrix denies anonymous/viewer access and limits editors", () => {
  for (const permission of ["panel", "write", "delete", "publish", "settings"] as const) {
    assert.ok(can("OWNER", permission)); assert.ok(can("ADMIN", permission)); assert.equal(can("VIEWER", permission), false);
    assert.throws(() => demand(null, permission), { status: 401 });
    assert.equal(can("EDITOR", permission), ["panel", "write"].includes(permission));
  }
});
test("admin cookies require HTTPS beyond loopback and use the host prefix", () => {
  assert.deepEqual(adminConfiguration("https://atlas.example"), { origin: "https://atlas.example", cookieName: "__Host-atlas_session", secure: true, maxAge: 28800 });
  assert.equal(adminConfiguration("http://127.0.0.1:3000").secure, false);
  for (const origin of ["http://atlas.example", "https://user:pass@example.com", "https://example.com/path", "javascript:alert(1)"]) assert.throws(() => adminConfiguration(origin));
});
test("content inputs reject mass assignment, unsafe links and demo publication", () => {
  const tool = { name: "Test", slug: "test", summary: "Test", description: "Test", websiteUrl: "https://example.invalid", categoryIds: [], tagIds: [], status: "DRAFT" };
  assert.ok(toolSchema.safeParse(tool).success);
  for (const input of [{ ...tool, role: "OWNER" }, { ...tool, websiteUrl: "javascript:alert(1)" }, { ...tool, websiteUrl: "https://u:p@example.invalid" }, { ...tool, status: "PUBLISHED", isDemo: true }, { ...tool, categoryIds: ["invalid"] }]) assert.equal(toolSchema.safeParse(input).success, false);
  assert.equal(useCaseSchema.safeParse({ name: "Incomplete" }).success, false);
  assert.equal(settingsSchema.safeParse({ editorialGuidelines: "Test", defaultStatus: "PUBLISHED" }).success, false);
});
