import { Brand } from "@/components/ui/brand";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div><Brand /><p>Less noise. More useful work.</p></div>
        <div className="footer-meta"><span>Independent by design. Built from Colombia.</span><span>AI Workflow Atlas · Working name · Pre-launch</span></div>
        <div className="footer-links"><Link href="/tools">AI tools</Link><Link href="/use-cases">Use cases</Link><Link href="/blog">Journal</Link><Link href="/sponsor">Sponsor</Link><Link href="/newsletter">Newsletter</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link><Link href="/advertising">Advertising</Link><Link href="/affiliates">Affiliates</Link><Link href="/contact">Contact</Link></div>
      </div>
    </footer>
  );
}
