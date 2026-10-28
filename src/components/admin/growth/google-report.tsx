import { z } from 'zod';
import { googleDimensionSchema,googleDimensionLabels } from '@/lib/google-reports';
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const ga4=z.object({dimension:googleDimensionSchema.default('date'),hostname:z.string().optional(),rows:z.array(z.object({date:z.string().optional(),label:z.string().optional(),users:count,sessions:count,pageViews:count,activeUsers:count.nullable().optional()})).max(100),truncated:z.boolean().optional(),excludedPaths:count.optional()});
const gsc=z.object({rows:z.array(z.object({date:z.string(),clicks:z.number().nonnegative(),impressions:z.number().nonnegative(),ctr:z.number().min(0).max(1),position:z.number().nonnegative()})).max(100)});
export function GoogleReportTable({provider,data}:{provider:string;data:unknown}){
  if(provider==='GA4'){
    const report=ga4.safeParse(data);if(!report.success)return <p>Formato de informe no reconocido; consultar el registro original.</p>;
    const label=googleDimensionLabels[report.data.dimension];
    return <><p>{label}. {report.data.hostname?`Filtro de host: ${report.data.hostname}.`:'Importación anterior sin filtro de host documentado.'} Calendario de la propiedad GA4; usuarios únicos por fila, sin sumarlos entre días o dimensiones.</p>
      {report.data.truncated&&<p>Se muestran hasta 100 filas; el proveedor informa filas adicionales. La muestra no es un total completo.</p>}
      {!!report.data.excludedPaths&&<p>{report.data.excludedPaths} rutas privadas o no reconocidas excluidas.</p>}
      <div className="admin-table-scroll" role="region" aria-label={`Informe GA4: ${label}`} tabIndex={0}><table><thead><tr><th>{label}</th><th>Usuarios</th><th>Usuarios activos</th><th>Sesiones</th><th>Páginas consultadas</th></tr></thead><tbody>{report.data.rows.map((r,index)=><tr key={index}><td>{r.date??r.label}</td><td>{r.users}</td><td>{r.activeUsers??'No suministrado'}</td><td>{r.sessions}</td><td>{r.pageViews}</td></tr>)}</tbody></table></div>
      {!report.data.rows.length&&<p>El proveedor no suministró filas públicas para este informe; no se infiere tráfico cero.</p>}
      <p>La captación actual mediante Measurement Protocol del servidor no acredita atribución completa de canales, países o dispositivos. Revisar el origen de la medición y consentimiento antes de interpretar esos desgloses.</p></>;
  }
  const report=gsc.safeParse(data);if(!report.success)return <p>Formato de informe no reconocido; consultar el registro original.</p>;
  return <><p>Search Console: datos diarios finales del proveedor, calendario PST. Impresiones y clics de búsqueda no son visitas consentidas ni ingresos.</p><div className="admin-table-scroll" role="region" aria-label="Informe Search Console" tabIndex={0}><table><thead><tr><th>Fecha</th><th>Clics</th><th>Impresiones</th><th>CTR</th><th>Posición media</th></tr></thead><tbody>{report.data.rows.map(row=><tr key={row.date}><td>{row.date}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{new Intl.NumberFormat('es',{style:'percent',maximumFractionDigits:2}).format(row.ctr)}</td><td>{row.position}</td></tr>)}</tbody></table></div>{!report.data.rows.length&&<p>Sin filas suministradas; no se infiere ausencia de búsquedas o indexación.</p>}</>;
}
