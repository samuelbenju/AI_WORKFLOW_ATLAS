"use client";
import {Suspense} from "react";
import {GrowthConsent} from "@/components/growth/consent";
import { usePathname } from "next/navigation";
import { AdvertisingNavigation } from "@/components/advertising/navigation";
import { advertisingPath } from "@/lib/advertising";
export function SiteChrome({ children, header, footer, notice, advertisingPreferences }: { children: React.ReactNode; header: React.ReactNode; footer: React.ReactNode; notice: React.ReactNode; advertisingPreferences?: React.ReactNode }) {
  const pathname = usePathname();
  const privateArea = pathname === "/login" || pathname === "/admin" || pathname.startsWith("/admin/");
  return <><Suspense fallback={null}><AdvertisingNavigation /></Suspense><a className="skip-link" href="#main-content">{privateArea ? "Saltar al contenido" : "Skip to content"}</a>{privateArea ? children : <>{header}{notice}<main id="main-content">{children}</main>{footer}<Suspense fallback={null}><GrowthConsent/></Suspense>{advertisingPath(pathname) && advertisingPreferences}</>}</>;
}
