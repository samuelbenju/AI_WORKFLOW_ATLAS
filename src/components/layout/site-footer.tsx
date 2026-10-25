import { Brand } from "@/components/ui/brand";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div><Brand /><p>Less noise. More useful work.</p></div>
        <div className="footer-meta"><span>Independent by design. Built from Colombia.</span><span>AI Workflow Atlas · Working name · Pre-launch</span></div>
        <Link href="/#project-status">Development status <span aria-hidden="true">↗</span></Link>
      </div>
    </footer>
  );
}
