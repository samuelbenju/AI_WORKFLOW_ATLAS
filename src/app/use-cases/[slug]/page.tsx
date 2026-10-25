import { publicMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Route } from "lucide-react";
import type { Metadata } from "next";
import { workflowBySlug } from "@/server/data/public-catalog";
import { difficultyLabels, workflowReferences, workflowSteps } from "@/lib/catalog-content";
import { ToolCard } from "@/components/catalog/catalog-ui";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const workflow = await workflowBySlug((await params).slug);
  return workflow ? publicMetadata(workflow.title, workflow.problem.slice(0, 200), `/use-cases/${workflow.slug}`, { noindex: workflow.isDemo }) : { title: "Use case not found", robots: { index: false, follow: false } };
}
export default async function WorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const workflow = await workflowBySlug((await params).slug);
  if (!workflow) notFound();
  const steps = workflowSteps(workflow.instructions);
  const references = workflowReferences(workflow.references);
  return <div className="container detail-page"><Link className="back-link" href="/use-cases"><ArrowLeft size={15} aria-hidden="true" /> All use cases</Link><header className="workflow-heading"><p className="eyebrow"><Route size={16} aria-hidden="true" /> {workflow.isDemo ? "DEVELOPMENT WORKFLOW EXAMPLE" : "PRACTICAL AI WORKFLOW"}</p><h1>{workflow.title}</h1><div className="detail-tags"><span>{difficultyLabels[workflow.difficulty]}</span>{workflow.categories.map((category) => <Link key={category.slug} href={`/use-cases?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>)}{workflow.tags.map((tag) => <Link key={tag.slug} href={`/use-cases?tag=${encodeURIComponent(tag.slug)}`}>#{tag.name}</Link>)}</div></header><div className="workflow-detail-grid"><div><section className="prose-panel"><p className="eyebrow muted">01 / THE STARTING POINT</p><h2>The problem</h2><p>{workflow.problem}</p></section><section className="prose-panel"><p className="eyebrow muted">02 / A POSSIBLE APPROACH</p><h2>The solution</h2><p>{workflow.solution || "A solution overview has not been provided for this workflow yet."}</p></section><section className="prose-panel"><p className="eyebrow muted">03 / MAKE IT PRACTICAL</p><h2>Step by step</h2>{steps.length ? <ol className="workflow-steps">{steps.map((step, index) => <li key={`${step.step}-${index}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{step.text}</p></li>)}</ol> : <p>No structured instructions have been provided yet.</p>}</section></div><aside><section className="limits-panel"><p className="eyebrow muted">KEEP YOUR JUDGMENT IN THE LOOP</p><h2>Limitations & considerations</h2><p>{workflow.limitations}</p>{workflow.isDemo && <p className="detail-disclaimer">Proposed development example. This workflow has not been executed or validated as an integration.</p>}</section><section className="references-panel"><h2>References</h2>{references.length ? <ul>{references.map((reference, index) => <li key={`${reference.url}-${index}`}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.note || new URL(reference.url).hostname}<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul> : <p>No references have been provided yet.</p>}</section></aside></div><section className="related-section"><div className="section-heading"><div><p className="eyebrow muted">YOUR STARTING TOOLKIT</p><h2>Tools for this workflow</h2></div></div><div className="catalog-grid">{workflow.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>{workflow.tools.length === 0 && <p className="section-note">No tools are linked to this workflow yet.</p>}</section></div>;
}
