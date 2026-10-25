# PostgreSQL y Prisma — Fase 2

Persistencia implementada con PostgreSQL real, Prisma `7.10.1`, adaptador `@prisma/adapter-pg` y `pg`. No se utiliza SQLite. La Fase 3 conecta la presentación pública a consultas; la Fase 4 incorpora administración protegida (ver `ADMIN.md`) y Fase 5 agrega CMS/SEO (`EDITORIAL.md`); Fase 6 agrega solicitudes/CRM y campañas condicionadas (`COMMERCIAL.md`); todavía no hay checkout, newsletter o agentes operativos. Ver `PUBLIC_CATALOG.md` para los modos publicado/demo.

## Entorno local

Desde la raíz del checkout existente, Node 24.19.0 y npm 11.9.0:

```bash
npm ci --ignore-scripts
npm run db:local
npm run db:validate
npm run db:generate
npm run db:deploy
npm run db:seed
npm run db:status
```

`db:local` usa Docker en el socket local Unix (Linux y entornos con ese socket), la imagen oficial PostgreSQL 17 fijada por digest y un volumen nombrado. Publica únicamente `127.0.0.1:55432`. Genera una contraseña aleatoria local en `.env.local` ignorado por Git, con modo 0600 cuando crea el archivo; nunca imprime el valor ni lo guarda en documentación. Conserva el contenido previo y no reemplaza una `DATABASE_URL` externa. No cambiar credenciales de un volumen existente sin un procedimiento de rotación. No compartir `.env.local`, salidas de `docker inspect` o `docker compose config`, ni ejecutar shell tracing.

Base de desarrollo `atlas_dev`; base administrativa de pruebas `atlas_test`. El rol local `atlas` tiene privilegios elevados para crear bases aisladas; **no es un diseño de permisos de producción**. `db:local` exige coherencia con la configuración local y verifica health antes de preparar pruebas. Reiniciar sin eliminar datos:

```bash
npm run db:stop
npm run db:local
npm run db:status
```

No ejecutar `docker compose down -v`, `prisma migrate reset` ni `prisma db push` para recuperar el entorno. Eliminar volúmenes destruye datos. Una instancia restaurada puede necesitar recrear contenedor/volumen y aplicar migraciones; no se presupone que Docker o los datos de la DB sobrevivan al snapshot cloud. Para conservar datos fuera de una máquina, usar backups privados y una restauración verificada.

## PostgreSQL externo

No se crean cuentas o recursos comerciales. Configurar `DATABASE_URL` mediante variables inyectadas o `.env.local` privado y ejecutar `db:deploy` de forma explícita después de revisar las migraciones. Para desarrollo no hace falta Docker si el servidor externo ya es accesible. Los helpers `db:local`, `db:backup` y `db:restore-check` gestionan exclusivamente el PostgreSQL local; no apuntarlos a una base externa.

Usar un origen PostgreSQL real y una conexión TLS con verificación de certificado, por ejemplo el formato ilustrativo de `.env.example` con `sslmode=verify-full`. No desactivar verificación TLS. El proceso necesita la cadena de confianza correspondiente. Una red privada puede requerir VPN/TCP autorizado; una allowlist HTTP por sí sola no autoriza PostgreSQL TCP. Los valores proxy de secretos para HTTPS no equivalen a contraseñas PostgreSQL utilizables por un proceso local.

En despliegue: rol de migración con DDL separado del rol de aplicación con privilegios mínimos. Conexión reutilizable en `src/server/db/client.ts`, solo servidor, pool máximo 5 por proceso, timeout de conexión 5 segundos e inicialización diferida. Limitar conexiones totales según instancias y proveedor. No se registran consultas, contraseñas ni parámetros personales.

## Motor Prisma y bloqueo del CLI nativo

El CLI nativo intenta descargar `schema-engine` desde `binaries.prisma.sh`, denegado por la política actual (403). **No se desactivaron checksums, firmas ni TLS.** Los scripts `db:*` usan los módulos oficiales `@prisma/internals`, `@prisma/client-generator-ts`, `@prisma/schema-engine-wasm` y utilidades del adaptador, instalados desde npm con integridad verificada en el lockfile. El motor WASM corresponde exactamente al commit `d1b3f377ca835d73fd50954a5e22128b9ebdd6b8` requerido por Prisma 7.10.1.

La elección está aislada en `scripts/prisma-wasm.mjs`. Se usa la entrada CommonJS oficial porque algunas dependencias de generación tienen imports ESM sin extensión incompatibles con Node. No se modifican paquetes en node_modules. Estas APIs de tooling son internas y requieren actualizar versiones conjuntamente y volver a ejecutar las pruebas de migración. Node 24 emite un aviso experimental al importar WASM; las operaciones verificadas funcionan.

`npm ci --ignore-scripts` evita el intento de descarga nativa de los hooks de instalación. Después se genera explícitamente el cliente con `db:generate`; se probó una instalación limpia desde caché de esta manera. No se omite ninguna verificación de integridad npm ni se emplean artefactos nativos sin verificar. `build` y `typecheck` generan el cliente automáticamente; generar no conecta a PostgreSQL. El cliente generado en `src/generated/prisma` se ignora en Git.

El borrador cloud incluye el dominio `binaries.prisma.sh` para quien necesite el CLI nativo: requiere revisión/guardado en ajustes; no está habilitado por guardar el borrador. Las operaciones requeridas de esta fase se verificaron con WASM. El CLI nativo no se declara probado. Una comprobación adicional de introspección/drift por WASM encontró un error del proveedor al deserializar el tipo interno `char` del catálogo PostgreSQL; esa comprobación opcional queda pendiente, sin ocultarla ni afirmar ausencia de drift. Historial, SQL aplicado, restricciones y consultas sí fueron comprobados.

## Migraciones versionadas

| Migración | Contenido |
| --- | --- |
| `20261025000100_initial_domain` | Generada por el motor oficial Prisma WASM: modelos, enums, tablas de unión, índices y claves foráneas. |
| `20261025000200_domain_constraints` | CHECK SQL: importes positivos, emails normalizados, fechas/consentimiento/aprobaciones, digest de eventos, estructuras JSON y presupuestos/intentos. |
| `20261025000300_commercial_consistency` | Claves compuestas para concordancia campaña/orden (patrocinador/paquete) y evento/transacción (proveedor/entorno). |
| `20261025000400_campaign_relation_key` | Unicidad de la tupla completa de la relación uno a uno exigida por Prisma. |
| `20261025000500_public_catalog` | Fase 3: selección editorial featured, solución de casos e índices, sin alterar datos existentes. |
| `20261025000600_admin_auth` | Fase 4: hash opcional de contraseña, sesiones opacas y contadores de login; restricciones y FK aditivas. |
| `20261025000700_editorial_cms` | Fase 5: fuentes, revisión, imagen/noindex y snapshots relacionados con Article; preserva registros anteriores. |
| `20261025000800_crm_statuses` | Nuevos estados comerciales, preservando historia. Un intento pre-DDL revertido permanece como auditoría; recuperación en COMMERCIAL.md. |
| `20261025000900_sponsorship_crm` | Condiciones de paquetes, intake con consentimiento/snapshot, campañas sin orden de borrador, notas y contadores. |
| `20261025001000_commercial_required_fields` | CHECK explícitos que rechazan NULL en solicitudes públicas/condiciones de campañas activas. |

Se aplican mediante `SchemaEngine.applyMigrations`, no un migrador SQL inventado. El motor mantiene `_prisma_migrations` con checksums. `db:deploy` revisa primero historial: rechaza migraciones editadas, fallidas o divergentes, sin reset ni alteración de checksums. Una segunda ejecución no reaplica SQL. `db:status` verifica historial actual, sin migraciones fallidas o editadas; no es una prueba de drift completo.

No editar SQL ya aplicado. Para cambios futuros crear una nueva migración revisada, preferiblemente con el CLI nativo cuando esté disponible. `node scripts/prisma-wasm.mjs diff` imprime el SQL del esquema completo desde vacío: sirve como referencia inicial, **no** como migración incremental ni comando para ejecutar sobre una DB existente. Conservar los CHECK escritos manualmente que Prisma no representa en schema.prisma. Revisar transformaciones y backup antes de DDL sobre datos reales. La herramienta no resuelve automáticamente una migración fallida; inspeccionar la causa, recuperar una copia y documentar cualquier procedimiento de resolución explícito.

## Modelo y garantías

25 modelos: CommercialNote, CommercialRateLimit, Session, LoginRateLimit y User (rol enum, hash opcional; nunca contraseña plana), Category, Tag, Tool, UseCase, Article, Sponsor, SponsorshipPackage, CommercialLead, SponsorshipCampaign, PaymentOrder, PaymentTransaction, PaymentEvent, NewsletterSubscriber, NewsletterCampaign, Agent, AgentTask, AgentExecution, ContentDraft, SiteSetting y AuditLog. Las tablas de unión generadas resuelven relaciones reales de categorías, etiquetas y herramientas; no son directorios duplicados.

- UUID para entidades; timestamps con zona; slugs y referencias únicos e índices de filtros/estados/fechas/FK.
- Dinero entero `BigInt` en unidades mínimas y moneda explícita; no floats. Serializar a texto en futuras APIs JSON. IA usa micros de USD, diferenciados de pagos COP. TypeScript apunta a ES2020 para BigInt.
- Paquetes sin precio (`null`) significan pendientes de cotización/configuración, no gratuitos. Órdenes positivas y Sandbox por defecto; restricciones evitan mezclar importe/moneda/entorno entre orden y transacción y duplicar eventos externos.
- Estados iniciales seguros: usuarios inactivos, contenido en borrador, campañas pendientes de aprobación, agentes deshabilitados y presupuesto cero. Las fechas y aprobación mínima tienen CHECK donde corresponde.
- Las restricciones no sustituyen servicios: confirmar un pago con un proveedor, autorizar roles, evaluar presupuestos antes de gasto, validar transiciones y aprobar/publicar corresponden a fases posteriores. No hay webhooks, envíos o workers; la Fase 4 agrega UI administrativa/autenticación descritas en `ADMIN.md`.
- `PaymentEvent` guarda digest en vez de payload arbitrario; no se almacenan tarjetas. `SiteSetting` no es almacén de secretos y los metadatos de auditoría deben minimizar información personal.
- Relaciones financieras con `onDelete: Restrict`; los logs conservan eventos y permiten anonimizar referencias de usuario con `SetNull`. No se afirma auditoría inmutable ni cumplimiento jurídico integral.

## Seed y acceso a datos

`db:seed` solo funciona fuera de producción y con nombres reales de DB terminados en `_dev` o `_test`. Usa una transacción y upserts no destructivos: conserva ediciones existentes, evita duplicados, no crea clientes/ventas/suscriptores y no inicia agentes. Los ejemplos usan `.invalid`, `isDemo=true` y estado DRAFT; los cuatro productos están inactivos y sin precio. No ofrece cuentas administrativas ni contraseñas.

Repositorios internos `src/server/data/catalog.ts` y `commercial.ts`: validación Zod, creación de borradores, relaciones, búsqueda/paginación PostgreSQL con orden estable y snapshot RepeatableRead para total/lista, lectura de artículos/casos publicados y captura atómica de lead + auditoría. Lecturas públicas excluyen demos, borradores y publicaciones futuras; no retornan emails de autores. Las rutas administrativas nuevas usan servicios separados con permisos y controles de abuso (`ADMIN.md`); no se exponen operaciones comerciales de esta sección.

## Pruebas reales

```bash
npm run check
npm run test:db
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

`TEST_DATABASE_URL` debe apuntar a una base dedicada terminada en `_test`, sin `NODE_ENV=production`, con privilegio `CREATEDB`. El runner crea una base aleatoria propia, aplica todas las migraciones, comprueba que una segunda aplicación no haga cambios y ejecuta los tests de lectura/escritura/integridad (33 tras Fase 6). Solo elimina la base que él mismo creó. No borra ni reinicializa la DB configurada por el usuario. Si el proveedor no permite CREATEDB, el test queda bloqueado por ese permiso; no usar la DB de producción para evitarlo. El mismo helper de aislamiento se reutiliza para E2E, con su propio ciclo de vida y seeds.

Las pruebas incluyen seed repetible y conservación de ediciones, filtros/paginación, privacidad de autores, FK y unicidad, rollback real con fallo de auditoría, coherencia financiera, idempotencia de eventos, consentimiento, aprobación y límites persistidos de agentes. Las filas de pagos/ejecuciones de prueba son fixtures de persistencia en una base temporal; no corresponden a operaciones de proveedores ni métricas del negocio. CI con servicio PostgreSQL quedó escrita, pero su ejecución remota requiere subir el código y no se declara verificada.

## Backup y recuperación de desarrollo

Con la DB local sin cambios concurrentes:

```bash
npm run db:backup
# Usar el archivo que imprime el comando anterior:
npm run db:restore-check -- .cache/backups/atlas-dev-TIMESTAMP.dump
```

El backup usa `pg_dump -Fc` dentro de la misma imagen PostgreSQL. El archivo privado tiene modo 0600, se guarda bajo `.cache/backups` y está ignorado en Git. `restore-check` crea una base temporal nueva, ejecuta `pg_restore --exit-on-error --no-owner --no-acl`, compara recuentos de todas las tablas con desarrollo y elimina únicamente esa base temporal. **No sobrescribe atlas_dev.** Un cambio concurrente o un backup antiguo puede hacer fallar la comparación: usar una copia reciente y una DB en reposo. Los recuentos y el SQL restaurado son un ensayo útil, no una prueba criptográfica del contenido completo ni una garantía de RPO/RTO.

Para recuperación real, conservar el volumen y el backup, restaurar en una DB nueva, verificar migraciones/datos/funcionalidad, y cambiar `DATABASE_URL` solamente después de revisar el resultado. No automatizar la sobrescritura del origen. PostgreSQL externo administrado requiere su propio procedimiento privado de backup/restore y ensayo independiente; no se ha contratado ni comprobado ninguno. Definir retención, cifrado, copias fuera de la máquina, RPO/RTO y roles antes de producción.
