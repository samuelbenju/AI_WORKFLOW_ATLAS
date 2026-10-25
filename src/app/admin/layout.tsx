import Link from "next/link";
import { Compass, ExternalLink } from "lucide-react";
import { requirePageActor } from "@/server/auth/request";
import { can } from "@/server/auth/policy";
import { AdminNavigation } from "@/components/admin/navigation";
import { LogoutButton } from "@/components/admin/auth-forms";
export const dynamic = "force-dynamic";
export const metadata = { title: "Administración", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { actor, csrfToken } = await requirePageActor();
  const roles = { OWNER: "Propietario", ADMIN: "Administrador", EDITOR: "Editor", VIEWER: "Lector" };
  return <div className="admin-shell" lang="es"><aside className="admin-sidebar"><Link className="admin-brand" href="/admin"><Compass aria-hidden="true" /><span>AI Workflow Atlas<small>ADMINISTRACIÓN</small></span></Link><AdminNavigation privileged={can(actor.role, "settings")} /><Link className="admin-public-link" href="/">Ver plataforma <ExternalLink size={15} aria-hidden="true" /></Link></aside><div className="admin-workspace"><header className="admin-topbar"><div><span className="admin-status-dot" /> Sesión protegida</div><div className="admin-identity"><span>{actor.name ?? "Operador"}<small>{roles[actor.role]}</small></span><LogoutButton csrf={csrfToken} /></div></header><main id="main-content" className="admin-main">{children}</main><footer className="admin-footer">AI Workflow Atlas · Centro de control editorial</footer></div></div>;
}
