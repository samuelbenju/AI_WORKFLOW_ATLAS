import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";

const links = [
  { href: "/tools", label: "AI tools" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/blog", label: "Journal" },
  { href: "/sponsor", label: "Sponsor" },
  { href: "/#approach", label: "Our approach" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <Link className="header-cta" href="/use-cases">Find your workflow <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <details className="mobile-menu">
          <summary>Menu <span aria-hidden="true">+</span></summary>
          <nav aria-label="Mobile navigation">
            {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          </nav>
        </details>
      </div>
    </header>
  );
}
