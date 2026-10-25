import { SponsoredPlacements } from "@/components/commercial/placements";
import { publicMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { parseCatalogQuery, type CatalogSearchParams, catalogHref } from "@/lib/catalog-query";
import { queryTools, getCatalogFacets } from "@/server/data/public-catalog";
import { CatalogFilters, DirectoryHeading, EmptyState, Pagination, ToolCard } from "@/components/catalog/catalog-ui";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<CatalogSearchParams> }): Promise<Metadata> {
  const raw = await searchParams; const parsed = parseCatalogQuery(raw);
  return publicMetadata("AI tools", "Find AI tools by purpose, category, and workflow.", parsed.success ? catalogHref("/tools", { page: parsed.data.page }) : "/tools", { noindex: !parsed.success || Object.keys(raw).some(key => key !== "page") });
}
export default async function ToolsPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const parsed = parseCatalogQuery(await searchParams);
  if (!parsed.success) return <div className="container directory-page"><DirectoryHeading kind="tools" /><EmptyState title="Those filters need a quick check." description="Use a search of up to 100 characters, valid categories, and a positive page number." href="/tools" label="Reset filters" /></div>;
  const query = parsed.data;
  const [result, facets] = await Promise.all([queryTools(query), getCatalogFacets("tools")]);
  return <div className="container directory-page"><DirectoryHeading kind="tools" /><SponsoredPlacements kind="FEATURED_TOOL_LISTING" /><CatalogFilters kind="tools" query={query} facets={facets} /><div className="results-heading" id="results"><h2>{query.q ? `Results for “${query.q}”` : "Explore the tools"}</h2><span>{result.total} {result.total === 1 ? "tool" : "tools"}{result.total > 0 && ` · Page ${query.page} of ${result.pageCount}`}</span></div><div className="catalog-grid">{result.items.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>{result.items.length === 0 && <EmptyState title={result.total > 0 ? "This page is off the map." : "No tools match just yet."} description={result.total > 0 ? "There are listings on earlier pages. Return to the first page to explore them." : "Try another search or clear your filters. New listings will appear here when they are available."} href={result.total > 0 ? catalogHref("/tools", query, { page: 1 }) : "/tools"} label={result.total > 0 ? "Back to first page" : "Clear filters"} />}<Pagination path="/tools" query={query} pageCount={result.pageCount} /></div>;
}
