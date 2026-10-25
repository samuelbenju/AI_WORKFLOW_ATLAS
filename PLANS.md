# Plan de doce fases

Cada fase requiere solicitud expresa. La Fase 1 es la única autorizada en la primera ejecución. El orden respeta dependencias sin reducir el alcance final de `PRODUCT_SPEC.md`.

| Fase | Entrega | Dependencias | Criterios críticos de aceptación |
| --- | --- | --- | --- |
| 1 | Inicialización y arquitectura | Repositorio y Node compatible | Next App Router + React + TS estricto + Tailwind ejecutables; shell inglés responsive/accesible, estado honesto, configuración sin secretos, documentos permanentes, versiones/lockfile, CI escrita, lint/tipos/tests/build y arranque HTTP/navegador comprobados. |
| 2 | PostgreSQL y Prisma | 1; PostgreSQL accesible | Schema de categorías/tags/herramientas/casos y ajustes necesarios, migración versionada ejecutada, seed de desarrollo identificable y repetible, constraints/índices, consultas y persistencia probadas; instrucciones DB y ensayo de backup/restore de desarrollo. Sin crear tablas ajenas a esta fase. |
| 3 | Plataforma pública y directorios | 2 | Home conectada a datos, búsqueda real, filtros/categorías/tags, paginación y ordenamiento; fichas tools/use cases con problema, pasos, dificultad, referencias y limitaciones; vacíos y 404; pruebas contra DB y navegador móvil. |
| 4 | Auth y administración | 2–3; proveedor auth configurado | Sesiones seguras, roles y `/admin` español; permisos servidor por operación, CRUD de categorías/herramientas/casos y auditoría; pruebas negativas de acceso, CSRF/origen y cierre de sesión; nunca usar indicadores comerciales inventados. |
| 5 | Blog, contenido y SEO | 3–4 | Articles/ContentDraft, flujo borrador/revisión/publicación, guías/comparativas/tutoriales y relacionados; metadata/canonical/OG/schema adecuados, sitemap/robots y RSS si aporta valor; sanitización; comprobaciones de render/índice y edición autorizada. No indexar pre-lanzamiento incompleto. |
| 6 | Patrocinios y CRM | 4–5 | Sponsor/Package/Campaign/Lead; cuatro productos y precios administrables; solicitud real validada/persistida, revisión/aprobación/estados/auditoría y espacios etiquetados; pruebas de integridad de precios y permisos. Pago todavía pendiente de 8. |
| 7 | Newsletter | 4–6; email/dominio verificados | Consentimiento persistente, confirmación/baja, supresión, admin y borradores/plantillas/historial/patrocinios; flujo real con proveedor en destinatario autorizado; límites/idempotencia/privacidad; no campañas masivas sin autorización. |
| 8 | Wompi Sandbox | 6; credenciales Sandbox | Órdenes/referencias/moneda/importe servidor, firmas oficiales, checkout, webhook auténtico idempotente, estados/eventos y conciliación; probar pago Sandbox y rechazar firmas/repeticiones/manipulación; campaña requiere aprobación. Sin producción ni tarjetas almacenadas. |
| 9 | Infraestructura de agentes | 4; DB y proveedor IA/scheduler configurados | Agent/Task/Execution persistidos, adaptador Responses API y modelos, presupuesto/consumo, allowlist, leases, concurrencia/cancelación/reintentos acotados; worker/scheduler fuera de Codex; pruebas reales autorizadas y de caídas/idempotencia; logs y aprobación. |
| 10 | Cinco agentes | 5–9 | CEO/investigador/editor/SEO/comercial configurados, prompts y herramientas versionados; ejecuciones reales y fuentes, borradores/reportes; adversarial prompt injection y approvals; ninguna publicación/comunicación sin control humano. |
| 11 | Analítica, crecimiento y afiliados | 3–10; medición configurada | Conversión y eventos reales, afiliados etiquetados, Search Console y GA4/equivalente según consentimiento; reportes que distinguen bruto/pago/comisión/gasto/neto; no métricas sintéticas en dashboard; premium solo si hay demanda validada. |
| 12 | Auditoría y preparación de lanzamiento | 1–11; decisiones del propietario | Revisión integral funcional/seguridad/permisos/abuso/webhooks/UX móvil/consumo; políticas y contacto editables, revisión jurídica Colombia e internacional, nombre/dominio, presupuestos, backups/restauración, alertas/rollback; build y E2E; lista de pendientes real. Publicar/activar cobros/envíos solo con autorización. |

## Condiciones comunes

- Validar con herramientas reales; distinguir aprobado, fallido, omitido y no ejecutado.
- Credenciales faltantes no justifican integraciones falsas. Completar trabajo independiente y documentar el bloqueo exacto.
- Ninguna fase se marca completa con requisitos críticos pendientes. Un fallo confirmado de producto y un bloqueo del entorno se registran por separado.
- Actualizar contratos y migraciones de manera incremental, conservando datos y módulos funcionales.
- Mantener `PROGRESS.md` como estado resumido y `BUILD_LOG.md` como evidencia de comandos y resultados.
- Pruebas y costes de integraciones necesitan límites y autorización específica de operaciones externas; el presupuesto orientativo no es autorización de gasto.
