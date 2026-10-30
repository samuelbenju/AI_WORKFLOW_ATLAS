# Checkpoint C — etapa17

CAPACIDADES DE CRECIMIENTO IMPLEMENTADAS / INTEGRACIONES COMERCIALES PENDIENTES. APROBADA CON OBSERVACIONES; no ingresos, audiencia o monetización activa acreditados.

## Diagnóstico y brecha cubierta

Se reutilizan /admin/analytics, tracking consentido, GA4/GSC manuales, snapshots, afiliados/webhooks, CRM, órdenes/transacciones, gastos, experimentos, AdSense y herramientas agregadas CEO. No nuevo panel, tabla, evento, cookie o sistema paralelo. Ya existen métricas de negocio y tráfico, pero no una vista que explicite qué evidencia falta entre etapas del embudo.

Nueva growthFunnel compone exclusivamente los agregados existentes; panel administrativo muestra una tabla accesible y CEO recibe el mismo resumen agregado, sin contactos o claves. Fuentes separadas: PAGE_VIEW, TOOL_VIEW, NewsletterConsent CONFIRM, CommercialLead y órdenes PRODUCTION con transacción/evento verificados. Orgánico y descargas se mantienen sin conteo acreditado: no se infieren de PAGE_VIEW, clics o un JSON local. Cero/sin filas se muestra como ausencia de observaciones acreditadas; no ausencia de tráfico o cero comercial inventado. Conteos históricos con tracking deshabilitado se identifican. No tasas entre poblaciones distintas, ni atribución orgánica o beneficio neto fabricados. Validación numérica y unitarias prueban estas exclusiones.

No consultas extra por la vista ni escritura por petición; solo mapeo acotado de agregados ya obtenidos en transacción RepeatableRead. Misma autorización analytics/roles/CSRF y retención versionada. No cambio a AnalyticsEvent: descarga sigue preparada/no persistida por el CHECK SQL existente. A/B o eventos nuevos requieren diseño/aprobación correspondientes. Blueprint público sigue gratuito, no exige registro o suscripción; descubrimiento, versiones, requisitos, licencia y CTA solo configurado ya existen. No paquete privado/objetos/releases nuevos.

## Canales y activaciones separadas

- GA4/GSC: imports manuales autenticados/CSRF, ausencia de configuración visible. Nuevas validaciones GSC de etapa16, sin llamadas reales. No propiedad verificada, tráfico geográfico o adquisición atribuida sin datos del proveedor.
- Afiliados: programas/hosts HTTPS exactos, enlaces asociados a herramientas públicas, divulgación, tracking solo consentido y conversiones firmadas/idempotentes/reversiones existentes. Sin contratos o eventos de proveedor no hay comisión real. Verificadas por integración91/E2E actuales; no redirección comercial nueva. Comisiones devengadas no son caja cobrada.
- Sponsors: cuatro paquetes/CRM, consentimiento/idempotencia y campañas aprobadas/pagadas/período vigente existentes. Sandbox nunca activa campañas. No implementación de consultoría disfrazada de sponsorship; contacto solo correo público autorizado.
- AdSense: puertas cuenta/sitio/emplazamientos/CMP/consentimiento/legal/indexación existentes; ads.txt real condicionado, exclusión privados/vacíos, opt-out/DNT/GPC y script único. Sin IDs o scripts reales en tests. No activar flag o publicar aprobación inexistente.
- Newsletter: doble opt-in, baja y modo disabled existentes. No envíos o contactos ficticios. CRM/datos reales conservados.
- Agentes: CEO/Investigador/Editor/SEO/Comercial y presupuesto/aprobaciones/herramientas existentes; resumen de funnel agregado disponible sin llamada externa. Investigador propone fuentes → Editor DRAFT → SEO valida → persona revisa/publica cuando autorice → imports/observaciones → CEO propone. No habilitar scheduler/modelos/workers o publicaciones automáticas.

## Experimentos preparados sobre GrowthExperiment existente

Ninguno activado o creado en Neon. Registrar propuestas mediante interfaz autorizada tras revisión; incluir el protocolo siguiente en hypothesis, sin migración. COMPLETED significa cierre de observación, nunca ganador automático.

| Propuesta | Métrica existente | Evidencia requerida | Criterio propuesto y límites | Parada/reversión |
| --- | --- | --- | --- | --- |
| Descubrimiento desde automation hacia guías pertinentes | PAGE_VIEW de guía | Misma ventana UTC y cohortes consentidas, baseline y anotación de cambio | Umbral decidido antes, volumen suficiente; no comparar ceros sin exposición ni afirmar causalidad por conteo | STOPPED y retirar solo enlace editorial autorizado |
| Claridad del CTA de descarga | Medición pendiente | Mecanismo de descargas autorizado + publicación real + privacidad | Bloqueado mientras no exista esa evidencia; no usar clic como descarga o venta | No activar experimento hasta resolver medición |
| Enlace a newsletter al final de guía útil | NEWSLETTER_CONFIRM por contenido | Doble opt-in real y atribución consentida deduplicada | Comparación de periodos acordada; no extrapolar a todos visitantes o exigir correo para descargar | STOPPED, revertir posición sin enviar campañas |

Cada propuesta requiere hipótesis, fecha/baseline, denominador/exposición definido, ventana/cohorte, umbral/tamaño mínimo acordados, riesgos/a11y/performance, consentimiento y responsable humano. No activar cookies, asignación de variantes o cron nuevos. Sin datos, resultado inconcluso, no ganador.

## Monetización priorizada y puertas

Primero contenido útil/enlaces internos y revisión editorial del calendario existente; después contratos reales de afiliación y medición consentida; sponsors solo con entrega/capacidad/condiciones verificadas; AdSense solo cuenta+CMP/legal+sitio aprobados; servicios solo canal/operador autorizados. No promesa de ingresos, conversiones o ranking. Producto Blueprint requiere licencia, storage privado real y revisión antes de publicar, no archivos públicos en GitHub. Los seis DRAFT permanecen sin publicar.

## Checkpoint D — validación integrada y conservación

Check89 PASS (incluye nueva unit funnel), build PASS, integración PostgreSQL91 PASS, SEO5 PASS, catálogo válido65/30/6/20/24. E2E completo escritorio/móvil PASS122/122 en3,8min. Regresiones conjuntas ejecutadas en bases locales desechables. Datos fixtures aislados, no actividad comercial. No nuevas dependencias o migraciones, registros reales, flags Google/SEO/legales/ads/pagos/IA cambiados. No despliegue. CI propia del SHA definitivo se consulta después del push; éxito antiguo no se atribuye a esta entrega.
