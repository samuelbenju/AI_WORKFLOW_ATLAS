import {ArticleCard} from "@/components/editorial/article-view";
import {AffiliateLinks} from "@/components/growth/affiliate-links";
import { SponsoredPlacements } from "@/components/commercial/placements";
import { publicMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Globe } from "lucide-react";
import type { Metadata } from "next";
import { toolBySlug } from "@/server/data/public-catalog";
import { safeExternalUrl } from "@/lib/catalog-content";
import { EmptyState, WorkflowCard, ToolCard } from "@/components/catalog/catalog-ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const tool = await toolBySlug((await params).slug);
  if (!tool) notFound();
  return publicMetadata(`${tool.name}: overview and workflows`, tool.summary, `/tools/${tool.slug}`, { noindex: tool.isDemo });
}
export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const tool = await toolBySlug((await params).slug);
  if (!tool) notFound();
  const candidate = safeExternalUrl(tool.websiteUrl);
  const website = candidate && !new URL(candidate).hostname.endsWith(".invalid") ? candidate : null;
  return <div className="container detail-page"><Link className="back-link" href="/tools"><ArrowLeft size={15} aria-hidden="true" /> All AI tools</Link><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "AI tools", path: "/tools" }, { name: tool.name, path: `/tools/${tool.slug}` }]} /><header className="detail-heading"><div><p className="eyebrow muted">{tool.isDemo ? "SAMPLE TOOL LISTING" : "THE TOOL ATLAS"}</p><h1>{tool.name}</h1><p>{tool.summary}</p><div className="detail-tags">{tool.categories.map((category) => <Link key={category.slug} href={`/categories/${encodeURIComponent(category.slug)}`}>{category.name}</Link>)}{tool.tags.map((tag) => <Link key={tag.slug} href={`/tools?tag=${encodeURIComponent(tag.slug)}`}>#{tag.name}</Link>)}</div></div><aside className="official-link-panel"><Globe size={23} aria-hidden="true" /><span>Explore at the source</span>{website ? <a className="button button-primary" href={website} target="_blank" rel="noopener noreferrer">Official website <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a> : <p>Official link unavailable.</p>}<small>External website. Availability and terms may change.</small></aside></header><SponsoredPlacements kind="FEATURED_TOOL_LISTING" targetId={tool.id}/><AffiliateLinks toolId={tool.id}/><section className="prose-panel" aria-labelledby="tool-about"><h2 id="tool-about">What it helps you do</h2><p>{tool.description}</p>{tool.isDemo && <p className="detail-disclaimer">This development listing illustrates the directory. It is not a hands-on review or a claim of verified integration.</p>}</section><section className="related-section" aria-labelledby="related-title"><div className="section-heading"><div><p className="eyebrow muted">PUT IT INTO CONTEXT</p><h2 id="related-title">Related workflows</h2></div></div><div className="catalog-grid">{tool.useCases.map((workflow) => <WorkflowCard key={workflow.slug} workflow={workflow} />)}</div>{tool.useCases.length === 0 && <EmptyState description="No related workflows are available for this tool yet." href="/use-cases" label="Explore use cases" />}</section>{tool.related.length>0&&<section className="related-section" aria-labelledby="related-tools"><div className="section-heading"><div><p className="eyebrow muted">KEEP EXPLORING</p><h2 id="related-tools">Tools with shared topics</h2></div></div><p className="section-note">Related by existing categories or tags, listed alphabetically. This is not a ranking.</p><div className="catalog-grid">{tool.related.map(related=><ToolCard key={related.id} tool={related}/>)}</div></section>}<p className="section-note">Listing updated <time dateTime={tool.updatedAt.toISOString()}>{new Intl.DateTimeFormat("en",{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}).format(tool.updatedAt)}</time>. This records an editorial change, not a product test or source-verification date. <Link href="/about">How we approach evidence</Link>.</p>{tool.articles.length>0&&<section className="related-section" aria-labelledby="related-journal"><div className="section-heading"><h2 id="related-journal">Practical reading from the journal</h2></div><div className="blog-grid">{tool.articles.map(article=><ArticleCard key={article.id} article={article}/>)}</div></section>}</div>;
}
