import { requirePageActor } from "@/server/auth/request";
import { can } from "@/server/auth/policy";
import { editorialOptions } from "@/server/editorial/admin";
import { readAdminSettings } from "@/server/admin/content";
import { blankArticle } from "@/lib/editorial";
import { ArticleEditor } from "@/components/admin/article-editor";
import { AdminHeading } from "@/components/admin/presentation";
export default async function NewArticle() {const session=await requirePageActor("write");const [options,settings]=await Promise.all([editorialOptions(session.actor.id),readAdminSettings(session.actor.id)]);return <><AdminHeading title="Crear artículo" description={settings.editorialGuidelines}/><ArticleEditor initial={{...blankArticle,status:settings.defaultStatus}} privileged={can(session.actor.role,"publish")} options={options} csrf={session.csrfToken}/></>;}
