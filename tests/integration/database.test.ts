import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createDatabaseClient, getDatabase } from "../../src/server/db/client";
import { createToolDraft, listPublishedTools, getPublishedUseCase, getPublishedArticle } from "../../src/server/data/catalog";
import { createCommercialLead } from "../../src/server/data/commercial";
import { seedDevelopment } from "../../prisma/seed-data";
import { seedCatalogDevelopment } from "../../prisma/seed-catalog-data";
import { queryTools, queryWorkflows, homeCatalog, getCatalogFacets } from "../../src/server/data/public-catalog";
import { catalogQuerySchema } from "../../src/lib/catalog-query";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test") || process.env.DATABASE_URL !== url) throw new Error("Run npm run test:db using the isolated database runner.");
const db = createDatabaseClient(url);
const sql = new pg.Pool({ connectionString: url });
after(async () => { await db.$disconnect(); await sql.end(); });

test("the reusable server connection is cached and configured lazily", async () => {
  const singleton = getDatabase();
  assert.equal(getDatabase(), singleton);
  assert.deepEqual(await singleton.$queryRaw`SELECT 1 AS value`, [{ value: 1 }]);
  await singleton.$disconnect();
});

test("development seed is repeatable, relational, fictional and non-destructive", async () => {
  const first = await seedDevelopment(db);
  const counts = await Promise.all([db.tool.count(), db.useCase.count(), db.article.count(), db.sponsorshipPackage.count()]);
  await db.tool.update({ where: { id: first.toolId }, data: { summary: "Retain this manual development edit." } });
  const second = await seedDevelopment(db);
  assert.deepEqual(first, second);
  assert.deepEqual(await Promise.all([db.tool.count(), db.useCase.count(), db.article.count(), db.sponsorshipPackage.count()]), counts);
  assert.equal((await db.tool.findUniqueOrThrow({ where: { id: first.toolId } })).summary, "Retain this manual development edit.");
  assert.equal(await db.tool.count({ where: { status: "PUBLISHED" } }), 0);
  assert.equal(await db.sponsorshipPackage.count({ where: { OR: [{ active: true }, { amountMinor: { not: null } }] } }), 0);
  assert.equal(await db.paymentOrder.count(), 0);
  assert.equal(await db.newsletterSubscriber.count(), 0);
  const workflow = await db.useCase.findUniqueOrThrow({ where: { id: first.useCaseId }, include: { tools: true, categories: true, tags: true } });
  assert.equal(workflow.tools[0]?.id, first.toolId);
  assert.equal(workflow.categories.length, 1); assert.equal(workflow.tags.length, 1);
});

test("catalog repositories persist drafts, search PostgreSQL and hide nonpublic/demo data", async () => {
  const category = await db.category.findUniqueOrThrow({ where: { slug: "development-examples" } });
  const tool = await createToolDraft({ slug: "integration-real-tool", name: "Integration Search Needle", summary: "Searchable summary", description: "Integration test record.",
    websiteUrl: "https://example.invalid", categoryIds: [category.id, category.id] }, db);
  assert.equal(tool.status, "DRAFT"); assert.equal(tool.categories.length, 1);
  assert.equal((await listPublishedTools({ search: "Needle" }, db)).total, 0);
  await db.tool.update({ where: { id: tool.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  const found = await listPublishedTools({ search: "needle", category: category.slug, pageSize: 1 }, db);
  assert.equal(found.total, 1); assert.equal(found.items[0]?.id, tool.id);
  assert.equal((await listPublishedTools({ search: "needle", page: 2, pageSize: 1 }, db)).items.length, 0);
  assert.equal((await listPublishedTools({ search: "' OR 1=1 --" }, db)).total, 0);
  await assert.rejects(createToolDraft({ slug: "Bad Slug", name: "x", summary: "x", description: "x", websiteUrl: "javascript:alert(1)" }, db));
  await assert.rejects(createToolDraft({ slug: "credential-url-test", name: "x", summary: "x", description: "x", websiteUrl: "https://user:password@example.invalid" }, db));
  await assert.rejects(listPublishedTools({ pageSize: 500 }, db));
  assert.equal(await getPublishedUseCase("development-example-workflow", db), null);
  assert.equal(await getPublishedArticle("development-example-article", db), null);
  const useCase = await db.useCase.create({ data: { slug: "integration-workflow", title: "Integration workflow", problem: "Test query.", instructions: [], limitations: "Test only.", references: [], status: "PUBLISHED", publishedAt: new Date(), tools: { connect: { id: tool.id } } } });
  const author = await db.user.findUniqueOrThrow({ where: { email: "editor@seed.invalid" } });
  await db.article.create({ data: { slug: "integration-article", title: "Integration article", excerpt: "Test record.", body: { blocks: [] }, status: "PUBLISHED", publishedAt: new Date(), authorId: author.id, useCaseId: useCase.id } });
  assert.equal((await getPublishedUseCase(useCase.slug, db))?.tools[0]?.id, tool.id);
  const article = await getPublishedArticle("integration-article", db);
  assert.deepEqual(article?.author, { name: author.name });
});

test("unique slugs and foreign keys are enforced by PostgreSQL", async () => {
  const category = await db.category.findUniqueOrThrow({ where: { slug: "development-examples" } });
  await assert.rejects(db.category.create({ data: { slug: category.slug, name: "Duplicate" } }), (error: unknown) => (error as { code: string }).code === "P2002");
  await assert.rejects(db.commercialLead.create({ data: { email: "missing@integration.invalid", companyName: "Test", message: "No package exists.", packageId: randomUUID() } }), (error: unknown) => (error as { code: string }).code === "P2003");
  await assert.rejects(sql.query('UPDATE "User" SET email = $1 WHERE email = $2', ["EDITOR@SEED.INVALID", "editor@seed.invalid"]), (error: unknown) => (error as { code: string }).code === "23514");
  await assert.rejects(sql.query('UPDATE "Tool" SET status = $1, "publishedAt" = NULL WHERE slug = $2', ["PUBLISHED", "development-example-tool"]), (error: unknown) => (error as { code: string }).code === "23514");
});

test("commercial leads and their audit records commit together without trusting browser prices", async () => {
  const input = { email: "B2B@integration.invalid", companyName: "Integration fixture", message: "Test lead, not a real commercial request.", packageSlug: "homepage-featured-sponsor" };
  await assert.rejects(createCommercialLead(input, db), /unavailable/);
  assert.equal(await db.commercialLead.count(), 0);
  await db.sponsorshipPackage.update({ where: { slug: input.packageSlug }, data: { active: true, amountMinor: 10000n } });
  await assert.rejects(createCommercialLead({ ...input, amountMinor: 1 } as typeof input, db));
  const lead = await createCommercialLead(input, db);
  assert.equal(lead.email, "b2b@integration.invalid"); assert.equal(lead.status, "NEW");
  assert.equal(await db.auditLog.count({ where: { entityId: lead.id, action: "commercial_lead.created" } }), 1);
  const originalCount = await db.commercialLead.count();
  // Cause the audit insert to fail inside the same transaction, using a real DB trigger.
  await sql.query(`CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'integration rollback'; END; $$; CREATE TRIGGER reject_test_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_test_audit();`);
  try { await assert.rejects(createCommercialLead({ ...input, email: "rollback@integration.invalid" }, db)); }
  finally { await sql.query('DROP TRIGGER reject_test_audit ON "AuditLog"; DROP FUNCTION reject_test_audit();'); }
  assert.equal(await db.commercialLead.count(), originalCount);
});

test("orders, transactions, events and campaigns preserve commercial integrity", async () => {
  const product = await db.sponsorshipPackage.findUniqueOrThrow({ where: { slug: "homepage-featured-sponsor" } });
  const sponsor = await db.sponsor.create({ data: { name: "Integration sponsor fixture", contactEmail: "sponsor@integration.invalid" } });
  const order = await db.paymentOrder.create({ data: { reference: "integration-order-1", sponsorId: sponsor.id, packageId: product.id, amountMinor: 10000n } });
  assert.equal(order.environment, "SANDBOX"); assert.equal(order.status, "PENDING");
  const base = { provider: "integration-only", providerTransactionId: "tx-1", orderId: order.id, amountMinor: order.amountMinor, currency: order.currency };
  const transaction = await db.paymentTransaction.create({ data: base });
  await assert.rejects(db.paymentTransaction.create({ data: { ...base, providerTransactionId: "wrong-amount", amountMinor: 1n } }));
  await assert.rejects(db.paymentTransaction.create({ data: { ...base, providerTransactionId: "wrong-environment", environment: "PRODUCTION" } }));
  await assert.rejects(db.paymentTransaction.create({ data: { ...base, providerTransactionId: "wrong-currency", currency: "USD" } }));
  await assert.rejects(db.paymentTransaction.create({ data: base }), (error: unknown) => (error as { code: string }).code === "P2002");
  const event = { provider: "integration-only", providerEventId: "event-1", eventType: "test.not_a_payment", transactionId: transaction.id, payloadDigest: "a".repeat(64) };
  await db.paymentEvent.create({ data: event });
  await assert.rejects(db.paymentEvent.create({ data: event }), (error: unknown) => (error as { code: string }).code === "P2002");
  await assert.rejects(db.paymentEvent.create({ data: { ...event, providerEventId: "wrong-provider-event", provider: "different-provider" } }), (error: unknown) => (error as { code: string }).code === "P2003");
  await assert.rejects(sql.query('UPDATE "PaymentOrder" SET "amountMinor" = -1 WHERE id = $1', [order.id]), (error: unknown) => ["23514", "23503"].includes((error as { code: string }).code));
  await assert.rejects(sql.query('UPDATE "SponsorshipPackage" SET "amountMinor" = -1 WHERE id = $1', [product.id]), (error: unknown) => (error as { code: string }).code === "23514");
  await assert.rejects(db.sponsor.delete({ where: { id: sponsor.id } }), (error: unknown) => (error as { code: string }).code === "P2003");
  const campaign = await db.sponsorshipCampaign.create({ data: { name: "Integration campaign fixture", sponsorId: sponsor.id, packageId: product.id, orderId: order.id } });
  assert.equal(campaign.status, "DRAFT");
  await assert.rejects(sql.query('UPDATE "SponsorshipCampaign" SET status = $1 WHERE id = $2', ["ACTIVE", campaign.id]), (error: unknown) => (error as { code: string }).code === "23514");
  const otherSponsor = await db.sponsor.create({ data: { name: "Different integration sponsor", contactEmail: "other@integration.invalid" } });
  await assert.rejects(sql.query('UPDATE "SponsorshipCampaign" SET "sponsorId" = $1 WHERE id = $2', [otherSponsor.id, campaign.id]), (error: unknown) => (error as { code: string }).code === "23503");
  assert.equal((await db.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })).status, "PENDING");
});

test("subscriber consent and newsletter approvals are persisted without sending email", async () => {
  const subscriber = await db.newsletterSubscriber.create({ data: { email: "subscriber@integration.invalid", consentAt: new Date(), consentVersion: "integration-only", consentSource: "integration-test" } });
  assert.equal(subscriber.status, "PENDING");
  await assert.rejects(sql.query('UPDATE "NewsletterSubscriber" SET status = $1 WHERE id = $2', ["CONFIRMED", subscriber.id]), (error: unknown) => (error as { code: string }).code === "23514");
  const campaign = await db.newsletterCampaign.create({ data: { subject: "Integration draft", body: { blocks: [] } } });
  assert.equal(campaign.status, "DRAFT");
  await assert.rejects(sql.query('UPDATE "NewsletterCampaign" SET status = $1 WHERE id = $2', ["SENT", campaign.id]), (error: unknown) => (error as { code: string }).code === "23514");
});

test("agent models retain budgets, idempotency, attempts and drafts without executing agents", async () => {
  const agent = await db.agent.create({ data: { identifier: "integration-researcher", role: "RESEARCHER", prompt: "Integration fixture. Never execute." } });
  assert.equal(agent.enabled, false); assert.equal(agent.monthlyBudgetUsdMicros, 0n); assert.deepEqual(agent.allowedTools, []);
  const task = await db.agentTask.create({ data: { agentId: agent.id, idempotencyKey: "integration-task-1", input: { fixture: true } } });
  assert.equal(task.requiresApproval, true); assert.equal(task.tokenBudget, 0);
  await assert.rejects(db.agentTask.create({ data: { agentId: agent.id, idempotencyKey: task.idempotencyKey, input: {} } }), (error: unknown) => (error as { code: string }).code === "P2002");
  await assert.rejects(sql.query('UPDATE "AgentTask" SET attempts = 99 WHERE id = $1', [task.id]), (error: unknown) => (error as { code: string }).code === "23514");
  const execution = { taskId: task.id, attempt: 1, model: "integration-fixture-not-executed" };
  await db.agentExecution.create({ data: execution });
  await assert.rejects(db.agentExecution.create({ data: execution }), (error: unknown) => (error as { code: string }).code === "P2002");
  await db.contentDraft.create({ data: { kind: "REPORT", title: "Integration draft", body: { fixture: true }, taskId: task.id } });
  const found = await db.agentTask.findUniqueOrThrow({ where: { id: task.id }, include: { executions: true, drafts: true } });
  assert.equal(found.executions.length, 1); assert.equal(found.drafts.length, 1);
  assert.equal(found.status, "PENDING");
});

test("public catalog demo seed is repeatable and does not publish records", async () => {
  await seedCatalogDevelopment(db);
  const first = await db.tool.count({ where: { isDemo: true } });
  await seedCatalogDevelopment(db);
  assert.equal(await db.tool.count({ where: { isDemo: true } }), first);
  assert.equal(await db.tool.count({ where: { isDemo: true, status: "PUBLISHED" } }), 0);
  const mode = await homeCatalog("demo", db);
  assert.equal(mode.tools.length, 3); assert.equal(mode.workflows.length, 3); assert.ok(mode.categories.length >= 5);
  assert.equal((await homeCatalog("published", db)).tools.length, 0);
});

test("public catalog reads real filters, sorting and non-overlapping pages", async () => {
  const query = catalogQuerySchema.parse({ sort: "name" });
  const first = await queryTools(query, "demo", db);
  const second = await queryTools({ ...query, page: 2 }, "demo", db);
  assert.equal(first.items.length, 6); assert.ok(second.items.length > 0);
  assert.ok(second.items.every((item) => !first.items.some((other) => other.id === item.id)));
  assert.equal((await queryTools({ ...query, q: "chatgpt" }, "demo", db)).items[0]?.name, "ChatGPT");
  const filtered = await queryTools({ ...query, category: "automation", tag: "no-code" }, "demo", db);
  assert.equal(filtered.total, 3);
  assert.ok(filtered.items.every((item) => item.categories.some((category) => category.slug === "automation")));
  assert.equal((await queryTools({ ...query, q: "' OR 1=1 --" }, "demo", db)).total, 0);
  assert.equal((await queryTools({ ...query, q: "chatgpt" }, "published", db)).total, 0);
  const workflows = await queryWorkflows({ ...query, difficulty: "BEGINNER", category: "content" }, "demo", db);
  assert.equal(workflows.total, 1); assert.equal(workflows.items[0]?.slug, "demo-content-outline");
  assert.equal((await getCatalogFacets("tools", "published", db)).categories.some((category) => category.slug === "automation"), false);
});
