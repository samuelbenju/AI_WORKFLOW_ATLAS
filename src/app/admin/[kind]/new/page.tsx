import { notFound } from "next/navigation";
import { requirePageActor } from "@/server/auth/request";
import { adminOptions, readAdminSettings } from "@/server/admin/content";
import { kindSchema, contentLabels } from "@/lib/admin-content";
import { ContentEditor } from "@/components/admin/content-editor";
import { AdminHeading } from "@/components/admin/presentation";
export default async function CreateContent({ params }: { params: Promise<{ kind: string }> }) {
  const session = await requirePageActor("write"); const kind = kindSchema.safeParse((await params).kind); if (!kind.success) notFound();
  const [options, settings] = await Promise.all([adminOptions(session.actor.id), readAdminSettings(session.actor.id)]);
  return <><AdminHeading title={`Crear ${contentLabels[kind.data].singular.toLowerCase()}`} description="Guarda un registro con datos y fuentes revisados." /><ContentEditor kind={kind.data} csrf={session.csrfToken} role={session.actor.role} options={options} guidelines={settings.editorialGuidelines} initial={{ name: "", slug: "", description: "", summary: "", websiteUrl: "", problem: "", solution: "", limitations: "", instructions: [], references: [], difficulty: "BEGINNER", status: settings.defaultStatus, isDemo: false, featured: false, publishedAt: null, categoryIds: [], tagIds: [], toolIds: [] }} /></>;
}
