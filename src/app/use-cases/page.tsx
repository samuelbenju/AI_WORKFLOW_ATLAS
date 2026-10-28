import { Suspense } from "react";
import Loading from "../loading";
import { publicMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { parseCatalogQuery, type CatalogSearchParams, type CatalogQuery, catalogHref } from "@/lib/catalog-query";
import { workflowsPageData, getCatalogFacets } from "@/server/data/public-catalog";
import { CatalogFilters, DirectoryHeading, EmptyState, Pagination, WorkflowCard } from "@/components/catalog/catalog-ui";
import { AdvertisingPlacement } from "@/components/advertising/placement";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

import { CollectionData } from "@/components/seo/collection";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<CatalogSearchParams> }): Promise<Metadata> {
  const raw = await searchParams; const parsed = parseCatalogQuery(raw);
  const result=parsed.success?await workflowsPageData(parsed.data):null;
  const page=parsed.success?parsed.data.page:1;
  return publicMetadata(`Practical AI use cases${page>1?` — Page ${page}`:''}`, `Explore practical AI workflows with tools, steps, sources and limitations.${page>1?` Page ${page} of the directory.`:''}`, parsed.success ? catalogHref("/use-cases", parsed.data) : "/use-cases", { noindex: !result?.items.length || Object.keys(raw).some(key => key !== "page") });
}
export default async function UseCasesPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const parsed = parseCatalogQuery(await searchParams);
  if (!parsed.success) return <div className="container directory-page"><DirectoryHeading kind="use-cases" /><EmptyState title="Those filters need a quick check." description="Choose a supported difficulty, valid filters, and a positive page number." href="/use-cases" label="Reset filters" /></div>;
  const query = parsed.data;
  return <div className="container directory-page"><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Use cases", path: "/use-cases" }]} /><DirectoryHeading kind="use-cases" /><Suspense fallback={<Loading />}><WorkflowResults query={query} /></Suspense></div>;
}

async function WorkflowResults({query}:{query:CatalogQuery}){
  const [result, facets] = await Promise.all([workflowsPageData(query), getCatalogFacets("use-cases")]);
  return <><CatalogFilters kind="use-cases" query={query} facets={facets} /><div className="results-heading" id="results"><h2>{query.q ? `Results for “${query.q}”` : "Find a workflow worth exploring"}</h2><span>{result.total} {result.total === 1 ? "use case" : "use cases"}{result.total > 0 && ` · Page ${query.page} of ${result.pageCount}`}</span></div><div className="catalog-grid">{result.items.map((workflow) => <WorkflowCard key={workflow.slug} workflow={workflow} />)}</div>{result.items.length === 0 && <EmptyState title={result.total > 0 ? "This page is off the map." : "No workflows match just yet."} description={result.total > 0 ? "Return to the first page to explore the matching workflows." : "Try a different problem, category, or difficulty, or clear your filters."} href={result.total > 0 ? catalogHref("/use-cases", query, { page: 1 }) : "/use-cases"} label={result.total > 0 ? "Back to first page" : "Clear filters"} />}<CollectionData name="Practical AI use cases" path={catalogHref("/use-cases",query)} start={(query.page-1)*6} items={result.items.map(workflow=>({name:workflow.title,path:`/use-cases/${workflow.slug}`}))}/><Pagination path="/use-cases" query={query} pageCount={result.pageCount} /><AdvertisingPlacement placement="guides" path="/use-cases" eligible={!query.q && result.items.length >= 6 && result.items.every(w => !w.isDemo)} /></>;
}
