import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <section className="container not-found"><p className="eyebrow muted">404 / OFF THE MAP</p><h1>This path isn’t on the atlas.</h1><p>The page may have moved, or it hasn’t been built yet.</p><Link href="/" className="button button-primary"><ArrowLeft size={17} aria-hidden="true" /> Back to the atlas</Link></section>;
}
