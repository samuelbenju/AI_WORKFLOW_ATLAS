# MVP — catálogo, Lead Flow y contacto

03-11-2026. Base GitHub99479df; propietario confirma ese SHA Live y Auto-Deploy Off. Sin acceso Render/Neon/Firecrawl en este executor. **No lanzamiento comercial completado ni descarga pública real acreditada.** No se reimportó catálogo, migró Neon o publicó una release del Blueprint.

## Catálogo: cambio pequeño, garantías explícitas

`cacheComponents` no habilitado. Se conserva force-dynamic/streaming, Proxy con comprobación viva de existencia/404 y transacciones RepeatableRead de catálogo/paginación. No sustitución por Promise.all masivo: no acredita menor presión y separaría filas/conteos. No se modifican max5, connectionTimeout5000, idle30000, aislamiento, TLS o retries.

Elegida caché granular de DTO públicos en memoria por cliente DB, no ISR/archivo. Cada petición necesita primero `pg_current_snapshot()::text` + época del postmaster. React.cache comparte esa revisión solo dentro de la petición. Un commit cambia visibilidad MVCC, también si lo hace otro proceso o SQL sin updatedAt; ese token no permite reutilizar la revisión anterior. Autorización puntual al gate, como toda lectura concurrente, no una promesa de revocar bytes ya enviados. Nueva conexión/época no hereda el cache de otro cliente/proceso.

32 entradas,15s,256KiB por entrada y32 claves en vuelo; deduplicación de misses y clones para no mutar datos compartidos. Nuevo contenido programado puede tardar hasta15s sin un nuevo commit; nunca se adelanta. Retiro confirmado antes del gate invalida sin esperar TTL. Cualquier escritura de la instancia PostgreSQL, incluso ajena al catálogo, puede reducir el hit rate: optimización conservadora, no garantía de ahorro bajo escrituras continuas. Fuente oficial consultada: [PostgreSQL17, snapshots](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/doc/src/sgml/func.sgml).

Sin stale-on-error: si DB/gate falla no hay lista vacía ni copia offline. Demos, búsqueda libre, DB explícita/readiness y descargas no se cachean. No sesiones/PII/pagos/admin; no URLs privadas o tokens en las claves. Publicación, relaciones y artículos siguen filtrados en SQL. Una consulta PostgreSQL por petición sigue siendo necesaria para revocación estricta entre escritores sin introducir una tabla/broker compartido; no se promete cero DB por visita. El disco efímero no participa y al reiniciar Next la caché se pierde/reconstruye.

## Evidencia aislada, no Neon

- RED de visita consecutiva:10 SQL en vez de1. GREEN: baseline10/cold11/warm1;24 visitas calientes→24 SQL, pool observado≤5. Concurrencia fría deduplicada, retirada SQL sin updatedAt, transacción no confirmada, fallo DB, aislamiento de clientes, clones y publicación futura/expiración probados.
- Demora real controlada del wire PostgreSQL3s: batch explícito sin caché→P2028 inicio2134ms; lectura siguiente28ms. Camino público con gate→primera3039ms/segunda2ms. No se elevaron límites: pg permite ya5s de conexión, Prisma batch2s de inicio. El gate legítimo adquiere conexión antes del batch. Esto no confirma el motivo de Neon ni cubre demoras superiores al presupuesto pg.
- HTTP local sobre catálogo completo65/30: portada TTFB286/30/21ms y cuerpo401/34/26; tools26/19/16 y cuerpo42/25/22; use-cases18/17/14 y cuerpo34/22/19. Tres muestras secuenciales, no percentiles/CWV ni latencias Render. Nuevo proceso Next consulta catálogo SQL real con200; no persistencia de caché o prueba de reinicio remoto.
- Se conserva un fallo funcional reproducido con HTTP200 y error visible. La regresión de navegador rechaza esa pantalla; liveness no basta. Readiness autenticado salta caché y ejecuta las consultas reales. No se desactiva streaming global ni se crea diagnóstico público.

## Blueprint001: original conservado

ZIP privado existente recuperado, SHA256 `0349bfb69e8c68c85d1ca7a28b7dcea546a254a4df787ebeb02c8c5946ac5c55` sin modificar. Diez descargables, JSON y guías en inglés de importación, credenciales, privacidad, límites, ejemplos y operaciones ya preparados; propuesta editorial privada conservada. No se copian sus bytes a Git/public/SQL seed. Checker vigente PASS, no confundir estructura con ejecución.

Reejecución en copia privada: n8n2.45.6, imagen oficial del checkpoint14, Node26.12.1 dentro de n8n (Atlas24).17/17 escenarios PASS, importación/activación de test/re-exportación nativas, red Docker interna sin proveedores reales.21 nodos originales preservan validación, dedupe, ledger y manejo de resultados inciertos; no se reconstruyó otro workflow más pequeño eliminando esos controles. Google Sheets/Slack/Tally reales siguen **NO PROBADOS**. Contenedores/red propios retirados; servicios existentes conservados.

QA Atlas con paquete original: carga privada auditada, manifest/versionado, permisos/revisión, UI/descargaHTTP, SHA/tamaño, reinicio de Next, corrupción y retirada. Almacenamiento local privado y S3 simulado son evidencia aislada; no Neon Object Storage. El motor de publicación/descarga sigue autorizando cada lectura y verificando bytes.

## Contacto y oferta

ServiceInquiryCard reutilizado solo con release pública elegible y contacto revisado por el padre. El piloto específico aparece únicamente en `qualify-tally-leads-with-n8n-and-slack`; otras guías conservan su contacto genérico. Mailto validado/codificado con asunto solicitado y preguntas de compañía/país/formulario/Sheets/Slack/volumen/necesidad. Advierte no enviar claves/datos de clientes. Pruebas móviles y rechazo de inyección de headers. No envío automático, CRM nuevo, precio, plazo48h, disponibilidad o resultado económico prometidos. La propuesta de precios/alcance/entrega requiere aprobación comercial, no inferirla de este código.

## Bloqueos reales; intervención privada

El propietario confirma03-11: Live99479df y Auto-Deploy Off. Backend storage=neon, bucket privado, permiso efectivo runtime solo lectura, PUBLIC_CONTACT_EMAIL y revisión legal: **PENDIENTES DE VERIFICACIÓN**, no ausencias demostradas. No se modificaron variables ni se generaron secretos.

1. Verificar/configurar privadamente Object Storage del proyecto existente, bucket privado, endpoint/región/cuota/ACL/policy, runtime storage:read y operador write separados mediante el procedimiento BLUEPRINT_STORAGE.md; no exponer claves ni alterar PostgreSQL. No afirmar provisión sin evidencia.
2. Revisar licencia/atribución, guía y release original. Carga explícita mediante CLI actual; DRAFT→VERIFIED→PUBLISHED con evidencia/permiso. Descargar desde URL pública exacta, comprobar SHA/headers y persistencia tras reinicio/deploy autorizado; retirar→404. Hasta entonces no hay descarga MVP pública aceptada.
3. Aprobar identidad/contacto, seis políticas existentes y alcance real con asesor jurídico/operador; datos exigibles Colombia/mercados y responsabilidades/transferencias/retención/reclamos pendientes. No asumir domicilio ni cambiar LEGAL_REVIEW_CONFIRMED. Correo público revisado y servicio disponible son decisiones humanas. No precios o plazos públicos antes de aprobación.
4. Autorizar SHA nuevo tras CI y preflight del cliente conectado, desplegar manualmente conservando Auto-Deploy Off; aceptar HTTP+contenido, fichas/filtros/readiness privado y logs en varias condiciones. Nuevos límites de disponibilidad necesitan decisión económica; Free puede suspender/arrancar frío y servir robots restrictivo, disco efímero. No pings ni upgrade automático. Esta ejecución no acredita reparación productiva de P2028/ETIMEDOUT.

Indexación, Search Console oficial, revisión legal, AdSense, pagos, correo y agentes mantienen sus aprobaciones separadas. No se necesita AdSense para este MVP. No hubo nuevos clientes, ingresos, solicitudes comerciales o integraciones reales inventados.

Validación local: check94/lint/TS, DB99, build, runtime11, SEO6, Blueprint35 con paquete original, n8n17 y E2E126/126 PASS; catálogo65/30/6DRAFT/20/24 validado sin reimportar. Revisión independiente sin bloqueantes, precisión de cliente/reinicio corregida. Errores intermedios en BUILD_LOG.md; el SHA nuevo necesita CI propia. **Dictamen: mejoras técnicas y producto privado verificados en aislamiento; MVP comercial/descarga persistente/estabilidad productiva PENDIENTES.**
