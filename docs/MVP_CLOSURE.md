# Cierre MVP — candidato y aceptación pendiente

Fecha: 03-11-2026 UTC. Base `41b86ab6ae28c9fa7c326bf5ef75b6070aecd5d6`. Complementa [MVP_RELEASE.md](MVP_RELEASE.md), sin sustituir checkpoints históricos ni acreditar aceptación productiva.

## P0: evidencia y corrección mínima

Evidencia aportada por el propietario desde Render MCP/Firecrawl, solo lectura: Live41b86ab, deployment `dep-dbkv40bm8hqs738m7ji0`, servicio `srv-dbfprkbrjlhs73easoag`, Free/Auto-Deploy OFF. No consultada independientemente por este executor.

| UTC03-11 | Observación aportada |
| --- | --- |
| 15:20:02 | Siete rutas públicas, incluidos health y robots, 503 sin contenido útil. |
| 15:20:41 | Home útil; tools/use-cases/categories HTTP200 con error; health200; contacto sin identidad/correo; robots Disallow: /. |
| 15:21:16 | Home/tools/categories útiles; use-cases todavía con error. |
| 15:20:32–33 | catalog.facets.tools: ETIMEDOUT. |
| 15:20:34 | catalog.use-cases: UNCLASSIFIED_DATABASE_ERROR. |
| 15:20:37 | catalog.facets.tools: P2028, TRANSACTION_START_TIMEOUT. |

**Aceptación productiva FALLIDA; causa física remota NO DETERMINADA.** No atribuir ETIMEDOUT a compute/PgBouncer/CPU/conexiones fantasma sin métricas. Los códigos nuevos no reclasifican retrospectivamente el error desconocido.

Reproducción real en PostgreSQL loopback desechable: ocupar las cinco conexiones y liberarlas a2600ms. El batch original de facetas falla con P2028/TRANSACTION_START_TIMEOUT a~2053ms. Regresión RED→GREEN: las dos lecturas independientes secuenciales completan a~2610ms, dosSQL, sin BEGIN/COMMIT. Retener las cinco conexiones más de5000ms sigue fallando a~5048ms, ahora con código fijo PG_POOL_QUEUE_TIMEOUT. No datos ficticios, fallback o retries.

- Se retira únicamente el batch READ COMMITTED de categorías/etiquetas independientes; tampoco ofrecía una instantánea común entre sentencias. Filtros editoriales, relaciones, conteos y límites se conservan.
- Tools/use-cases cargan filas/conteo antes de facetas para evitar solapar dos grupos por página; no elimina la concurrencia global de visitantes.
- RepeatableRead de filas/conteo, pool max5/connectionTimeoutMillis5000/idleTimeoutMillis30000, TLS, caché con revisiónDB viva, Proxy404 y readiness privado se conservan.
- **Facetas ya no tiene el inicio2s ni la expiración lógica5s de una transacción Prisma.** No se añade statement_timeout. Ni el batch anterior ni esta ruta garantizan cancelación de SQL bloqueado: el experimento previo de bloqueo6s esperaba el SQL antes de devolver la expiración. No presentar el cambio como límite duro de ejecución preservado.
- Diagnóstico distingue solo los mensajes exactos fijos de pg-pool como PG_POOL_QUEUE_TIMEOUT/PG_CONNECTION_TIMEOUT. No registra mensajes/URLs/SQL; desconocidos siguen desconocidos. No confundirlos con el inicio transaccional Prisma.

El mecanismo de inicio innecesario de facetas está reproducido y corregido **localmente**. Las transacciones necesarias de home/listados aún pueden fallar si no consiguen conexión a tiempo. P2028/ETIMEDOUT no están acreditados como resueltos en Render.

## Storage privado: sonda preparada, prueba real pendiente

Según el propietario: proyecto cold-shadow-53495242, branch br-young-queen-b7w8sxqs/production, us-east-1, bucket privado atlas-blueprints, prefijo objects/sha256/ vacío. Alias runtime atlas-render-readonly con storage:read; escritura separada. No se recrearon recursos, rotaron credenciales ni comprobaron scopes remotos aquí.

Incidente comunicado: la actualización parcial de variables provocó un despliegue pese a Auto-Deploy OFF. No tratar cambios de variables/API como operaciones sin deploy. Para una futura configuración aprobada, confirmar **Save only** del Dashboard cuando exista; si solo ofrece guardar y desplegar, detener hasta autorizar ese efecto. Esta misión no cambia variables.

Adaptador existente: ACL/policy fail-closed, HTTPS/TLS, SHA-256/tamaño/formato, timeout8s y maxAttempts1 intactos. Observador nuevo opt-in solo emite etapa/código permitido/statusHTTP; errores síncronos/asíncronos del observador no cambian transporte o autorización. No se relajan controles ante APIs incompatibles.

La [documentación oficial S3 de Neon](https://neon.com/docs/storage/s3-compatibility), contrastada con su fuente pública `neondatabase/website/content/docs/storage/s3-compatibility.md`, declara ACL/policy de lectura y HEAD/GET/PUT. No certifica SDK/credencial/bucket reales; compatibilidad, cuotas/transferencia y PUT condicional requieren pruebas autorizadas independientes.

Sonda nueva exclusivamente READ, usando variables ya disponibles en un canal privado autorizado y el paquete original descomprimido:

```bash
node --conditions=react-server --import tsx scripts/blueprint-storage-check.ts --directory /ruta/privada/absoluta/package
```

Valida destino exacto y paquete antes del S3, luego ACL/policy/HEAD/GET; nunca PUT/DB/publicación/creación. Solo informa presencia, etapas/códigos y existencia/integridad. Un objeto faltante no acredita integridad. `runtimeLocationVerified:false` y `credentialScopeVerified:false` evitan confundir otra estación con Render o inferir permisos exclusivos desde un GET. El verificador existente requiere permisos de archivos privados compatibles. No copiar claves entre gestores ni enviarlas por chat para ejecutar la sonda.

Pendiente: sonda autorizada, scopes por metadatos administrativos, carga con identidad de escritura/CLI existente, licencia/editorial, DRAFT→VERIFIED→PUBLISHED y HTTP real con hash/retiro/persistencia. No probar PUT con identidad runtime ni usar disco efímero como sustituto.

## Producto y captación: preparados sin publicación

ZIP original privado SHA-256 `0349bfb69e8c68c85d1ca7a28b7dcea546a254a4df787ebeb02c8c5946ac5c55` conservado, fuera de Git. Flujo real: webhook compatible con Tally, validación/clasificación determinista, ledger Sheets y Slack condicional. Son21 nodos oficiales base, incluidos HTTP Request con OAuth, no nodos específicos de cada marca; conservar requisitos de idempotencia/executor dedicado.

Se reutiliza evidencia de17 escenarios nativos n8n2.45.6 reejecutados en el checkpoint MVP precedente con proveedores sintéticos. No repetir por cambios de copy/diagnóstico. No prueba Sheets/Slack reales, descarga productiva ni aprobación de licencia/atribución/editorial.

Hero/ServiceInquiryCard existentes: guías gratuitas, descargas solo revisadas/disponibles, presupuesto con contacto revisado. Sin correo válido/revisión, home enlaza a contacto/disponibilidad; ficha conserva puertas de guía/release. Mailto amplía herramientas/integraciones/volumen; sin precios, plazo48h, nuevoCRM, envío o recepción afirmada. Políticas añaden borradores sobre mensajes/condiciones separadas, sin identidad inventada ni aprobación legal falsa.

Material privado de revisión: mensajes manuales por canal, plantilla sin personas ni resultados, decisiones del operador y diagrama derivado de nodos/conexiones originales. Objetivos20prospectos/5conversaciones/3pruebas/1consulta calificada, nunca resultados. Imagen rotulada como **diagrama, no captura de editor ni evidencia de ejecución**; intento de captura nativa sin imagen verificable. ZIP de revisión excluye workflow, fixture.env y basesn8n. Sin envíos/publicaciones/contactos reales.

## Verificación y siguiente operación

Suites locales: PostgreSQL desechable, S3 simulado y HTTP/navegador local. Regresiones RED→GREEN cubren facetas, códigos driver, observadorS3, scope de sonda, copy/mailto. Revisión independiente sin bloqueos; riesgo de expiración lógica retirado documentado arriba. Resultados finales/SHA/CI propia se registran en el checkpoint de entrega, nunca reutilizando CI41b86ab para el candidato.

Antes de desplegar: autorización del **nuevo SHA exacto** con CI SUCCESS y preflight del servicio existente. Después: HTTP+contenido/readiness privado/logs, primera visita y concurrencia moderada, sin pings o reinicios no autorizados. Streaming200conerror sigue cubierto por comprobaciones funcionales; health permanece liveness, no readiness público.

Dependencias humanas: autorización de deploy, canal privado de storage/carga/publicación, licencia/editorial, identidad/contacto/privacidad/disponibilidad comercial, cuentas autorizadas para Sheets/Slack y prueba de recepción, difusión manual. Indexación, AdSense, pagos y agentes siguen apagados; no condicionan validar una oferta por contacto. Neon/Render/datos/roles/secretos/migraciones/dependencias/ZIP no modificados por esta misión.


### Resultado local final

| Control | Resultado |
| --- | --- |
| check: Prisma validate, ESLint, TypeScript, unitarias | PASS,96unitarias |
| Integración PostgreSQL desechable |99/99PASS |
| Build producción |PASS |
| Runtime/catálogo/pool/readiness |13/13PASS |
| SEO/HTTP/navegador |6/6PASS |
| Blueprint backend/storage simulado + UI/HTTP local |26+8=34PASS |
| E2E completa final escritorio/móvil |126/126PASS |
| Validación editorial del catálogo en archivos |65herramientas/30guías/6DRAFT/20categorías/24etiquetas válido |

No son conteos actuales de Neon ni evidencia de disponibilidad productiva. Las suites no redujeron aserciones ni usaron proveedores reales como fixtures. Logs locales `/tmp/atlas-close-{check-final2,db-final,build-final,runtime-final,seo-final,blueprints-final,e2e-final,catalog-final}.log`; no artefactos públicos con secretos/paquetes. CI propia del nuevo SHA se registra tras publicar.
