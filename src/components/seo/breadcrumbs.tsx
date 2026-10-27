import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/editorial";

export type Breadcrumb = { name: string; path: string };
export function Breadcrumbs({ items, structured = true }: { items: Breadcrumb[]; structured?: boolean }) {
  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item, index) =>
      <li key={item.path}>{index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}</li>)}</ol></nav>
    {structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({
        "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path),
      })),
    }) }} />}
  </>;
}
