ALTER TABLE "User" ADD COLUMN "passwordHash" VARCHAR(255);
ALTER TABLE "User" ADD CONSTRAINT "User_password_hash_format" CHECK ("passwordHash" IS NULL OR "passwordHash" ~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$');
CREATE TABLE "Session" (
  "id" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_token_digest" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "Session_expiry" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "LoginRateLimit" (
  "keyHash" CHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "windowStarted" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("keyHash"),
  CONSTRAINT "LoginRateLimit_attempts" CHECK ("attempts" > 0)
);
CREATE INDEX "LoginRateLimit_windowStarted_idx" ON "LoginRateLimit"("windowStarted");
