import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageActor } from "@/server/auth/request";
import { getContent, adminOptions, readAdminSettings } from "@/server/admin/content";
import { kindSchema, contentLabels } from "@/lib/admin-content";
import { ContentEditor } from "@/components/admin/content-editor";
import { AdminHeading } from "@/components/admin/presentation";
export default async function EditContent({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const session = await requirePageActor("write"); const values = await params; const kind = kindSchema.safeParse(values.kind); if (!kind.success || !z.uuid().safeParse(values.id).success) notFound();
  const [record, options, settings] = await Promise.all([getContent(session.actor.id, kind.data, values.id), adminOptions(session.actor.id), readAdminSettings(session.actor.id)]); if (!record) notFound();
  return <><AdminHeading title={`Editar ${contentLabels[kind.data].singular.toLowerCase()}`} description={record.data.name} /><ContentEditor kind={kind.data} id={record.id} linked={record.linked} csrf={session.csrfToken} role={session.actor.role} options={options} initial={record.data} guidelines={settings.editorialGuidelines} /></>;
}
