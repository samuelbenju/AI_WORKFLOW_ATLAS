# Neon PostgreSQL de staging — comprobación manual y antecedentes

## Estado operativo confirmado — no repetir migraciones

Actualización 28-10-2026: [apply 40714352948](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40714352948) SUCCESS observado en GitHub; propietario confirma rol del importador verificado, 101 registros creados y catálogo visible en Render. No repetir bootstrap, contraseñas o importación. Las comprobaciones de configuración y los incidentes anteriores son históricos; no implican que vuelvan a faltar los secretos. La mejora SEO no abrió otra sesión SQL Neon ni modificó datos o permisos. Estado de lanzamiento/Google en [PUBLIC_LAUNCH.md](PUBLIC_LAUNCH.md).

Comprobación 26-10-2026, America/Bogota (27-10 UTC). Las páginas públicas de GitHub muestran **SUCCESS** en las ejecuciones reales de [conexión 40372875357](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40372875357) y [migración 40373255135](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40373255135), ambas sobre 843710e53e16c440ff52e6386bb44ba1066529b0. El propietario aporta el resultado SQL **16/16 migraciones, 55 tablas, 72 FK, dbStatus PASS, COMPLETE**. Es evidencia remota satisfactoria: no se vuelve a presentar su aplicación como pendiente y no se repite db:deploy, db push, reset o seed. No se inició otra sesión SQL en Neon desde este executor.

También se observó [CI 40402836767](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40402836767) **SUCCESS** para b5319e2ba2d7c8beb94adb4700468dabd2753e69. La API autenticada sigue devolviendo Forbidden, pero la lectura normal de páginas públicas de GitHub sí está permitida. No confundir la limitación de dispatch/secretos con falta de evidencia sobre ejecuciones anteriores. No hay binding de conexión Neon listo en este entorno; existencia de rol/secreto de catálogo y conteos de contenido actuales siguen sin inspección SQL. Activación del catálogo: [CATALOG_OPERATIONS.md](CATALOG_OPERATIONS.md). No se necesita volver a proporcionar el secreto de migración.

## Antecedentes históricos — inicialización ya terminada

Los apartados siguientes describen el estado anterior a esas ejecuciones. Sus instrucciones de base vacía, migración inicial, CLI, Railway o autorizaciones antiguas **no son pasos pendientes ni deben ejecutarse para la Fase 13**. Se conservan únicamente como historial técnico. El procedimiento vigente utiliza Render existente y el workflow separado de catálogo, sin migraciones.

### Histórico: dos workflows manuales y ejecución condicionada

- `neon-staging-check.yml`: solo workflow_dispatch/main, contents:read, Node 24, lockfile, sesión TLS/read-only. Invoca `node --import tsx scripts/neon-staging.ts inspect` y exige destino/rol/proyecto verificados. No escribe, no usa Neon CLI y no llama db:status sobre base vacía.
- `neon-staging-migrate.yml`: solo workflow_dispatch/main, contents:read y actions:read. Concurrency compartida con el workflow de conexión, sin cancelación de una migración en curso. Requiere connection_run_id exitoso del workflow correcto, repo/main, evento manual y **mismo SHA**; confirm_target debe coincidir con cold-shadow-53495242/atlas_staging. Antes de entregar el secreto ejecuta npm ci, check (incluye lint/TypeScript/unitarias) y build/generación Prisma.
- El paso con secreto vuelve a comprobar TLS, rol atlas_staging_owner, base, región de endpoint y estado vacío inmediatamente antes de `npm run db:deploy`. Se usa el migrador WASM original, sin SQL ad hoc. Si ya existen exactamente las 16 migraciones válidas, el catálogo de referencia y cero filas de negocio, omite deploy y verifica status. Estado parcial, datos existentes, checksum cambiado u objetos inesperados detienen el proceso sin reset/limpieza.
- `scripts/neon-staging-manifest.json` conserva hashes de los 16 SQL, migration_lock, esquema y ejecutor WASM del commit 70984e42d862d8c47e34531648f8c531698cb42e. Referencia generada en una DB efímera local con los SQL originales: **55 tablas totales (incluido _prisma_migrations), 486 columnas, 72 FK, 230 restricciones, 182 índices y 75 valores enum**. No son conteos observados en Neon. La comparación posterior cubre nombres/definiciones/tipos/defaults/nullability e historial, y rechaza filas de negocio.

### Vinculación independiente con el proyecto

El nombre de DB y el usuario no identifican por sí solos un proyecto Neon. El script usa `current_setting('neon.project_id', true)` si está disponible y exige cold-shadow-53495242. Si el servidor no expone ese identificador, **se detiene** salvo que el propietario haya configurado la variable no secreta de repositorio `NEON_STAGING_EXPECTED_HOST` con el hostname directo exacto obtenido en la consola de ese proyecto (sin usuario/password/URL). NEON_STAGING_PROJECT_ID se fija en el workflow al ID autorizado. El host esperado no se deriva del mismo secreto para autoaprobarse y no se imprime. No se solicita volver a compartir el secreto de migración.

### Histórico: secuencia de la primera migración, ya completada

1. Publicar el commit preparado, sin force push. Confirmar que main remota coincide con el SHA a ejecutar.
2. Ejecutar primero Neon staging read-only check en main. El resultado debe demostrar EMPTY/0 tablas, TLS e identidad/proyecto válidos. Registrar URL e ID reales. Si falla una condición crítica, detenerse.
3. Ejecutar Neon staging guarded migrations en el mismo main, con connection_run_id del paso anterior y confirm_target exacto. Si main cambió, repetir primero la conexión en el nuevo SHA. No puede usar un check de otro commit, repo o workflow.
4. El script normaliza la URL en memoria a TLS verify-full para el runner existente. No persiste URLs/credenciales, no cambia .env.local o el ORM y no crea roles/datos comerciales. Los errores de proveedor no se imprimen; si falla deploy se muestran solo nombres de migraciones conocidas no terminadas que pueda consultar la sesión de inspección.
5. Esperar éxito real de db:status y comparación de catálogo; registrar 16 migraciones verificadas y conteo real. No ejecutar seeds o suites que crean/eliminan DB sobre atlas_staging.

El respaldo/branch Neon previo no se creó: sin acceso API autorizado y sin certeza de coste/cuota no se habilitan recursos. El estado vacío y los hashes se verifican como línea base, pero **no equivalen a un backup/PITR**. Una futura rama/punto de recuperación requiere comprobar disponibilidad sin costes y permisos; no se simula su existencia. Ante error parcial se conservan objetos e historial, no se borra para reintentar.

### Preparación de Render y límites de la entrega

Hosting elegido: Render, no Railway. Consultar [RENDER_STAGING.md](RENDER_STAGING.md) para build/start/Node/TLS, rol runtime distinto del migrador, pool, HTTPS, health, admin interactivo y límites de Free a revisar. Worker deshabilitado, sin despliegue/cron/cobros/IA/email. **Neon no se declara listo para Render mientras falten ejecución real, 16 migraciones/status y vínculo de proyecto comprobado**, además del rol runtime mínimo y decisiones de lanzamiento.


## Histórico: preparación inicial de GitHub Actions, solo lectura

Actualización 26-10-2026 (America/Bogota). El propietario confirma proyecto ai-workflow-atlas-staging, base atlas_staging, PostgreSQL 17.11, AWS US East 1 y esquema público inicialmente vacío. También confirma que el secreto **MIGRATION_DATABASE_URL** ya está configurado en GitHub Actions con conexión directa. Estos son datos aportados por el propietario: la conectividad desde Actions aún no se ha ejecutado/verificado.

Se prepara `.github/workflows/neon-staging-check.yml`. Solo tiene `workflow_dispatch`; no push, pull_request, pull_request_target, schedule o workflow_call. El job exige el repositorio oficial y main, usa Node 24/dependencias del lockfile, permisos contents:read y checkout sin credenciales persistentes. El secreto solo se entrega al paso de verificación, después de npm ci --ignore-scripts --no-audit --no-fund. No usa Neon CLI ni importa la aplicación/dotenv/Prisma.

La URL debe corresponder a un host Neon terminado en .neon.tech, sin -pooler, puerto 5432 y base atlas_staging. El cliente pg se construye con campos explícitos para que los parámetros de la URL no puedan anular host/TLS/solo lectura. TLS valida certificado e identidad del servidor, mínimo TLS 1.2; se comprueba el socket cifrado/autorizado. La sesión arranca con default_transaction_read_only=on y timeouts. La única consulta SQL es SELECT: base actual, versión, estado read-only y conteo de tablas públicas (regulares/particionadas). No lee historial Prisma ni contenido de tablas. Rechaza otro nombre de base, otra versión mayor distinta de 17 o una sesión sin read-only. Un conteo distinto de cero se informa, no modifica la base.

Salida permitida: atlas_staging, versión numérica PostgreSQL, conexión directa, certificado verificado, protocolo TLS, readOnly y número de tablas. No muestra host, usuario, URL, password, tokens o mensajes originales de error del proveedor. Errores solo indican una etapa fija; GitHub conserva sus propias protecciones de secrets. No publica artifacts con datos de conexión.

### Histórico: ejecución sobre la base inicialmente vacía

1. Publicar el commit aprobado en main; antes de ello el workflow nuevo no estará disponible en la interfaz de Actions de la rama principal.
2. En el repositorio oficial: **Actions → Neon staging read-only check → Run workflow → Branch: main → Run workflow**. No elegir otra rama: el job la rechazará omitiendo su ejecución.
3. Abrir la ejecución y el job connection; consultar Summary y el paso de verificación. Para la base inicialmente vacía se espera publicTables=0, pero solo el resultado real permite afirmarlo. La versión debe reflejar la observada en el servidor (17.11 según el propietario, puede cambiar por mantenimiento).
4. Si falla en configuration, revisar en privado que el secreto exista a nivel repositorio y contenga la URL directa de atlas_staging. Si falla en connection, revisar acceso de red, certificado, endpoint, contraseña y restricciones Neon por medios privados. Si falla en read-only verification, comprobar base/versión/estado sin ejecutar migraciones. Nunca pegar secretos o logs con URLs en el chat.
5. Registrar el resultado real antes de proponer migraciones. **No ejecutar db:deploy, db:status, seeds o escrituras todavía**; no existe historial Prisma inicial. Las 16 migraciones siguen intactas y requieren una autorización posterior separada para su aplicación.

Validación local: actionlint 1.7.12 sin hallazgos, YAML parseado, JavaScript del heredoc pasa node --check y ocho fixtures de pg simuladas pasan sin red. Cubren secreto ausente, pooling, destino/base erróneos, certificado no autorizado, base reportada distinta y sesión no read-only. No son evidencia de conexión real a Neon. No se repiten suites de la aplicación porque no cambia código funcional.

Los apartados que siguen conservan el diagnóstico histórico del intento con CLI y la preparación futura de Railway. **El procedimiento vigente no depende de completar ese login y no ejecuta Neon CLI.** No se despliega Railway ni se activan agentes, pagos o correo.


26-10-2026, America/Bogota. Base Git comprobada: `70984e42d862d8c47e34531648f8c531698cb42e`, checkout existente limpio antes de este intento. No es producción comercial y no se desplegó Railway.

## Histórico: destino solicitado antes de la primera verificación

- Organización: `org-purple-boat-02914113`.
- Proyecto existente: `cold-shadow-53495242`.
- Rama indicada por el proveedor: `production`. Su nombre no demuestra que sea staging, ni que esté vacía: ambos extremos necesitan metadata autenticada y consultas de solo lectura.
- Único servicio autorizado: PostgreSQL. Sin Neon Auth, Data API, Functions, AI Gateway, Object Storage, Realtime, nuevas aplicaciones o bases duplicadas.

## Resultado de este intento

Lectura de controles, estado Git y respaldo privado de `.env.local` completados. El archivo original conserva bytes y modo 0600. No se modificó DATABASE_URL, package.json, lockfile, esquema, adaptador o código funcional.

`npm i -g neon@latest` con caché temporal falló ENOENT al intentar crear `/home/agent/.local/lib`. No se usó sudo ni se cambiaron permisos o el prefijo global. El fallback `npx --yes --cache /tmp/atlas-neon-npm-cache neon@latest --version` funcionó: **8.11.4**.

Se consultó la ayuda oficial de init/login. `init -y` instala por defecto herramientas de agentes; se añadió `--no-agent-setup` para preservar las herramientas/configuración existentes y limitar el alcance. Se intentó:

```bash
npx --yes --cache /tmp/atlas-neon-npm-cache neon@latest init -y \
  --org-id org-purple-boat-02914113 \
  --project-id cold-shadow-53495242 \
  --branch production --services postgres --no-agent-setup
```

Resultado: **ENOENT: no such file or directory, mkdir '/home/agent/.config/neon'**. Se detuvo la integración como pidió el propietario ante problemas de permisos. El CLI no llegó a generar neon.ts ni a comprobar autenticación/destino. No hubo plan, deploy, creación de recursos, conexión PostgreSQL, DDL, seed o pruebas de escritura. Las 16 migraciones siguen sin aplicarse a Neon en este intento.

La política inspeccionada no lista dominios Neon y no hay binding NEON_API_KEY listo. Esto no demuestra por sí solo una denegación efectiva: acceso API/HTTPS y acceso PostgreSQL TCP siguen pendientes de comprobación. No eludir proxy, cambiar rutas o desactivar TLS.

## Intervención del propietario para desbloquear

La CLI 8.11.4 admite oficialmente `--config-dir`. Desde una terminal de **este mismo entorno**, usar un directorio privado escribible en el workspace y completar el login del navegador:

```bash
cd /workspace/Quesito
umask 077
npx --yes --cache /tmp/atlas-neon-npm-cache neon@8.11.4 login \
  --config-dir /workspace/.cache/neon-cli
```

Este comando de recuperación **no se ejecutó** en el intento detenido. La ubicación es privada/fuera del repositorio y no sustituye configuraciones o credenciales previas. Si el acceso API/navegador es bloqueado, el propietario debe ajustar el entorno mediante la configuración de red admitida. No compartir contraseñas, API keys, archivos de credenciales o cadenas de conexión en el chat. Login en otro equipo no autentica automáticamente este entorno.

Tras completar acceso, continuar con init usando **el mismo --config-dir**, los IDs anteriores, `--services postgres` y `--no-agent-setup`. Revisar todo neon.ts y cambios locales; ejecutar `neon config plan` con ese directorio antes de cualquier deploy. Comprobar que apunta al proyecto existente, rama correcta y solo PostgreSQL, sin recursos adicionales, reemplazos, eliminación o activación de servicios. No desplegar un plan inesperado; detenerse y consultar al propietario.

## Secuencia pendiente antes de migrar

1. Con autenticación válida, consultar organización/proyecto/rama y sus IDs, nombres, fecha, bases y roles. Confirmar con el propietario el uso staging; no fiarse únicamente del nombre `production`.
2. Comprobar mediante consultas read-only que no hay tablas/filas comerciales reales y revisar `_prisma_migrations`, si existe. Ausencia de autenticación no equivale a DB vacía.
3. Revisar plan y neon.ts. Solo si el plan es no destructivo y corresponde al destino autorizado, `neon deploy` con la misma configuración. No aceptar secretos en stdout/logs o reemplazar .env.local sin comparación y backup.
4. Preparar dos roles distintos en la misma DB: aplicación con CONNECT/USAGE/DML necesarios, sin DDL/CREATEDB/CREATEROLE o membresía que lo conceda; migrador operativo con DDL controlado y propietario de los objetos. Revisar default privileges para tablas/secuencias futuras. La conexión directa con el mismo usuario privilegiado no constituye separación de credenciales.
5. DATABASE_URL de aplicación (pooler cuando proceda) y MIGRATION_DATABASE_URL directa con rol migrador, ambas PostgreSQL TLS verify-full y confianza CA válida. Mantener `@prisma/adapter-pg`, `pg` y Prisma 7.10.1; no introducir otro ORM o cliente serverless por defecto.
6. Revisar los 16 SQL/checksums contra la base Git, historial activo y permisos/objeto destino. Si la DB está vacía y validada, aplicar una vez `npm run db:deploy` con credencial migradora; ejecutar `npm run db:status`. No reset, db push, SQL reescrito, seed demo ni creación de otra DB para sortear permisos.
7. Conexión real read-only: TLS observado, DB/usuario/privilegios, tablas/restricciones, historial/checksums. Ejecutar check y build. No interpretar un build exitoso como prueba de conexión, porque inicialización DB es diferida.
8. Prueba controlada de dominio con registro sintético DRAFT/no personal/identificable, lectura desde conexión independiente y consultas de directorios/contenido. No publicar ejemplos como contenido real o eliminar filas previas. Registrar límites: un rollback solo demuestra la transacción, no persistencia durable. Acordar conservación de la fixture de staging.
9. No apuntar TEST_DATABASE_URL a esta DB compartida. Los runners existentes crean bases efímeras y usan seeds: no ejecutarlos sobre Neon staging por omisión ni crear una DB duplicada para ellos.

## Histórico: preparación descartada de Railway — no utilizar

Configuración prevista para un servicio web sobre este mismo repositorio/commit aprobado, sin crear recursos todavía:

- Node 24 y npm 11; instalación `npm ci --ignore-scripts`, build `npm run build`, inicio `npm run start -- --port "$PORT"`. El script existente escucha 0.0.0.0. Verificar comandos/variables del host antes de desplegar.
- En el gestor privado de Railway: DATABASE_URL con rol runtime mínimo y TLS verify-full. No subirla a Git, neon.ts, logs, capturas o `NEXT_PUBLIC_`.
- MIGRATION_DATABASE_URL solo en un proceso operativo autorizado para migraciones, no en el servicio web normal. Nunca migrar automáticamente desde build o usar seed como release command.
- SITE_URL y los orígenes ADMIN/SPONSOR/NEWSLETTER/PAYMENT/ANALYTICS, si se establecen, deben coincidir con el HTTPS final de staging. CATALOG_DEMO_MODE=false; SEO_INDEXING_ENABLED=false y revisión legal sin habilitar.
- AGENTS_ENABLED=false, AGENTS_MONTHLY_BUDGET_USD_MICROS=0, todas las automatizaciones deshabilitadas; sin credencial OpenAI o worker desplegado por este paso. NEWSLETTER_MODE=disabled, WOMPI_SANDBOX_ENABLED=false, ANALYTICS_ENABLED=false y GA4_MODE=disabled. No configurar credenciales externas con costes.
- Preservar claves privadas locales de formularios/newsletter por gestor de secretos seguro si el módulo las necesita; no regenerarlas a ciegas. No crear administrador humano ni configurar contraseñas de pruebas.
- Healthcheck `/api/health` es liveness; readiness real `/api/internal/readiness` requiere token privado y comprobación DB. Mantener OPS_EXPECT_WORKER=false hasta existir un supervisor autorizado/verificado.
- Revisar pool máximo cinco conexiones por proceso, conexiones totales de instancias y límites del proveedor. Validar backups, restauración, dominio/HTTPS, logs y costes antes de contratación o publicación.

Todo lo relativo a Neon/Railway indicado como pendiente es preparación, no una integración comprobada. No hubo commit/push ni activación de servicios.
