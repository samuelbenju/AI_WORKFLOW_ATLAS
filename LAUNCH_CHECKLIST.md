# Lista de lanzamiento — AI Workflow Atlas

Actualización 28-10-2026: [procedimiento vigente de publicación, GSC y AdSense](docs/PUBLIC_LAUNCH.md) y [estrategia SEO/editorial](docs/SEO_STRATEGY.md). Apply 40714352948 SUCCESS observado; propietario confirma 101 registros y sitio funcional con catálogo. Las 16 migraciones ya están aplicadas: no repetir migraciones, bootstrap o importación. Las aprobaciones de lanzamiento/legales/Google son independientes.

- [x] Catálogo inicial aplicado: workflow 40714352948 SUCCESS; propietario confirma 101 registros creados, 65 herramientas/30 guías/seis DRAFT. No reimportar. No se hicieron escrituras remotas en la mejora SEO.
- [ ] Comprobar OWNER humano privadamente solo si falta; conservarlo si existe. Sitio con contenido confirmado por propietario; comprobar SHA Live y rutas de la nueva entrega SEO por separado.
- [ ] Resolver disponibilidad/robots del Render Free y validar rastreo real antes de indexar. No pings artificiales.
- [ ] Textos legales y datos públicos aprobados por persona competente; solo entonces LEGAL_REVIEW_CONFIRMED=true.
- [ ] PUBLIC_LAUNCH_CONFIRMED y SEO_INDEXING_ENABLED tras revisar catálogo, HTTPS, canonical y permisos.
- [ ] Propiedad GSC verificada y sitemap real enviado, seis DRAFT excluidos.
- [ ] Cuenta/sitio AdSense aprobados, publisher real, CMP certificada vigente publicada y probada en regiones requeridas.
- [ ] Ubicaciones/Auto Ads revisados en Google; flags ADSENSE_* siguen false hasta esas decisiones.
- [ ] Informes externos reales, si se autorizan, separados de pagos/liquidaciones y métricas propias; no ingresos garantizados.

Auditoría local: 26-10-2026 UTC. **NO AUTORIZADO PARA PRODUCCIÓN COMERCIAL.** Esta lista no ejecuta, compra ni publica nada. Evidencia: [AUDIT_REPORT.md](AUDIT_REPORT.md), [BUILD_LOG.md](BUILD_LOG.md). Operación: [docs/PRODUCTION.md](docs/PRODUCTION.md). El propietario debe asignar responsables y registrar fecha/evidencia de cada pendiente; pasar pruebas locales no sustituye esas decisiones.

Actualización 26-10-2026 (America/Bogota): Fases 1–12 respaldadas y Render Free + Neon staging confirmados por el propietario. Fase 13 añade contenido real y un workflow de importación manual autorizado; **sin importación Neon o comprobación Render de esta ejecución todavía**. Ver [docs/PHASE13_REPORT.md](docs/PHASE13_REPORT.md) y [docs/CATALOG_OPERATIONS.md](docs/CATALOG_OPERATIONS.md). Esto no autoriza lanzamiento comercial, pagos, envíos, indexación o gasto de agentes.

## Puertas obligatorias de salida

- [x] Mantener checkout e historial oficial; fases previas, 45 modelos, 16 migraciones y lockfile conservados.
- [x] Auditar auth/roles/CSRF, formularios, webhooks, idempotencia, herramientas y cuotas; corregir regresiones de Fase 12 y añadir pruebas.
- [x] Respaldo de las doce fases autorizado y realizado en main; posteriores cambios de staging autorizados por sus solicitudes. Conservar SHA y comprobar el despliegue exacto; esto no es aprobación de lanzamiento comercial.
- [ ] Revisión independiente de seguridad y configuración del entorno de destino. npm audit sin hallazgos no certifica ausencia de vulnerabilidades.
- [ ] Inicializar administrador humano con `npm run admin:init` interactivo; contraseña propia, sin fixture ni fichero de contraseñas. Revisar roles y recuperación.
- [ ] Contratar/configurar PostgreSQL de producción por decisión del propietario, TLS verify-full y CA confiable; rol runtime sin superusuario/CREATEDB/CREATEROLE, permisos mínimos. Credencial migradora separada y conexión directa compatible.
- [ ] Backup privado cifrado externo/PITR, retención y responsables acordados; ensayo de restauración en destino con conteos e integridad. Definir RPO/RTO y acceso de emergencia.
- [x] Neon staging: 16 migraciones aplicadas; SUCCESS remoto observado y conteos 55 tablas/72 FK aportados por propietario. No reejecutarlas. Cualquier cambio futuro requiere backup, revisión y nueva migración autorizada, nunca reset, db push o seed demo.
- [ ] Configurar Vercel u otro runtime Node 24 compatible, pool de conexiones y límites; comprobar build en destino, caché privada, cookies Secure y exclusión de secretos del bundle/logs.
- [ ] Dominio/nombre/marca aprobados, DNS/HTTPS y renovaciones comprobados, SITE_URL/orígenes coherentes; prueba de HSTS y headers sobre el dominio real. No activar preload/includeSubDomains indiscriminadamente.
- [ ] Identidad legal, dirección comercial y canal público verificado; seis políticas revisadas, fecha aprobada. Solo entonces `LEGAL_REVIEW_CONFIRMED=true`; no usar email privado de administración como contacto automático.
- [ ] Revisar obligaciones Colombia con abogado/contador y mercados internacionales: datos, consumidor, fiscalidad, facturación, contratos y publicidad. Resolver vacíos antes de aceptar clientes.
- [ ] `npm run launch:check` revisado junto a evidencia manual; su salida 2 recuerda que no autoriza producción.

## Plataforma, contenido y medición

- [x] Home/directorios/búsqueda/filtros/slugs/paginación, CMS y SEO cubiertos por pruebas locales.
- [ ] Curar herramientas/casos y seis borradores editoriales: fuentes actuales, derechos de imágenes, exactitud y revisión humana antes de publicar. No publicar el seed o estadísticas inventadas.
- [ ] Revisar teclado, lector de pantalla, navegadores y dispositivos reales además de Chromium/axe; rendimiento y carga representativos, objetivos/alertas definidos por el operador.
- [ ] Sitemap/canonical/robots/OG y contenido público revisados sobre dominio definitivo; activar SEO_INDEXING_ENABLED solo después del lanzamiento autorizado. Legales sin revisar siguen noindex/fuera del sitemap.
- [ ] Aprobar política de consentimiento/cookies, retención y procedimientos de acceso/supresión. Tracking permanece false hasta decisión explícita; DNT/GPC prevalecen, sin queries/PII en eventos.
- [ ] Configurar GA4/GSC solo con cuentas verificadas y permisos mínimos; OAuth expirable debe renovarse. Probar recepción/propiedad real; snapshots de pruebas no son tráfico.
- [ ] Verificar contratos/protocolos de socios afiliados, destinos HTTPS, divulgación, HMAC y fuente de conversiones. No inventar comisiones ni inferir ventas de clics.
- [ ] Definir rutina de retención: dry-run, revisión y aplicación explícita en lotes. Sin cron configurado; contactos/consentimientos/documentos financieros necesitan política jurídica específica.

## Comercial y pagos

- [x] Solicitud → PostgreSQL → CRM → orden → evento firmado/idempotente → transacción probado localmente con transporte fixture.
- [x] Sandbox no habilita anuncios. Prueba separada con evidencia PRODUCTION **ficticia y aislada** verifica aprobación/periodo/producto y retirada por ON_HOLD. No representa un cobro real.
- [ ] Aprobar paquetes, disponibilidad, precio/moneda/duración, impuestos, condiciones de servicio/cancelación/reembolsos y contratos. No prometer audiencia o disponibilidad inexistentes.
- [ ] Releer documentación oficial Wompi vigente, obtener credenciales exclusivamente Sandbox y probar checkout/webhook/consulta/conciliación reales en HTTPS, con transacción autorizada de prueba. Hoy no verificado externamente.
- [ ] **Bloqueo comercial:** solo existe proveedor Wompi Sandbox. Implementar y auditar un proveedor de producción en trabajo autorizado posterior, onboarding comercial/fiscal y autorización de cobros. No cambiar una bandera o registros para convertir Sandbox a producción.
- [ ] Verificar manejo real de reembolsos/contracargos y retenciones del proveedor antes de ventas; conciliación manual hasta disponer de eventos soportados.
- [ ] Prueba de entrega comercial en staging con evidencia propia legítima, revisión de campañas y autorización de publicación. No activar campañas automáticamente por pagar.

## Newsletter y agentes

- [ ] Resend: dominio/remitente verificados, SPF/DKIM/DMARC y claves privadas; prueba autorizada a destinatario controlado, doble opt-in/baja, rebotes/supresión y entregabilidad. Sin key no hay envío real; captura solo en tests aislados.
- [ ] Revisar cada campaña, destinatarios y patrocinio. Preparar no envía; máximo dos entregas por acción humana. No campañas recurrentes o comunicaciones externas automáticas.
- [x] Cinco perfiles y cinco automatizaciones conservan estado deshabilitado, sin clave/presupuesto IA real; scheduler probado sin llamadas.
- [ ] Worker dedicado fuera de Vercel, snapshot/versiones coincidentes, supervisor, heartbeat y recuperación verificados en infraestructura final. `agents:service` es helper local, no despliega un worker remoto.
- [ ] OpenAI: credencial autorizada, modelo y tarifas vigentes, límites por tarea/agente/global y tope del proveedor; asignar presupuesto explícito. Primera ejecución pequeña manual autorizada, sin activar recurrencia.
- [ ] Verificar aprobación ligada a versión y usuario activo, herramientas por rol, cancelación, reservas inciertas y revisión de resultados. Editor solo DRAFT, CEO no concede presupuestos a sus delegados.
- [ ] Aprobar cada automatización y activar por separado solo tras comprobar el scheduler final y su coste. Deshabilitar es el valor inicial, no una avería que deba eludirse.

## Operación y publicación

- [x] CI y vercel.json preparados sin despliegues, crons o migraciones automáticos.
- [ ] Revisar branch protection, required checks, revisiones y secret scanning. CI remota base 5af53c41 SUCCESS observada; comprobar la CI específica de cada nueva versión.
- [ ] Configurar monitor externo autenticado a `/api/internal/readiness`, token local fuerte y OPS_EXPECT_WORKER según infraestructura; cadencia, responsables y canal de alertas autorizados. La aplicación devuelve alertas, no las envía automáticamente.
- [ ] Pruebas del host: recuperación de DB/worker, caída del proveedor, carga/pooling, logs redactados/retención, restauración y rollback de versión compatible.
- [ ] Ejecutar todas las comprobaciones finales en staging privado, registrar SHA, migraciones, backups y checklist firmado.
- [ ] Solicitar autorización de despliegue para ese resultado concreto; habilitar integraciones y publicación comercial mediante decisiones separadas. No activar cobros reales con la infraestructura Sandbox actual.

## Verificación técnica SEO y medición — 28-10-2026

- [x] Hubs de categorías reales, About/metodología, metadatos por página, filtros/vacíos noindex y exclusión de drafts en sitemap implementados y cubiertos por regresión aislada.
- [x] Estrategia cualitativa, brechas de los seis DRAFT y calendario de ocho semanas preparados sin publicar o modificar contenido importado.
- [x] Informes GA4/AdSense administrativos ampliados con permisos, validación, fuente y límites, sin activar seguimiento o anuncios.
- [ ] Validar la nueva versión y su SHA Live en Render; registrar pruebas de campo p75 cuando haya muestra suficiente. Lighthouse local no las reemplaza.
- [ ] Contrastar condiciones vigentes de Render Free/rastreo y elegibilidad del hostname en AdSense; ayuda oficial inaccesible desde cloud.
- [ ] Verificar en Google propiedad GSC, sitemap e inspección de URLs cuando las puertas de lanzamiento estén aprobadas. Aprobación publicitaria y CMP real requieren evidencia aparte.

## Etapas14–15: paquete original y almacenamiento

- [x] n8n real importado/ejecutado/re-exportado en aislamiento; fuentes, manifiesto y ZIP privado verificables (PHASE14_REPORT.md).
- [x] Diez archivos reales cargados/descargados con hashes exactos en Atlas local; privacidad, RBAC, UI, reinicio/corrupción/retirada probados (PHASE15_REPORT.md).
- [ ] Propietario descarga/conserva copia privada; aprobación de licencia/propuesta/editorial y prueba de cuentas reales, incluido header Tally.
- [ ] Comprobar bucket privado existente, región/cuotas/scopes y configuración privada Neon/Render; crear recursos o credenciales solo tras aprobación específica.
- [ ] Carga/estados editoriales remotos aprobados, SHA Live, descarga/reinicio/redeploy con persistencia y errores controlados, sin cambiar registros anteriores.
- [x] Etapas14–15 publicadas: `1a690e2f803c5a2c5b82ccb93005bdcc1caf9c33` y `786ef4445b3b26e6dc242ae8a7ceb267c5d44580`, conservadas como ancestros de `421842d62ac0433c4ee54125c9f6ce6cb143b5c0`; CI de ese HEAD [41011779292 SUCCESS](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/41011779292). Un push no autoriza deploy o publicación del paquete.

## Etapas16–17 — puertas conservadas

- [x] Revisión SEO y validación de snapshots GSC; no datos inválidos por calendario/intervalo/duplicado.
- [ ] Aprobar alternativa manual Render y configurar secreto GitHub independiente solo si se elige esa vía; no transferencia automática del vault Codex.
- [ ] Preflight real, SHA Live y recuperación observados; ningún SHA16/17 autorizado para despliegue aún.
- [ ] Revisión editorial/legal/Google, persistencia Blueprint y activación de medición/comercial separadas; no inferir aprobaciones por build/CI.
- [x] Embudo con procedencia y ausencia de evidencia explícitas, sin tasas entre cohortes incompatibles ni métricas Blueprint inventadas.
- [ ] Para experimentos: baseline, población/denominador, ventana, umbral y parada definidos antes de observar; sin datos declarar inconcluso.

Continuidad 30-10-2026: [preflight y operación concreta de solo lectura](docs/RENDER_STAGING.md#preflight-de-continuidad--30-10-2026-americabogota). Render MCP funciona en otro cliente según el propietario, pero no está expuesto a esta sesión Cloud. SHA Live/configuración aportados por propietario pendientes de reconfirmar; P2028 histórico no se da por vigente ni corregido. No recrear el runtime existente. Las aprobaciones de deploy, storage, editorial, legales, Google y comercial siguen separadas.

## P0 — catálogo, incidente del 02-11-2026

- [x] Reproducir y distinguir P2028 de inicio/ejecución en PostgreSQL aislado y conservar errores seguros; controles reales de PgBouncer/concurrencia/recuperación. Check93, DB91, build, runtime10, SEO5 y E2E122 locales PASS; no equivalen a Neon o Render.
- [ ] Confirmar subtipo/causa de Render y corregirla: logs aportados solo P2028, sin causa suficiente; [matriz/evidencia](docs/RENDER_CATALOG_DIAGNOSTICS.md#p0--incidente-del-02-11-2026-evidencia-y-límites). No aumentar plazos o pool por intuición.
- [ ] Si se decide usar el diagnóstico nuevo: autorizar SHA exacto tras CI/preflight y desplegar por separado. No presentarlo como solución definitiva. Repetir HTTP+contenido/readiness/logs y condición de arranque autorizada; un health200 no certifica catálogo.
- [ ] Cerrar reparación productiva solo con contenido real estable, causa respaldada y comprobaciones posteriores; hasta entonces lanzamiento/indexación/comercial continúan sin aprobación.

CI de diagnóstico6ecf8c5 falló solo en E2E (41556428028); no usarla como aprobación. Se reproduce/corrige además cierre ilimitado del servidor aislado de QA, sin alterar producción o assertions; runtime11/check93/SEO5 locales PASS. Revisar nueva CI del commit siguiente antes de proponer siquiera el despliegue diagnóstico.

## Misión 18 — checkpoint de preparación (03-11-2026)

- [x] Corregir propiedad GSC ajena antes del transporte/persistencia y head inicial de verificaciones; pruebas focales y documentación en [PHASE18_REPORT.md](docs/PHASE18_REPORT.md). Sin cambios de publicidad, indexación o credenciales.
- [ ] Cerrar estabilidad remota con SHA/UTC, HTTP+contenido, readiness autorizado, nuevos stage/codes y métricas. TRANSACTION_START_TIMEOUT observado no distingue pool/PgBouncer/compute; no subir límites a ciegas.
- [ ] Verificar propiedad URL-prefix real en Google mediante token oficial y head del deployment autorizado; OAuth webmasters.readonly limitado al mismo origen para informes manuales. No inferirlo por configuración ni enviar sitemap antes de aprobación.
- [ ] Revisar CMP certificada/TCF y Google EEE/Reino Unido/Suiza, privacidad Colombia/otros mercados, operador/contacto y políticas con revisión humana; conservar flags false hasta aprobación.
- [ ] Contrastar precio/cuotas oficiales del mismo servicio siempre activo, robots tras inactividad natural y límites Neon; sin pings artificiales o compras. Free no implica disponibilidad o rastreo continuo.
- [ ] Revisión humana de sitio/cuenta/emplazamientos AdSense y aceptación del hostname. Verificación meta ≠ aprobación ≠ anuncios activos; no cambiar ADSENSE_SITE_APPROVED/ENABLED por aprobar CI.

Evidencia03-11 aportada por propietario:4bcf3aa ya Live y contenido recuperado03:07:07 tras503 de arranque y errores de catálogo03:06:36–39. No repetir ese deploy; no cerrar estabilidad por esta recuperación. Faltan métricas contemporáneas Neon/pool/event-loop para determinar la causa. El candidato18 no está desplegado ni autoriza flags de lanzamiento/Google.

## MVP — cierre técnico y aceptación real

- [x] Cache granular de DTO públicos con revisión DB viva y sin stale fallback; retiro sin updatedAt, concurrencia, recuperación, búsqueda y read-only/regresiones locales. No cachear descarga/privados.
- [x] Original Lead Flow íntegro, n8n17 escenarios aislados y QA Atlas del paquete real local; no prueba de proveedores reales o storage remoto.
- [x] CTA piloto reutiliza contacto validado/revisado, guía exacta y release autorizada, sin precios/plazo/envíos automáticos.
- [ ] Propietario verifica/configura bucket privado/cuotas/scopes y carga/revisa/publica original por el motor existente, prueba SHA/HTTP/persistencia/retiro real. No publicar para esquivar bloqueo storage.
- [ ] Aprobar datos legales/contacto/autoría/licencia y alcance comercial, después publicación. No asumir domicilio, precio o48h aprobados.
- [ ] Autorizar nuevo SHA con CI y aceptar catálogo+Blueprint+CTA reales en Render, incluidos arranque/HTTP200conerror/readiness/logs. Mantener Free sin SLA, indexación/AdSense/pagos/IA/correo desactivados.


## Cierre MVP — estado actualizado03-11, sin deploy

- [x] Reproducción RED→GREEN del batch innecesario de facetas y códigos seguros del pool; lectura secuencial y menor solapamiento por listado. No certifica causalidad física de los fallos remotos.
- [x] Sonda storage READ preparada para destino/paquete original; privacidad fail-closed conservada, sinPUT/credenciales rotadas/variables actualizadas.
- [x] Hero/contacto/presupuesto reutilizados con gates y políticas borrador, sin precio/plazo/identidad inventada; material manual privado sin publicación.
- [ ] Aceptar producción tras autorizar nuevoSHA/CI y comprobar HTTP+contenido/readiness/logs repetidos. Live41b86ab falló15:20–15:21UTC; health200 no cierraP0.
- [ ] Verificar storage runtime y permisos/ACL/policy reales, aprobar carga/licencia/editorial y descarga persistente íntegra/revocable; bucket vacío reportado no es producto descargable.
- [ ] Aprobar identidad/contacto/políticas y disponibilidad comercial; probar recepción real y proveedores con cuentas autorizadas. No activar indexación/AdSense/pagos/IA por estas pruebas.

Reporte: docs/MVP_CLOSURE.md. Incidente de variables→deploy implícito registrado; mantenerAuto-DeployOff y no guardar cambios remotos sin conocer/autorizar el efecto.


Cierre local final: check96/lint/TS/PrismaValidate, PostgreSQL99, build, runtime13, SEO6, Blueprint34(26backend+8UI), catálogo válido65/30/6DRAFT/20categorías/24etiquetas y E2E126/126 PASS. E2E completa repetida tras la corrección P0, no reutilizada del build previo. Revisión independiente sin hallazgos bloqueantes; main remota conservaba41b86ab antes de preparar commits. SHA/CI del candidato se verifican después del push normal, sin despliegue. Producción continúa sin aceptar según evidencia externa.


## P0 directorios — 03-11-2026, base569b00e

RED real queryTools búsqueda con pool5 ocupado2600ms→P2028inicio~2063ms. Estrategias A/B dosSQL sin snapshot común; C unaSQL parametrizada con filas/taxonomía/conteo en snapshot único, elegida sin cambiar caché/pool/home/facetas. GREEN tools2607ms/use-cases2605ms. Concurrencia1/5/10/20→1/5/10/20SQL y pool≤5; cifras locales, no Neon/Render. Regresiones de filtros/paginación/inyección/interrupción/recuperación y controles existentes. No retries/timeouts nuevos/deploy/servicios/datos/migraciones/Blueprint. Ver docs/P0_DIRECTORY_READS.md; contacto solo informe separado docs/CONTACT_READINESS.md. Suites finales/CI propia se registran al cierre; producción sin certificar.


Validación local final: check96 (lint/TS/Prisma/unitarias), PostgreSQL99, build, runtime16, SEO6 y E2E126/126 PASS. Runtime verifica /tools y /use-cases?q=presentation con error visible y HTTP200/500/503 como fallo funcional; no catálogo vacío ficticio. Revisión independiente sin bloqueos; materialización reducida a columnas de tarjeta y riesgo de casts enum documentado. Sin cambios en schema/16migraciones/deps/Blueprint/envs/Neon/Render. CI propia se verifica tras push, no reutilizar CI base. Despliegue y validación productiva pendientes de autorización.


## MVP controlado tres gates —03-11-2026

Base31faa6a, sin cambioscatálogo/cache/pool/Prisma/16migraciones/Neon/Render/roles/secretos o flags. Etapa1 reutiliza ServiceInquiryCard/contacto con mensaje mínimo validado y CTA público/móvil condicionado a legal.reviewed; sinCRM/envíos/precios/plazos. RED helper faltante→GREEN; Minor revisión mailtoespacios+→RED→encodeURIComponentGREEN. Check97/build/SEO6/Blueprint34 focales PASS; E2E126PASS previa al ajuste de codificación, focales posteriores PASS y CI repetirá finalexacto. DB99/runtime16PASS. No recepción/correo/identidad legal real verificados: Gate1 código completo/configuración pendiente.

Etapa2 originalZIP0349bfb…ac5c55 intacto, checker y38Atlas(26+8+4paquete)PASS con SQL/archivos/HTTP locales; noS3real. n8n2.45.6 histórico17PASS sintéticos separado: nuevos intentos en copia encuentranSQLite duplicatecolumn conCLI/servidor concurrentes; CLI exclusivo permiteIMPORTED, servidor posterior sale139 sinOOMmarcado y no completaescenarios. Recursos propios retirados, causaexit139no determinada. No se modifica original/historia ni publica licenciaMITpropuesta o release. Gate2 nueva ejecución nativa/proveedores reales/storage remoto/publicación pendientes.

Etapa3 conservaSEO/GSC/robots/sitemap/canónicas/OG/JSON-LD y gates. SEO6/E2E126 cubren privados/drafts/noindex/filtros/404/mobile. TTFBloopbackmedido noCWV/Google/producción. FuenteREADMEoficialn8nHTTP200; dosdocpaths404 no usados, Renderdocs/preciosURLError no verificados. Análisiskeywords cualitativo sinSERP/volúmenes y cinco secciones originales privadas, no artículos publicados; calendario existente reutilizado. Noindexación/AdSense/analytics/IA/pagos/correo habilitados. Reporte docs/MVP_THREE_GATES.md y fuentes docs/MVP_SEO_SOURCES.json. No se declara MVP comercial listo.

Entorno: montaje bwrap fallaba porraíztemporalfaltante, directorio vacío /tmp recreado para recuperar terminal; sin políticas/secrets modificados. IPC/socketlocales/networkGit necesitan ejecución autorizada fuera del sandbox en esta revisión; nunca TLS desactivado. Fixtures/DB/n8n privados, sin escritura sobre producción. PublicaciónGit normal solo sin divergencia y CI propia delSHAfinal, sin deploy.
