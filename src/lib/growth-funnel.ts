// Counts are observations from different populations, never a sequential conversion rate.
export function growthFunnel(input:{trackingEnabled:boolean;events:Record<string,number>;confirmedSubscriptions:number;leads:number;confirmedOrders:number}){
 const count=(v:number|undefined)=>{if(v===undefined||v===0)return null;if(!Number.isSafeInteger(v)||v<0)throw Error('FUNNEL_COUNT_INVALID');return v;};
 return [
  {stage:'Adquisición orgánica',count:null,source:'Search Console/GA4',status:'Requiere informe autorizado; no se deduce de visitas locales'},
  {stage:'Contenido consultado',count:count(input.events.PAGE_VIEW),source:'PAGE_VIEW consentido',status:input.trackingEnabled?'Observación parcial':'Seguimiento deshabilitado; puede haber datos históricos'},
  {stage:'Interés en herramientas',count:count(input.events.TOOL_VIEW),source:'TOOL_VIEW consentido',status:'No acredita descarga o intención de compra'},
  {stage:'Descarga Blueprint',count:null,source:'Medición no persistida',status:'Requiere mecanismo autorizado; no se reutiliza PAGE_VIEW'},
  {stage:'Suscripción confirmada',count:count(input.confirmedSubscriptions),source:'NewsletterConsent CONFIRM',status:'Registro de negocio, no atribución orgánica'},
  {stage:'Solicitud voluntaria',count:count(input.leads),source:'CommercialLead',status:'No es venta ni contrato'},
  {stage:'Orden confirmada',count:count(input.confirmedOrders),source:'Orden PRODUCTION y transacción/evento verificados',status:'Bruto confirmado; no beneficio neto ni caja conciliada'},
 ];
}
