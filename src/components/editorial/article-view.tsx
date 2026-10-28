import Link from "next/link";
import Image from "next/image";
import { ArrowRight,ArrowUpRight,BookOpen,Clock } from "lucide-react";
import { coverPath,readingMinutes,type ArticleBody } from "@/lib/editorial";
import type { ArticleCard as ArticleCardData } from "@/server/editorial/public";
export function ArticleCard({article}:{article:ArticleCardData}) {
  return <article className="blog-card" data-testid="article-card">{article.coverKey && <Link prefetch={false} href={`/blog/${article.slug}`} tabIndex={-1} aria-hidden="true"><Image src={coverPath(article.coverKey)} alt="" width={1200} height={630} sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw" /></Link>}<div className="blog-card-content"><div className="blog-card-meta"><span>{article.categories[0]?.name ?? "Field notes"}</span>{article.publishedAt && <time dateTime={article.publishedAt.toISOString()}>{formatArticleDate(article.publishedAt)}</time>}</div><h3><Link prefetch={false} href={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p><Link prefetch={false} className="text-link" href={`/blog/${article.slug}`}>Read the guide <ArrowRight size={15} aria-hidden="true" /><span className="sr-only">: {article.title}</span></Link></div></article>;
}
export function ArticleBlocks({body,targets={}}:{body:ArticleBody;targets?:Record<string,string>}) {
  return <div className="article-prose">{body.blocks.map((block,index)=>{
    if(block.type==="heading")return block.level===2?<h2 id={`section-${index}`} key={index}>{block.text}</h2>:<h3 id={`section-${index}`} key={index}>{block.text}</h3>;
    if(block.type==="list"){const items=block.items.map((item,i)=><li key={i}>{item}</li>);return block.ordered?<ol key={index}>{items}</ol>:<ul key={index}>{items}</ul>;}
    if(block.type==="code")return <figure className="article-code" key={index}><figcaption>{block.language}</figcaption><pre><code>{block.text}</code></pre></figure>;
    if(block.type==="callout")return <aside className="article-callout" key={index}><BookOpen size={20} aria-hidden="true" /><p>{block.text}</p></aside>;
    if(block.type==="link")return <p className="article-internal-link" key={index}>{targets[block.id]?<Link href={targets[block.id]!}>{block.label} <ArrowRight size={16} aria-hidden="true" /></Link>:<span>{block.label} <small>(resource currently unavailable)</small></span>}</p>;
    return <p key={index}>{block.text}</p>;
  })}</div>;
}
export const formatArticleDate=(date:Date)=>new Intl.DateTimeFormat("en",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}).format(date);
export function ReadingTime({body}:{body:ArticleBody}) {return <span><Clock size={14} aria-hidden="true" />{readingMinutes(body)} min read</span>;}
export function SourceLink({title,url}:{title:string;url:string}) {return <a href={url} target="_blank" rel="noopener noreferrer">{title}<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>;}
