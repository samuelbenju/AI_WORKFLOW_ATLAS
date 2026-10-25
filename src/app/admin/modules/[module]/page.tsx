import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { requirePageActor } from "@/server/auth/request";
import { AdminHeading } from "@/components/admin/presentation";
const modules = { commercial: { title: "Comercial", phase: "Fases 6 y 8", detail: "Solicitudes, patrocinadores, campañas, órdenes y pagos Sandbox." }, newsletter: { title: "Newsletter", phase: "Fase 7", detail: "Suscripciones, consentimiento y boletines." }, agents: { title: "Agentes", phase: "Fases 9 y 10", detail: "Tareas, ejecuciones, aprobación humana y programación." } };
export default async function FutureModule({ params }: { params: Promise<{ module: string }> }) {
  await requirePageActor(); const key = (await params).module; if (key === "newsletter") redirect("/admin/newsletter"); if (key === "commercial") redirect("/admin/sponsors"); if (!Object.prototype.hasOwnProperty.call(modules, key)) notFound(); const selected = modules[key as keyof typeof modules];
  return <><AdminHeading eyebrow="ALCANCE FUTURO" title={selected.title} description={selected.detail} /><section className="admin-panel admin-empty"><span className="admin-badge">Pendiente · {selected.phase}</span><h2>Este módulo aún no está implementado</h2><p className="admin-muted">Este espacio documenta su alcance. No permite activar operaciones, enviar comunicaciones ni procesar pagos.</p></section></>;
}
