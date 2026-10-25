import Link from "next/link";
import { ArrowRight, ArrowUpRight,  Layers3, Search, Route } from "lucide-react";
import type { PublicTool, PublicWorkflow, Facets } from "@/server/data/public-catalog";
import { catalogHref, type CatalogQuery } from "@/lib/catalog-query";
import { difficultyLabels } from "@/lib/catalog-content";

export function SearchForm() {
  return <form action="/tools" method="get" className="atlas-search" role="search"><Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor="hero-search">Search AI tools</label><input id="hero-search" name="q" type="search" maxLength={100} placeholder="What would you like to do?" /><button type="submit">Explore <ArrowRight size={16} aria-hidden="true" /></button></form>;
}

export function ToolCard({ tool }: { tool: PublicTool }) {
  return <article className="catalog-card tool-card" data-testid="tool-card"><div className="card-top"><span className={`tool-monogram tone-${tool.name.length % 4}`} aria-hidden="true">{tool.name.slice(0, 2)}</span><span className="record-type">{tool.isDemo ? "Sample listing" : "AI TOOL"}</span></div><h3><Link href={`/tools/${tool.slug}`}>{tool.name}<ArrowUpRight size={17} aria-hidden="true" /></Link></h3><p>{tool.summary}</p><div className="record-footer"><span>{tool.categories[0]?.name ?? "General"}</span><span><Layers3 size={13} aria-hidden="true" /> Tool guide</span></div></article>;
}

export function WorkflowCard({ workflow }: { workflow: PublicWorkflow }) {
  return <article className="catalog-card workflow-card" data-testid="workflow-card"><div className="card-top"><span className="workflow-symbol"><Route size={23} strokeWidth={1.5} aria-hidden="true" /></span><span className="difficulty-label">{difficultyLabels[workflow.difficulty]}</span></div>{workflow.isDemo && <span className="sample-label">Development example</span>}<h3><Link href={`/use-cases/${workflow.slug}`}>{workflow.title}</Link></h3><p>{workflow.problem}</p><div className="record-footer"><span>{workflow.categories[0]?.name ?? "General"}</span><Link href={`/use-cases/${workflow.slug}`} aria-label={`Explore workflow: ${workflow.title}`}>Explore workflow <ArrowRight size={14} aria-hidden="true" /></Link></div></article>;
}

export function CatalogFilters({ kind, query, facets }: { kind: "tools" | "use-cases"; query: CatalogQuery; facets: Facets }) {
  const path = kind === "tools" ? "/tools" : "/use-cases";
  return <form method="get" action={path} className="catalog-filters" aria-label="Catalog filters"><div className="filter-search"><label htmlFor="catalog-search">Search {kind === "tools" ? "tools" : "workflows"}</label><div><Search size={16} aria-hidden="true" /><input id="catalog-search" name="q" type="search" defaultValue={query.q} maxLength={100} placeholder={kind === "tools" ? "Tool name or purpose…" : "Problem or workflow…"} /></div></div><div><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={query.category ?? ""}><option value="">All categories</option>{facets.categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></div><div><label htmlFor="tag">Tag</label><select id="tag" name="tag" defaultValue={query.tag ?? ""}><option value="">All tags</option>{facets.tags.map((tag) => <option key={tag.slug} value={tag.slug}>{tag.name}</option>)}</select></div>{kind === "use-cases" && <div><label htmlFor="difficulty">Difficulty</label><select id="difficulty" name="difficulty" defaultValue={query.difficulty ?? ""}><option value="">Any difficulty</option>{Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}<div><label htmlFor="sort">Sort by</label><select id="sort" name="sort" defaultValue={query.sort}><option value="recent">Recently added</option><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option></select></div><div className="filter-actions"><button type="submit" className="button button-primary">Apply filters</button><Link href={path}>Clear all</Link></div></form>;
}

export function Pagination({ path, query, pageCount }: { path: "/tools" | "/use-cases"; query: CatalogQuery; pageCount: number }) {
  if (pageCount <= 1 || query.page > pageCount) return null;
  const pages = [...new Set([1, query.page - 1, query.page, query.page + 1, pageCount])].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
  return <nav className="pagination" aria-label="Pagination">{query.page > 1 ? <Link rel="prev" href={catalogHref(path, query, { page: query.page - 1 })}>← Previous</Link> : <span aria-disabled="true">← Previous</span>}<div>{pages.map((page, index) => <span key={page}>{index > 0 && page - (pages[index - 1] ?? 0) > 1 && <span className="page-gap">…</span>}<Link href={catalogHref(path, query, { page })} aria-label={`Page ${page}`} aria-current={page === query.page ? "page" : undefined}>{page}</Link></span>)}</div>{query.page < pageCount ? <Link rel="next" href={catalogHref(path, query, { page: query.page + 1 })}>Next →</Link> : <span aria-disabled="true">Next →</span>}</nav>;
}

export function EmptyState({ title = "Nothing here just yet.", description, href, label = "Explore all tools" }: { title?: string; description: string; href?: string; label?: string }) {
  return <div className="empty-state"><span className="empty-icon"><Search size={23} aria-hidden="true" /></span><h2>{title}</h2><p>{description}</p>{href && <Link className="button button-outline" href={href}>{label}<ArrowRight size={15} aria-hidden="true" /></Link>}</div>;
}

export function DirectoryHeading({ kind }: { kind: "tools" | "use-cases" }) {
  return <div className="directory-heading"><p className="eyebrow"><span className="status-dot" /> {kind === "tools" ? "THE TOOL ATLAS" : "FROM IDEA TO ACTION"}</p><h1>{kind === "tools" ? <>Find your next <span className="gradient-text">unfair advantage.</span></> : <>Good ideas deserve <span className="gradient-text">a practical workflow.</span></>}</h1><p>{kind === "tools" ? "Explore AI tools by what they help you do. Find a starting point, understand its purpose, and make it your own." : "Start with a problem. Discover the tools, steps, and human judgment needed to work through it."}</p></div>;
}

export {NewsletterSection as NewsletterBlock} from "@/components/newsletter/section";
