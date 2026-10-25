import "server-only";
import { z } from "zod";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { hashPassword, verifyPassword } from "./password";
import { AccessError, can, type Actor } from "./policy";

export const digestToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const csrfForToken = (token: string) => createHmac("sha256", Buffer.from(token, "hex")).update("atlas-admin-csrf-v1").digest("hex");
export function validCsrf(token: string, supplied: string | null): boolean {
  if (!supplied || !/^[a-f0-9]{64}$/.test(supplied) || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(csrfForToken(token), "hex"), Buffer.from(supplied, "hex"));
}

async function consumeBucket(key: string, seconds: number, maximum: number, db: PrismaClient) {
  const hash = digestToken(key);
  const rows = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginRateLimit" ("keyHash", "attempts", "windowStarted") VALUES (${hash}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("keyHash") DO UPDATE SET
      "attempts" = CASE WHEN "LoginRateLimit"."windowStarted" < CURRENT_TIMESTAMP - make_interval(secs => ${seconds}) THEN 1 ELSE "LoginRateLimit"."attempts" + 1 END,
      "windowStarted" = CASE WHEN "LoginRateLimit"."windowStarted" < CURRENT_TIMESTAMP - make_interval(secs => ${seconds}) THEN CURRENT_TIMESTAMP ELSE "LoginRateLimit"."windowStarted" END
    RETURNING "attempts"`;
  if (!rows[0] || rows[0].attempts > maximum) throw new AccessError(429, "Demasiados intentos. Espera antes de volver a intentarlo.");
}

export async function authenticate(email: string, password: string, previousToken?: string, db: PrismaClient = getDatabase()) {
  const normalized = email.trim().toLowerCase();
  await consumeBucket("login:global", 60, 60, db);
  await consumeBucket(`login:email:${normalized}`, 900, 5, db);
  const user = await db.user.findUnique({ where: { email: normalized } });
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!valid || !user?.active || !user.passwordHash) throw new AccessError(401, "Correo o contraseña incorrectos.");
  if (!can(user.role, "panel")) throw new AccessError(403, "Esta cuenta no tiene acceso al panel.");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.active || current.passwordHash !== user.passwordHash || !can(current.role, "panel")) throw new AccessError(401, "Correo o contraseña incorrectos.");
    if (previousToken && /^[a-f0-9]{64}$/.test(previousToken)) await tx.session.deleteMany({ where: { tokenHash: digestToken(previousToken) } });
    await tx.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await tx.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt } });
    await tx.loginRateLimit.deleteMany({ where: { keyHash: digestToken(`login:email:${normalized}`) } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id } });
  });
  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined, db: PrismaClient = getDatabase()) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digestToken(token) }, select: {
    expiresAt: true, user: { select: { id: true, email: true, name: true, role: true, active: true } },
  } });
  if (!session || session.expiresAt <= new Date() || !session.user.active || !can(session.user.role, "panel")) return null;
  const { active: _active, ...actor } = session.user;
  void _active;
  return { actor: actor as Actor, csrfToken: csrfForToken(token), expiresAt: session.expiresAt };
}

export async function revokeSession(token: string, actor: Actor, db: PrismaClient = getDatabase()) {
  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { tokenHash: digestToken(token), userId: actor.id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "auth.logout", entityType: "User", entityId: actor.id } });
  });
}

export async function initializeOwner(email: string, password: string, db: PrismaClient = getDatabase()) {
  email = z.email().max(320).parse(email.trim().toLowerCase());
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(48183724)`;
    if (await tx.user.count({ where: { active: true, role: { in: ["OWNER", "ADMIN"] }, passwordHash: { not: null } } })) throw new AccessError(409, "El propietario ya fue inicializado. Usa el procedimiento de cambio de contraseña.");
    const user = await tx.user.create({ data: { email: email.trim().toLowerCase(), name: "Propietario", role: "OWNER", active: true, passwordHash } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "auth.owner_initialized", entityType: "User", entityId: user.id, metadata: { source: "operator-cli" } } });
    return { id: user.id };
  });
}

export async function replacePassword(email: string, password: string, db: PrismaClient = getDatabase()) {
  email = z.email().max(320).parse(email.trim().toLowerCase());
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user?.active || !["OWNER", "ADMIN"].includes(user.role)) throw new AccessError(404, "No existe un administrador activo con ese correo.");
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "auth.password_changed", entityType: "User", entityId: user.id, metadata: { source: "operator-cli" } } });
  });
}
