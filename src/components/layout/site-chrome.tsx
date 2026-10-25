"use client";
import { usePathname } from "next/navigation";
export function SiteChrome({ children, header, footer, notice }: { children: React.ReactNode; header: React.ReactNode; footer: React.ReactNode; notice: React.ReactNode }) {
  const pathname = usePathname();
  const privateArea = pathname === "/login" || pathname === "/admin" || pathname.startsWith("/admin/");
  return <><a className="skip-link" href="#main-content">{privateArea ? "Saltar al contenido" : "Skip to content"}</a>{privateArea ? children : <>{header}{notice}<main id="main-content">{children}</main>{footer}</>}</>;
}
