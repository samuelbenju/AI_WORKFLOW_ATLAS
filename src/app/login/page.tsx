import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, ShieldCheck } from "lucide-react";
import { currentSession } from "@/server/auth/request";
import { LoginForm } from "@/components/admin/auth-forms";
export const metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };
export default async function LoginPage() {
  if (await currentSession()) redirect("/admin");
  return <main id="main-content" className="admin-login" lang="es"><div className="admin-login-card"><Link href="/" className="admin-brand"><Compass aria-hidden="true" /><span>AI Workflow Atlas</span></Link><div className="admin-login-icon"><ShieldCheck size={30} aria-hidden="true" /></div><p className="admin-eyebrow">CENTRO DE CONTROL</p><h1>Bienvenido de nuevo</h1><p className="admin-muted">Gestiona el contenido que convierte la IA en soluciones útiles.</p><LoginForm /><Link className="admin-back" href="/">← Volver a la plataforma</Link></div><p className="admin-login-note">Tu sesión es privada y tiene una duración limitada.</p></main>;
}
