"use client";
import { useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
export function LoginForm() {
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  return <form className="admin-form" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      if (!response.ok) { const result = await response.json(); setError(result.error ?? "No se pudo iniciar sesión."); setPending(false); return; }
      window.location.assign(new URL("/admin", window.location.origin).href);
    } catch { setError("No se pudo conectar. Inténtalo de nuevo."); setPending(false); }
  }}>
    <label>Correo electrónico<input name="email" type="email" autoComplete="username" maxLength={320} required /></label>
    <label>Contraseña<input name="password" type="password" autoComplete="current-password" maxLength={128} required /></label>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    <button className="admin-primary" disabled={pending} type="submit"><LogIn size={18} aria-hidden="true" />{pending ? "Verificando…" : "Iniciar sesión"}</button>
    <p className="admin-muted"><ShieldCheck size={16} aria-hidden="true" /> Acceso exclusivo para personal autorizado.</p>
  </form>;
}
export function LogoutButton({ csrf }: { csrf: string }) {
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  return <div><button className="admin-secondary" disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try { const response = await fetch("/api/admin/logout", { method: "POST", headers: { "x-csrf-token": csrf } }); if (response.ok || response.status === 401) { window.location.replace("/login"); return; } setError("No se pudo cerrar la sesión. Recarga e inténtalo de nuevo."); }
    catch { setError("No se pudo conectar."); } setPending(false);
  }}><LogOut size={16} aria-hidden="true" />{pending ? "Cerrando…" : "Cerrar sesión"}</button>{error && <p role="alert">{error}</p>}</div>;
}
