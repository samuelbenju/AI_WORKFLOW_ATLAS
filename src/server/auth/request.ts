import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminConfiguration } from "./config";
import { AccessError, demand, type Permission } from "./policy";
import { resolveSession, validCsrf } from "./service";

export async function currentSession() {
  const token = (await cookies()).get(adminConfiguration().cookieName)?.value;
  // Missing cookies do not need any DB access, including before initialization.
  return token ? resolveSession(token) : null;
}
export async function requirePageActor(permission: Permission = "panel") {
  const session = await currentSession();
  if (!session) redirect("/login");
  try { demand(session.actor, permission); } catch { redirect("/admin/access-denied"); }
  return session;
}
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== adminConfiguration().origin) throw new AccessError(403, "Origen de solicitud no permitido.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AccessError(403, "Solicitud entre sitios no permitida.");
}
export async function requireRequestActor(request: Request, permission: Permission = "panel") {
  const session = await currentSession();
  demand(session?.actor ?? null, permission);
  if (!["GET", "HEAD"].includes(request.method)) {
    checkOrigin(request);
    const token = (await cookies()).get(adminConfiguration().cookieName)?.value;
    if (!token || !validCsrf(token, request.headers.get("x-csrf-token"))) throw new AccessError(403, "La verificación de seguridad expiró. Recarga la página.");
  }
  return session!;
}
export async function readJson(request: Request, maxBytes = 64000): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) throw new AccessError(415, "Se requiere contenido JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "La solicitud está vacía.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    length += chunk.value.length;
    if (length > maxBytes) { await reader.cancel(); throw new AccessError(413, "El contenido supera el tamaño permitido."); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AccessError(400, "El JSON no es válido."); }
}
export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
}
export async function adminApi(operation: () => Promise<Response>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof AccessError) return privateJson({ error: error.message }, error.status);
    if (error instanceof ZodError) return privateJson({ error: "Revisa los campos indicados.", fields: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.code === "custom" ? issue.message : issue.code === "too_big" ? "El valor supera el límite máximo permitido." : issue.code === "too_small" ? "El valor es obligatorio o no alcanza el mínimo permitido." : issue.code === "unrecognized_keys" ? "La solicitud contiene campos no permitidos." : "El valor o su formato no son válidos." })) }, 422);
    const code = (error as { code?: string })?.code;
    if (code === "P2002") return privateJson({ error: "Ya existe un registro con ese identificador." }, 409);
    if (["P2003", "P2014"].includes(code ?? "")) return privateJson({ error: "El registro tiene relaciones que deben resolverse primero." }, 409);
    if (code === "P2025") return privateJson({ error: "El registro o una de sus relaciones ya no existe." }, 404);
    if (code === "P2034") return privateJson({ error: "El registro cambió durante la operación. Recarga e inténtalo de nuevo." }, 409);
    return privateJson({ error: "No se pudo completar la operación. Inténtalo de nuevo." }, 500);
  }
}
