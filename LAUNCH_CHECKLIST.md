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
