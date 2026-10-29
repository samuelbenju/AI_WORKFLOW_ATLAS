# Arquitectura

Actualización 27-10-2026: [lanzamiento público/AdSense](docs/PUBLIC_LAUNCH.md) añade controles sin modificar esquema, 16 migraciones, lockfile, ORM o infraestructura. Las secciones por fase posteriores conservan su contexto histórico; la activación remota actual sigue pendiente de acceso/evidencia, aunque la CI de la base y migraciones Neon tienen SUCCESS remoto observado.

## Estado y límites

Actualización Fase 13: base e7a3bbb y stack intactos. El propietario confirma Render Free/Neon staging funcionando; la verificación de red de esta sesión sigue bloqueada. Catálogo versionado con evidencia → Zod y contratos existentes → plan read-only → workflow manual del mismo SHA → lotes Prisma hacia los mismos modelos y auditoría. Sin nuevo esquema, ORM, tabla o endpoint. La cuenta humana se prepara mediante el CLI existente con guardas staging y wrapper PowerShell privado. Ver [docs/CATALOG_OPERATIONS.md](docs/CATALOG_OPERATIONS.md) y [docs/PHASE13_REPORT.md](docs/PHASE13_REPORT.md). El texto posterior conserva la evolución de las fases originales.

Fases 1–11 locales y auditoría de Fase 12 (correo/pagos/modelo y producción pendientes): portada, directorios públicos y administración conectados a PostgreSQL/Prisma, 45 modelos, dieciséis migraciones, conexión de servidor, repositorios y seeds. Existen búsqueda/filtros/paginación y fichas de herramientas/casos con relaciones. Blog y CMS con bloques/fuentes/revisión/publicación, SEO dinámico y control de indexación de preestreno. Login real con sesiones opacas y CRUD administrativo; inicialización de la cuenta humana pendiente de contraseña mediante CLI seguro. Hay captación, confirmación/baja, borradores y envío manual desacoplado; la entrega real de Resend está pendiente de configuración/prueba autorizada. Hay infraestructura de órdenes/Wompi Sandbox deshabilitada sin credenciales; no se verificaron pagos externos. Existe motor/worker/scheduler común con cinco agentes empresariales, evidencia y productos persistentes verificados localmente, con OpenAI deshabilitado por falta de clave; sin ejecuciones reales de IA. Patrocinios y CRM operativos para solicitudes, propuestas privadas y campañas condicionadas; entrega externa de correo/pagos/agentes siguen pendientes.

## Componentes actuales

```text
Navegador
  └─ Next.js App Router
      ├─ /                 portada dinámica con contenido PostgreSQL
      ├─ /tools[/slug]     directorio y ficha de herramientas
      ├─ /use-cases[/slug] directorio y ficha de casos
      ├─ /blog[/slug]      artículos publicados y revisados
      ├─ /sponsor         paquetes y solicitudes con consentimiento
      ├─ /admin/sponsors  CRM privado, empresas/paquetes/propuestas/campañas
      ├─ /robots.txt, /sitemap.xml  SEO dinámico según política explícita
      ├─ rutas inexistentes → not-found.tsx / HTTP 404
      ├─ /login, /admin   sesiones, roles, dashboard y CRUD privados
      ├─ /api/admin/*     autorización/Origin/CSRF y servicios transaccionales
      ├─ /api/health       liveness HTTP 200, sin dependencias externas
      ├─ components/      layout, marca, diagrama ilustrativo
      ├─ lib/config/      Zod + configuración de origen en servidor
      └─ server/data → server/db → Prisma + adapter-pg → PostgreSQL 17
```

La UI pública consulta contenido y admite solicitudes comerciales mediante un POST protegido y acotado. Búsqueda y filtros mediante GET; newsletter con consentimiento/doble opt-in, baja y protección propia. El diagrama sigue siendo una ilustración, no una ejecución de agentes. No hay métricas comerciales ficticias; los ejemplos se identifican como tales.

## Decisiones registradas

| Decisión | Motivo y consecuencias |
| --- | --- |
| ADR-001: monolito modular Next.js | Un solo repositorio, despliegue y runtime inicial; Route Handlers y Server Actions según cada operación futura. Evitar microservicios sin necesidad. |
| ADR-002: Node 24 / npm 11, dependencias exactas | Runtime disponible y compatible con Next.js 16.4.3 + React 19.3.1. `.nvmrc` fija 24.19.0; lockfile reproducible; TypeScript 5.9.3 estable satisface el contrato de Next sin incorporar TS 7 innecesariamente. |
| ADR-003: CSS de diseño + Tailwind 4 | Tailwind integrado por PostCSS; tokens en `@theme`, clases semánticas para composición del shell y media queries. Sin librería de componentes adicional. Lucide para iconos locales. |
| ADR-004: Server Components por defecto | Server Components para datos; wrapper cliente mínimo selecciona el shell público/administrativo según ruta. Formularios privados usan JS cliente sin DB o permisos locales. Menú móvil mediante `details`/`summary`, sin SDK externo ni llamadas a APIs. |
| ADR-005: aplazar infraestructura por fases | PostgreSQL/Prisma en Fase 2; auth en 4; email en 7; Wompi en 8; IA/worker en 9–10. No instalar servicios, SDK ni pedir credenciales antes de utilizarlos. No cambia la arquitectura exigida. |
| ADR-006: internacionalización incremental | `lang=en`, configuración `publicLocale=en` y `adminLocale=es`. Inglés público y español administrativo. Añadir routing/diccionarios al implementar localización; no afirmar que exista traducción actualmente. |
| ADR-007: indexación controlada | Fase 5 mantiene noindex por defecto, robots y sitemap dinámicos. Solo se habilita con flag explícito, HTTPS/origen no loopback y demo desactivada; privados siempre noindex. Retirar bloqueo requiere revisión de lanzamiento; SITE_URL es la base canónica, sin dominio inventado. |
| ADR-008: CI + navegador real | ESLint, tipos, tests unitarios, build y Playwright en Chromium desktop/móvil; un worker por DB compartida, sin reintentos que oculten fallos. Soporte explícito para Chromium del entorno. |
| ADR-009: fuentes del sistema | No descargar fuentes de Google en build ni añadir llamadas externas al cargar la portada. Marca e icono originales en código/SVG local. |
| ADR-010: compatibilidad del linter | ESLint 9.39.5 está marcado como fuera de soporte por npm; se conserva temporalmente porque los plugins React/import/jsx-a11y de la configuración oficial Next declaran compatibilidad hasta 9. No forzar ESLint 10 ni ignorar peer dependencies. Sin vulnerabilidades reportadas en el audit de esta ejecución; revisar actualización conjunta antes de lanzamiento. |

## Estructura y reglas de extensión

- `src/app/`: rutas, metadata, HTTP y composición. Componentes servidor por defecto.
- `src/components/`: presentación reusable. No consultas Prisma ni permisos en componentes de cliente.
- `src/lib/config/`: validación de configuración. `site.ts` marcado `server-only`; no exponer secretos con `NEXT_PUBLIC_`.
- En futuras fases, `src/server/<dominio>/` contendrá servicios, validación, repositorios y adaptadores usados por Route Handlers/Server Actions. Crear módulos solo cuando tengan código real.
- `prisma/`: schema, dieciséis migraciones y seeds de desarrollo/editorial/comercial; `src/generated/prisma` se genera y no se versiona. No usar `db push` como sustituto de migraciones.
- `tests/`: contratos de configuración y comportamiento real HTTP/navegador; no depender de servicios ficticios.

## Persistencia y seguridad futuras

PostgreSQL es la fuente de verdad de la capa de datos. En esta solicitud el propietario autorizó explícitamente modelar todos los dominios comerciales listados, ampliando la selección inicialmente prevista para Fase 2. Modelos: User con Role enum; Category/Tag/Tool/UseCase/Article; Sponsor/SponsorshipPackage/CommercialLead/SponsorshipCampaign; PaymentOrder/PaymentTransaction/PaymentEvent; NewsletterSubscriber/NewsletterCampaign; Agent/AgentTask/AgentExecution/ContentDraft; SiteSetting/AuditLog. Fase 4 añade Session y LoginRateLimit, hash de contraseña nullable en User y endpoints administrativos; no se añade Account/OAuth. Los endpoints comerciales se incorporan únicamente en Fase 6. Relaciones de contenido usan tablas de unión generadas; financieras usan FK restrictivas y claves compuestas para coherencia. Detalle de constraints y límites en `docs/DATABASE.md`.

Repositorios de servidor internos: borradores y búsqueda de herramientas, casos y artículos publicados, lead + auditoría atómicos. El singleton se inicializa al primer uso y limita cada pool a cinco conexiones, con timeout; el shell estático sigue compilando sin DB. Validación Zod, consultas parametrizadas, exclusión de demos/borradores y selección de autor sin email. Fase 4 expone únicamente los servicios administrativos con autorización fresca por operación, validación estricta, límites y CSRF. Fase 6 expone intake público validado y CRM con permiso commercial (solo OWNER/ADMIN), manteniendo autorización fresca/Origin/CSRF en operaciones privadas.

Importes `BigInt` en unidades mínimas y moneda explícita; micros USD separados para consumo IA. Valores JSON futuros requieren serialización BigInt a texto. TypeScript pasa a ES2020 porque usa BigInt; se conserva strict. Los estados y restricciones de SQL no constituyen verificación real de pagos ni ejecución de agentes.

### Decisiones de Fase 2

- ADR-011: PostgreSQL 17 local con Docker funcional, imagen oficial fijada por digest y puerto exclusivo loopback 55432; volumen persistente. Credenciales aleatorias solo en `.env.local` ignorado; no servicios de pago. Conexión externa disponible por `DATABASE_URL` sin sustituir PostgreSQL ni forzar Docker.
- ADR-012: Prisma/cliente/adaptador 7.10.1 estable, en lugar del CLI `latest` que apuntaba a 8.0.0-rc.27. Native CLI bloqueado por 403 en binaries.prisma.sh. Se utilizan artefactos oficiales npm/WASM del mismo commit de motor mediante wrapper aislado con versiones exactas, sin parchear paquetes ni desactivar integridad. Las APIs internas y avisos WASM de Node exigen prueba de migraciones al actualizar. Instalación reproducida con `npm ci --ignore-scripts`; generación explícita. CommonJS evita un problema de imports ESM sin extensión de los módulos oficiales de generación. Ver `docs/DATABASE.md` para el alcance del bloqueo nativo y de introspección.
- ADR-013: migraciones aplicadas con `SchemaEngine.applyMigrations`, manteniendo `_prisma_migrations` y checksums. CHECK SQL complementan el schema Prisma. No modificar migraciones aplicadas; se agregaron migraciones posteriores al reforzar consistencia comercial.
- ADR-014: pruebas en base aleatoria creada desde una conexión `_test`, con privilegio CREATEDB, eliminando solo esa base. Seed transaccional, repetible y no destructivo, exclusivamente desarrollo; fixtures en borrador, sin estadísticas, transacciones o agentes reales.
- ADR-015: backup privado de desarrollo con pg_dump y restauración en otra DB; comparación de todas las tablas sin sobrescribir la original. Procedimientos administrados y RPO/RTO quedan para infraestructura de producción.

### Decisiones de Fase 3

- ADR-016: consultas públicas aisladas en `server/data/public-catalog.ts`, DTOs sin datos administrativos, rutas force-dynamic y cache React solo por petición para detalles/metadata. No arrays como fallback ni cache persistente que esconda errores de PostgreSQL. Estados de error genéricos con reintento.
- ADR-017: modo público por defecto exige PUBLISHED/no-demo/fecha no futura en cada entidad y relación. El flag de proceso explícito `CATALOG_DEMO_MODE=true` permite solo fixtures DRAFT/isDemo y muestra avisos persistentes. No se habilita por parámetros del navegador. Se conserva el contenido previo; el nuevo seed no publica ni sobreescribe ediciones.
- ADR-018: filtros GET validados con Zod, páginas fijas de seis registros, orden estable, facets desde DB y transacción RepeatableRead para resultados/totales. Pasos y referencias JSON limitados y escapados, enlaces HTTP(S) seguros; sin render HTML externo.
- ADR-019: migración aditiva añade `featured` editorial y `solution`; no se inventan métricas para llamar populares a los casos ni se interpreta featured como patrocinio. Newsletter/patrocinios se presentan como futuras capacidades, sin inputs o checkout ficticios. El blog completo sigue fuera de fase.
- ADR-020: E2E usa DB temporal propia con los dos seeds; comparte helper de aislamiento con tests de persistencia, conserva filtros/links reales y provoca fallos/lentitud en entornos de test. Regresión con Chromium desktop/móvil, 320 px, teclado, reduced motion y axe. Build no captura el catálogo de desarrollo.

Detalles de contratos, rutas, modo demo y límites en `docs/PUBLIC_CATALOG.md`.

### Decisiones de Fase 4

- ADR-021: alternativa justificada a Auth.js para identidad local sin OAuth: scrypt nativo Node y sesiones opacas aleatorias, con digest en PostgreSQL, revocación, expiración de ocho horas y estado/rol fresco por petición. Evita proveedor externo sin configurar; no es acceso simulado. Detalles y límites en `docs/ADMIN.md`.
- ADR-022: bootstrap de propietario y recuperación exclusivamente por CLI privilegiado interactivo sin eco. Sin registro web, contraseña fija o archivo de contraseña. Correo humano solo en configuración privada; su cuenta requiere que el propietario elija su contraseña. Seeds normales mantienen usuarios inactivos y sin credenciales.
- ADR-023: Route Handlers de administración exigen sesión, permiso, Origin exacto y CSRF para mutaciones; JSON acotado, Zod estricto, respuestas no-store y errores genéricos. Login tiene rate limit PostgreSQL por cuenta/global y no admite callbacks externos. HTTPS/cookie __Host en despliegue; HTTP solo loopback.
- ADR-024: CRUD de cuatro entidades con relaciones reales, transacciones Serializable junto con auditoría, confirmación por nombre actual y rechazo de borrado con relaciones entrantes. EDITOR solo borrador/revisión; OWNER/ADMIN publican/eliminan/configuran. VIEWER no entra al panel. Dashboard consulta recuentos reales y separa ejemplos; ajustes editoriales se consumen en los formularios. Los módulos futuros informan que no están implementados.
- ADR-025: pruebas de autenticación/CRUD en bases temporales, usuarios .invalid y contraseñas aleatorias en memoria. No se inicializa la cuenta humana con fixtures para declarar completas las pruebas. Shell público conservado mediante composición; shell administrativo independiente y español.

Contenido editorial estructurado y escapado; no renderizar HTML externo sin validación.

Controles actuales: escape de React, validación Zod de `SITE_URL`, headers nosniff/frame denial/referrer/permissions, sesiones/roles, validación de formularios y ausencia de secretos en respuestas. **No constituyen auditoría completa.** CSP con nonce requiere diseño compatible con Next al introducir scripts/clientes; HSTS depende de HTTPS de producción. No aplicar políticas que rompan hidratación sin verificarlas.

## Contratos de integraciones (pendientes)

### Pagos

`PaymentProvider` implementa preparación de checkout, validación de eventos y consulta/conciliación exclusivamente Sandbox. Orden y precio se obtienen en servidor, referencia única e importe COP en unidades mínimas. Adaptador Wompi Sandbox implementado con pruebas locales; contraste con documentación oficial vigente bloqueado por 403 del proxy y pendiente. Webhook autenticado y eventos idempotentes actualizan transacciones en una transacción DB; retorno del navegador nunca confirma pago. Campaña requiere aprobación separada. No almacenar PAN/CVV. Proveedor de pagos de producción no implementado; su desarrollo y activación requieren autorización y pruebas adicionales.

### Correo

Adaptador de Resend o equivalente para confirmación/baja y envíos aprobados; consentimiento persistido, tokens de acción con expiración, lista de supresión e idempotencia. ACCEPTED exige ID de respuesta real del proveedor y no significa entregado/leído. Dominio remitente verificado y credenciales están pendientes; actualmente no se envían correos externos. Ver decisiones de Fase 7 y docs/NEWSLETTER.md.

### IA y tareas

Proveedor intercambiable; OpenAI Responses API cuando corresponda, esquema de salida validado, allowlist de herramientas, registro de modelo/tokens/coste, tiempo máximo y reintentos limitados. Fuentes externas no pueden modificar instrucciones ni obtener secretos.

Scheduler desplegado invoca un worker acotado. Tareas en PostgreSQL con idempotency key única, lease con expiración, concurrencia limitada, retry/backoff, presupuesto y cancelación; estados implementados: pendiente, en ejecución, pendiente de aprobación, completada, fallida, cancelada. Reservar presupuesto antes de llamadas y reconciliar uso. Diseñar continuidad tras caída, no bucles en serverless. La instancia local utiliza el worker Docker dedicado de Fase 9; despliegue/supervisión externos siguen pendientes según hosting.

Publicar contenido, enviar correo/propuestas, activar campañas o gastar requiere autorización por riesgo. El agente CEO propone y coordina dentro de ese límite; no amplía permisos.

## Flujos comerciales y auditoría previstos

Solicitud validada → lead persistido → aprobación humana → orden calculada en servidor → checkout Sandbox → webhook verificado → transacción conciliada → aprobación de campaña → publicación identificada → reporte con datos reales.

Logs con IDs de correlación, actor, entidad, transición y fecha; sin secretos, tarjetas ni datos personales innecesarios. Diferenciar comisiones, gastos, ingresos brutos, liquidaciones y neto. Definir retención por tipo de dato y acceso mínimo.

## Operación, costes y recuperación

No hay servicios facturables configurados. Desarrollo Fase 1 es local; disponibilidad de créditos/planes gratuitos no se presupone. Objetivo futuro US$0–100/mes no autoriza gasto. Hosting, DB, dominio, email, tokens IA, worker y comisiones necesitan evaluación y límites antes de alta.

Vercel o Node compatible será el destino previsto, aún no desplegado. Backup y restauración local de desarrollo se ensayaron en Fase 2; bases administradas no se han contratado. Antes de producción habrá RPO/RTO acordados, backups externos, prueba de restauración, monitorización y rollback. Un snapshot de cloud no sustituye backups PostgreSQL ni garantiza conservar el volumen Docker. Las Fases 1–10 están publicadas en `samuelbenju/AI_WORKFLOW_ATLAS`, main `1b468492d0d761f71706bf252ab25935ee3ce83d`, tras el push expresamente autorizado. Los cambios de Fase 11 permanecen locales, sin nuevo push automático. La ejecución remota de CI no se ha comprobado.

## Referencias oficiales consultadas

- Instalación Next.js: https://nextjs.org/docs/app/getting-started/installation (fuente oficial consultada vía https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/01-getting-started/01-installation.mdx).
- Plantillas oficiales Next.js para TypeScript, ESLint y Tailwind: https://github.com/vercel/next.js/tree/canary/packages/create-next-app/templates/app-tw/ts.
- Registro oficial npm para versiones y peer dependencies de Next.js, React y herramientas; versiones instaladas definitivas en `package.json`/`package-lock.json`.
- Para integraciones futuras consultar documentación oficial al implementar: https://www.prisma.io/docs, https://authjs.dev, https://docs.wompi.co, https://resend.com/docs, https://platform.openai.com/docs. Estas integraciones **no están validadas** en Fase 1.


### Decisiones de Fase 5

- ADR-026: ampliar Article/ContentDraft existentes, sin duplicar CMS/taxonomías. Fuentes, revisión, imagen/noindex y FK de snapshots en séptima migración aditiva; registros heredados preservados, con snapshot íntegro antes de convertirlos. Cada guardado genera revisión histórica y auditoría en la misma transacción.
- ADR-027: edición mediante bloques JSON tipados (párrafos, h2/h3, listas, código, notas y enlaces por UUID); escape de React y JSON-LD seguro. Sin HTML ejecutable, iframes o fetch de URLs del editor. Enlaces internos se validan y resuelven contra destinos públicos vigentes.
- ADR-028: borrador/en revisión por editor, aprobación explícita y publicación por OWNER/ADMIN. Fuentes comprobadas, metadatos, categoría y enlaces públicos son requisitos. Guardar invalida revisión y retira la publicación anterior; expectedUpdatedAt evita sobrescribir otra edición, timestamps de servicio monótonos. Preview exclusivamente privado.
- ADR-029: blog siempre PUBLISHED/no-demo/no-futuro/revisado/formato 1, incluso si el catálogo está en demo. Listados SQL, relacionados por categoría y DTO sin correo/credenciales. No convertir silenciosamente previews viejos o seeds en publicaciones.
- ADR-030: canonical/OG/Twitter, BlogPosting/BreadcrumbList/CollectionPage y robots/sitemap dinámicos. SEO_INDEXING_ENABLED exige origen HTTPS explícito y no demo; por defecto noindex. Proxy Next se limita a headers SEO, autorización permanece en páginas/API/servicios. Filtrados noindex, noindex individual excluido de sitemap y privados nunca indexables.
- ADR-031: seis borradores originales útiles, fuentes oficiales consultadas con fecha/huella y revisión humana pendiente. Sin estadísticas de resultados o publicación masiva. Seis diagramas locales propios, next/image con dimensiones/sizes, AVIF/WebP y allowlist local; no optimizador para imágenes remotas proporcionadas por usuarios. No se afirma rendimiento CWV de producción.

Operación, contratos, fuentes y límites en `docs/EDITORIAL.md`. RSS, redirecciones históricas, restauración de versiones y producción no se presentan como implementados. Este registro de Fase 5 se conserva; las adiciones comerciales autorizadas están abajo.


### Decisiones de Fase 6

- ADR-032: reutilizar Sponsor/SponsorshipPackage/CommercialLead/Campaign y ContentDraft. Nuevos CommercialNote para notas con autor/fecha y CommercialRateLimit para intake compartido; sin duplicar productos, CRM o propuestas. Enums históricos de leads conservados, nuevas escrituras en el pipeline de cinco estados solicitado. Diez migraciones totales, con recuperación oficial documentada de un intento pre-DDL fallido en la octava.
- ADR-033: intake firmado por HMAC, origen exacto, JSON/Zod estricto, consentimiento versionado, nonce único, digest de contenido/versión del paquete, ventana de duplicados y rate limit persistente. Solo referencia/received en respuesta. Snapshot del precio/moneda/duración mostrado, rechazo si cambian términos; no Sponsor automático a partir de formularios no verificados.
- ADR-034: conservar precios desconocidos como null/por cotizar y duración por acordar. Aceptar interés no implica habilitación del paquete, reserva, pago o promesa de audiencia. Estado/fechas/notas/propuestas son datos reales del operador; WON no altera finanzas ni publica nada. Propuestas solo DRAFT privadas sin envío.
- ADR-035: campañas pueden nacer sin orden para no inventar registros financieros. Guardar invalida aprobación/activación; aprobar/activar exige permiso, confirmación, orden PAID/PRODUCTION y transacción/evento verificados, snapshot, fechas y contenido público. Bloqueo de solapamientos por espacio; newsletter bloqueado por fase. No se integra checkout/proveedor de pagos en esta entrega.
- ADR-036: entrega pública revisa condiciones por petición, no solo una bandera ACTIVE. Bloques separados y etiquetados Sponsored, rel sponsored en enlaces comerciales; ni Sandbox ni demo entregan anuncios. Precios, disponibilidad, citas y contactos nunca se presentan como métricas comerciales inventadas.

Guía operativa, controles y límites actuales en `docs/COMMERCIAL.md`. No se inició Fase 7, no se enviaron propuestas y no se activaron campañas reales.


### Decisiones de Fase 7

- ADR-037: ampliar modelos Newsletter existentes con generación de consentimiento y audiencia/modo; NewsletterConsent, NewsletterDelivery y NewsletterRateLimit son entidades propias para trazabilidad, outbox cifrado y límites compartidos. Migración 11 aditiva, 28 modelos, datos anteriores conservados.
- ADR-038: doble opt-in con token aleatorio/digest/24h; bajas HMAC por generación, links en fragmento y POST explícito (GET no muta). Respuestas públicas iguales para direcciones nuevas/conocidas; contactos privados solo OWNER/ADMIN y cada mutación conserva Origin/CSRF/rol fresco.
- ADR-039: EmailService desacoplado y adaptador Resend con fetch nativo, timeout e idempotencia, sin nuevas dependencias. Payload AES-GCM con NEWSLETTER_SECRET privado local. Default disabled registra BLOCKED; capture solo en DB de tests aisladas, nunca fake SENT. Sin claves/configuración no se afirman envíos reales.
- ADR-040: preparación inmutable de audiencia confirmada (máximo 1000), aprobación humana y cada lote de hasta 10 autorizado explícitamente. Barrera UNKNOWN duradera antes de I/O impide replay tras caídas; no reintentos automáticos de resultados inciertos/rechazados. Cancelación/supresión y guardias de consentimiento, fuentes y patrocinio en servidor. No cron ni campaña automática.
- ADR-041: patrocinio Newsletter reutiliza validación comercial de pago PRODUCTION, aprobación/periodo/contrato y versión. Se etiqueta en plantilla y no se entrega en espacios web. Propuesta editorial solo desde artículos publicados/revisados crea DRAFT; prepara futura entrada de agente sin activarlo. No Fase 8.

Guía de configuración, privacidad, envío, estados, límites, recuperación y pruebas en `docs/NEWSLETTER.md`. Las decisiones/secciones previas conservan su contexto histórico de Fase 6; la restricción de formato Newsletter queda sustituida por las guardias de Fase 7. API key, dominio/remitente y destinatario autorizado siguen pendientes para verificar entrega externa.


### Decisiones de Fase 8

- ADR-042: reutilizar orden/transacción/evento y añadir PaymentAttempt/PaymentOrderHistory. Snapshot comercial y cobro separados, idempotencia de creación, historia y cumplimiento independientes de campaña. Dos migraciones aditivas (12–13), FK compuestas de importes/intento/orden/proveedor y actor, conservación de filas anteriores y restricción de cumplimiento Sandbox.
- ADR-043: hosted checkout evita instrumentos de pago en la aplicación. Adaptador PaymentProvider desacoplado, único Wompi Sandbox con destinos fijos, moneda COP, firmas y lookup con timeout. No hay procesador/URL/bandera de producción. El backend calcula precio; USD/EUR se rechaza sin conversión implícita. Falta revisar contratos con documentación oficial vigente, cuyo acceso fue denegado por el proxy.
- ADR-044: webhook exige checksum con campos esenciales y consulta adicional al proveedor: campos no firmados como reference no se usan para liquidar. Evento idempotente, transición financiera atómica bajo locks; conflictos/unknown refs quedan visibles. Errores de consulta RETRYABLE, conciliación administrativa por ID/orden real y estados terminales sin retrocesos indebidos. Ningún retorno o botón marca un pago manualmente aprobado.
- ADR-045: nonce de orden y referencia independiente por intento, reutilización segura de checkout pendiente y bloqueo de reintento ciego tras expiración. Aprobaciones múltiples/tardías ON_HOLD. Sandbox PAID implica SANDBOX_ONLY, nunca FULFILLED; los guards comerciales conservan exigencia PRODUCTION/aprobación/contrato y no cambian por esta implementación.
- ADR-046: pruebas de protocolo/transporte son fixtures explícitas locales con PostgreSQL temporal. No se ejecutó un pago externo ni se afirma conformidad con documentación oficial inaccesible. Default disabled y bloqueo externo hasta disponer de acceso, credenciales y callback HTTPS. Fase 9 no iniciada.

Guía de configuración, endpoints, contratos candidatos, límites de aceptación, idempotencia/recuperación y obligaciones pendientes en `docs/PAYMENTS.md`.


### Decisiones de Fase 9

- ADR-047: ampliar Agent/Task/Execution existentes, sin recrearlos ni lanzar los cinco agentes de Fase 10. Migración 14 aditiva: configuración/límites/versiones, fencing/cancelación/aprobación, llamada/uso/reserva/periodo, AgentSchedule, AgentBudgetPeriod y AgentWorkerHeartbeat. Total 33 modelos/catorce migraciones, SQL histórico intacto.
- ADR-048: proveedor Responses nativo desacoplado, modelos por allowlist, store=false/background=false/tools=[]/schema de salida y timeout 30 s. Herramienta local única catalog_summary: solo recuentos públicos. No ejecución de instrucciones como comandos, pagos, envíos, publicación o cambios de permisos. Datos no confiables no amplían capacidades; salida DRAFT para revisión.
- ADR-049: aprobación humana por tarea/consumo y hash de configuración; reserva conservadora de entrada/salida por tarea/agente/global UTC antes de I/O, coste estimado según tarifas configuradas y uso reportado. Sin precios inventados ni afirmación de factura. Budget global cero y proveedor deshabilitado por defecto. Resultados inciertos consumen la reserva estimada; nunca se liberan para reenviar un POST desconocido.
- ADR-050: cola PostgreSQL con claims serializados breves y llamadas fuera de SQL, límites de concurrencia, lease 120 s, dispatchedAt durable, fencing de zombies y cancelación por abort/flag. Backoff solo para fallos conocidos/no despacho; sin retry automático de incertidumbre. Historial/auditoría, errores seguros y reserva conservada al recuperar interrupciones posteriores al despacho.
- ADR-051: Docker dedicado supervisa procesos de un ciclo, periodicidad 15 s y restart unless-stopped, fuera del servidor Next/Codex. Runtime mínimo readonly, non-root/cap-drop, red de DB sin host networking, proxy/CA preservados y Node --use-env-proxy en CLI/Next. No bucle infinito en handler serverless. Propuestas programadas siempre necesitan aprobación/budget propios. Entrada por evento administrativa idempotente, sin afirmar integración CMS/event bus inexistente.
- ADR-052: infraestructura comprobada en Docker/DB reales con tarea programada, heartbeat y reinicio sin duplicados/llamadas IA; modelos solo TEST_FIXTURE en DB temporal. OpenAI externo bloqueado por API key ausente, no se simula éxito ni se considera validada restauración/despliegue externo. Guía `docs/AGENT_ENGINE.md`.

### Decisiones de Fase 10

- ADR-053: cinco perfiles con contratos JSON/herramientas diferenciados sobre la cola, proveedor, worker y contabilidad existentes. Herramientas ejecutadas por servidor antes/después del modelo; el modelo no recibe capacidades arbitrarias. RBAC/Origin/CSRF y validación de permisos al guardar/aprobar/reclamar/finalizar. Analista anterior conservado.
- ADR-054: migración 15 aditiva: AgentSource y AgentWorkProduct, relaciones de evidencia/revisión/CMS/lead, parentTaskId, automationKey y aprobación ligada a entrada. Total 35 modelos/quince migraciones; SQL anterior y lockfile conservados. Fuente FETCHED guarda texto/digest/fecha, fixture rechazada fuera de tests, citas verificadas contra snapshot; semántica factual necesita revisión humana.
- ADR-055: Editor únicamente desde investigación aprobada con fuentes vigentes; DRAFT real noindex y fuentes PENDING, o actualización explícita/versionada preservando snapshot y relaciones humanas. Producto revisado no publica. Comercial crea propuestas existentes ContentDraft con importe actual/sugerido separados; no cambia leads, precios, órdenes o permisos.
- ADR-056: CEO recibe métricas DB con pagos confirmados PRODUCTION por moneda y Sandbox separado, sin inferir audiencia/beneficio/atribución. Asigna hasta cuatro tareas idempotentes con presupuesto cero. Especialistas devuelven productos y el motor propone consolidación CEO independiente pendiente de aprobación, sin cascada recursiva o gasto automático.
- ADR-057: cinco calendarios administrables inicialmente deshabilitados, propuestas siempre con presupuesto cero y aprobación individual; contexto faltante se completa antes de aprobar. Límites/fencing/cancelación/recuperación de Fase 9 conservados. Fuentes externas solo por recuperación administrativa explícita de hosts permitidos; sin buscador/feed/crawler externo o métricas de buscadores inventados.

Operación y limitaciones en [BUSINESS_AGENTS.md](docs/BUSINESS_AGENTS.md). Pruebas de modelos identificadas TEST_FIXTURE, persistencia/worker PostgreSQL reales. Credenciales, presupuesto y primera ejecución OpenAI siguen pendientes. No Fase 11.

### Decisiones de Fase 11

- ADR-058: analítica de eventos propia en PostgreSQL, inicialmente deshabilitada y solo tras consentimiento. Cookies aleatorias HttpOnly/Secure/SameSite y hashes en DB; rutas públicas canónicas, sin IP/UA/consulta/email o fingerprinting. DNT/GPC, retirada/borrado y retención explícita; métricas son muestra consentida y seudónimos, no personas/audiencia auditada. Migración 16 aditiva: diez entidades para sesiones/eventos/rate limits, programas/enlaces/conversiones/evidencia de afiliados, gastos, experimentos e importaciones. Total 45 modelos/dieciséis migraciones; conserva todos los dominios anteriores.
- ADR-059: conversiones newsletter/leads solo desde operaciones reales de backend, atribución opcional idempotente sin revertir el negocio si falla. Totales de negocio separados de tráfico consentido y de atribución parcial; no tasas inventadas. Retirada elimina eventos locales pero conserva registros con finalidad propia.
- ADR-060: GA4 Measurement Protocol exclusivamente servidor, sin SDK de navegador, solo datos consentidos/validados. Modos disabled/validation/live, barrera y estados de entrega sin retries ciegos; HTTP aceptado no acredita ingestión. Adaptadores de informes GA4 Data/Search Console con OAuth readonly, endpoints oficiales, consulta manual y snapshots sin términos/datos personales. Periodos/fuentes/timezones separados. Sin credenciales, no configurado y sin llamadas reales.
- ADR-061: afiliaciones administrables con hosts exactos, HTTPS, divulgación rel=sponsored/no-follow y redirect controlado/no-store/noindex, tracking únicamente consentido. Conversiones solo por contrato de proveedor HMAC autenticado, ventana/replay/idempotencia, prueba de cuerpo/fecha y reversión inmutable. No conversiones manuales ni estimaciones de comisión desde clics; ningún socio real integrado sin su configuración/adopción del protocolo.
- ADR-062: registro de gastos auditado sin ejecutar pagos, dinero entero por moneda, bruto confirmado PRODUCTION y comisiones verificadas devengadas separados de gastos/estimaciones IA/reservas inciertas. TEST_FIXTURE y Sandbox excluidos de ingresos/costes reales; sin conversión COP/EUR/USD o beneficio garantizado. Evolución UTC propia y calendarios externos explícitos.
- ADR-063: oportunidades sobre muestra acotada y categorías/enlaces reales, experimentos como propuestas/observaciones sin activar A/B. CEO recibe analytics_summary agregado y snapshots existentes sin PII/claves/fetch externo, conservando motor/aprobación/límites. Migración actualiza solo perfil CEO conocido e invalida aprobación anterior por versión, sin activarlo o presupuestarlo.

Configuración, contrato de eventos/afiliados, privacidad, cálculos y límites en [GROWTH.md](docs/GROWTH.md). Auditoría de Fase 12 documentada abajo, sin activación comercial o publicación Git automática.

## Decisiones de auditoría / Fase 12

- ADR-064: mantener límites y aprobaciones al cerrar I/O: comprobación fresca del aprobador antes/durante/al persistir, cancelar si se revoca y conservar consumo. Uso reportado fuera de límites falla con reserva acotada/costKnown=false, sin desbordar SQL ni dejar lease pendiente. Herramientas/permisos/scheduler del motor común se conservan; proveedor real deshabilitado.
- ADR-065: ON_HOLD impide elegibilidad/publicación del anuncio y excluye ingresos confirmados en crecimiento/CEO. Sandbox nunca activa publicidad. El circuito local usa transporte Sandbox fixture y evidencia PRODUCTION separada en DB temporal; no prueba un cobro externo. Producción necesita adaptador/contratos/prueba autorizada posteriores.
- ADR-066: lote newsletter reducido de diez (ADR-040 histórico) a **dos** por acción humana, para acotar dos timeouts de 10 s bajo maxDuration 60 s. Rutas administrativas de newsletter/agentes/analítica declaran ese límite; no bucles/crons de envíos en funciones.
- ADR-067: seis rutas legales explícitas, contenido React escapado y configuración pública de operador/contacto/fecha; revisión pendiente visible, noindex y sin sitemap hasta declaración de revisión y política SEO. No catch-all que cambie el HTTP 404; no derivar identidad desde credenciales privadas.
- ADR-068: CSP básica base/object/frame/form y HSTS en configuración HTTPS, sin afirmar protección script-nonce completa; preservar React/validación de contenido y comprobar headers del host final. Readiness privado separado de liveness público, bearer constante, sin PII o comunicaciones externas.
- ADR-069: deploy/status aceptan MIGRATION_DATABASE_URL operativa, runtime sigue con DATABASE_URL mínimo. Build/CI no migran ni siembran producción; vercel.json solo prepara framework/build. Gates de lanzamiento read-only requieren evidencia humana incluso si están verdes. Intentos históricos rolled-back resueltos no invalidan el historial activo; hashes/SQL intactos.
- ADR-070: retención operativa en CLI dry-run por defecto, aplicación explícita acotada a analítica/sesiones/buckets y auditoría; nada de borrado automático de negocio. Backup/restore locales no sustituyen cifrado/custodia/PITR en destino. Worker local refrescado con cinco perfiles/calendarios deshabilitados; supervisor remoto no verificado.

Estructura añadida: `/privacy`, `/terms`, `/cookies`, `/advertising`, `/affiliates`, `/contact`, `server/ops/readiness`, `/api/internal/readiness`, `scripts/launch-check.ts` y `scripts/maintenance.ts`. **45 modelos/16 migraciones; sin cambios de esquema o lockfile en esta fase.** Lista de lanzamiento, límites y operación: LAUNCH_CHECKLIST.md, AUDIT_REPORT.md y docs/PRODUCTION.md.


## Decisiones de preparación del lanzamiento público — 27-10-2026

- ADR-071: SEO exige la declaración humana PUBLIC_LAUNCH_CONFIRMED y configuración legal completa/revisada, además del flag SEO/HTTPS/no-demo. No se infiere aprobación jurídica o catálogo real de un build. GSC HTML-tag con valor público suministrado por el propietario; verificación de propiedad e indexación dependen de Google.
- ADR-072: AdSense modular en componentes de servidor/cliente existentes. Un SDK deduplicado, apagado por defecto, publisher y slots reales, aprobación de sitio/ubicaciones y CMP certificada declaradas antes de permitirlo. Google Privacy & messaging es el único adaptador inicial; TCF estricto mundial y DNT/GPC/opt-out prevalecen. No sustituir el consentimiento con el banner de analítica. Navegación tras cargar SDK usa documentos nuevos porque desmontar React no descarga JavaScript. Auto Ads requiere configuración/revisión en Google; modo manual no puede anular una cuenta remota con Auto Ads encendido.
- ADR-073: informes opcionales Management API v2 de solo lectura, dominio exacto de SITE_URL, consulta manual protegida/autorizada de nuevo al cerrar I/O, decimales sin float, estimaciones/calendario/moneda/fuente explícitos. Auditoría sin introducir importes en libros financieros o snapshots GA4/GSC; no nuevas tablas. Sin credencial no hay consulta o ceros inventados.
- ADR-074: loading enviaba HTTP 200 antes de notFound incluso resolviendo metadata. Proxy Node realiza SELECT de identidad pública por slug antes de transmitir respuesta, reutiliza singleton/visibilidad y reescribe faltantes a la vista 404 existente. DB falla con diagnóstico sanitizado; no devuelve ausencia artificial. Se conserva streaming de rutas válidas; medir consulta adicional/pool/latencia en destino. Breadcrumbs visibles/JSON-LD y Organization/WebSite representan la marca/contenido, sin ratings/precios inventados.

No publicación/indexación/anuncios/servicios activados desde este entorno. No credenciales humanas, cuenta Google o patrocinadores inventados. Capacidades y verificación real separadas en docs/PUBLIC_LAUNCH.md.

## Decisiones SEO, rendimiento y medición — 28-10-2026

- ADR-075: hubs públicos por categorías ya existentes, seleccionados por relaciones realmente publicadas. Categoría sin contenido no existe públicamente; con un solo registro es navegable pero noindex/excluida del sitemap por política editorial. About distingue fuente oficial, propuesta editorial y ensayo práctico. Sin nuevas tablas, taxonomías o datos remotos.
- ADR-076: metadatos y cuerpo comparten consultas por React cache y claves primitivas, limitadas a cada petición. Tarjetas usan DTOs ligeros; detalles conservan campos completos. Introducción/encabezados se separan de consultas en Suspense para no retrasar el contenido principal con metadata dinámica; los fallos siguen propagándose. Reducir prefetch de links numerosos limita lecturas sin ocultar errores ni persistir datos obsoletos.
- ADR-077: paginación real tiene título/canonical propios; filtros, queries en detalles, vacíos y páginas fuera de rango son noindex. Sitemap solo contiene contenido público canónico y hubs con cobertura; fechas únicamente de registros persistidos. CollectionPage/ItemList usa elementos realmente visibles, sin precios, reviews o SoftwareApplication ficticios.
- ADR-078: reportes Google existentes ampliados sin nuevo tracking o esquema. GA4 manual por seis dimensiones, host exacto, métricas acotadas y rutas privadas/queries excluidas; snapshots persistentes y límites de Measurement Protocol explícitos. AdSense añade tallies, RPM/CTR/cobertura oficiales, conserva decimales/rangos/moneda y nunca se suma a ingresos confirmados. Tokens solo servidor, autorización/Origin/CSRF/auditoría intactas; ningún proveedor llamado por abrir el panel.

La importación remota inicial ya fue confirmada por el propietario y Actions SUCCESS; no se repite. La nueva UI/metadata se valida en PostgreSQL/browser efímeros y Lighthouse local; CI, SHA Live, métricas de campo y aprobación Google/legales se distinguen. Estrategia y ocho semanas en docs/SEO_STRATEGY.md, operación en docs/PUBLIC_LAUNCH.md.

## Blueprint Engine — entrega 1, 29-10-2026

- ADR-079: releases con manifiesto tipado en SiteSetting por id@SemVer y transiciones auditadas en AuditLog dentro de una transacción/bloqueo por versión. Sin modificar Prisma o migraciones. Asociación lógica por slug de UseCase, fijando updatedAt al revisar; autorización del servidor, publicación solo OWNER/ADMIN y versiones inmutables después de verificar. Ningún dato importado se edita.
- ADR-080: objetos privados por SHA-256 fuera de public/Git/build, POSIX 0700/0600, sin upload/fetch/ejecución. GET attachment valida bytes, formato, rutas y guía vigente; revalida aprobación antes de responder, sin caché/rangos, errores sanitizados y admisión acotada por proceso. Atribución separada del JSON oficial; no se afirma compatibilidad práctica sin ensayo.
- ADR-081: AnalyticsEvent tiene CHECK cerrado que excluye descargas. Preparar un descriptor consentido y deduplicable reutilizando AnalyticsSession, sin escrituras o métrica de sustitución. Activar persistencia requiere autorización posterior y controles de límites/retención/retirada. No cambiar las 16 migraciones o activar tracking por preparar el hook.

No UI o blueprint real publicados. Store privado efímero de tests no acredita persistencia en Render; provisioning y almacenamiento durable deben aprobarse por separado. Contrato: docs/BLUEPRINT_ENGINE.md.

Contrato de asociación para la siguiente interfaz: publicBlueprintsForGuide(slug, after?) devuelve hasta 20 versiones explícitas y cursor público, con revalidación por descriptor. No aliases latest, claves privadas o listados de drafts. Sin componentes ni ruta HTTP de listado en esta entrega.

## Blueprint Engine — entrega 1.5

- ADR-082: proveedor de almacenamiento privado separado del registry SQL: local POSIX compatible y Neon S3, selección explícita de servidor y sin fallback. S3 por SHA, TLS, credenciales independientes de PostgreSQL, ACL/policy de lectura comprobadas, operaciones limitadas en tiempo/tamaño, no borrados/presignado. CLI reutiliza login privado y exige OWNER/ADMIN/DRAFT no sellado; almacenar no publica. Lectura final revalida bytes y autorización. Head solo presencia, inspect integridad. No se depende de versionado/lifecycle S3 no aplicados por Neon. Configuración y pruebas reales remotas pendientes, límites/cuotas y evidencia oficial en docs/BLUEPRINT_STORAGE.md.

## Blueprint Engine — entrega 2

- ADR-083: discovery/selección sobre servicios existentes, sección Server Component en Suspense y pequeño botón cliente; cero bytes de objeto en page view, disponibilidad metadata acotada/errores visibles. Varias versiones requieren elección; queries de selector/cursor permanecen noindex y canonical de guía. Presentation opcional sin defaults preserva digests sellados; arquitectura conceptual/atribución/requisitos se revisan en la misma transición. React escapa textos y el frontend no publica. Descarga exacta mediante API/Blob sin correo/cookies, con estados honestos; no nuevo tracking, lead backend, integración o contacto inventado. Contrato y pruebas en docs/BLUEPRINT_INTERFACE.md.
