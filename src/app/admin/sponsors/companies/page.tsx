import {requirePageActor} from "@/server/auth/request";
import {crmCompanies} from "@/server/commercial/admin";
import {CompanyForm} from "@/components/admin/crm-forms";
import {AdminHeading} from "@/components/admin/presentation";
export default async function CompaniesPage(){const {actor,csrfToken}=await requirePageActor("commercial");const rows=await crmCompanies(actor.id);return <><AdminHeading title="Empresas patrocinadoras" description="Contactos registrados por un administrador. No se crean empresas automáticamente al recibir formularios."/><div className="crm-columns"><CompanyForm csrf={csrfToken}/>{rows.map(row=><section key={row.id} className="crm-stack"><CompanyForm csrf={csrfToken} item={{...row,updatedAt:row.updatedAt.toISOString()}}/><p className="admin-muted">{row._count.leads} solicitudes · {row._count.campaigns} campañas</p></section>)}</div>{rows.length===200&&<p className="admin-info">Se muestran las primeras 200 empresas por nombre.</p>}</>;}
