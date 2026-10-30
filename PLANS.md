# Plan de doce fases

Cada fase requiere solicitud expresa. La Fase 1 es la única autorizada en la primera ejecución. El orden respeta dependencias sin reducir el alcance final de `PRODUCT_SPEC.md`.

| Fase | Entrega | Dependencias | Criterios críticos de aceptación |
| --- | --- | --- | --- |
| 1 | Inicialización y arquitectura | Repositorio y Node compatible | Next App Router + React + TS estricto + Tailwind ejecutables; shell inglés responsive/accesible, estado honesto, configuración sin secretos, documentos permanentes, versiones/lockfile, CI escrita, lint/tipos/tests/build y arranque HTTP/navegador comprobados. |
| 2 | PostgreSQL y Prisma | 1; PostgreSQL accesible | Según la solicitud expresa de ejecución 2/12: modelos de usuarios/roles, contenido, patrocinios, pagos, newsletter, agentes, configuración y auditoría; migraciones versionadas ejecutadas, seed identificable/repetible, constraints/índices, repositorios, consultas e integridad probadas; instrucciones y ensayo de backup/restore. Solo persistencia, sin implementar interfaces o integraciones de fases posteriores. |
| 3 | Plataforma pública y directorios | 2 | Home conectada a datos, búsqueda real, filtros/categorías/tags, paginación y ordenamiento; fichas tools/use cases con problema, pasos, dificultad, referencias y limitaciones; vacíos y 404; pruebas contra DB y navegador móvil. |
| 4 | Auth y administración | 2–3; identidad y contraseña por operador | Sesiones seguras, roles y `/admin` español; permisos servidor por operación, CRUD de categorías/etiquetas/herramientas/casos y auditoría; pruebas negativas de acceso, CSRF/origen y cierre de sesión; nunca usar indicadores comerciales inventados. |
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

## Fase 13 autorizada posteriormente — operación y catálogo

La solicitud adjunta autoriza investigación, implementación, pruebas, commits/push normales y publicación de contenido revisado exclusivamente en atlas_staging. Se añaden catálogo/evidencia, importación manual guardada y bootstrap seguro desde Windows, reutilizando modelos/servicios existentes. No es una reconstrucción o reapertura de las doce fases. Meta inicial comprobable: 65 herramientas, 30 guías, seis artículos DRAFT; 200 herramientas sigue aspiracional. Actualización 28-10-2026: catálogo aplicado mediante workflow 40714352948 SUCCESS y contenido público confirmado por el propietario; no reimportar. El login OWNER humano y el lanzamiento comercial se verifican de forma independiente, sin negar esa activación ya realizada. Alcance, resultados y bloqueos: docs/PHASE13_REPORT.md. Servicios con coste, tracking, indexación y automatizaciones continúan deshabilitados.

## Estado de cierre de Fase 12 — 26-10-2026

Solicitud 12/12 autorizada y ejecutada sobre el proyecto existente. Auditoría, correcciones acotadas, pruebas locales y preparación operativa/legal documentadas en AUDIT_REPORT.md y LAUNCH_CHECKLIST.md. No se marca completado el lanzamiento: credenciales/pruebas externas, host/DB/backup/monitor finales, administrador humano, revisión jurídica/fiscal y proveedor de pagos de producción siguen pendientes. No se autoriza despliegue, cobro, publicación comercial o recurrencia con costes por terminar estas fases.


## Lanzamiento público autorizado posteriormente — 27-10-2026

Sobre Fase 13 existente: completar activación remota cuando se disponga de acceso; preparar Google/GSC/AdSense, consentimiento certificado y control de indexación, validar y conservar infraestructura. No repetir migraciones, publicar DRAFT, asumir revisión legal, fabricar ingresos o activar agentes/pagos/correo. Alcance y evidencias diferenciadas en docs/PUBLIC_LAUNCH.md; no es una fase nueva que reinicie las doce anteriores.

## Operación SEO y crecimiento autorizada — 28-10-2026

Catálogo ya importado y sitio operativo confirmado por el propietario; no volver a ejecutarlos. Mejorar SEO técnico, descubrimiento por categorías, enlaces internos, rendimiento y medición administrativa sobre los módulos existentes. Proponer ocho semanas editoriales con fuentes y revisión humana. Conservar los seis DRAFT, los 101 registros, esquema/16 migraciones y barreras legales/Google. No activar seguimiento/anuncios/indexación/servicios ni comprar infraestructura. Validar localmente y diferenciar CI, prueba efímera y comportamiento real de Render.

## Blueprint Engine — entrega 1 autorizada, 29-10-2026

Implementar solo backend: manifiesto validado/versionado, guía existente por slug, estados/autorización, archivos privados, descarga verificada, preparación consentida de medición y pruebas. Conservar commit SEO aprobado 9a824bf y cualquier avance posterior. Sin esquema/migraciones/Neon, UI, workflow completo, monetización o automatizaciones nuevas. Interfaz y primer blueprint real son entregas futuras independientes, sin inicio automático. Contrato y riesgos en docs/BLUEPRINT_ENGINE.md.

## Blueprint Engine — entregas 1.5 y 2 autorizadas posteriormente

Conservar 96105c4 y sucesores. Entrega 1.5: abstracción local/Neon privado S3, carga CLI segura y pruebas; no provisionar si no hay acceso/autorización, no declarar durabilidad remota por simulaciones. Checkpoint en docs/BLUEPRINT_STORAGE.md. Entrega 2: UI pública inglesa sobre servicios existentes, versiones explícitas, descarga real, diagrama sustentado/conceptual etiquetado, requisitos/atribución/errores y contacto público solo configurado. Extensión compatible del manifiesto, sin editar releases selladas. Pruebas aisladas, sin blueprint ficticio en Neon, sin migraciones/roles/catálogo/SEO/AdSense/servicios nuevos. Dos entregas/commits independientes; no primer workflow comercial o publicación automática de archivos.

## Etapas 14 y 15 autorizadas — 29-10-2026

14: paquete n8n original privado, ejecución nativa aislada, evidencia y propuesta editorial sin publicar. 15: reutilizar storage/upload/auth/UI/download; corregir defectos demostrados y verificar paquete real en PostgreSQL temporal. Persistencia Neon/Render exige acceso privado, configuración y aprobación independientes. Dos commits locales lógicos; solicitar autorización antes del push. No desplegar/publicar/provisionar automáticamente. No etapa 16. Checkpoint 14: docs/PHASE14_REPORT.md. Producto y fuentes privadas fuera de Git público.

Checkpoint15: implementación y validación local completadas; activación remota pendiente, no dictamen de producción. Reutilizados adaptadores/CLI/API/UI; paquete original probado sin incorporarlo a Git. docs/PHASE15_REPORT.md distingue S3 simulado, archivos/SQL/HTTP reales locales y Neon/Render sin acceso. Publicación editorial, recursos cloud, secretos y deploy requieren aprobación propia; no etapa16.

## Etapas16 y17 autorizadas conjuntamente — 30-10-2026

Tres líneas: diagnóstico acotado y alternativa Render manual sin transferir secretos; etapa16 SEO/validación/editorial/GSC con puertas intactas; etapa17 embudo basado en agregados existentes sin nueva analítica o atribución falsa. Commits/push normales autorizados tras checks, sin deploy/activación comercial. Checkpoints A/B/C/D separados en reportes16/17 y diagnóstico. Bloqueos de plataforma no detienen código; no migraciones/importación de Neon ni nuevos servicios.
