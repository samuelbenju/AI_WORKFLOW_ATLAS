# Plan de doce fases

Cada fase requiere solicitud expresa. La Fase 1 es la única autorizada en la primera ejecución. El orden respeta dependencias sin reducir el alcance final de `PRODUCT_SPEC.md`.

| Fase | Entrega | Dependencias | Criterios críticos de aceptación |
| --- | --- | --- | --- |
| 1 | Inicialización y arquitectura | Repositorio y Node compatible | Next App Router + React + TS estricto + Tailwind ejecutables; shell inglés responsive/accesible, estado honesto, configuración sin secretos, documentos permanentes, versiones/lockfile, CI escrita, lint/tipos/tests/build y arranque HTTP/navegador comprobados. |
| 2 | PostgreSQL y Prisma | 1; PostgreSQL accesible | Según la solicitud expresa de ejecución 2/12: modelos de usuarios/roles, contenido, patrocinios, pagos, newsletter, agentes, configuración y auditoría; migraciones versionadas ejecutadas, seed identificable/repetible, constraints/índices, repositorios, consultas e integridad probadas; instrucciones y ensayo de backup/restore. Solo persistencia, sin implementar interfaces o integraciones de fases posteriores. |
| 3 | Plataforma pública y directorios | 2 | Home conectada a datos, búsqueda real, filtros/categorías/tags, paginación y ordenamiento; fichas tools/use cases con problema, pasos, dificultad, referencias y limitaciones; vacíos y 404; pruebas contra DB y navegador móvil. |
| 4 | Auth y administración | 2–3; identidad y contraseña por operador | Sesiones seguras, roles y `/admin` español; permisos servidor por operación, CRUD de categorías/etiquetas/herramientas/casos y auditoría; pruebas negativas de acceso, CSRF/origen y cierre de sesión; nunca usar indicadores comerciales inventados. |
| 5 | Blog, contenido y SEO | 3–4 | Articles/ContentDraft, flujo borrador/revisión/publicación, guías/comparativas/tutoriales y relacionados; metadata/canonical/OG/schema adecuados, sitemap/robots y RSS si aporta valor; sanitización; comprobaciones de render/índice y edición autorizada. No indexar pre-lanzamiento incompleto. |
| 6 | Patrocinios y CRM | 4–5 | Sponsor/Package/Campaign/Lead; cuatro productos y precios administrables; solicitud real validada/persistida, revisión/aprobación/estados/auditoría y espacios etiquetados; pruebas de integridad de precios y permisos. Pago todavía pendiente de 8. |
| 7 | Newsletter | 4–6; email/dominio verificados | Consentimiento persistente, confirmación/baja, supresión, admin y borradores/plantillas/historial/patrocinios; flujo real con proveedor en destinatario autorizado; límites/idempotencia/privacidad; no campañas masivas sin autorización. |
| 8 | Wompi Sandbox | 6; credenciales Sandbox | Órdenes/referencias/moneda/importe servidor, firmas oficiales, checkout, webhook auténtico idempotente, estados/eventos y conciliación; probar pago Sandbox y rechazar firmas/repeticiones/manipulación; campaña requiere aprobación. Sin producción ni tarjetas almacenadas. |
| 9 | Infraestructura de agentes | 4; DB y proveedor IA/scheduler configurados | Agent/Task/Execution persistidos, adaptador Responses API y modelos, presupuesto/consumo, allowlist, leases, concurrencia/cancelación/reintentos acotados; worker/scheduler fuera de Codex; pruebas reales autorizadas y de caídas/idempotencia; logs y aprobación. |
| 10 | Cinco agentes | 5–9 | CEO/investigador/editor/SEO/comercial configurados, prompts y herramientas versionados; ejecuciones reales y fuentes, borradores/reportes; adversarial prompt injection y approvals; ninguna publicación/comunicación sin control humano. |
| 11 | Analítica, crecimiento y afiliados | 3–10; medición configurada | Conversión y eventos reales, afiliados etiquetados, Search Console y GA4/equivalente según consentimiento; reportes que distinguen bruto/pago/comisión/gasto/neto; no métricas sintéticas en dashboard; premium solo si hay demanda validada. |
| 12 | Auditoría y preparación de lanzamiento | 1–11; decisiones del propietario | Revisión integral funcional/seguridad/permisos/abuso/webhooks/UX móvil/consumo; políticas y contacto editables, revisión jurídica Colombia e internacional, nombre/dominio, presupuestos, backups/restauración, alertas/rollback; build y E2E; lista de pendientes real. Publicar/activar cobros/envíos solo con autorización. |

## Condiciones comunes

- Validar con herramientas reales; distinguir aprobado, fallido, omitido y no ejecutado.
- Credenciales faltantes no justifican integraciones falsas. Completar trabajo independiente y documentar el bloqueo exacto.
- Ninguna fase se marca completa con requisitos críticos pendientes. Un fallo confirmado de producto y un bloqueo del entorno se registran por separado.
- Actualizar contratos y migraciones de manera incremental, conservando datos y módulos funcionales.
- Mantener `PROGRESS.md` como estado resumido y `BUILD_LOG.md` como evidencia de comandos y resultados.
- Pruebas y costes de integraciones necesitan límites y autorización específica de operaciones externas; el presupuesto orientativo no es autorización de gasto.

## Fase 13 autorizada posteriormente — operación y catálogo

La solicitud adjunta autoriza investigación, implementación, pruebas, commits/push normales y publicación de contenido revisado exclusivamente en atlas_staging. Se añaden catálogo/evidencia, importación manual guardada y bootstrap seguro desde Windows, reutilizando modelos/servicios existentes. No es una reconstrucción o reapertura de las doce fases. Meta inicial comprobable: 65 herramientas, 30 guías, seis artículos DRAFT; 200 herramientas sigue aspiracional. Actualización 28-10-2026: catálogo aplicado mediante workflow 40714352948 SUCCESS y contenido público confirmado por el propietario; no reimportar. El login OWNER humano y el lanzamiento comercial se verifican de forma independiente, sin negar esa activación ya realizada. Alcance, resultados y bloqueos: docs/PHASE13_REPORT.md. Servicios con coste, tracking, indexación y automatizaciones continúan deshabilitados.

## Estado de cierre de Fase 12 — 26-10-2026

Solicitud 12/12 autorizada y ejecutada sobre el proyecto existente. Auditoría, correcciones acotadas, pruebas locales y preparación operativa/legal documentadas en AUDIT_REPORT.md y LAUNCH_CHECKLIST.md. No se marca completado el lanzamiento: credenciales/pruebas externas, host/DB/backup/monitor finales, administrador humano, revisión jurídica/fiscal y proveedor de pagos de producción siguen pendientes. No se autoriza despliegue, cobro, publicación comercial o recurrencia con costes por terminar estas fases.


## Lanzamiento público autorizado posteriormente — 27-10-2026

Sobre Fase 13 existente: completar activación remota cuando se disponga de acceso; preparar Google/GSC/AdSense, consentimiento certificado y control de indexación, validar y conservar infraestructura. No repetir migraciones, publicar DRAFT, asumir revisión legal, fabricar ingresos o activar agentes/pagos/correo. Alcance y evidencias diferenciadas en docs/PUBLIC_LAUNCH.md; no es una fase nueva que reinicie las doce anteriores.

## Operación SEO y crecimiento autorizada — 28-10-2026

Catálogo ya importado y sitio operativo confirmado por el propietario; no volver a ejecutarlos. Mejorar SEO técnico, descubrimiento por categorías, enlaces internos, rendimiento y medición administrativa sobre los módulos existentes. Proponer ocho semanas editoriales con fuentes y revisión humana. Conservar los seis DRAFT, los 101 registros, esquema/16 migraciones y barreras legales/Google. No activar seguimiento/anuncios/indexación/servicios ni comprar infraestructura. Validar localmente y diferenciar CI, prueba efímera y comportamiento real de Render.

## Blueprint Engine — entrega 1 autorizada, 29-10-2026

Implementar solo backend: manifiesto validado/versionado, guía existente por slug, estados/autorización, archivos privados, descarga verificada, preparación consentida de medición y pruebas. Conservar commit SEO aprobado 9a824bf y cualquier avance posterior. Sin esquema/migraciones/Neon, UI, workflow completo, monetización o automatizaciones nuevas. Interfaz y primer blueprint real son entregas futuras independientes, sin inicio automático. Contrato y riesgos en docs/BLUEPRINT_ENGINE.md.

## Blueprint Engine — entregas 1.5 y 2 autorizadas posteriormente

Conservar 96105c4 y sucesores. Entrega 1.5: abstracción local/Neon privado S3, carga CLI segura y pruebas; no provisionar si no hay acceso/autorización, no declarar durabilidad remota por simulaciones. Checkpoint en docs/BLUEPRINT_STORAGE.md. Entrega 2: UI pública inglesa sobre servicios existentes, versiones explícitas, descarga real, diagrama sustentado/conceptual etiquetado, requisitos/atribución/errores y contacto público solo configurado. Extensión compatible del manifiesto, sin editar releases selladas. Pruebas aisladas, sin blueprint ficticio en Neon, sin migraciones/roles/catálogo/SEO/AdSense/servicios nuevos. Dos entregas/commits independientes; no primer workflow comercial o publicación automática de archivos.

## Etapas 14 y 15 autorizadas — 29-10-2026

14: paquete n8n original privado, ejecución nativa aislada, evidencia y propuesta editorial sin publicar. 15: reutilizar storage/upload/auth/UI/download; corregir defectos demostrados y verificar paquete real en PostgreSQL temporal. Persistencia Neon/Render exige acceso privado, configuración y aprobación independientes. Dos commits locales lógicos; solicitar autorización antes del push. No desplegar/publicar/provisionar automáticamente. No etapa 16. Checkpoint 14: docs/PHASE14_REPORT.md. Producto y fuentes privadas fuera de Git público.

Checkpoint15: implementación y validación local completadas; activación remota pendiente, no dictamen de producción. Reutilizados adaptadores/CLI/API/UI; paquete original probado sin incorporarlo a Git. docs/PHASE15_REPORT.md distingue S3 simulado, archivos/SQL/HTTP reales locales y Neon/Render sin acceso. Publicación editorial, recursos cloud, secretos y deploy requieren aprobación propia; no etapa16.

## Etapas16 y17 autorizadas conjuntamente — 30-10-2026

Tres líneas: diagnóstico acotado y alternativa Render manual sin transferir secretos; etapa16 SEO/validación/editorial/GSC con puertas intactas; etapa17 embudo basado en agregados existentes sin nueva analítica o atribución falsa. Commits/push normales autorizados tras checks, sin deploy/activación comercial. Checkpoints A/B/C/D separados en reportes16/17 y diagnóstico. Bloqueos de plataforma no detienen código; no migraciones/importación de Neon ni nuevos servicios.

Checkpoint17: panel/CEO consumen el mismo funnel de evidencia sin analítica paralela. Experimentos se proponen mediante GrowthExperiment existente, con evidencia/privacidad/parada, sin resultados inventados. Activaciones Google/CMP/editorial/storage/comercial siguen separadas; no etapa18 automática. Reporte PHASE17_REPORT.md y cierre conjunto en BUILD_LOG.

## Continuidad y QA incremental — 30-10-2026

Alcance autorizado: auditoría/preflight y correcciones demostradas, sin etapa nueva. Ejecución directa en el checkout existente; no worktree, nuevas dependencias o cambios productivos para compensar accesos ausentes.

- [x] Reproducir la dependencia de `zzz-business-agents.test.ts` respecto al paquete creado por otras suites: ejecución parcial en PostgreSQL loopback desechable, 12/19 PASS; primer fallo en `sponsorshipPackage.findFirstOrThrow`, siete fallos en cascada.
- [x] Corregir exclusivamente el fixture del caso CEO: reutilizar paquete disponible o preparar uno explícitamente ficticio en esa DB; conservar precios existentes cuando se reutiliza y todas las aserciones.
- [x] Repetir las 19 pruebas aisladas de agentes, ejecutar `npm run check` y la integración general para verificar convivencia con los fixtures anteriores: 19/19, 90/90 y 91/91 PASS. Sin cambios de aplicación, reutilizar build/E2E de la CI exacta, sin repetirlos localmente.
- [x] Corregir instrucciones operativas históricas de creación del runtime/push pendiente y revisar diff/secretos; revisión independiente sin hallazgos bloqueantes. Commit/push normal autorizado solo sin divergencia; la CI del SHA resultante se informa después de publicarlo, sin desplegar.

## P0 — discriminar P2028 antes de corregir su causa remota

Incidente aportado: 02-11-2026 19:11:46 America/Bogota, catalog.home/P2028, liveness200 y portada200 con error. Base96e0164, Render Live b3f39f5 según propietario; no acceso MCP/Neon en esta sesión. No se modifican pool, aislamiento o plazos sin confirmar cuál falla.

- [x] Trazar Prisma/adapter-pg/pg7.10.1/7.10.1/8.23.1 y fuente oficial de la versión: batch multi usa plazos2000/5000; singleton/pool5 y sin disconnect en runtime. Reproducción real aislada: pool ocupado→P2028 al inicio; bloqueo SQL→P2028 expirado. Ambos pierden el subtipo en el diagnóstico actual. No prueban causa de Render.
- [x] RED: unitarias y regresiones reales de ambos P2028 exigen códigos fijos distintos y ausencia de material privado; fallaron dos unitarias y dos casos reales por subtipo perdido, manteniendo stage/codes y error público.
- [x] GREEN: clasificar solo metadata numérica validada o sufijo exacto de inicio P2028, sin imprimir/retener mensajes; ejecución/retries intactos. Catálogo con datos/relaciones/concurrencia, interrupción y liveness/readiness/autorización/deadline cubiertos. Experimento PgBouncer real distingue cola servidor de cola aplicación; no acredita Neon.
- [x] Check93, integración91, build, runtime10, SEO5 y E2E122/122 locales PASS. Matriz A–K y evidencia externa mínima registradas en RENDER_CATALOG_DIAGNOSTICS; corrección del diagnóstico, no causa productiva determinada.
- [x] Revisión independiente focal y corrección de limpieza del fixture: nueva repetición check93/runtime10 PASS. Revisar secretos/diff/main antes de push normal y consultar su CI propia después. Reparación del catálogo aún bloqueada por subtipo/evidencia remotos: cualquier despliegue diagnóstico requiere autorización específica del SHA, no es una solución productiva certificada.

CI41556428028 del commit6ecf8c5 falló exclusivamente en E2E, timeout catalog.spec.ts111; check/DB/build/runtime/SEO/Blueprint PASS. No se declara CI aprobada. Logs públicos404; evidencia de acción pendiente solicitada al cliente conectado. Probe real reproduce además cierre sin cota de withAppServer ante HTTP incompleto; probar RED→GREEN y acotar solo limpieza del proceso propio, sin aumentar timeout global/retries o quitar assertions. No atribuirlo al P2028 ni al fallo exacto de CI sin la traza.

Checkpoint del harness: RED10/11→GREEN11/11 runtime; check93/SEO5/Blueprint31/importador10/E2E122 PASS, revisión independiente sin hallazgos. Commit separado y CI propia posterior; código productivo/Neon/Render sin cambios adicionales. La misión causal del catálogo sigue parcial y el despliegue diagnóstico requiere autorización propia.
## Misión 18 — estabilidad, Search Console y AdSense (03-11-2026)

Ejecución autorizada sobre 4bcf3aa, sin despliegue nuevo ni cambios remotos. Diseño mínimo: conservar la metaetiqueta AdSense existente (verificación sin anuncios); restringir el adaptador GSC existente al prefijo HTTPS raíz de SITE_URL. No aceptar propiedades de terceros, subrutas o sc-domain del proveedor. Una propiedad Dominio propia requiere una decisión posterior, no inferir control DNS de onrender.com.

- [x] Auditar estado observado y distinguir el Live/TRANSACTION_START_TIMEOUT aportados por el propietario de verificaciones independientes. No modificar pool/timeouts sin métricas.
- [x] RED: pruebas de propiedad GSC ajena/malformada y de rechazo sin transporte ni persistencia. GREEN: corrección mínima en src/server/growth/google.ts y ajuste explícito del origen de fixtures.
- [x] Probar en navegador/HTTP las etiquetas públicas GSC/AdSense con aprobaciones apagadas, rechazo de valores inválidos, cero scripts/peticiones comerciales y ads.txt 404 text/plain. Mantener la entrega actual aprobada separada.
- [x] Ejecutar check, integración aislada, build, runtime, SEO y E2E completa; revisión independiente del diff. No repetir importaciones o migraciones remotas.
- [ ] Registrar evidencia y límites en los controles y reporte 18; push normal solo con árbol revisado, sin secretos y main remota sin divergencia; consultar CI del nuevo SHA. Google/Render real, precios oficiales y revisiones humanas pendientes si no hay acceso.

Cierre local: check93, DB93, build, catálogo, runtime11, SEO5 y E2E126/126 PASS; revisión independiente sin hallazgos. Persisten bloqueos remotos/Google y precio oficial no verificado. Push/CI nueva se comprueban tras el commit, sin desplegar.

## MVP final — catálogo, descarga y contacto (03-11-2026)

Sin cacheComponents ni ISR global. Probar una caché granular en memoria (32 entradas,15s,256KiB por entrada, single-flight acotado), autorizada por snapshot MVCC y época PostgreSQL leídos sin transacción Prisma antes de reutilizar datos. Mantener RR filas/conteo y Proxy404; búsquedas libres, demos, DB explícita/readiness y descargas no se cachean. No stale-on-error. El gate en DB es necesario para detectar revocación desde otros procesos/SQL sin tablas/servicios nuevos. Comparar SQL/latencia/24lecturas, retiro sin updatedAt, reinicio y fallo DB; rechazar diseño si no reduce consultas o conserva garantías.

Reutilizar paquete privado original y QA existente, sin reconstruir ZIP; verificar hash, estructura y ejecuciones aisladas si entorno disponible. No afirmar descarga remota sin bucket/credenciales/prueba HTTP real. CTA piloto específico únicamente para slug de guía propuesto, email público validado/revisado y release aprobada; no publicar precios/plazos ni crear CRM.

Pruebas RED→GREEN, check/build/DB/runtime/SEO/Blueprint/E2E; revisión independiente, push normal con CI exacta. Sin despliegues/Neon/migraciones/importaciones/remotos o activaciones comerciales no aprobadas. Evidencias y bloqueos en reporte breve al cerrar.

## Cierre MVP — operación storage y captación (03-11-2026)

Base41b86ab, Live confirmado externamente. No redeploy, env updates, roles, credenciales, migraciones, catálogo o motor de caché. Reutilizar adaptador S3 con diagnóstico opt-in de etapas/códigos permitidos, CLI exclusivamente READ que valide destino original y paquete privado antes de HEAD/GET; no probar PUT sin autorización de carga. Tests de secretos/observador/comandos solo lectura. La CLI no acredita ejecución en Render si se usa desde otra estación.

Ajustar hero/ServiceInquiryCard existentes: guías gratuitas y solicitud de presupuesto únicamente con contacto legalmente revisado; no prometer descargas ausentes, precio o48h. Ampliar preguntas del mailto sin captación/trackers nuevos. Reutilizar paquete original y preparar material de captación privado, demo/imagen auténtica si entorno disponible; no publicar ni contactar. Check/build/Blueprint/SEO/E2E pertinentes, revisión y CI del SHA nuevo. Cierre depende de almacenamiento, licencia/editorial, identidad/contacto, recepción real y aprobación de deploy.


### P0 añadido por evidencia real15:20–15:21UTC

- [x] Reproducir espera pool5/2600ms con PostgreSQL real; batchfacetas falla por inicio2s, lecturas secuenciales pasan usando conexión dentro del plazo pg ya existente.
- [x] Retirar solo transacción facetas READ COMMITTED y secuenciar grupos del listado; conservar RR filas/conteo/cache/gates. Documentar retirada de expiración lógica5s, sin SQLcancel garantizado antes/después.
- [x] Clasificar mensajes fijos pg uncoded con pruebas reales/negativas; no diagnosticar retrospectivamente error desconocido remoto.
- [x] Revisión independiente y regresiones afectadas; verificar CI propia y pedir autorización del SHA nuevo antes de deploy. Producción todavía falla según evidencia externa, no resuelta por suite local.


Cierre local final: check96/lint/TS/PrismaValidate, PostgreSQL99, build, runtime13, SEO6, Blueprint34(26backend+8UI), catálogo válido65/30/6DRAFT/20categorías/24etiquetas y E2E126/126 PASS. E2E completa repetida tras la corrección P0, no reutilizada del build previo. Revisión independiente sin hallazgos bloqueantes; main remota conservaba41b86ab antes de preparar commits. SHA/CI del candidato se verifican después del push normal, sin despliegue. Producción continúa sin aceptar según evidencia externa.


## P0 directorios — 03-11-2026, base569b00e

RED real queryTools búsqueda con pool5 ocupado2600ms→P2028inicio~2063ms. Estrategias A/B dosSQL sin snapshot común; C unaSQL parametrizada con filas/taxonomía/conteo en snapshot único, elegida sin cambiar caché/pool/home/facetas. GREEN tools2607ms/use-cases2605ms. Concurrencia1/5/10/20→1/5/10/20SQL y pool≤5; cifras locales, no Neon/Render. Regresiones de filtros/paginación/inyección/interrupción/recuperación y controles existentes. No retries/timeouts nuevos/deploy/servicios/datos/migraciones/Blueprint. Ver docs/P0_DIRECTORY_READS.md; contacto solo informe separado docs/CONTACT_READINESS.md. Suites finales/CI propia se registran al cierre; producción sin certificar.


Validación local final: check96 (lint/TS/Prisma/unitarias), PostgreSQL99, build, runtime16, SEO6 y E2E126/126 PASS. Runtime verifica /tools y /use-cases?q=presentation con error visible y HTTP200/500/503 como fallo funcional; no catálogo vacío ficticio. Revisión independiente sin bloqueos; materialización reducida a columnas de tarjeta y riesgo de casts enum documentado. Sin cambios en schema/16migraciones/deps/Blueprint/envs/Neon/Render. CI propia se verifica tras push, no reutilizar CI base. Despliegue y validación productiva pendientes de autorización.


## MVP controlado — tres etapas internas autorizadas03-11

1. Reutilizar contacto/ServiceInquiryCard con mensaje mínimo seguro, oferta por cotización sin precio/plazo, CTA desde herramientas y guías aunque no haya Blueprint publicado; mantener validación legal/email y ausencia de descarga ficticia. Validar check/build/SEO/Blueprint y móvil antes de etapa2.
2. Preservar original ZIP0349bfb…ac5c55; comprobar paquete, evidencia e importación/17casos n8n aislados si disponible, QA de motor/HTTP privado en DB desechable. Sin subir/publicar S3 o cambios de permisos. Registrar diferencias entre fixture e integración real.
3. Reutilizar SEO/GSC/robots/sitemap, comprobar regresiones, preparar contenido original privado y análisis cualitativo sin volúmenes; hosting/Google real pendientes de acceso. Sin activar indexación. Checkpoints en docs/MVP_THREE_GATES.md. Final check/DB/runtime/SEO/E2E/build, push normal y CI exacta, sin deploy.
