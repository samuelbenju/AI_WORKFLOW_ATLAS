import {NewsletterSection} from "@/components/newsletter/section";
import Link from "next/link";
import { BookOpen,Search } from "lucide-react";
import { parseArticleQuery,articleHref,serializeJsonLd } from "@/lib/editorial";
import { publicMetadata,absoluteUrl } from "@/lib/seo";
import { articlesPageData } from "@/server/editorial/public";
import { ArticleCard } from "@/components/editorial/article-view";
import { EmptyState } from "@/components/catalog/catalog-ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export const dynamic="force-dynamic";
export async function generateMetadata({searchParams}:Props) {
  const raw=await searchParams;const parsed=parseArticleQuery(raw);
  const result=parsed.success?await articlesPageData(parsed.data):null;
  const page=parsed.success?parsed.data.page:1;
  return publicMetadata(`AI workflows, thoughtfully explained${page>1?` — Page ${page}`:''}`,`Practical guides to AI, business automation, software and data. Clear steps, sources and trade-offs.${page>1?` Page ${page}.`:''}`,parsed.success?articleHref(parsed.data):"/blog",{noindex:!result?.items.length||Object.keys(raw).some(key=>key!=="page")});
}
export default async function BlogPage({searchParams}:Props) {
  const query=parseArticleQuery(await searchParams);
  const heading=<header className="directory-heading blog-heading"><p className="eyebrow"><BookOpen size={16} aria-hidden="true" /> THE ATLAS JOURNAL</p><h1>Good questions.<br /><span className="gradient-text">Useful answers.</span></h1><p>Field notes on working with AI. Practical guides, clear trade-offs, and sources you can follow.</p></header>;
  if(!query.success)return <div className="container directory-page">{heading}<EmptyState title="Those filters need a quick check." description="Use a valid category, a short search, and a positive page number." href="/blog" label="Reset filters" /></div>;
  const data=await articlesPageData(query.data);
  return <div className="container directory-page"><Breadcrumbs items={[{name:"Home",path:"/"},{name:"Journal",path:"/blog"}]}/>{heading}<form className="catalog-filters blog-filters" method="get" action="/blog" aria-label="Article filters"><div className="filter-search"><label htmlFor="article-search">Search articles</label><div><Search size={17} aria-hidden="true" /><input id="article-search" name="q" type="search" maxLength={100} defaultValue={query.data.q} placeholder="A problem, a process, an idea…" /></div></div><div><label htmlFor="article-category">Category</label><select id="article-category" name="category" defaultValue={query.data.category??""}><option value="">All categories</option>{data.categories.map(category=><option value={category.slug} key={category.slug}>{category.name}</option>)}</select></div><div className="filter-actions"><button className="button button-primary" type="submit">Apply filters</button><Link href="/blog">Clear all</Link></div></form><div className="results-heading"><h2>{query.data.q?`Results for “${query.data.q}”`:"From the journal"}</h2><span>{data.total} {data.total===1?"article":"articles"}</span></div><div className="blog-grid">{data.items.map(article=><ArticleCard key={article.id} article={article} />)}</div>{!data.items.length&&<EmptyState title={data.total?"This page is off the map.":"Good guides take careful work."} description={data.total?"Return to an earlier page to continue reading.":"No published articles match these filters yet. Drafts stay private until their content and sources have been reviewed."} href={data.total?articleHref(query.data,1):"/blog"} label={data.total?"Back to first page":"Clear filters"} />}{data.pageCount>1&&query.data.page<=data.pageCount&&<nav className="pagination" aria-label="Article pagination">{query.data.page>1?<Link rel="prev" href={articleHref(query.data,query.data.page-1)}>← Previous</Link>:<span aria-disabled="true">← Previous</span>}<span>Page {query.data.page} of {data.pageCount}</span>{query.data.page<data.pageCount?<Link rel="next" href={articleHref(query.data,query.data.page+1)}>Next →</Link>:<span aria-disabled="true">Next →</span>}</nav>}<NewsletterSection source="blog"/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd({"@context":"https://schema.org","@type":"CollectionPage",name:"The Atlas Journal",url:absoluteUrl(articleHref(query.data)),mainEntity:{"@type":"ItemList",itemListElement:data.items.map((article,index)=>({"@type":"ListItem",position:(query.data.page-1)*6+index+1,url:absoluteUrl(`/blog/${article.slug}`),name:article.title}))}})}} /></div>;
}
