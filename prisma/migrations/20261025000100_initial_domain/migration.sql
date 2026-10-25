-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PackageKind" AS ENUM ('HOMEPAGE_FEATURED_SPONSOR', 'NEWSLETTER_SPONSORSHIP', 'FEATURED_TOOL_LISTING', 'SPONSORED_ARTICLE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COP', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('CEO', 'RESEARCHER', 'EDITOR', 'SEO', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DraftKind" AS ENUM ('TOOL', 'USE_CASE', 'ARTICLE', 'COMMERCIAL_PROPOSAL', 'REPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(120),
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "websiteUrl" VARCHAR(2048) NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "problem" TEXT NOT NULL,
    "instructions" JSONB NOT NULL,
    "limitations" TEXT NOT NULL,
    "references" JSONB NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "body" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(3),
    "metaTitle" VARCHAR(200),
    "metaDescription" VARCHAR(500),
    "authorId" UUID,
    "useCaseId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "websiteUrl" VARCHAR(2048),
    "contactEmail" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorshipPackage" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "kind" "PackageKind" NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" BIGINT,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SponsorshipPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialLead" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "companyName" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "packageId" UUID NOT NULL,
    "sponsorId" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommercialLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorshipCampaign" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sponsorId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "toolId" UUID,
    "articleId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SponsorshipCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "sponsorId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "leadId" UUID,
    "paidAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "providerTransactionId" VARCHAR(200) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "orderId" UUID NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "providerEventId" VARCHAR(200) NOT NULL,
    "transactionId" UUID,
    "eventType" VARCHAR(120) NOT NULL,
    "payloadDigest" CHAR(64) NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3),
    "processedAt" TIMESTAMPTZ(3),
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "consentVersion" VARCHAR(100) NOT NULL,
    "consentSource" VARCHAR(200) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "unsubscribedAt" TIMESTAMPTZ(3),
    "tokenHash" CHAR(64),
    "tokenExpiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" UUID NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "body" JSONB NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'DRAFT',
    "sponsorshipCampaignId" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "scheduledAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "providerCampaignId" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" UUID NOT NULL,
    "identifier" VARCHAR(100) NOT NULL,
    "role" "AgentRole" NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "model" VARCHAR(100),
    "allowedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "monthlyBudgetUsdMicros" BIGINT NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "input" JSONB NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "tokenBudget" INTEGER NOT NULL DEFAULT 0,
    "budgetUsdMicros" BIGINT NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "model" VARCHAR(100) NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicros" BIGINT NOT NULL DEFAULT 0,
    "output" JSONB,
    "errorCode" VARCHAR(100),
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" UUID NOT NULL,
    "kind" "DraftKind" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" UUID,
    "taskId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(200) NOT NULL,
    "requestId" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToTool" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CategoryToTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CategoryToUseCase" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CategoryToUseCase_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TagToTool" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TagToTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TagToUseCase" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TagToUseCase_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ToolToUseCase" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ToolToUseCase_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArticleToCategory" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ArticleToCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArticleToTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ArticleToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArticleToTool" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ArticleToTool_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_slug_key" ON "Tool"("slug");

-- CreateIndex
CREATE INDEX "Tool_status_isDemo_publishedAt_idx" ON "Tool"("status", "isDemo", "publishedAt");

-- CreateIndex
CREATE INDEX "Tool_name_id_idx" ON "Tool"("name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "UseCase_slug_key" ON "UseCase"("slug");

-- CreateIndex
CREATE INDEX "UseCase_status_isDemo_difficulty_publishedAt_idx" ON "UseCase"("status", "isDemo", "difficulty", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_isDemo_publishedAt_idx" ON "Article"("status", "isDemo", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");

-- CreateIndex
CREATE INDEX "Article_useCaseId_idx" ON "Article"("useCaseId");

-- CreateIndex
CREATE INDEX "Sponsor_contactEmail_idx" ON "Sponsor"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorshipPackage_slug_key" ON "SponsorshipPackage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorshipPackage_kind_key" ON "SponsorshipPackage"("kind");

-- CreateIndex
CREATE INDEX "CommercialLead_status_createdAt_idx" ON "CommercialLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommercialLead_email_idx" ON "CommercialLead"("email");

-- CreateIndex
CREATE INDEX "CommercialLead_packageId_idx" ON "CommercialLead"("packageId");

-- CreateIndex
CREATE INDEX "CommercialLead_sponsorId_idx" ON "CommercialLead"("sponsorId");

-- CreateIndex
CREATE INDEX "CommercialLead_approvedById_idx" ON "CommercialLead"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorshipCampaign_orderId_key" ON "SponsorshipCampaign"("orderId");

-- CreateIndex
CREATE INDEX "SponsorshipCampaign_status_startsAt_endsAt_idx" ON "SponsorshipCampaign"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "SponsorshipCampaign_sponsorId_idx" ON "SponsorshipCampaign"("sponsorId");

-- CreateIndex
CREATE INDEX "SponsorshipCampaign_packageId_idx" ON "SponsorshipCampaign"("packageId");

-- CreateIndex
CREATE INDEX "SponsorshipCampaign_approvedById_idx" ON "SponsorshipCampaign"("approvedById");

-- CreateIndex
CREATE INDEX "SponsorshipCampaign_toolId_idx" ON "SponsorshipCampaign"("toolId");

-- CreateIndex
CREATE INDEX "SponsorshipCampaign_articleId_idx" ON "SponsorshipCampaign"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_reference_key" ON "PaymentOrder"("reference");

-- CreateIndex
CREATE INDEX "PaymentOrder_environment_status_createdAt_idx" ON "PaymentOrder"("environment", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_sponsorId_idx" ON "PaymentOrder"("sponsorId");

-- CreateIndex
CREATE INDEX "PaymentOrder_packageId_idx" ON "PaymentOrder"("packageId");

-- CreateIndex
CREATE INDEX "PaymentOrder_leadId_idx" ON "PaymentOrder"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_id_amountMinor_currency_environment_key" ON "PaymentOrder"("id", "amountMinor", "currency", "environment");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_amountMinor_currency_environment_idx" ON "PaymentTransaction"("orderId", "amountMinor", "currency", "environment");

-- CreateIndex
CREATE INDEX "PaymentTransaction_environment_status_createdAt_idx" ON "PaymentTransaction"("environment", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_provider_environment_providerTransaction_key" ON "PaymentTransaction"("provider", "environment", "providerTransactionId");

-- CreateIndex
CREATE INDEX "PaymentEvent_transactionId_idx" ON "PaymentEvent"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentEvent_processedAt_receivedAt_idx" ON "PaymentEvent"("processedAt", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_environment_providerEventId_key" ON "PaymentEvent"("provider", "environment", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_tokenHash_key" ON "NewsletterSubscriber"("tokenHash");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_createdAt_idx" ON "NewsletterSubscriber"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterCampaign_providerCampaignId_key" ON "NewsletterCampaign"("providerCampaignId");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_status_scheduledAt_idx" ON "NewsletterCampaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_sponsorshipCampaignId_idx" ON "NewsletterCampaign"("sponsorshipCampaignId");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_approvedById_idx" ON "NewsletterCampaign"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_identifier_key" ON "Agent"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTask_idempotencyKey_key" ON "AgentTask"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentTask_status_scheduledAt_leaseExpiresAt_idx" ON "AgentTask"("status", "scheduledAt", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "AgentTask_agentId_createdAt_idx" ON "AgentTask"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_approvedById_idx" ON "AgentTask"("approvedById");

-- CreateIndex
CREATE INDEX "AgentExecution_status_startedAt_idx" ON "AgentExecution"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentExecution_taskId_attempt_key" ON "AgentExecution"("taskId", "attempt");

-- CreateIndex
CREATE INDEX "ContentDraft_status_createdAt_idx" ON "ContentDraft"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDraft_authorId_idx" ON "ContentDraft"("authorId");

-- CreateIndex
CREATE INDEX "ContentDraft_taskId_idx" ON "ContentDraft"("taskId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "_CategoryToTool_B_index" ON "_CategoryToTool"("B");

-- CreateIndex
CREATE INDEX "_CategoryToUseCase_B_index" ON "_CategoryToUseCase"("B");

-- CreateIndex
CREATE INDEX "_TagToTool_B_index" ON "_TagToTool"("B");

-- CreateIndex
CREATE INDEX "_TagToUseCase_B_index" ON "_TagToUseCase"("B");

-- CreateIndex
CREATE INDEX "_ToolToUseCase_B_index" ON "_ToolToUseCase"("B");

-- CreateIndex
CREATE INDEX "_ArticleToCategory_B_index" ON "_ArticleToCategory"("B");

-- CreateIndex
CREATE INDEX "_ArticleToTag_B_index" ON "_ArticleToTag"("B");

-- CreateIndex
CREATE INDEX "_ArticleToTool_B_index" ON "_ArticleToTool"("B");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "UseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialLead" ADD CONSTRAINT "CommercialLead_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SponsorshipPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialLead" ADD CONSTRAINT "CommercialLead_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialLead" ADD CONSTRAINT "CommercialLead_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SponsorshipPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipCampaign" ADD CONSTRAINT "SponsorshipCampaign_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SponsorshipPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CommercialLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_amountMinor_currency_environmen_fkey" FOREIGN KEY ("orderId", "amountMinor", "currency", "environment") REFERENCES "PaymentOrder"("id", "amountMinor", "currency", "environment") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_sponsorshipCampaignId_fkey" FOREIGN KEY ("sponsorshipCampaignId") REFERENCES "SponsorshipCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToTool" ADD CONSTRAINT "_CategoryToTool_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToTool" ADD CONSTRAINT "_CategoryToTool_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToUseCase" ADD CONSTRAINT "_CategoryToUseCase_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToUseCase" ADD CONSTRAINT "_CategoryToUseCase_B_fkey" FOREIGN KEY ("B") REFERENCES "UseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTool" ADD CONSTRAINT "_TagToTool_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTool" ADD CONSTRAINT "_TagToTool_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToUseCase" ADD CONSTRAINT "_TagToUseCase_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToUseCase" ADD CONSTRAINT "_TagToUseCase_B_fkey" FOREIGN KEY ("B") REFERENCES "UseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToUseCase" ADD CONSTRAINT "_ToolToUseCase_A_fkey" FOREIGN KEY ("A") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToUseCase" ADD CONSTRAINT "_ToolToUseCase_B_fkey" FOREIGN KEY ("B") REFERENCES "UseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToCategory" ADD CONSTRAINT "_ArticleToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToCategory" ADD CONSTRAINT "_ArticleToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToTag" ADD CONSTRAINT "_ArticleToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToTag" ADD CONSTRAINT "_ArticleToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToTool" ADD CONSTRAINT "_ArticleToTool_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToTool" ADD CONSTRAINT "_ArticleToTool_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
