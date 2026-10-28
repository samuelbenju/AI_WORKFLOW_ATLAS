import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryBySlug } from '@/server/data/public-catalog';
import { publicMetadata } from '@/lib/seo';
import { catalogHref } from '@/lib/catalog-query';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { ToolCard, WorkflowCard } from '@/components/catalog/catalog-ui';
import { CollectionData } from '@/components/seo/collection';
type Props={params:Promise<{slug:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props){
  const topic=await categoryBySlug((await params).slug);if(!topic)notFound();
  return publicMetadata(`${topic.name}: AI tools and workflows`,topic.description||`Explore published tools and source-informed workflow outlines for ${topic.name.toLowerCase()}.`,`/categories/${topic.slug}`,{noindex:topic._count.tools+topic._count.useCases<2});
}
export default async function CategoryPage({params}:Props){
  const topic=await categoryBySlug((await params).slug);if(!topic)notFound();
  return <div className="container detail-page"><Breadcrumbs items={[{name:'Home',path:'/'},{name:'Topics',path:'/categories'},{name:topic.name,path:`/categories/${topic.slug}`}]}/>
    <header className="detail-heading"><div><p className="eyebrow muted">EXPLORE A PRACTICAL TOPIC</p><h1>{topic.name}</h1><p>{topic.description||`Explore tools and workflow outlines for ${topic.name.toLowerCase()}.`}</p><p className="section-note">{topic._count.tools} {topic._count.tools===1?'tool':'tools'} · {topic._count.useCases} {topic._count.useCases===1?'workflow':'workflows'} in this view of the catalog. Listings describe documented capabilities; workflow outlines require your own validation.</p></div></header>
    {!!topic.tools.length&&<section className="related-section" aria-labelledby="topic-tools"><div className="section-heading"><h2 id="topic-tools">Tools for {topic.name.toLowerCase()}</h2><Link prefetch={false} href={catalogHref('/tools',{category:topic.slug})}>Browse all {topic._count.tools} tools →</Link></div><div className="catalog-grid">{topic.tools.map(tool=><ToolCard key={tool.id} tool={tool}/>)}</div></section>}
    {!!topic.useCases.length&&<section className="related-section" aria-labelledby="topic-guides"><div className="section-heading"><h2 id="topic-guides">Put the tools into context</h2><Link prefetch={false} href={catalogHref('/use-cases',{category:topic.slug})}>Browse all {topic._count.useCases} workflows →</Link></div><div className="catalog-grid">{topic.useCases.map(workflow=><WorkflowCard key={workflow.id} workflow={workflow}/>)}</div></section>}
    <CollectionData name={topic.name} path={`/categories/${topic.slug}`} items={[...topic.tools.map(tool=>({name:tool.name,path:`/tools/${tool.slug}`})),...topic.useCases.map(guide=>({name:guide.title,path:`/use-cases/${guide.slug}`}))]}/><p className="section-note">Not sure how to evaluate a listing? <Link href="/about">Read how the atlas approaches sources and editorial independence.</Link></p>
  </div>;
}
