"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CatalogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/admin" || pathname.startsWith("/admin/")) return <main id="main-content" className="admin-login" lang="es"><section className="admin-login-card" role="alert"><h1>No se pudo cargar el acceso</h1><p>Comprueba la conexión con el servicio e inténtalo de nuevo.</p><button className="admin-primary" onClick={reset}>Reintentar</button><Link className="admin-back" href="/">Volver a la plataforma</Link></section></main>;
  return <section className="container error-state" role="alert"><p className="eyebrow muted">A TEMPORARY DETOUR</p><h1>The atlas is temporarily unavailable.</h1><p>We couldn’t load the catalog. Please try again shortly.</p><div className="hero-actions"><button className="button button-primary" onClick={() => reset()}>Try again</button><Link className="button button-outline" href="/">Back to home</Link></div></section>;
}
