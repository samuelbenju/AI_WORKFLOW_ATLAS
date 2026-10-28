"use client";

import { useState } from "react";
import type { AdsenseMetric } from '@/lib/adsense-report';
type Report = { currency: string; rows: { date: string; estimatedEarnings: string;metrics?:Partial<Record<AdsenseMetric,string>> }[]; totalEstimatedEarnings: string | null; warningCount: number; from: string; to: string; hostname: string; observedAt: string; source: string; calendar: string };
const ratio=(value:string|undefined)=>value===undefined?'—':new Intl.NumberFormat('es',{style:'percent',maximumFractionDigits:2}).format(Number(value));
export function AdsenseReport({ csrf, days, configured }: { csrf: string; days: number; configured: boolean }) {
  const [report, setReport] = useState<Report | null>(null), [error, setError] = useState(""), [pending, setPending] = useState(false);
  return <>
    <p>{configured ? "Credencial de solo lectura configurada; recepción y permisos aún deben comprobarse con una consulta real." : "AdSense: informes no configurados. Sin datos externos ni ingresos de sustitución."}</p>
    <form className="admin-form" aria-label="Consultar informe AdSense" onSubmit={async e => {
      e.preventDefault(); setError(""); setReport(null); setPending(true);
      try {
        const response = await fetch("/api/admin/analytics/adsense", { method: "POST", headers: { "Content-Type": "application/json", "x-csrf-token": csrf }, body: JSON.stringify({ days, confirmation: true }) });
        const value = await response.json(); if (!response.ok) throw new Error(value.error); setReport(value);
      } catch { setError("Informe no disponible. No se añadieron ingresos ni valores estimados locales."); } finally { setPending(false); }
    }}><label className="admin-check"><input type="checkbox" required disabled={!configured || pending} />Confirmo una consulta manual a la API de Google</label><button className="admin-secondary" disabled={!configured || pending}>Consultar informe AdSense</button></form>
    {error && <p role="alert">{error}</p>}
    {report && <div aria-live="polite"><p>Fuente {report.source} · {report.hostname} · consulta {report.observedAt}. Del {report.from} al {report.to}, calendario de la cuenta Google, distinto del UTC propio. No se consulta una cuenta bancaria.</p><p>Ingresos estimados reportados por Google: {report.totalEstimatedEarnings ?? "total no suministrado"} {report.currency}. {report.warningCount} avisos del proveedor; revisar la consola antes de interpretar el informe.</p><div className="admin-table-scroll" role="region" aria-label="Estimaciones externas de AdSense" tabIndex={0}><table><thead><tr><th>Fecha de cuenta</th><th>Estimación del proveedor</th><th>Páginas</th><th>Impresiones</th><th>Clics</th><th>RPM de página</th><th>CTR de página</th><th>Cobertura</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.estimatedEarnings} {report.currency}</td><td>{row.metrics?.PAGE_VIEWS??"—"}</td><td>{row.metrics?.IMPRESSIONS??"—"}</td><td>{row.metrics?.CLICKS??"—"}</td><td>{row.metrics?.PAGE_VIEWS_RPM===undefined?"—":`${row.metrics?.PAGE_VIEWS_RPM} ${report.currency}`}</td><td>{ratio(row.metrics?.PAGE_VIEWS_CTR)}</td><td>{ratio(row.metrics?.AD_REQUESTS_COVERAGE)}</td></tr>)}</tbody></table></div>{!report.rows.length && <p>El proveedor no suministró filas para este rango y dominio; no implica ingresos confirmados de cero.</p>}<p>— significa no suministrado, nunca cero de sustitución. RPM, CTR y cobertura proceden del informe de Google; no se infieren del tráfico propio. El desglose por sección requiere canales URL reales configurados en AdSense.</p><p>Vista puntual con consulta auditada. No se guarda como movimiento financiero ni se suma al resultado parcial; no acredita pago, factura, liquidación, comisión o beneficio neto.</p></div>}
  </>;
}
