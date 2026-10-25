import Link from "next/link";
import { Orbit } from "lucide-react";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-icon"><Orbit size={23} strokeWidth={1.7} aria-hidden="true" /></span>
      <span>workflow<span className="brand-light">atlas</span><span className="brand-dot">.</span></span>
      <span className="sr-only"> Home</span>
    </Link>
  );
}
