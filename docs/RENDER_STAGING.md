# Render + Neon staging — preparación, sin despliegue

26-10-2026 (America/Bogota). Hosting elegido por el propietario: Render. No se creó servicio, cuenta, worker, cron o recurso de pago. Esta guía no afirma que Neon ya esté migrado: consultar el resultado real en docs/NEON_STAGING.md y BUILD_LOG.md.

## Versión y comandos previstos

Repositorio: samuelbenju/AI_WORKFLOW_ATLAS, rama main, release identificada por SHA aprobado. Un servicio web Node de la aplicación existente, sin duplicar app, esquema o DB. Node **24.19.0** según .nvmrc; npm 11.9.0 y lockfile existente. Verificar que Render soporte esa versión antes de publicar.

- Build Command: `npm ci --include=dev --ignore-scripts --no-audit --no-fund && npm run build`
- Start Command: `npm run start -- --port "$PORT"`
- Health Check Path: `/api/health`

El build usa dependencias dev para Prisma/TypeScript/WASM; --include=dev evita omitirlas por NODE_ENV=production. El script build genera el cliente Prisma y compila Next. Start ya escucha 0.0.0.0 y Render asigna PORT. No añadir db:deploy, seeds, admin:init o agents:tick al build/start. No poner credenciales en comandos.

## PostgreSQL runtime separado

Misma base Neon atlas_staging, proyecto cold-shadow-53495242, rama Neon production utilizada como staging. No conectar al rol atlas_staging_owner desde el servicio web.

Antes de desplegar, un operador autorizado debe crear en la consola/procedimiento seguro de Neon un rol de aplicación distinto (por ejemplo atlas_staging_app) con contraseña privada almacenada directamente en el gestor de secretos, nunca comunicada por chat. Este documento no crea roles o contraseñas.

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
