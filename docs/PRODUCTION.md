# Operación y preparación de producción

Estado 26-10-2026: preparado para revisión, sin despliegue o cuentas compradas. Ver [lista de lanzamiento](../LAUNCH_CHECKLIST.md) y [auditoría](../AUDIT_REPORT.md). No es una certificación de producción.

## Hosting de staging elegido posteriormente

El propietario confirma Render Free desplegado y portada funcional, con Neon staging migrado y rol runtime mínimo. Guía vigente: [RENDER_STAGING.md](RENDER_STAGING.md). Fase 13 conserva esos proveedores sin nueva infraestructura: [CATALOG_OPERATIONS.md](CATALOG_OPERATIONS.md). Su catálogo aún requiere importación comprobada por Actions y verificación pública; este entorno no accede a esos servicios. La configuración Vercel anterior es histórica y no propone sustituir Render.

## Topología y configuración

Web Next.js en Node 24 (Vercel compatible sujeto a comprobación en destino), PostgreSQL 17 externo con TLS verify-full y worker Node/Docker separado. No ejecutar bucles de agentes dentro de funciones serverless. `vercel.json` solo declara framework/instalación/build, sin migración, seed, cron o despliegue. El checkout usa el repositorio oficial AI_WORKFLOW_ATLAS; CI solo prueba bases efímeras y no tiene permisos de publicación.

Copiar **nombres**, nunca valores reales, desde `.env.example` al gestor privado del host. Evitar `NEXT_PUBLIC_` para secretos. SITE_URL y orígenes deben corresponder al HTTPS definitivo; probar redirecciones/canonical/cookies y reconstruir al cambiar metadata/headers compilados. Privados y archivos `.env` reales no deben subirse ni adjuntarse a logs. Google puede permanecer deshabilitado; no se necesita para las métricas propias consentidas. No habilitar un módulo solamente porque existe su variable.

Runtime: DATABASE_URL con rol mínimo (CONNECT/USAGE y DML necesarios; sin superusuario, creación de roles o bases, idealmente sin DDL). Migraciones: MIGRATION_DATABASE_URL de operador, directa/TLS, disponible solo durante db:deploy/status. Esta separación no crea usuarios ni concede permisos; un administrador de DB debe definirlos/revisarlos. No reutilizar la cuenta local de desarrollo con CREATEDB. Ajustar pool agregado: hasta cinco conexiones por instancia; medir la concurrencia serverless y el límite del proveedor, sin inventar una capacidad aprobada.

## Preparar y revisar una versión

1. Backup externo cifrado consistente y restauración de ensayo; comprobar SHA de release, migraciones/versiones, aprobación y origen remoto antes de publicar código.
2. `npm ci --ignore-scripts`, `npm run check`, `npm run test:db`, `npm run build`, `npm run test:e2e -- --workers=1` en CI/staging con TEST_DATABASE_URL **dedicada**, rol CREATEDB solo de tests. Chromium: README. No ejecutar runners/seed contra producción. Motores oficiales Prisma WASM fijados; no desactivar TLS o checksums por el CLI nativo bloqueado.
3. Proveer conexión migradora solo al proceso de operador: `npm run db:status`, `npm run db:deploy`, `npm run db:status`. Comandos idempotentes, SQL versionado; no editar migraciones aplicadas, usar reset o db push. No hay migraciones nuevas en Fase 12: 16 vigentes.
4. Configurar runtime privado; `npm run admin:init` interactivo con email del propietario por configuración privada y contraseña sin eco. `npm run admin:password` rota el hash y revoca sesiones. No usar cuentas o contraseñas de fixtures.
5. `npm run launch:check`: lectura de configuración sin valores secretos, historial/checksums, rol/TLS observados, contenido y administrador. Siempre termina con salida 2 `BLOCKED_PENDING_RELEASE_REVIEW`: también exige evidencia manual y aprobación del operador; no es un comando de despliegue.
6. Tras autorización de despliegue, hacer smoke del dominio real, login/no autorizado, formularios, consultas, sitemap/robots, headers/caché y readiness. Registrar evidencia y volver a revisar la lista antes de aceptar clientes. Esta auditoría no hizo ese despliegue.

## Salud, alertas y privacidad

`GET /api/health` es liveness público sin DB. `GET /api/internal/readiness` exige `Authorization: Bearer <OPS_MONITOR_TOKEN>` aleatorio privado de al menos 32 caracteres; no ponerlo en query string, navegador público o sistemas que registren headers. Sin token devuelve 401; autorizado devuelve 200 o 503 y solo estado de DB, worker esperado, leases vencidas, emails UNKNOWN antiguos y órdenes PRODUCTION retenidas, sin contactos/payloads. Timeout de respuesta 4 s; consulta de DB conserva sus límites. Cache no-store/noindex. OPS_EXPECT_WORKER=true requiere heartbeat actual (<60 s) del OPS_WORKER_ID correcto. Solo monitoriza configuración declarada; no certifica proveedores externos, integridad total o carga.

Configurar por separado monitor externo, canal autorizado, guardia y pruebas de alerta. La aplicación no envía emails/Slack ni contrata monitoreo. El supervisor local hace tick cada 15 s; bloquear por falta de clave es estado esperado, no una llamada real. Revisar PII del host y redacción/retención de logs: no habilitar query logs Prisma ni registrar bodies, tokens, contraseñas, emails o webhooks completos.

`npm run ops:maintenance` es dry-run: cuenta sesiones analíticas de más de 90 días. Revisar resultado y política de retención antes de `npm run ops:maintenance -- --apply`: borra hasta 1000 sesiones por invocación con eventos en cascada, sesiones administrativas expiradas y rate buckets antiguos; registra auditoría. No elimina órdenes, pagos, leads, artículos, suscriptores o consentimientos. Ejecutar como operador, sin endpoint público ni cron añadido. La retención de otros datos requiere procedimiento y revisión jurídica; retirada analítica no elimina obligaciones contables/contractuales. No confundir esta tarea con las cinco automatizaciones de IA.

## Backups, migraciones y recuperación

Helpers `db:backup`/`db:restore-check` son **solo locales**, restringidos a la DB loopback documentada. Dump privado 0600 en `.cache/backups`, fuera de Git; restore en DB temporal creada para ese ensayo y comparación de conteos de todas las tablas. No certifica PITR, cifrado o custodia externa de producción.

Antes de producción, definir RPO/RTO con propietario, backups cifrados externos/PITR, acceso mínimo y retención, copias de NEWSLETTER_SECRET y demás claves locales por canal separado, restauración periódica en destino aislado y borrado seguro de copias expiradas. Un dump sin clave de newsletter no recupera los mensajes/tokens cifrados. Probar integridad/referencias y aplicación sobre restauración, no solo existencia del fichero. No emitir correos o ticks con gasto desde una restauración: flags apagados inicialmente.

Rollback: conservar versión anterior y backup, retirar tráfico y desactivar módulos afectados. Volver al artefacto anterior solo si es compatible con esquema actual; no hay migraciones down automáticas, ni revertir SQL o restaurar sobre producción a ciegas. Preferir migración correctiva hacia delante revisada. Ante corrupción o exposición, congelar escrituras según incidente, restaurar a instancia aislada, conciliar transacciones/emails/ejecuciones antes de promover con autorización. Nunca force push o eliminar historia para resolver un incidente.

## Integraciones y agentes

Resend deshabilitado sin configuración verificada. Doble opt-in y baja obligatorios, envíos manuales autorizados, dos destinatarios por acción y timeout 10 s por proveedor dentro de maxDuration 60 s. UNKNOWN/FAILED requieren conciliación, nunca reintento masivo; cambiar clave de newsletter exige plan de recifrado/conciliación. Ver NEWSLETTER.md.

Wompi es **solo SANDBOX/COP**, sin FX o producción. Revisión oficial y primera transacción de prueba externa pendientes; callbacks del navegador no confirman pagos. Firma + consulta al proveedor + importe/referencia/idempotencia obligatorios. ON_HOLD impide entrega aunque exista un pago previo. Sandbox conserva SANDBOX_ONLY y no activa publicidad. Producción/reembolsos/disputas necesitan trabajo técnico y aprobación adicionales, no reemplazar environment en DB. Ver PAYMENTS.md.

Cinco agentes y calendarios inicialmente deshabilitados. Antes de una prueba de IA autorizada: confirmar clave autorizada, modelo/tarifas actuales, techo del proveedor, presupuesto global/agente/tarea y permisos mínimos. Refrescar snapshot con código revisado; configurar supervisor en infraestructura propia y comprobar heartbeat/recuperación. Helper `npm run agents:service -- restart` solo actualiza el contenedor local propio, primero comprobar tareas RUNNING=0; no es un despliegue remoto. `test:agent-service` crea únicamente DB/contenedor aislados y no llama IA.

Después crear tarea pequeña, revisar contexto/snapshot y aprobar presupuesto humano; habilitar solo perfil necesario y AGENTS_ENABLED con presupuesto explícito, ejecutar tick controlado y revisar costes/producto. No activar cinco agentes o calendarios en bloque. Scheduler solo crea propuestas con presupuesto cero y aprobación pendiente. Cada asignación CEO necesita nueva aprobación. Publicación, contactos, finanzas, permisos y shell siguen prohibidos. Revocar al aprobador durante I/O cancela el resultado y conserva uso; uso fuera de límites consume reserva acotada y falla, requiere conciliación con proveedor. No se afirma que la estimación local sea una factura o límite infalible de gasto externo.

Incidente: deshabilitar scheduler/perfil/global, cancelar tareas, detener worker si corresponde, conservar auditoría/reservas y conciliar resultados inciertos antes de liberar presupuesto. No reintentar ciegamente llamadas cuyo resultado se desconoce. Rotar secretos comprometidos por el gestor privado y revisar sesiones; nunca exponerlos en el informe del incidente. Ver AGENT_ENGINE.md/BUSINESS_AGENTS.md/GROWTH.md.

## Plan comercial inicial sujeto a aprobación

Curar un catálogo pequeño y útil y revisar artículos con fuentes verificables; recoger newsletter por doble opt-in y métricas consentidas antes de prometer alcance. Revisar cuatro paquetes y precios con impuestos/moneda/condiciones reales. Piloto con solicitudes entrantes gestionadas por una persona, propuestas privadas y campañas aprobadas; no contacto masivo o anuncios inventados. Posponer ventas con entrega pagada hasta disponer de proveedor producción auditado. Afiliación solo con contrato y prueba de conversiones de proveedor. Revisar semanalmente datos registrados y proponer experimentos sin declarar causalidad; CEO recomienda, propietario aprueba. Ningún ingreso, audiencia o presupuesto están garantizados por el software.
