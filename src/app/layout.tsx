import { indexingEnabled } from "@/lib/seo-policy";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { site } from "@/lib/config/site";
import { DemoNotice } from "@/components/catalog/demo-notice";
import { SiteChrome } from "@/components/layout/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: { default: `${site.name} — A clearer path to useful AI`, template: `%s | ${site.name}` },
  description: site.description,
  robots: { index: indexingEnabled(), follow: indexingEnabled() },
  openGraph: { title: site.name, description: site.description, type: "website", locale: "en_US" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={site.publicLocale}>
      <body>
        <SiteChrome header={<SiteHeader />} notice={<DemoNotice />} footer={<SiteFooter />}>{children}</SiteChrome>
      </body>
    </html>
  );
}
