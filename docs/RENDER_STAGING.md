# Render + Neon staging — operación y preparación

28-10-2026. El propietario confirma Render Free operativo y contenido del catálogo importado visible; apply 40714352948 SUCCESS observado en GitHub. Neon conserva 16 migraciones/55 tablas. No repetir importación, bootstrap o migraciones. Esta sesión no accede al dominio ni a logs privados por la política de red; no se interpreta como caída. El SHA Live de la nueva mejora SEO debe contrastarse después de publicarse. Se conserva servicio/base/credenciales y no se crean workers, cron o recursos de pago. Los incidentes anteriores quedan como historial; aprobaciones en [PUBLIC_LAUNCH.md](PUBLIC_LAUNCH.md).

## Versión y comandos previstos

Repositorio: samuelbenju/AI_WORKFLOW_ATLAS, rama main, release identificada por SHA aprobado. Un servicio web Node de la aplicación existente, sin duplicar app, esquema o DB. Node **24.19.0** según .nvmrc; npm 11.9.0 y lockfile existente. Verificar que Render soporte esa versión antes de publicar.

- Build Command: `npm ci --include=dev --ignore-scripts --no-audit --no-fund && npm run build`
- Start Command: `npm run start -- --port "$PORT"`
- Health Check Path: `/api/health`

El build usa dependencias dev para Prisma/TypeScript/WASM; --include=dev evita omitirlas por NODE_ENV=production. El script build genera el cliente Prisma y compila Next. Start ya escucha 0.0.0.0 y Render asigna PORT. No añadir db:deploy, seeds, admin:init o agents:tick al build/start. No poner credenciales en comandos.

## PostgreSQL runtime separado

Misma base Neon atlas_staging, proyecto cold-shadow-53495242, rama Neon production utilizada como staging. No conectar al rol atlas_staging_owner desde el servicio web.

El rol runtime `atlas_staging_app` ya está configurado según el propietario: conservarlo y verificarlo mediante una lectura autorizada. No volver a crearlo, rotar su contraseña ni modificar sus permisos como requisito de una nueva release. La separación descrita aquí es el contrato de conexión existente, no una orden de inicialización. Este documento no crea roles o contraseñas.

Privilegios: LOGIN/CONNECT a atlas_staging, USAGE del esquema public y de tipos necesarios, SELECT/INSERT/UPDATE/DELETE solo sobre las tablas de negocio y uniones que usa Prisma; USAGE/SELECT de secuencias si existen. Sin superusuario, CREATEDB, CREATEROLE, REPLICATION, propiedad del esquema/tablas o membresía en el migrador/neon_superuser. Sin CREATE sobre public ni permisos concedidos indirectamente por PUBLIC que lo permitan. Revisar concesiones existentes antes de retirar privilegios globales que afecten a otros usuarios.

No conceder escrituras sobre _prisma_migrations al runtime. Si se administran default privileges del migrador para tablas futuras, revisar explícitamente excepciones/historial después de cada migración; no convertir un GRANT ALL global en política de mínimo privilegio. Validar con has_database_privilege, has_schema_privilege, has_table_privilege y pg_has_role desde una sesión de operador. Credenciales de migración pertenecen solo a GitHub Actions/procesos operativos.

DATABASE_URL en Render: URL de runtime con usuario/contraseña propios, TLS verify-full, endpoint Neon correcto (pooler autorizado solo para runtime, conexión directa para migración). Verificar certificado/CA e identidad de host; nunca sslmode=disable, rejectUnauthorized=false o NODE_TLS_REJECT_UNAUTHORIZED=0. El adaptador sigue siendo @prisma/adapter-pg con pg/Prisma 7.10.1.

Pool actual: máximo cinco conexiones por proceso. Presupuestar cinco por cada instancia, builds/procesos auxiliares y conexiones operativas según límites reales del plan Neon. No suponer capacidad ilimitada; revisar compatibilidad de transacciones/advisory locks y pooling antes de habilitar agentes. No instalar un ORM o cliente distinto para sortear límites.

## Variables privadas y flags seguros

En el gestor de Render, no en Git o capturas:

- NODE_ENV=production; NODE_VERSION=24.19.0; NEXT_TELEMETRY_DISABLED=1.
- DATABASE_URL de runtime mínimo, nunca MIGRATION_DATABASE_URL en el servicio web.
- SITE_URL: origen HTTPS real de staging, sin path/query; ADMIN_ORIGIN y demás orígenes, si se definen, iguales a ese origen.
- CATALOG_DEMO_MODE=false; SEO_INDEXING_ENABLED=false; LEGAL_REVIEW_CONFIRMED=false.
- AGENTS_ENABLED=false; AGENTS_MONTHLY_BUDGET_USD_MICROS=0; todas las automatizaciones/perfiles deshabilitados. Sin clave OpenAI.
- NEWSLETTER_MODE=disabled; WOMPI_SANDBOX_ENABLED=false; ANALYTICS_ENABLED=false; GA4_MODE=disabled. No claves de email, Wompi, Google o afiliados por este despliegue.
- OPS_EXPECT_WORKER=false. OPS_MONITOR_TOKEN privado fuerte solo si se configura monitor autorizado; no en query o frontend.
- SPONSOR_FORM_SECRET / NEWSLETTER_SECRET privados si se habilitan formularios locales: conservar/rotar con procedimiento, no copiar claves a logs o regenerar datos cifrados existentes a ciegas.

No usar NEXT_PUBLIC_ para secretos. La ubicación onrender.com asignada no se inventa antes de crear el servicio. Tras autorización de despliegue, comprobar HTTPS/canonical/origins/cookies Secure y headers en ese dominio. robots/noindex de staging no es control de acceso: limitar acceso de preestreno según opciones del host y autorización del propietario.

## Comprobación y administración futuras

/api/health solo prueba proceso HTTP; /api/internal/readiness con bearer privado prueba DB/alertas. Verificar ambas sin publicar datos, frontend de directorios con estados vacíos reales y rutas privadas rechazando anónimos. Un build exitoso no prueba conexión a Neon.

No crear administrador humano ahora. Cuando el propietario lo autorice: ejecutar npm run admin:init desde un entorno operativo privado con acceso a la DB runtime y terminal interactiva sin eco, identidad privada configurada y contraseña elegida por el propietario. No pedir contraseñas en chat, usar fixtures, colocar credenciales en build o abrir un endpoint bootstrap. Si el plan de Render no ofrece shell/one-off jobs, usar una estación/entorno privado autorizado; no simular ese acceso. Recuperación con admin:password revoca sesiones existentes.

Worker autónomo desactivado. La web Free no garantiza un proceso persistente de agentes y puede suspenderse/reiniciarse; no añadir bucles o ticks al servidor Next. Se necesita un supervisor/servicio persistente adecuado, límites y autorización de costes antes de habilitarlo. No se compra o despliega ese servicio en esta tarea.

## Render Free: límites que deben revisarse antes de publicar

Referencia oficial para comprobar condiciones vigentes: https://render.com/docs/free (no se verificó aquí un contrato/plan real).

Considerar suspensión por inactividad y arranques en frío, reinicios/horas o consumo mensuales limitados, recursos/tiempos de build reducidos, filesystem efímero y disponibilidad/restricciones de shell, jobs, disco, escalado y comunicaciones salientes. No prometer SLA, latencia o continuidad comercial. No guardar datos, uploads, dumps o sesiones en el filesystem del servicio; DB y backups requieren almacenamiento externo adecuado. Un free web service no equivale a un free background worker persistente. Verificar límites y precio actuales antes de cualquier alta; no se autoriza plan de pago al excederlos.

La preparación de Render no resuelve bloqueos legales/fiscales, proveedor de pagos productivo, backup/restore, credenciales o pruebas externas pendientes de LAUNCH_CHECKLIST.md. No activar indexación, correos, pagos o IA por el solo hecho de arrancar staging.

## Incidente posterior: catálogo indisponible en Render Live

El propietario confirma 16 migraciones/55 tablas en Neon y rol atlas_staging_app en Render. Es un estado reportado externamente, no una validación remota realizada por esta ejecución. Diagnóstico, códigos seguros y verificación del SHA publicado: [RENDER_CATALOG_DIAGNOSTICS.md](RENDER_CATALOG_DIAGNOSTICS.md). Las lecturas vacías se comprobaron con un rol de solo lectura aislado; no asumir que la indisponibilidad significa falta de contenido o que ya está resuelta al compilar.

## Preflight de continuidad — 30-10-2026, America/Bogota

- GitHub observado: `main` en `421842d62ac0433c4ee54125c9f6ce6cb143b5c0`, [CI 41011779292 SUCCESS](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/41011779292). Las etapas 14–17 están publicadas; las notas de push pendiente de sus reportes son históricas.
- Evidencia aportada por el propietario desde su cliente conectado: workspace `tea-dbfo0kks728c738fd6g0`, servicio `srv-dbfprkbrjlhs73easoag`, deployment `dep-dbhosdtckfvc73fp5ulg`, SHA Live `b3f39f528b7a9b9796d363d1d3dbc276152c1355`, Auto-Deploy Off y comandos coincidentes. Esta sesión no los consultó independientemente ni los interpreta como estado perpetuo.
- Codex Cloud expone Superpowers, no las herramientas Render/GitHub/OpenAI Developers/Firecrawl/Neon del otro cliente. No es un fallo demostrado de autenticación o del proveedor. La política efectiva sigue sin hosts Render ni bindings utilizables; no se repiten sondas del mismo proxy o cambios de revisión 15.
- P2028 del 29-10 es histórico; sin logs actuales no se afirma recurrencia o causa. No hay diferencias de Prisma, dependencias, cliente DB o consultas del catálogo entre el Live reportado y el candidato. Se mantienen pool/transacciones/timeouts, sin reintentos nuevos.
- Regresión actual: cuatro pruebas de catálogo/readiness/HTTP en PostgreSQL loopback desechable PASS, con rol SELECT/read-only y sin acceso al historial. Ausencia de configuración y denegación de unión fallan visiblemente y sin filtrar credenciales. No reproduce P2028; tampoco prueba latencia, conexiones o arranque frío de Neon/Render.
- Preparación estática compatible: Node 24.19.0, build genera cliente y compila; start escucha el PORT asignado, sin migraciones/seed/worker. Las puertas SEO/legal/ads/IA/correo/pagos se conservan en código; sus valores privados en Render no fueron leídos. Storage remoto, ACL/policy, scopes, cuotas e If-None-Match continúan sin prueba real. No usar disco efímero como sustituto ni cargar el paquete para aprobar este preflight.

**Operación pendiente desde el cliente que ya tiene Render MCP:** consultar dos veces el servicio por su ID; confirmar workspace/repo/main, Auto-Deploy y Build/Start/Health; obtener deployments Live/anterior y sus SHA completos; consultar logs recientes de arranque y catálogo, incluidos stage/codes y fechas, diferenciando el incidente del 29-10; comprobar `/` y `/api/health` mediante HTTPS. Compartir solo el resumen sanitizado, sin variables, tokens o respuestas privadas completas. No repetir instalación/OAuth si esa conexión ya funciona.

El candidato debe estar aprobado por su SHA y tener CI propia. Punto de recuperación provisional: deployment/SHA reportados arriba, pendiente de reconfirmación y compatibilidad. Tras autorización específica: validar SHA Live, HTTP/catálogo/guías/búsqueda/privados/SEO y ausencia de anuncios o archivos no aprobados; un fallo crítico requiere diagnóstico y autorización independiente antes del rollback. **Preflight remoto BLOQUEADO POR ACCESO; deploy NO EJECUTADO.** Un commit de pruebas/documentación posterior no queda autorizado para deploy por esta nota.

### Prioridades posteriores; no son etapas nuevas iniciadas

| Orden | Trabajo reutilizando módulos existentes | Criterio de aceptación y dependencia |
| --- | --- | --- |
| P0 | Cerrar preflight y determinar recurrencia de P2028 | Dos lecturas MCP, SHA/configuración/CI, logs fechados tras peticiones reales y ruta de recuperación. Requisito antes de decidir deploy, no motivo para cambiar pool a ciegas. |
| P0 | Custodia y recuperación de datos | Propietario verifica backup/PITR, retención y ensayo de restauración en destino aislado autorizado con RPO/RTO. No restaurar sobre Neon actual. |
| P1 | Persistencia del primer Blueprint | Bucket privado/scopes/ACL/policy/If-None-Match/cuotas comprobados, carga y descarga exactas y supervivencia a reinicio/redeploy autorizados. Bloquea publicar ese Blueprint, no navegar el catálogo. |
| P1 | Revisión editorial/legal y Google | Aprobar identidad/políticas/contacto y contenido, después lanzamiento/indexación y propiedad GSC. Cuenta/CMP/sitio AdSense requieren evidencias independientes. No activar flags como parte de QA. |
| P2 | Mejorar cobertura editorial y descubrimiento | Reutilizar ocho semanas de calendario; revisar primero guías prácticas y relaciones útiles pendientes, con fuentes y aprobación humana. Oportunidad, no requisito para llenar categorías o crear páginas masivas. |
| P3 | Medir y monetizar con evidencia | Consentimiento y fuente/cohorte definidos, informes reales, contratos de afiliación/patrocinio y experimentos sin ganadores inventados. IA/worker/newsletter/pagos siguen con autorizaciones separadas; no bloquean esta release técnica. |
