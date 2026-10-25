import { FlaskConical } from "lucide-react";
import { catalogMode } from "@/server/data/public-catalog";

export function DemoNotice() {
  if (catalogMode() !== "demo") return null;
  return <aside className="demo-notice" aria-label="Development preview"><FlaskConical size={15} aria-hidden="true" /><span><strong>Development preview</strong> · Sample catalog content. These are not verified reviews, live integrations, or business results.</span></aside>;
}
