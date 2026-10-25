import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageActor } from "@/server/auth/request";
import { adminArticle } from "@/server/editorial/admin";
import { resolvePublicArticleLinks } from "@/server/editorial/public";
import { ArticleBlocks,SourceLink } from "@/components/editorial/article-view";
import { AdminHeading } from "@/components/admin/presentation";
export default async function Preview({params}:{params:Promise<{id:string}>}) {const {actor}=await requirePageActor();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const record=await adminArticle(actor.id,id);if(!record)notFound();const targets=await resolvePublicArticleLinks(record.data.body);return <><AdminHeading eyebrow="PREVISUALIZACIÓN PRIVADA" title={record.data.title} description="Contenido guardado. Esta vista no publica ni permite indexar el borrador."/><Link className="admin-back" href={`/admin/articles/${id}`}>← Volver al editor</Link><article className="editor-preview" lang="en"><p>{record.data.excerpt}</p><ArticleBlocks body={record.data.body} targets={targets}/><section className="article-sources"><h2>Sources</h2>{record.data.sources.map((source,index)=><div key={index}><SourceLink title={source.title} url={source.url}/><p>{source.note}</p><span className="admin-badge">{source.status==="VERIFIED"?"Comprobada":"Pendiente de comprobar"}</span></div>)}</section></article></>;}
