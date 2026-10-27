import {NewsletterSection} from "@/components/newsletter/section";
import { SponsoredPlacements } from "@/components/commercial/placements";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { publicArticleBySlug } from "@/server/editorial/public";
import { publicMetadata,absoluteUrl } from "@/lib/seo";
import { coverPath,serializeJsonLd } from "@/lib/editorial";
import { site } from "@/lib/config/site";
import { ArticleBlocks,ArticleCard,ReadingTime,SourceLink,formatArticleDate } from "@/components/editorial/article-view";
import { AdvertisingPlacement } from "@/components/advertising/placement";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { articleText } from "@/lib/editorial";
type Props={params:Promise<{slug:string}>};
export const dynamic="force-dynamic";
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const article=await publicArticleBySlug((await params).slug);
  if(!article)notFound();
  const metadata=publicMetadata(article.metaTitle||article.title,article.metaDescription||article.excerpt,`/blog/${article.slug}`,{noindex:article.noindex,image:coverPath(article.coverKey??"workflow")});
  return {...metadata,openGraph:{...metadata.openGraph,type:"article",publishedTime:article.publishedAt?.toISOString(),modifiedTime:article.updatedAt.toISOString(),authors:article.author?.name?[article.author.name]:undefined}};
}
export default async function ArticlePage({params}:Props) {
  const article=await publicArticleBySlug((await params).slug);if(!article)notFound();
  const url=absoluteUrl(`/blog/${article.slug}`);const author=article.author?.name?{"@type":"Person",name:article.author.name}:{"@type":"Organization",name:site.name};
  const structured={"@context":"https://schema.org","@graph":[{"@type":"BlogPosting",headline:article.title,description:article.excerpt,datePublished:article.publishedAt?.toISOString(),dateModified:article.updatedAt.toISOString(),mainEntityOfPage:url,url,author,publisher:{"@type":"Organization",name:site.name,url:site.origin},image:absoluteUrl(coverPath(article.coverKey??"workflow")),inLanguage:"en",citation:article.sources.map(source=>source.url)},
    {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:absoluteUrl("/")},{"@type":"ListItem",position:2,name:"Journal",item:absoluteUrl("/blog")},{"@type":"ListItem",position:3,name:article.title,item:url}]}]};
  return <div className="container detail-page article-page"><Link className="back-link" href="/blog"><ArrowLeft size={15} aria-hidden="true" />All articles</Link><Breadcrumbs structured={false} items={[{ name: "Home", path: "/" }, { name: "Journal", path: "/blog" }, { name: article.title, path: `/blog/${article.slug}` }]} /><SponsoredPlacements kind="SPONSORED_ARTICLE" targetId={article.id}/><article><header className="article-heading"><p className="eyebrow">THE ATLAS JOURNAL</p><h1>{article.title}</h1><p className="article-deck">{article.excerpt}</p><div className="article-byline"><span>{article.author?.name??site.name}</span>{article.publishedAt&&<time dateTime={article.publishedAt.toISOString()}>{formatArticleDate(article.publishedAt)}</time>}<ReadingTime body={article.body} /></div><div className="detail-tags">{article.categories.map(category=><Link href={`/blog?category=${category.slug}`} key={category.slug}>{category.name}</Link>)}</div>{article.coverKey&&<Image className="article-cover" src={coverPath(article.coverKey)} alt={article.coverAlt??""} width={1200} height={630} sizes="(max-width: 760px) 100vw, 1100px" preload />}</header><div className="article-reading-layout"><div><ArticleBlocks body={article.body} targets={article.targets} /><section className="article-sources" aria-labelledby="sources-title"><p className="eyebrow muted">FOLLOW THE EVIDENCE</p><h2 id="sources-title">Sources & further reading</h2><ol>{article.sources.map((source,index)=><li key={index}><SourceLink title={source.title} url={source.url} /><p>{source.note}</p>{source.checkedAt&&<small>Checked {formatArticleDate(new Date(source.checkedAt))}</small>}</li>)}</ol><p className="section-note">Documentation and product terms can change. Recheck the source before applying a workflow.</p></section></div><aside className="article-sidebar"><h2>In this guide</h2><nav aria-label="Article sections">{article.body.blocks.map((block,index)=>block.type==="heading"?<a href={`#section-${index}`} key={index}>{block.text}</a>:null)}<a href="#sources-title">Sources & further reading</a></nav>{(article.tools.length>0||article.useCase)&&<section><h2>Explore the atlas</h2>{article.tools.map(tool=><Link href={`/tools/${tool.slug}`} key={tool.id}>{tool.name} →</Link>)}{article.useCase&&<Link href={`/use-cases/${article.useCase.slug}`}>{article.useCase.title} →</Link>}</section>}<p>Updated <time dateTime={article.updatedAt.toISOString()}>{formatArticleDate(article.updatedAt)}</time></p></aside></div></article><AdvertisingPlacement placement="article" path={`/blog/${article.slug}`} eligible={!article.noindex && articleText(article.body).split(/\s+/).length >= 600} />{article.related.length>0&&<section className="related-section"><div className="section-heading"><div><p className="eyebrow muted">KEEP EXPLORING</p><h2>Related articles</h2></div></div><div className="blog-grid">{article.related.map(item=><ArticleCard key={item.id} article={item} />)}</div></section>}<NewsletterSection source="article"/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(structured)}} /></div>;
}
