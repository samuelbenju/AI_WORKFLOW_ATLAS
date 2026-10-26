# AI Workflow Atlas

Plataforma independiente sobre herramientas y flujos prácticos de IA. Nombre comercial provisional. Público en inglés, administración en español. **Fases 1–12 respaldadas; Fase 13 prepara catálogo real/importación y activación humana. No listo para producción comercial.** El propietario confirma portada funcional en Render Free y Neon staging con las 16 migraciones aplicadas; no se presenta esa confirmación como una verificación remota de esta sesión. Panel con login, roles, CRUD, CMS editorial y CRM; sin activar correo, pagos o agentes. Operación PostgreSQL en [docs/DATABASE.md](docs/DATABASE.md); catálogo en [docs/PUBLIC_CATALOG.md](docs/PUBLIC_CATALOG.md).

Biblioteca inicial: 65 herramientas con fuentes oficiales, 30 guías y seis borradores editoriales. **Preparada y probada en DB temporal; su importación en Neon y visibilidad remota requieren evidencia de Actions/Render.** Procedimiento repetible, secreto de catálogo independiente y bootstrap OWNER desde Windows: [docs/CATALOG_OPERATIONS.md](docs/CATALOG_OPERATIONS.md). Estado verificable de esta entrega: [docs/PHASE13_REPORT.md](docs/PHASE13_REPORT.md). No usar los seeds demo para poblar staging.

Administración e inicialización segura en [docs/ADMIN.md](docs/ADMIN.md). Blog, CMS, fuentes y control de indexación en [docs/EDITORIAL.md](docs/EDITORIAL.md).

Patrocinios, formulario y CRM en [docs/COMMERCIAL.md](docs/COMMERCIAL.md).

## Requisitos y versiones

Node.js 24 (fijado en `.nvmrc` a `24.19.0`) y npm 11 (`11.9.0`). Next.js 16.4.3, React 19.3.1, TypeScript estricto 5.9.3, Tailwind 4.3.3 y Prisma 7.10.1. Dependencias exactas en `package.json` y `package-lock.json`. PostgreSQL 17 local mediante Docker o servidor externo por `DATABASE_URL`; no se requieren cuentas comerciales. El build prepara rutas dinámicas; servir el catálogo requiere DB y migraciones actuales.

## Instalar y desarrollar

Desde el checkout existente; no crear otro proyecto ni un worktree:

```bash
cd /workspace/Quesito
# En otros equipos: entrar en el directorio donde se haya clonado este repo.
# Si usas nvm: nvm install && nvm use
npm ci --ignore-scripts
npm run db:local     # PostgreSQL local; omitir si usas una DATABASE_URL externa
npm run db:deploy
npm run db:seed      # Solo desarrollo, nunca producción
npm run db:seed:catalog  # Ejemplos adicionales para recorrer los directorios
npm run db:seed:editorial # Seis borradores con fuentes, sin aprobar/publicar
npm run db:seed:commercial # Cuatro paquetes; no crea ventas/campañas
npm run commercial:secret # Firma privada local del formulario público
npm run dev
```

El servidor utiliza el puerto 3000 por defecto. Se puede cambiar: `npm run dev -- --port 3001`. Para detenerlo, Ctrl+C. No sobrescribir `.env.local` existente: `db:local` genera bindings locales sin imprimir contraseñas. `.env.example` contiene únicamente ejemplos; sin `SITE_URL` se usa `http://localhost:3000` para metadata. PostgreSQL local solo se publica en loopback 55432 y necesita Docker con socket local Unix.

En el cloud restringido, si la caché por defecto no permite escritura:

```bash
npm --cache /workspace/.cache/npm ci --ignore-scripts
```

No es necesario reinstalar si `node_modules` ya corresponde al lockfile. La instalación cloud no necesita ampliar permisos del sistema.

## Configuración

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `SITE_URL` | No en desarrollo | Origen HTTP(S), por ejemplo `http://localhost:3000`. Sin ruta, query, fragmento ni credenciales. Se valida con Zod; requiere rebuild para metadata de producción. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Solo tests con navegador del sistema | Ruta al Chromium existente, en este cloud `/usr/bin/chromium`. No es variable de la aplicación. |
| `DATABASE_URL` | Para persistencia | URL PostgreSQL privada; CLI/scripts cargan `.env.local`/`.env` sin reemplazar variables inyectadas. No imprimir el valor. |
| `TEST_DATABASE_URL` | Para `test:db` | Conexión dedicada `_test`, rol con CREATEDB para pruebas aisladas. |
| `DEV_POSTGRES_PASSWORD` | Solo Docker local | Generada por `db:local` y conservada en `.env.local`, nunca en Git. |
| `SEO_INDEXING_ENABLED` | No, false por defecto | Habilitar solo tras revisión de lanzamiento, con HTTPS/SITE_URL explícito y demo desactivada; privados siempre noindex. |
| `SPONSOR_FORM_SECRET` | Para formulario comercial | Firma privada de 32 bytes/64 hex. Generar localmente con commercial:secret o inyectar de forma segura; no versionar. |
| `SPONSOR_ORIGIN` | Opcional | Origen exacto del navegador público; usa SITE_URL/localhost:3000. |
| `ADMIN_ORIGIN` | Opcional; debe coincidir con el navegador | Origen exacto para mutaciones. Usa SITE_URL por defecto; HTTPS fuera de loopback. |
| `ADMIN_BOOTSTRAP_EMAIL` | Para CLI sin --email | Identidad privada del primer propietario; contraseña solo por entrada interactiva sin eco. |
| `CATALOG_DEMO_MODE` | No, por defecto false | True muestra exclusivamente ejemplos DRAFT/isDemo con aviso visible. Este entorno local tiene true; no publica registros. |

No hay claves activas de IA/email/pagos. Nunca escribir secretos en `.env.example`, Git, logs o argumentos compartidos. No se exponen variables `NEXT_PUBLIC_`. Para PostgreSQL externo usar TLS verificado y revisar permisos/red según `docs/DATABASE.md`.

## Verificación

```bash
npm run check        # lint sin warnings + tipos Next/TS + tests unitarios
npm run test:db      # DB temporal propia: migraciones y pruebas reales
npm run build        # build real de producción; no ejecuta ESLint por sí mismo
npm run test:e2e     # inicia y detiene su propio servidor de producción en 3100
npm run catalog:validate    # valida biblioteca/evidencia sin conexión a Neon
npm run test:catalog-import # DB/roles temporales propios, necesita build y Chromium
```

`check` también valida el esquema. `typecheck` y `build` generan automáticamente el cliente Prisma sin necesitar conexión. `db:validate`, `db:generate`, `db:deploy` y `db:status` usan módulos oficiales WASM fijados, debido al bloqueo 403 del motor nativo de Prisma; no se desactivan checksums/TLS. La instalación con `--ignore-scripts` evita los hooks que intentan descargar ese binario. Limitaciones de esas APIs internas y del CLI nativo documentadas en `docs/DATABASE.md`.

Los tests E2E necesitan un build actual y Chromium. En un equipo/CI donde no esté instalado:

```bash
npx --no-install playwright install chromium
# En Linux con permisos adecuados y dependencias de SO faltantes:
# npx --no-install playwright install --with-deps chromium
```

En este cloud se reutiliza Chromium del sistema, sin descargar ni instalar otro:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

El wrapper E2E crea una base temporal propia desde TEST_DATABASE_URL, aplica migraciones y seeds y la elimina al terminar. Playwright usa dos workers, escritorio y móvil, puerto 3100 reservado para su servidor, sin reutilizar procesos ajenos. Prueba navegación, búsqueda/filtros/orden/paginación, slugs y relaciones, cambios reales de DB, separación de modos, errores/carga, headers, teclado, anchos móviles, reduced motion y axe. Reportes/capturas ignorados en Git. No es certificación WCAG ni auditoría completa.

Aviso de tooling: npm marca ESLint 9 como fuera de soporte. Se mantiene 9.39.5 por las restricciones de los plugins de la configuración oficial Next; no se han forzado peers incompatibles con ESLint 10. Revisar actualización conjunta antes de lanzamiento. Ver ADR-010 en `ARCHITECTURE.md`.

## Arranque de producción local

```bash
npm run build
npm run start
```

Con el proceso activo, verificar internamente:

```bash
curl --fail --silent http://127.0.0.1:3000/api/health
curl --fail --silent http://127.0.0.1:3000/ > /tmp/atlas-home.html
```

Health debe responder `{"status":"ok"}`. Es liveness de la aplicación, **no** verificación de DB u otros servicios. Comprobar PostgreSQL con `npm run db:status` y `npm run test:db`. Comprobar además la página en navegador; un puerto abierto no demuestra funcionalidad. No se generan enlaces públicos a localhost en onboarding.

## Estructura

```text
src/app/              rutas, layout, estilos, not-found, health
src/components/       marca, navegación, footer y diagrama ilustrativo
src/lib/config/       validación Zod y configuración en servidor
tests/unit/           contrato de configuración
tests/e2e/            navegador y contratos HTTP
tests/integration/    PostgreSQL real, integridad y repositorios
src/server/           conexión y acceso a datos solo en servidor
prisma/               schema, migraciones versionadas y seed ficticio
scripts/              herramientas Prisma WASM, DB local y aislamiento de tests
docs/DATABASE.md      migración, operación, límites y recuperación
.github/workflows/    CI de lint, tipos, tests, build y navegador
```

PostgreSQL/Prisma, 45 modelos, dieciséis migraciones y cuatro seeds de desarrollo disponibles. La portada, `/tools`, `/tools/[slug]`, `/use-cases` y `/use-cases/[slug]` consumen datos de DB. El modo público excluye demos/borradores; sin contenido publicado muestra vacíos reales. La demo local se identifica claramente. `/login` y `/admin` protegidos por sesiones y roles; cuatro CRUD, dashboard y configuración editorial real. No hay registro público ni cuenta con contraseña predeterminada. `/sponsor` recibe solicitudes con consentimiento y el CRM administra empresas, paquetes, notas, propuestas y campañas condicionadas. Entrega externa de newsletter y pagos siguen pendientes; no se simulan envíos o cobros.

## Despliegue y operación futuros

Destino previsto: Vercel o servicio Node compatible con Next.js. En etapa de build instalar dependencias de desarrollo con `npm ci --ignore-scripts`, construir con `npm run build`, iniciar con `npm run start` donde corresponda. Prisma tooling es una dependencia de desarrollo; no ejecutar generación con una instalación que haya omitido devDependencies. Aplicar migraciones explícitamente con el rol apropiado después de backup/revisión. Configurar `SITE_URL` real antes de build. No se ha contratado, desplegado ni publicado ningún servicio comercial. La indexación permanece bloqueada por defecto durante pre-lanzamiento; solo habilitarla con el origen y flag de lanzamiento revisados (ver guía editorial).

Los procesos y volúmenes Docker no deben darse por conservados tras snapshots: reiniciar/verificar según instrucciones guardadas del entorno. El snapshot no sustituye backups PostgreSQL. `npm run db:backup` y `npm run db:restore-check -- RUTA` permiten ensayar recuperación local en otra DB sin sobrescribir desarrollo; ver guía de base de datos. Costes, dominio, DB administrada, correo, Wompi Sandbox, IA y scheduler requieren configuración por fase; el objetivo US$0–100/mes no autoriza gasto.

La configuración de CI de estas fases sigue local y su ejecución remota no está verificada. Usa permisos de lectura, instalación congelada, servicio PostgreSQL temporal, migraciones, seed, tests de persistencia, checks, build y Chromium. Las credenciales fijas de ese servicio son exclusivamente fixtures de CI, nunca de una DB desplegada. Ninguna acción del pipeline despliega o cobra. La Fase 1 sí está publicada en el repositorio oficial.

## Continuar por fases

Leer `AGENTS.md`, `PROGRESS.md` y la fase pertinente de `PLANS.md`. `PRODUCT_SPEC.md` conserva el alcance integral; `ARCHITECTURE.md` explica decisiones; `BUILD_LOG.md` registra pruebas y bloqueos. No iniciar una fase posterior automáticamente. La Fase 12 está autorizada para auditar/preparar; desplegar o activar cobros/servicios requiere aprobación separada. El contenido inicial sigue sin aprobar/publicar; no se activa indexación automáticamente. Repositorio oficial: `samuelbenju/AI_WORKFLOW_ATLAS`; las Fases 1–10 están publicadas en GitHub y los avances de Fase 11 siguen locales.

## Newsletter (Fase 7)

Captación en home/blog/artículos y `/newsletter`; administración privada en `/admin/newsletter`. PostgreSQL, consentimiento/doble opt-in, baja, borradores, preparación y lotes manuales. `npm run newsletter:secret` prepara firma/cifrado local sin imprimir la clave. Default disabled registra bloqueos sin enviar. Resend requiere configuración segura y prueba externa autorizada pendiente; no se han enviado campañas reales. Ver [guía operativa](docs/NEWSLETTER.md). Fase 8 local descrita a continuación.


## Pagos (Fase 8)

`/admin/payments`: órdenes con precio del backend, intentos, transacciones/eventos, historial y cumplimiento. Adaptador Wompi Colombia exclusivamente Sandbox, COP, checkout firmado y webhook con checksum + consulta, conciliación e idempotencia. Default `WOMPI_SANDBOX_ENABLED=false`, sin cargos reales. Documentación oficial bloqueada por proxy 403 y credenciales faltantes: contraste del protocolo y pago externo **no verificados**. No habilitar antes de resolverlos. Sandbox nunca activa publicidad real. Ver [guía de pagos](docs/PAYMENTS.md). Fase 9 implementada localmente; ver motor y bloqueos externos abajo.


## Motor de agentes (Fase 9)

`/admin/agents` supervisa configuración/límites, tareas, aprobaciones, historial/resultados, costes estimados y alertas. PostgreSQL persiste cola/leases/reservas; worker Docker separado y programación comprobados en esta instancia, sin depender de Codex abierto. `npm run agents:service -- start|status|restart|stop`, `npm run agents:tick` (un ciclo), `npm run test:agent-service` (DB/worker aislados). OpenAI Responses preparado, sin API key ni llamadas reales; default deshabilitado y presupuesto global cero. Cada tarea necesita aprobación y no puede ejecutar comandos, enviar comunicaciones, pagar o publicar. Configuración, recuperación y límites: [AGENT_ENGINE.md](docs/AGENT_ENGINE.md). Fase 10 amplía sus herramientas bajo los mismos controles; no Fase 11.

## Equipo empresarial (Fase 10)

CEO, Investigador, Editor, SEO y Comercial usan el motor común con herramientas delimitadas, evidencia y resultados persistentes. Registro idempotente: `npm run agents:team:init` o panel privado `/admin/agents`. Nuevos perfiles y cinco automatizaciones deshabilitados, presupuesto/tarifas cero. CEO asigna propuestas pendientes y recibe informes para consolidación; Editor guarda borradores reales del CMS tras investigación aprobada; Comercial prepara propuestas privadas sin contactar ni modificar precios/órdenes. Fuentes recuperadas explícitamente con URL/fecha/digest; no feed de tendencias, crawler externo o métricas de buscadores configurados.

Pruebas de generación con TEST_FIXTURE en PostgreSQL aislado, **sin ejecuciones reales OpenAI**. Falta credencial, modelo/tarifas y consumo autorizados. Configuración, decisiones y coordinación: [BUSINESS_AGENTS.md](docs/BUSINESS_AGENTS.md). No se activan costes recurrentes ni se inicia Fase 11.

## Analítica y afiliados (Fase 11)

`/admin/analytics` privado OWNER/ADMIN: tráfico consentido, contenido/atribución, newsletter/leads/campañas, pagos PRODUCTION confirmados, comisiones verificadas, gastos registrados y coste IA estimado, separados por fuente/moneda/periodo. Analítica propia deshabilitada por defecto (`ANALYTICS_ENABLED=false`), consentimiento versionado con DNT/GPC y retirada/borrado, sin IP/UA/queries/emails o SDK Google en navegador. GA4 Measurement Protocol y reportes GA4/Search Console preparados, sin credenciales/medición externa real; estados no configurados explícitos.

Programas/enlaces de afiliados administrables, divulgación y `/go/[code]` controlado, clics solo consentidos. Conversiones/comisiones exclusivamente por webhook HMAC de un proveedor configurado que adopte el contrato; no socio/venta real verificados todavía. Gastos son registros, no pagos. Experimentos son propuestas, sin automatizar A/B o alegar causalidad. CEO consulta agregados e importaciones existentes bajo los mismos controles y sin claves de Google. Guía completa: [GROWTH.md](docs/GROWTH.md). Fase 12 auditada sin activar costes recurrentes.

## Auditoría y operación antes de lanzar

Ver [informe integral](AUDIT_REPORT.md), [lista de lanzamiento](LAUNCH_CHECKLIST.md) y [runbook de producción](docs/PRODUCTION.md). Seis páginas `/privacy`, `/terms`, `/cookies`, `/advertising`, `/affiliates`, `/contact` son borradores noindex hasta identidad/fecha/revisión explícitas; contacto no reutiliza credenciales de administración. No existe proveedor de pago de producción, solo Sandbox, que nunca activa publicidad.

`npm run launch:check` diagnostica configuración/DB sin publicar y termina con salida 2 pendiente de revisión humana. `npm run ops:maintenance` es dry-run; `-- --apply` requiere decisión operativa de retención. `/api/health` es liveness público; `/api/internal/readiness` exige bearer OPS_MONITOR_TOKEN privado y devuelve 200/503 según DB/worker/alertas. `MIGRATION_DATABASE_URL` es conexión operativa opcional solo de db:deploy/status; runtime conserva DATABASE_URL con rol mínimo/TLS. No hay migraciones, seeds, envíos o cron automáticos en CI/build. Variables nuevas en `.env.example`.

Wompi externo, Resend, Google, partners, OpenAI y host productivo siguen sin prueba real; no se habilitaron. El worker local fue refrescado y probado sin IA para incorporar filtros actuales del CEO; no demuestra disponibilidad de un host externo. Fase 11 conserva su commit local pendiente de aprobación de push; cambios Fase 12 permanecen locales.
