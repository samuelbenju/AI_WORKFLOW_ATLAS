import { statusLabels } from "@/lib/admin-content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageActor } from "@/server/auth/request";
import { can } from "@/server/auth/policy";
import { editorialOptions,adminArticle } from "@/server/editorial/admin";
import { ArticleEditor } from "@/components/admin/article-editor";
import { AdminHeading,formatDate } from "@/components/admin/presentation";
export default async function EditArticle({params}:{params:Promise<{id:string}>}) {
  const session=await requirePageActor("write");const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const [record,options]=await Promise.all([adminArticle(session.actor.id,id),editorialOptions(session.actor.id)]);if(!record)notFound();
  return <><AdminHeading title="Editar artículo" description={record.data.title}/><ArticleEditor id={id} initial={record.data} status={record.status} isDemo={record.isDemo} legacy={record.legacy} reviewedAt={record.reviewedAt} privileged={can(session.actor.role,"publish")} locked={session.actor.role==="EDITOR"&&!["DRAFT","IN_REVIEW"].includes(record.status)} csrf={session.csrfToken} options={options}/><section className="admin-panel" style={{marginTop:24}}><h2>Versiones guardadas</h2><p className="admin-muted">Últimas diez versiones, conservadas en PostgreSQL como borradores históricos.</p><ul>{record.revisions.map(revision=><li key={revision.id}>{formatDate(new Date(revision.createdAt))} UTC · {statusLabels[revision.status]}</li>)}</ul><Link className="admin-back" href={`/admin/articles/${id}/preview`}>Leer el contenido guardado →</Link></section></>;
}
