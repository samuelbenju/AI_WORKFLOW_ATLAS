import type { Role } from "@/generated/prisma/client";

export type Permission = "panel" | "write" | "delete" | "publish" | "settings" | "commercial" | "newsletter" | "payments" | "agents" | "analytics";
export type Actor = { id: string; email: string; name: string | null; role: Role };
export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function can(role: Role, permission: Permission): boolean {
  if (role === "OWNER" || role === "ADMIN") return true;
  return role === "EDITOR" && (permission === "panel" || permission === "write");
}
export function demand(actor: Actor | null, permission: Permission): asserts actor is Actor {
  if (!actor) throw new AccessError(401, "Debes iniciar sesión.");
  if (!can(actor.role, permission)) throw new AccessError(403, "No tienes permiso para esta operación.");
}
