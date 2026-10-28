import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { catalogCategories } from '@/server/data/public-catalog';
import { publicMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { EmptyState } from '@/components/catalog/catalog-ui';
import { CollectionData } from '@/components/seo/collection';
import { cache } from 'react';
export const dynamic='force-dynamic';
const topicsData=cache(()=>catalogCategories());
export async function generateMetadata(){return publicMetadata('Explore AI tools and workflows by topic','Find a practical starting point in the atlas. Browse published tools and workflow outlines grouped by the work they support.','/categories',{noindex:!(await topicsData()).length});}
export default async function CategoriesPage(){
  const topics=await topicsData();
  return <div className="container directory-page"><Breadcrumbs items={[{name:'Home',path:'/'},{name:'Topics',path:'/categories'}]}/>
    <header className="directory-heading"><p className="eyebrow muted">A STARTING POINT FOR YOUR WORK</p><h1>Explore the atlas <span className="gradient-text">by topic.</span></h1><p>Browse tools and workflow outlines grouped by the work they support. Follow official sources and explore practical steps, requirements and limitations.</p></header>
    <div className="catalog-grid">{topics.map(topic=><article className="catalog-card topic-card" key={topic.slug}><h2><Link prefetch={false} href={`/categories/${topic.slug}`}>{topic.name}<ArrowUpRight size={17} aria-hidden="true"/></Link></h2><p>{topic.description||`Explore tools and workflow outlines for ${topic.name.toLowerCase()}.`}</p><p className="section-note">{topic._count.tools} {topic._count.tools===1?'tool':'tools'} · {topic._count.useCases} {topic._count.useCases===1?'workflow':'workflows'}</p></article>)}</div>
    <CollectionData name="AI workflow topics" path="/categories" items={topics.map(topic=>({name:topic.name,path:`/categories/${topic.slug}`}))}/>
    {!topics.length&&<EmptyState title="Topics are taking shape." description="Topics will appear as tools and workflows are published." href="/tools"/>}
  </div>;
}
