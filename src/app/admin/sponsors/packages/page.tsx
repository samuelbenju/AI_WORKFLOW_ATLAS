import {requirePageActor} from "@/server/auth/request";
import {crmPackages} from "@/server/commercial/admin";
import {PackageForm} from "@/components/admin/crm-forms";
import {AdminHeading} from "@/components/admin/presentation";
export default async function PackagesPage(){const {actor,csrfToken}=await requirePageActor("commercial");const rows=await crmPackages(actor.id);return <><AdminHeading title="Paquetes comerciales" description="Configura precios en unidades mínimas, moneda, duración, disponibilidad y recepción de solicitudes."/><div className="crm-columns">{rows.map(item=><PackageForm key={item.id} item={item} csrf={csrfToken}/>)}</div></>;}
