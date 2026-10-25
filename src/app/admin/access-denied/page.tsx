import Link from "next/link";
import { requirePageActor } from "@/server/auth/request";
import { AdminHeading } from "@/components/admin/presentation";
export default async function Denied() { await requirePageActor(); return <><AdminHeading title="Acceso restringido" description="Tu rol no permite realizar esta operación." /><Link className="admin-secondary" href="/admin">Volver al resumen</Link></>; }
