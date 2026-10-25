import Link from "next/link";
import { statusLabels } from "@/lib/admin-content";
export function AdminHeading({ eyebrow = "ESPACIO EDITORIAL", title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-page-heading"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="admin-muted">{description}</p></div>{action}</div>;
}
export function StatusBadge({ status, demo }: { status?: string; demo?: boolean }) {
  return <span className="admin-badges">{status && <span className={`admin-badge ${status === "PUBLISHED" ? "admin-badge-live" : ""}`}>{statusLabels[status as keyof typeof statusLabels] ?? status}</span>}{demo && <span className="admin-badge">Ejemplo</span>}</span>;
}
export function EmptyState({ title = "Todavía no hay registros", description = "Los contenidos aparecerán aquí cuando se creen.", href, link }: { title?: string; description?: string; href?: string; link?: string }) {
  return <div className="admin-empty"><h2>{title}</h2><p className="admin-muted">{description}</p>{href && <Link className="admin-secondary" href={href}>{link ?? "Crear contenido"}</Link>}</div>;
}
export const formatDate = (date: Date) => new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
