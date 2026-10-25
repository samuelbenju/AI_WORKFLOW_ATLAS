import { test, after } from "node:test";
import { strict as assert } from "node:assert";
import { randomBytes, randomUUID } from "node:crypto";
import { createDatabaseClient } from "../../src/server/db/client";
import { initializeOwner, authenticate, resolveSession, revokeSession, digestToken, csrfForToken, validCsrf, replacePassword } from "../../src/server/auth/service";
import { saveContent, getContent, listContent, deleteContent, saveAdminSettings, readAdminSettings, adminDashboard } from "../../src/server/admin/content";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test") || process.env.DATABASE_URL !== url) throw new Error("Use the isolated test runner.");
const db = createDatabaseClient(url); after(() => db.$disconnect());
const password = randomBytes(24).toString("base64url");
let ownerId: string; let editorId: string; let viewerId: string;
const tool = { name: "Admin integration", slug: "admin-integration", summary: "Fixture", description: "Fixture", websiteUrl: "https://example.invalid", categoryIds: [] as string[], tagIds: [] as string[], status: "DRAFT", isDemo: false, featured: false, publishedAt: null };

test("operator bootstrap creates only a hashed owner and refuses a second bootstrap", async () => {
  ownerId = (await initializeOwner("OWNER@admin.invalid", password, db)).id;
  const owner = await db.user.findUniqueOrThrow({ where: { id: ownerId } });
  assert.equal(owner.role, "OWNER"); assert.equal(owner.active, true); assert.equal(owner.email, "owner@admin.invalid");
  assert.match(owner.passwordHash!, /^scrypt-v1\$/); assert.ok(!owner.passwordHash!.includes(password));
  await assert.rejects(initializeOwner("another@admin.invalid", password, db), { status: 409 });
  editorId = (await db.user.create({ data: { email: "editor@admin.invalid", role: "EDITOR", active: true, passwordHash: owner.passwordHash } })).id;
  viewerId = (await db.user.create({ data: { email: "viewer@admin.invalid", role: "VIEWER", active: true, passwordHash: owner.passwordHash } })).id;
  await assert.rejects(db.user.update({ where: { id: viewerId }, data: { passwordHash: password } }));
});
test("real login rejects invalid/inactive/viewer accounts and rotates opaque sessions", async () => {
  await assert.rejects(authenticate("owner@admin.invalid", `${password}x`, undefined, db), { status: 401 });
  await assert.rejects(authenticate("missing@admin.invalid", password, undefined, db), { status: 401 });
  await assert.rejects(authenticate("viewer@admin.invalid", password, undefined, db), { status: 403 });
  await db.user.update({ where: { id: editorId }, data: { active: false } });
  await assert.rejects(authenticate("editor@admin.invalid", password, undefined, db), { status: 401 });
  await db.user.update({ where: { id: editorId }, data: { active: true } });
  const first = await authenticate("owner@admin.invalid", password, undefined, db);
  assert.equal((await resolveSession(first.token, db))?.actor.id, ownerId);
  assert.equal((await db.session.findUniqueOrThrow({ where: { tokenHash: digestToken(first.token) } })).tokenHash.includes(first.token), false);
  const second = await authenticate("owner@admin.invalid", password, first.token, db);
  assert.equal(await resolveSession(first.token, db), null); assert.notEqual(first.token, second.token);
  assert.ok(validCsrf(second.token, csrfForToken(second.token))); assert.equal(validCsrf(second.token, csrfForToken(first.token)), false);
  assert.equal(validCsrf(second.token, null), false);
  const session = (await resolveSession(second.token, db))!; await revokeSession(second.token, session.actor, db);
  assert.equal(await resolveSession(second.token, db), null);
});
test("session resolution checks fresh roles, account activation and expiry", async () => {
  const login = await authenticate("editor@admin.invalid", password, undefined, db);
  await db.user.update({ where: { id: editorId }, data: { role: "VIEWER" } }); assert.equal(await resolveSession(login.token, db), null);
  await db.user.update({ where: { id: editorId }, data: { role: "EDITOR", active: false } }); assert.equal(await resolveSession(login.token, db), null);
  await db.user.update({ where: { id: editorId }, data: { active: true } });
  await db.session.update({ where: { tokenHash: digestToken(login.token) }, data: { createdAt: new Date(Date.now()-7200000), expiresAt: new Date(Date.now()-3600000) } });
  assert.equal(await resolveSession(login.token, db), null); assert.equal(await resolveSession("forged", db), null);
});
test("database login throttling persists across failed attempts and expires", async () => {
  for (let i = 0; i < 5; i++) await assert.rejects(authenticate("limited@admin.invalid", password, undefined, db), { status: 401 });
  await assert.rejects(authenticate("limited@admin.invalid", password, undefined, db), { status: 429 });
  await db.loginRateLimit.update({ where: { keyHash: digestToken("login:email:limited@admin.invalid") }, data: { windowStarted: new Date(Date.now()-901000) } });
  await assert.rejects(authenticate("limited@admin.invalid", password, undefined, db), { status: 401 });
});
test("all four content types persist creation, queries, editing and deletion with audit", async () => {
  const category = await saveContent(ownerId, "categories", { name: "Admin category", slug: "admin-category", description: "Fixture" }, undefined, db);
  const tag = await saveContent(ownerId, "tags", { name: "Admin tag", slug: "admin-tag" }, undefined, db);
  const item = await saveContent(ownerId, "tools", { ...tool, categoryIds: [category.id], tagIds: [tag.id] }, undefined, db);
  const workflow = await saveContent(ownerId, "use-cases", { name: "Admin workflow", slug: "admin-workflow", problem: "Problem", solution: "Solution", limitations: "Limits", instructions: [{ step: 1, text: "Step" }], references: [], difficulty: "BEGINNER", categoryIds: [category.id], tagIds: [tag.id], toolIds: [item.id], status: "DRAFT" }, undefined, db);
  const found = await listContent(ownerId, "tools", { q: "admin-integration", page: 1 }, db); assert.equal(found.total, 1); assert.equal(found.rows[0]?.id, item.id);
  assert.deepEqual((await getContent(ownerId, "tools", item.id, db))?.data.categoryIds, [category.id]);
  await saveContent(ownerId, "categories", { name: "Admin category updated", slug: "admin-category", description: "Updated" }, category.id, db);
  await saveContent(ownerId, "tags", { name: "Admin tag updated", slug: "admin-tag" }, tag.id, db);
  await saveContent(ownerId, "tools", { ...tool, name: "Admin integration updated", categoryIds: [category.id], tagIds: [tag.id] }, item.id, db);
  const workflowRecord = (await getContent(ownerId, "use-cases", workflow.id, db))!;
  await saveContent(ownerId, "use-cases", { ...workflowRecord.data, solution: "Updated solution" }, workflow.id, db);
  assert.equal((await getContent(ownerId, "use-cases", workflow.id, db))?.data.solution, "Updated solution");
  await assert.rejects(deleteContent(ownerId, "tools", item.id, { confirmation: "Admin integration updated" }, db), { status: 409 });
  await assert.rejects(deleteContent(ownerId, "categories", category.id, { confirmation: "Admin category updated" }, db), { status: 409 });
  await assert.rejects(deleteContent(ownerId, "use-cases", workflow.id, { confirmation: "Wrong" }, db), { status: 409 });
  for (const [kind,id,confirmation] of [["use-cases",workflow.id,"Admin workflow"],["tools",item.id,"Admin integration updated"],["categories",category.id,"Admin category updated"],["tags",tag.id,"Admin tag updated"]] as const) {
    await deleteContent(ownerId, kind, id, { confirmation }, db); assert.equal(await getContent(ownerId, kind, id, db), null);
    assert.equal(await db.auditLog.count({ where: { action: "content.deleted", entityId: id } }), 1);
  }
});
test("server authorization denies viewers, prevents editor publication/deletion and protects relationships", async () => {
  await assert.rejects(listContent(viewerId, "tools", { q: "", page: 1 }, db), { status: 403 });
  await assert.rejects(saveContent(viewerId, "tags", { name: "Denied", slug: "denied" }, undefined, db), { status: 403 });
  await assert.rejects(saveContent(ownerId, "tools", { ...tool, categoryIds: [randomUUID()] }, undefined, db));
  const draft = await saveContent(editorId, "tools", { ...tool, slug: "editor-draft" }, undefined, db);
  await assert.rejects(saveContent(editorId, "tools", { ...tool, slug: "editor-draft", status: "PUBLISHED" }, draft.id, db), { status: 403 });
  await assert.rejects(deleteContent(editorId, "tools", draft.id, { confirmation: tool.name }, db), { status: 403 });
  await assert.rejects(saveAdminSettings(editorId, { editorialGuidelines: "Denied", defaultStatus: "DRAFT" }, db), { status: 403 });
  await saveContent(ownerId, "tools", { ...tool, slug: "editor-draft", status: "PUBLISHED" }, draft.id, db);
  await assert.rejects(saveContent(editorId, "tools", { ...tool, slug: "editor-draft" }, draft.id, db), { status: 403 });
  await deleteContent(ownerId, "tools", draft.id, { confirmation: tool.name }, db);
});
test("settings and dashboard read actual PostgreSQL values including examples", async () => {
  await saveAdminSettings(ownerId, { editorialGuidelines: "Persisted guidelines", defaultStatus: "IN_REVIEW" }, db);
  assert.equal((await readAdminSettings(editorId, db)).editorialGuidelines, "Persisted guidelines");
  const dashboard = await adminDashboard(ownerId, db);
  assert.equal(dashboard.tools, await db.tool.count()); assert.equal(dashboard.demoTools, await db.tool.count({ where: { isDemo: true } }));
});
test("privileged password rotation invalidates every previous session", async () => {
  const login = await authenticate("owner@admin.invalid", password, undefined, db);
  const replacement = randomBytes(24).toString("base64url"); await replacePassword("owner@admin.invalid", replacement, db);
  assert.equal(await resolveSession(login.token, db), null);
  await assert.rejects(authenticate("owner@admin.invalid", password, undefined, db), { status: 401 });
  assert.ok(await authenticate("owner@admin.invalid", replacement, undefined, db));
});
