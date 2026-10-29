# Etapa 15 — almacenamiento y descarga del paquete real

29-10-2026, America/Bogota. **ETAPA 15 — IMPLEMENTACIÓN Y VALIDACIÓN LOCAL COMPLETADAS; ACTIVACIÓN REMOTA PENDIENTE. Dictamen PARCIAL.** No se declara verificada en producción. Producto/evidencias privadas y checkpoint anterior: [etapa 14](PHASE14_REPORT.md).

## Reutilización y correcciones demostradas

Se conservan BlueprintStorageProvider, LocalPrivateStorage, NeonObjectStorage, CLI blueprint-upload, APIs administrativas, SiteSetting/AuditLog, autorización fresca, estados/revisiones, descriptor, UI y endpoint GET existentes. Sin segunda API, proveedor o sistema de aprobación; sin cambios de schemaVersion, Prisma, migraciones o dependencias.

Cuatro grupos de regresión fallaron antes y pasan después de cambios mínimos del adaptador S3:

1. GetBucketPolicy exitoso sin Policy/valor vacío no demostraba privacidad. Ahora rechaza respuesta ambigua, JSON inválido, Allow, 403/501; únicamente NoSuchBucketPolicy con HTTP404 acredita ausencia de policy.
2. NoSuchKey/NotFound requerían solo nombre. Ahora exigen HTTP404; nombre con403/500/sin status no autoriza PUT ni convierte un fallo en ausencia.
3. Timeout del body podía devolver error sin cerrar un Readable bloqueado. Listener abort destruye el body al vencer el deadline, además del cierre finally; no queda esperando el final de la iteración.
4. Conflicto If-None-Match acepta únicamente PreconditionFailed/HTTP412 y readback íntegro. Otro código o bytes corruptos se rechazan, sin segundo PUT.

No se relajan ACL, políticas, TLS, host, rutas, hashes o permisos. No fallback local, borrados, repair o reintentos de escritura. Son defectos reproducidos con transporte S3 **simulado**, no incidentes demostrados en Neon.

## Compatibilidad y estado remoto

Fuentes oficiales Neon reconsultadas el 29-10-2026 mediante su repositorio website/content/docs: [S3 compatibility](https://neon.com/docs/storage/s3-compatibility) enumera GetBucketAcl y GetBucketPolicy como lectura de ACL/policy almacenadas. No basta para acreditar semántica, respuesta, permisos o soporte condicional del bucket particular. La prueba remota debe confirmar estas operaciones y If-None-Match, sin desactivar controles ante un error.

Free documenta 5GB objetos/proyecto, 5GB/mes egress compartido, sin cargo por operación. Lifecycle/versioning almacenados no implican enforcement. Credenciales de rama pueden alcanzar descendientes; storage:write incluye borrado y no equivale a permiso insert-only por bucket. Conservar scopes distintos runtime read y operador write. Límites y referencias en [BLUEPRINT_STORAGE.md](BLUEPRINT_STORAGE.md).

**BLOQUEADO POR ACCESO:** no hay credenciales Object Storage, identidad/conector Neon/Render o endpoint/bucket autorizado disponibles en este entorno. No se afirma que el proyecto carezca de bucket. No se crearon recursos/credenciales o procesos permanentes. La solicitud no autoriza implícitamente provisioning, publicación editorial o deployment. Acceso HTTP a Render desde este cloud falla por red; no demuestra que el sitio esté caído. SHA Live, runtime y persistencia remota no observados. Los 16 SQL y 101 registros quedan intactos; no se reabren como pendientes las migraciones/importación ya confirmadas por el propietario.

## Prueba real del paquete en Atlas, exclusivamente aislada

Nueva opción del runner existente, sin fixture comercial en Git:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
node scripts/test-blueprints.mjs --private-package /ruta/privada/package
```

Exige ruta absoluta/privada y TEST_DATABASE_URL loopback dedicado terminado en _test. Crea DB aleatoria propia atlas_run_…_test y la retira al terminar; aplica únicamente allí el historial original para construir el entorno de QA. No acepta Neon/staging. El test crea guía/cuentas/atestación de QA solo en esa DB, no una aprobación humana real, e impide salida del navegador a terceros. CI normal no recibe el producto y ejecuta fixtures genéricos; no se sube el paquete como artifact.

Resultados del producto original:

- Diez archivos cargados mediante uploadBlueprintFile con OWNER temporal, readback, SHA y auditoría; segunda carga existing, sin overwrite. VIEWER rechazado. Falta de bytes bloquea verify. DRAFT y VERIFIED →404. Publicación exige rol/aprobación de test explícita. Fuentes originales solo leídas.
- Diez GET HTTP200: 69.157 bytes, hashes y tamaños exactos, attachment, Content-Digest, no-store/noindex. Tiempos locales observados 6–193ms/archivo, una muestra sin validez estadística; no representan Render/Neon.
- Guía/UI real a 390 y1440px; abrirla no pide bytes. Descarga del JSON mediante teclado y Chromium conserva SHA, mensaje honesto, sin login/email/cookies/eventos/suscripción. Axe sin infracciones detectadas, sin scroll horizontal ni ruta privada en HTML; API admin anónima401.
- Nuevo proceso Next con los mismos archivos/DB: GET200/SHA original. Corrupción de la copia de test →503; restauración de esa copia →200; retirada →404 aunque el objeto permanezca. Ninguna edición del paquete original o catálogo real.
- Reinicio local y S3 simulado **no prueban durabilidad Neon**. No redeploy remoto realizado.

## QA y límites

| Control | Resultado observado |
| --- | --- |
| check: Prisma/lint/TypeScript/unitarias | PASS, 86 unitarias |
| Build producción | PASS |
| Paquete/backend/storage estándar | PASS, 23 pruebas |
| UI Blueprint estándar | PASS, 8 pruebas |
| Paquete privado real (tres subpruebas + grupo) | PASS, 4 pruebas |
| Integración general PostgreSQL | PASS, 91 pruebas |
| Runtime privado/catálogo vacío | PASS, 4 pruebas |
| Regresión SEO/categorías | PASS, 5 pruebas |
| E2E general escritorio/móvil | 121/122 primer recorrido; único caso fallido repetido: 1/1 PASS |
| actionlint / audit producción | PASS / 0 vulnerabilidades reportadas |

Los 35 checks Blueprint corresponden a23+8+4 en DB propias. El primer intento del paquete llegó a todos los GET correctos, pero axe exigió browser.newContext en el fixture nuevo; corregido, cuatro checks pertinentes repetidos y PASS, sin ignorar accesibilidad. Se conservaron los logs de ambos intentos. Warn pg@8 por consultas concurrentes de suites existentes y aviso WASM experimental no fallaron pruebas; no se presenta el proyecto como libre de todos los riesgos por audit=0.

Rendimiento conservado: metadatos solamente al abrir una guía, máximo4 comprobaciones simultáneas de disponibilidad,8 descargas en vuelo por proceso, tamaño/tiempo acotados, sin auditoría/evento por GET. En S3 cada archivo implica comprobaciones ACL/policy y HEAD para disponibilidad o GET para descarga (3 llamadas normalmente); diez archivos pueden generar30 operaciones de metadata. Sin caché de privacidad que oculte retirada. No hay medición real de egress/costes/latencia; revisar cuota compartida antes de publicar. Render Free/disco local no son almacenamiento duradero o garantía de disponibilidad. Respaldo privado y custodia siguen siendo responsabilidad operativa.

## Acciones privadas mínimas pendientes

1. Descargar/conservar el ZIP con SHA del reporte14. Revisar autoría/licencia, cuentas Tally/Google/Slack, header auth y propuesta editorial; no publicar aún sin aprobación. El permiso de push es independiente.
2. En [proyecto Neon existente](https://console.neon.tech/app/projects/cold-shadow-53495242), comprobar si ya existe bucket privado y región us-east-1/rama production de staging. Si no existe, solicitar autorización antes de crearlo. No habilitar otros servicios o planes.
3. En canales privados del operador/Render, configurar las seis variables existentes BLUEPRINT_STORAGE_BACKEND=neon, BLUEPRINT_OBJECT_ENDPOINT/REGION/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY. Endpoint real de Console, runtime storage:read, operador storage:write; no cambiar DATABASE_URL/roles. No enviar valores al chat. Confirmar ACL/policy efectivos con esos scopes.
4. Después de aprobar la guía y su licencia, registrar manifiesto DRAFT con API administrativa existente y cargar diez archivos exactos mediante scripts/blueprint-upload.ts; verificar stored/integrity/auditoría. Revisar y autorizar VERIFIED/PUBLISHED con sesión/CSRF. No usar atestación de QA como aprobación editorial real.
5. Con autorización separada de deploy/prueba remota, comprobar SHA Live, HTTP/bytes, reinicio y redeploy manteniendo objetos; retirada404 y fallos503 en recurso de prueba autorizado. Devolver solo SHA/estados/digests no sensibles. Mientras tanto mantener el paquete privado, sin nuevas cuentas humanas, cron, IA, anuncios, tracking, pagos o email.

## Cierre consolidado de Git y conservación

Base main local/remota b3f39f528b7a9b9796d363d1d3dbc276152c1355. Commit local A: 1a690e2f803c5a2c5b82ccb93005bdcc1caf9c33, 12 archivos. Commit B contiene este cierre; su SHA se obtiene con git rev-parse HEAD y se entrega al propietario después de crearlo, sin un tercer commit artificial para autocitarlo. Push no ejecutado: requiere aprobación expresa. No deploy u operación editorial autorizados por ese eventual push. CI remota propia de A/B pendiente; baseline CI40929730419 SUCCESS observado, no sustituye nueva CI.

Cambios públicos A: checker CLI, inspector n8n, servicio de paquete, dos fixtures/tests genéricos, integración runner, ignore ESLint de .private y documentación de arquitectura/plan/progreso/log/reporte14. B: correcciones S3, regresiones storage, opción opt-in de runner y test genérico que recibe paquete privado sin incorporarlo; README, checklist, arquitectura/plan/progreso/log y reportes de storage/etapa15. Sin frontend, endpoints o dependencias nuevos. Ver listado exacto con git diff --name-status b3f39f528b7a9b9796d363d1d3dbc276152c1355..HEAD.

E2E inicial: 121 PASS y un timeout30s en caso editorial/SEO móvil; la traza mostraba assertions completadas antes del timeout final. Causa exacta no confirmada; sin modificar SEO/helper/producto para esconderlo. Repetido únicamente ese caso en DB nueva: PASS1 en1,4s (tanda2,4s). No se afirma un recorrido único 122/122 limpio. Riesgo residual: inestabilidad de cierre/entorno de ese test. Logs /tmp/atlas-phase15-e2e.log y e2e-retry.log; check/build/storage/paquete/db/runtime/SEO también conservan sus logs /tmp/atlas-phase15-*. No se atribuye esa evidencia al sitio remoto.

Comparación con baseline: package.json/lockfile, prisma/16 SQL, data/catalog, .env.example, seo-policy/advertising/layout/robots/sitemap sin cambios. .env.local no editado y permanece ignorado. Revisión de patrones/diff: sin secretos reales detectados; única candidata fue URL sintética del test de secretos. .private no versionado. ZIP y manifiesto originales conservan SHA después de todas las pruebas; temporales n8n eliminados y ningún nuevo proceso persistente queda activo. No se tocaron worker/DB preexistentes.

Etapa16 no iniciada. Recomendación: completar aprobación privada/editorial y prueba remota de persistencia/descarga antes de ampliar el catálogo de blueprints; no añadir servicios para compensar falta de acceso.
