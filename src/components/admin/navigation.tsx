"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wrench, FolderTree, Tags, Workflow, Settings, ScrollText, BriefcaseBusiness, Mail, Bot, FileText } from "lucide-react";
const links = [
  ["/admin", "Resumen", LayoutDashboard], ["/admin/tools", "Herramientas", Wrench], ["/admin/use-cases", "Casos de uso", Workflow], ["/admin/articles", "Artículos", FileText], ["/admin/categories", "Categorías", FolderTree], ["/admin/tags", "Etiquetas", Tags],
] as const;
export function AdminNavigation({ privileged }: { privileged: boolean }) {
  const pathname = usePathname();
  const render = (href: string, label: string, Icon: typeof Settings) => <Link key={href} href={href} aria-current={(href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)) ? "page" : undefined}><Icon size={19} aria-hidden="true" />{label}</Link>;
  return <nav className="admin-nav" aria-label="Administración"><p>CONTENIDO</p>{links.map(([href,label,Icon]) => render(href,label,Icon))}{privileged && <><p>COMERCIAL</p>{render("/admin/sponsors", "Patrocinios y CRM", BriefcaseBusiness)}{render("/admin/newsletter", "Newsletter", Mail)}{render("/admin/payments", "Órdenes y pagos", BriefcaseBusiness)}</>}{privileged&&render("/admin/agents", "Motor de agentes", Bot)}{privileged && <><p>SISTEMA</p>{render("/admin/settings", "Configuración", Settings)}{render("/admin/audit", "Auditoría", ScrollText)}</>}</nav>;
}
