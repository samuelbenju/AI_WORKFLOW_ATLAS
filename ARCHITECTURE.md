# Arquitectura

## Estado y límites

Fase 1: aplicación web ejecutable, shell público, configuración validada, componentes, comprobaciones y CI. No existen aún base de datos, login, directorios, CMS, newsletter, pagos ni agentes operativos. Esas capacidades se describen como contratos futuros, no implementaciones disponibles.

## Componentes actuales

```text
Navegador
  └─ Next.js App Router
      ├─ /                 página pública (Server Component)
      ├─ rutas inexistentes → not-found.tsx / HTTP 404
      ├─ /api/health       liveness HTTP 200, sin dependencias externas
      ├─ components/      layout, marca, diagrama ilustrativo
      └─ lib/config/      Zod + configuración de origen en servidor
```

La UI no contiene lógica comercial. Los enlaces apuntan a secciones implementadas; no se ofrece búsqueda ni suscripción inactiva. El diagrama es una ilustración, no una ejecución de agentes. No hay datos comerciales o métricas ficticias.

## Decisiones registradas

| Decisión | Motivo y consecuencias |
| --- | --- |
| ADR-001: monolito modular Next.js | Un solo repositorio, despliegue y runtime inicial; Route Handlers y Server Actions según cada operación futura. Evitar microservicios sin necesidad. |
| ADR-002: Node 24 / npm 11, dependencias exactas | Runtime disponible y compatible con Next.js 16.4.3 + React 19.3.1. `.nvmrc` fija 24.19.0; lockfile reproducible; TypeScript 5.9.3 estable satisface el contrato de Next sin incorporar TS 7 innecesariamente. |
| ADR-003: CSS de diseño + Tailwind 4 | Tailwind integrado por PostCSS; tokens en `@theme`, clases semánticas para composición del shell y media queries. Sin librería de componentes adicional. Lucide para iconos locales. |
| ADR-004: Server Components por defecto | No JS de cliente propio para una portada estática. Menú móvil mediante `details`/`summary`, sin SDK externo ni llamadas a APIs. |
| ADR-005: aplazar infraestructura por fases | PostgreSQL/Prisma en Fase 2; auth en 4; email en 7; Wompi en 8; IA/worker en 9–10. No instalar servicios, SDK ni pedir credenciales antes de utilizarlos. No cambia la arquitectura exigida. |
| ADR-006: internacionalización incremental | `lang=en`, configuración `publicLocale=en` y `adminLocale=es`. Inglés público y español administrativo. Añadir routing/diccionarios al implementar localización; no afirmar que exista traducción actualmente. |
| ADR-007: sin indexación durante desarrollo | Meta robots y `X-Robots-Tag: noindex, nofollow` en todas las rutas. SEO completo en Fase 5; retirar bloqueo solo tras revisión de lanzamiento. `SITE_URL` validado en servidor; no dominio inventado. |
| ADR-008: CI + navegador real | ESLint, tipos, tests unitarios, build y Playwright en Chromium desktop/móvil; dos workers, sin reintentos que oculten fallos. Soporte explícito para Chromium del entorno. |
| ADR-009: fuentes del sistema | No descargar fuentes de Google en build ni añadir llamadas externas al cargar la portada. Marca e icono originales en código/SVG local. |
| ADR-010: compatibilidad del linter | ESLint 9.39.5 está marcado como fuera de soporte por npm; se conserva temporalmente porque los plugins React/import/jsx-a11y de la configuración oficial Next declaran compatibilidad hasta 9. No forzar ESLint 10 ni ignorar peer dependencies. Sin vulnerabilidades reportadas en el audit de esta ejecución; revisar actualización conjunta antes de lanzamiento. |

## Estructura y reglas de extensión

- `src/app/`: rutas, metadata, HTTP y composición. Componentes servidor por defecto.
- `src/components/`: presentación reusable. No consultas Prisma ni permisos en componentes de cliente.
- `src/lib/config/`: validación de configuración. `site.ts` marcado `server-only`; no exponer secretos con `NEXT_PUBLIC_`.
- En futuras fases, `src/server/<dominio>/` contendrá servicios, validación, repositorios y adaptadores usados por Route Handlers/Server Actions. Crear módulos solo cuando tengan código real.
- `prisma/` se añadirá en Fase 2: schema, migraciones revisadas y seeds de desarrollo. No usar `db push` como sustituto de migraciones de producción.
- `tests/`: contratos de configuración y comportamiento real HTTP/navegador; no depender de servicios ficticios.

## Persistencia y seguridad futuras

PostgreSQL será fuente de verdad. Modelos por fase según `PRODUCT_SPEC.md`; índices para slugs/estados/fechas, restricciones únicas para referencias e idempotencia. Transacciones en cambios comerciales relacionados. Importes enteros en unidades mínimas y moneda explícita, nunca floats para dinero.

Auth.js es la opción prevista en Fase 4, pendiente de proveedor confirmado; sesión HttpOnly/Secure/SameSite, roles y autorización por operación servidor. No crear `/admin` sin protección. Contenido editorial estructurado y saneado; nunca renderizar HTML externo sin validación. Formularios necesitarán límites y protección CSRF/origen según mecanismo.

Controles actuales: escape de React, validación Zod de `SITE_URL`, headers nosniff/frame denial/referrer/permissions, ausencia de captura de datos y de secretos. **No constituyen auditoría completa.** CSP con nonce requiere diseño compatible con Next al introducir scripts/clientes; HSTS depende de HTTPS de producción. No aplicar políticas que rompan hidratación sin verificarlas.

## Contratos de integraciones (pendientes)

### Pagos

`PaymentProvider` expondrá creación de checkout, validación de eventos y consulta/conciliación. Orden y precio se obtienen en servidor, referencia única e importe COP en unidades mínimas. Adaptador Wompi Sandbox firma según documentación vigente. Webhook autenticado y eventos idempotentes actualizan transacciones en una transacción DB; retorno del navegador nunca confirma pago. Campaña requiere aprobación separada. No almacenar PAN/CVV. Producción deshabilitada hasta autorización.

### Correo

Adaptador de Resend o equivalente para confirmación/baja y envíos aprobados; consentimiento persistido, tokens de acción con expiración, lista de supresión e idempotencia. Un mensaje enviado debe corresponder a un evento real del proveedor. Dominio remitente verificado y credenciales se pedirán únicamente cuando se integre.

### IA y tareas

Proveedor intercambiable; OpenAI Responses API cuando corresponda, esquema de salida validado, allowlist de herramientas, registro de modelo/tokens/coste, tiempo máximo y reintentos limitados. Fuentes externas no pueden modificar instrucciones ni obtener secretos.

Scheduler desplegado invoca un worker acotado. Tareas en PostgreSQL con idempotency key única, lease con expiración, concurrencia limitada, retry/backoff, presupuesto y cancelación; estados propuestos: pendiente, en ejecución, pendiente de aprobación, completada, fallida, cancelada. Reservar presupuesto antes de llamadas y reconciliar uso. Diseñar continuidad tras caída, no bucles en serverless. La elección final de scheduler depende del hosting y sus límites antes de Fase 9.

Publicar contenido, enviar correo/propuestas, activar campañas o gastar requiere autorización por riesgo. El agente CEO propone y coordina dentro de ese límite; no amplía permisos.

## Flujos comerciales y auditoría previstos

Solicitud validada → lead persistido → aprobación humana → orden calculada en servidor → checkout Sandbox → webhook verificado → transacción conciliada → aprobación de campaña → publicación identificada → reporte con datos reales.

Logs con IDs de correlación, actor, entidad, transición y fecha; sin secretos, tarjetas ni datos personales innecesarios. Diferenciar comisiones, gastos, ingresos brutos, liquidaciones y neto. Definir retención por tipo de dato y acceso mínimo.

## Operación, costes y recuperación

No hay servicios facturables configurados. Desarrollo Fase 1 es local; disponibilidad de créditos/planes gratuitos no se presupone. Objetivo futuro US$0–100/mes no autoriza gasto. Hosting, DB, dominio, email, tokens IA, worker y comisiones necesitan evaluación y límites antes de alta.

Vercel o Node compatible será el destino previsto, aún no desplegado. Fase 2 definirá backups, restauración local de prueba y configuración administrada; antes de producción habrá RPO/RTO acordados, prueba de restauración, monitorización y rollback. Un snapshot de cloud no sustituye backups de PostgreSQL. CI está escrito pero su ejecución remota depende de subir el repo; no se ha publicado ni hecho push.

## Referencias oficiales consultadas

- Instalación Next.js: https://nextjs.org/docs/app/getting-started/installation (fuente oficial consultada vía https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/01-getting-started/01-installation.mdx).
- Plantillas oficiales Next.js para TypeScript, ESLint y Tailwind: https://github.com/vercel/next.js/tree/canary/packages/create-next-app/templates/app-tw/ts.
- Registro oficial npm para versiones y peer dependencies de Next.js, React y herramientas; versiones instaladas definitivas en `package.json`/`package-lock.json`.
- Para integraciones futuras consultar documentación oficial al implementar: https://www.prisma.io/docs, https://authjs.dev, https://docs.wompi.co, https://resend.com/docs, https://platform.openai.com/docs. Estas integraciones **no están validadas** en Fase 1.
