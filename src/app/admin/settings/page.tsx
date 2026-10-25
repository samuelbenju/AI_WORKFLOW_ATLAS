import { requirePageActor } from "@/server/auth/request";
import { readAdminSettings } from "@/server/admin/content";
import { AdminHeading } from "@/components/admin/presentation";
import { SettingsForm } from "@/components/admin/settings-form";
export default async function SettingsPage() { const session = await requirePageActor("settings"); const settings = await readAdminSettings(session.actor.id); return <><AdminHeading title="Configuración editorial" description="Preferencias guardadas en PostgreSQL y aplicadas a los formularios de contenido." /><SettingsForm csrf={session.csrfToken} initial={settings} /></>; }
