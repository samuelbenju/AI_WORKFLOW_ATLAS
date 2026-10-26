# Auditoría final — Fase 12

Fecha: 26-10-2026 UTC. Checkout existente `/workspace/Quesito`, repositorio oficial `samuelbenju/AI_WORKFLOW_ATLAS`. **La plataforma está implementada y probada localmente, pero no está lista para lanzamiento comercial en producción.** No se desplegó, publicó, compró, envió correo externo o ejecutó un cobro/modelo real. Evidencia de comandos en BUILD_LOG.md; pendientes accionables en LAUNCH_CHECKLIST.md.

## 1. Funcionalidades verificadas

| Área solicitada | Evidencia local y límite |
| --- | --- |
| Plataforma pública | Home con consultas PostgreSQL, navegación, estados reales de carga/error/vacío y 404. |
| Directorios | Listados/fichas de herramientas y casos; demos solo bajo flag/aviso. |
| Búsqueda | Consultas reales y validación; términos no almacenados en eventos. |
| Filtros | Categorías/tags, ordenamiento y paginación comprobados en DB/navegador. |
| Blog | Listado/detalle, relacionados, fuentes y contenido estructurado sin HTML arbitrario. |
| CMS | Crear/editar/revisar/publicar/despublicar con autorización y versiones; editar invalida revisión. |
| Autenticación | Login correcto/incorrecto, scrypt, sesión opaca hasheada, expiración, logout y revocación. Cuenta humana pendiente. |
| Administración | Rutas/API privadas, permisos por operación, CSRF/Origin, validación y relaciones. |
| Patrocinios | Cuatro paquetes administrables, solicitud consentida, firma y referencia persistida. |
| CRM | Empresas, leads, estados, notas, propuestas y campañas revisadas con auditoría. |
| Newsletter | Consentimiento/doble opt-in/baja, duplicados, borradores, audiencia y entregas persistidas con captura aislada. Sin Resend real. |
| Órdenes | Precios/moneda del servidor, referencias únicas, historial y rechazo de manipulación. |
| Pagos Sandbox | Adaptador/firma/consulta/conciliación/idempotencia/rechazos probados con transporte fixture. Sin transacción externa. |
| Agentes | Motor común, roles/herramientas, resultados persistidos, presupuestos, leases, concurrencia, reintentos y cancelación. Proveedor TEST_FIXTURE. |
| Automatizaciones | Propuestas programadas idempotentes, aprobación/budget humano, supervisor Docker y recuperación. Cinco reales deshabilitadas. |
| Analítica | Consentimiento/DNT/GPC/retirada, eventos propios, agregados, finanzas por moneda y snapshots de importación de prueba. Google real no configurado. |
| Afiliados | Gestión, divulgación/redirect seguro, clics consentidos, webhooks HMAC de contrato local y reversión. Sin socio/conversión comercial real. |
| Base de datos | PostgreSQL 17, 45 modelos, 16 migraciones; integridad/constraints/seed reproducible y backup/restauración locales. |
| SEO | Metadata/canonical/OG/schema, sitemap/robots y control noindex; sin activar indexación de preestreno. |
| Móvil | Chromium escritorio/Pixel y ancho 320 px, teclado, reduced motion, tablas/controles y axe. No certifica todos los dispositivos o WCAG integral. |

## 2. Funcionalidades incompletas

Falta administrador humano inicializado, contenido editorial revisado/publicado, identidad/contacto/políticas efectivos, dominio/HTTPS e infraestructura de producción. Solo existe proveedor de pagos Sandbox: **no hay un checkout de producción operativo**; la publicidad pagada exige evidencia PRODUCTION legítima y aprobación. Reembolsos/disputas y operación comercial real necesitan trabajo/autorización adicionales. Las seis políticas son borradores y no certifican cumplimiento.

Resend, Wompi externo, Google, socios afiliados y OpenAI necesitan configuración y pruebas reales autorizadas. GA4/GSC usan credenciales OAuth renovables por operador, sin flujo automático de refresh. No hay alertas externas o cron de retención contratados/configurados, pruebas de carga representativa, CI remota ejecutada o restauración/PITR en destino. El worker local no demuestra disponibilidad del futuro host cuando este entorno se apague.

## 3. Pruebas ejecutadas

- Instalación reproducible aislada `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/atlas-phase12-npm-cache`; lockfile idéntico, instalación del checkout preservada. Primer intento falló por caché npm heredada no escribible, resuelto con caché temporal propia, sin permisos globales o cambios de red.
- `npm audit --json`: cero vulnerabilidades reportadas, sin añadir o actualizar dependencias.
- Validación/generación Prisma, ESLint sin warnings, TypeScript estricto y **45/45 pruebas unitarias**, sin fallos.
- `npm run test:db`: **87/87**, DB temporal PostgreSQL, migraciones aplicadas y segundo deploy sin cambios; 82 previas y cinco nuevas regresiones/circuitos de auditoría.
- Build de producción exitoso y suite final E2E completa Chromium escritorio/móvil: **108/108**. Primera ejecución detectó cuatro fallos del nuevo 404 (dos pruebas en dos dispositivos), corregidos antes de repetir la navegación.
- `test:agent-service`: heartbeat, propuesta persistida, recuperación de contenedor sin duplicación y **cero llamadas IA**, DB/contenedor temporales.
- Backup local privado y restore a DB temporal: conteos de todas las tablas coinciden; sin tocar datos funcionales. Mantenimiento CLI dry-run, cero sesiones antiguas, sin borrados.
- `launch:check`: diagnóstico bloqueado esperado, sin secretos en salida. Migraciones revisadas respetando intentos históricos resueltos/rolled-back; no se reescribieron SQL ni checksums.

### Circuito comercial integral

Artículo público → selección de paquete → formulario firmado/consentido → lead en PostgreSQL → CRM/empresa/WON → orden de precio servidor → checkout Sandbox → webhook con checksum y consulta de proveedor **fixture** → evento/transacción idempotentes. Dos recepciones del evento conservan una transacción. Intentar aprobar/entregar la campaña con ese pago se rechaza: SANDBOX_ONLY.

En la misma DB temporal, una **orden separada de evidencia PRODUCTION ficticia** prueba revisión humana → aprobación → activación/publicación del slot durante periodo y producto válidos. ON_HOLD retira la entrega. Esa fixture nunca se ejecuta en desarrollo/producción ni convierte el pago Sandbox a producción. El circuito extremo a extremo con dinero externo/publicación comercial **no está verificado** y está bloqueado deliberadamente.

### Circuito de agentes

Tarea horaria vencida → scheduler materializa una propuesta con presupuesto cero → aprobación humana con límite explícito → motor común → CEO con snapshot/analytics_summary limitado → proveedor TEST_FIXTURE → producto persistido PENDING_REVIEW → aprobación humana → reporte/auditoría. Las suites anteriores también cubren delegación a especialistas, herramientas prohibidas, borrador CMS, evidencia/versiones, costes, errores e interrupciones. No se afirma una ejecución de OpenAI.

## 4. Fallos detectados

| Hallazgo | Riesgo/impacto | Estado |
| --- | --- | --- |
| Revocación del aprobador después del claim | Un usuario revocado podía conservar el resultado de una tarea aprobada antes. | Corregido y regresión de revocación durante I/O. |
| Uso reportado superior a reserva/capacidad SQL | Desbordamiento de contadores o tarea RUNNING sin cierre y contabilidad indebida. | Corregido y regresión MAX_SAFE_INTEGER. |
| Orden PAID retenida por revisión | Una campaña podía seguir siendo elegible pese a ON_HOLD; reportes podían incluirla. | Corregido en condiciones, lectura pública y agregados financieros/CEO. |
| Lote newsletter de diez con timeout por destinatario | Posible exceso del tiempo de función y resultado incierto. | Reducido a dos y duración explícita 60 s. |
| Snapshot worker desactualizado de Fase 11 | CEO podía conservar filtros anteriores. | Snapshot actualizado y scheduler/restart comprobados. |
| Ruta legal genérica nueva devolvía 200 para URL inválida | Regresión SEO/navegación descubierta por E2E. | Reemplazada por seis rutas explícitas, preservando 404 existente. |
| Diagnóstico inicial contaba intentos de migración resueltos como activos | Falso bloqueo en historial con un rollback histórico legítimo. | Diagnóstico corregido y prueba de historial activo/duplicado/editado/incompleto. |

## 5. Correcciones y defensas añadidas

Aprobador activo/rol comprobados antes del dispatch, durante polling y al persistir; abortar no anula el uso ya realizado. Uso inválido falla con USAGE_OUT_OF_BOUNDS, conserva reserva acotada como estimación incierta y no escribe tokens desbordados. Preservadas aprobaciones por versión/contexto, fencing, cuotas y recuperación. ON_HOLD excluido de publicidad/ingresos confirmados; no se habilitó producción.

Headers globales anti-frame, nosniff, Referrer/Permissions y CSP básica de base/object/frame/form. HSTS solo para configuración HTTPS y debe probarse en dominio final. La CSP **no** incluye nonces/script-src y no se presenta como mitigación completa de XSS; contenido escapado/bloques tipados, entradas Zod y ausencia de HTML arbitrario siguen siendo barreras principales. Se añadieron readiness privado, diagnóstico read-only de lanzamiento y mantenimiento explícito/dry-run.

## 6. Riesgos y verificaciones pendientes

Revisión de seguridad independiente y operación en host final; PostgreSQL TLS/rol/pool, backups cifrados/PITR, renovaciones/rotación, recuperación de secretos, alertas, carga y navegadores reales. Rate limits globales conservadores pueden requerir ajuste con tráfico legítimo. Consentimiento/retención del host y solicitudes de derechos necesitan responsable/procedimientos.

ESLint 9.39.5 está fuera de soporte: plugins oficiales aún restringen compatibilidad; actualizar conjunto compatible antes de lanzamiento. pg emite aviso de consultas concurrentes y Prisma WASM es experimental en Node; suites actuales pasan, revisar compatibilidad antes de actualizar pg 9. npm audit no sustituye revisión de código o pentest. Riesgo residual de prompt injection se limita con datos no confiables, salida estructurada y herramientas cerradas; requiere revisión humana y no se declara eliminado.

## 7. Integraciones que necesitan credenciales/evidencia

| Integración | Pendiente |
| --- | --- |
| Vercel/PostgreSQL/monitor | Cuentas/host autorizados, bindings privados, TLS/rol, backups y dominio; sin crear recursos. |
| Resend | API key, remitente/dominio autenticados, destinatario autorizado y entrega/baja reales. |
| Wompi Sandbox | Claves de prueba, contraste oficial vigente, checkout/webhook/conciliación externos. Proxy bloqueó documentación en fase previa; no eludido. |
| Wompi producción | **Proveedor no implementado**, contratos/onboarding/fiscalidad y nueva autorización de desarrollo/cobros. |
| OpenAI | API key autorizada, modelo/tarifas/presupuesto explícitos y primera llamada controlada; no recurrencia. |
| GA4/GSC | Propiedad y credenciales readonly/Measurement Protocol según modo, consentimiento y evidencia real. |
| Afiliados | Acuerdo/credencial HMAC y protocolo de proveedor verificable; no ventas inferidas de clics. |

Claves locales de firma/formularios/newsletter ya existen privadamente para desarrollo, fuera de Git; no son credenciales de proveedor o autorización de envío. No se necesitan secretos para revisar este informe.

## 8. Costes potenciales

Web/egress/funciones, PostgreSQL/conexiones/almacenamiento/backups/PITR, worker continuo, dominio, monitoreo y correo según uso/plan; OpenAI por modelo/tokens/reintentos y Wompi por contrato/impuestos/liquidación. Afiliación según acuerdo. No se compraron servicios ni se asignaron presupuestos. Consultar precios actuales, límites y moneda antes de contratar; no hay conversión FX o estimaciones monetarias inventadas. El control local de IA es estimado, requiere tarifas correctas y tope del proveedor además de la aplicación.

## 9. Preparación de producción

CI GitHub solo valida y conserva reportes de fallo, permisos contents:read, PostgreSQL efímero y E2E serial por DB compartida. `vercel.json`, `.env.example`, puertas `launch:check`, seis políticas, readiness y runbook preparados. Ninguna migración/seed, cron, publicación o cuenta remota se activa desde build/CI. La CI remota y configuración real del destino siguen sin comprobar.

Git conserva Fase 11 en commit local `86c5323ba939d34d152b4f1c14e47f7022e2c895`, padre/remota `1b468492d0d761f71706bf252ab25935ee3ce83d`; Fase 12 sin commit/push por esta auditoría. Revisión de secretos y estado final en BUILD_LOG.md. No se afirma sincronización de cambios locales con GitHub.

## 10. Instrucciones de operación

Seguir [docs/PRODUCTION.md](docs/PRODUCTION.md): instalación/versiones, migración operativa separada, bootstrap interactivo, diagnóstico, monitor privado, retención manual, backup/restore, conciliación de resultados inciertos e incidentes/rollback. Completar y firmar [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) antes de solicitar autorización de despliegue. No usar tests/fixtures/seed contra una DB productiva ni publicar datos privados.

## 11. Activación de agentes

Todos permanecen deshabilitados y presupuesto cero, sin key o ejecución real. Autorizar primero una prueba pequeña con precio/techo revisados, snapshot actualizado y supervisor real comprobado; aprobar una tarea humana y revisar uso/producto. Cada automatización se habilita por separado con autorización de recurrencia y coste. CEO propone sin conceder presupuesto, editor guarda DRAFT, comercial no envía ni cambia finanzas; ninguna herramienta permite shell/pagos/permisos/publicación automática.

## 12. Plan comercial inicial y cumplimiento

Catálogo pequeño curado, artículos útiles con fuentes actuales y revisión humana, newsletter doble opt-in; medir muestra consentida sin prometer audiencia. Paquetes revisados, solicitudes entrantes y propuestas manuales, piloto con contratos/criterios claros. Entrega pagada solo tras proveedor de producción auditado, pago legítimo confirmado y aprobación de campaña. Afiliación con divulgación y evidencia de proveedor. Revisión semanal de datos reales y experimentos propuestos; ningún ingreso garantizado o contacto masivo autorizado.

Antes de operar desde Colombia: abogado/contador deben revisar aplicabilidad de Ley 1581/2012 y Decreto 1074/2015, políticas/autorizaciones/derechos, RNBD/SIC según sujeto/umbrales, responsables/encargados y transferencias/transmisiones internacionales; Ley 1480/2011 y reglas de comercio electrónico cuando correspondan, retracto/reversión, información comercial y reclamos; RUT/CIIU, forma jurídica/régimen, IVA/retenciones y facturación electrónica DIAN; contratos de patrocinio/afiliados, publicidad identificada, derechos de contenido/marca/dominio y obligaciones de mercados extranjeros. Son temas pendientes de asesoría, no dictamen de aplicabilidad o cumplimiento. Referencias institucionales para revisión: [SIC](https://www.sic.gov.co/), [DIAN](https://www.dian.gov.co/), [SUIN-Juriscol](https://www.suin-juriscol.gov.co/). No se declara verificada la vigencia normativa mediante esta auditoría técnica.
