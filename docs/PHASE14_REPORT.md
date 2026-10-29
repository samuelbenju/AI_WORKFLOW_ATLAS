# Etapa 14 — primer blueprint original

Checkpoint: 29-10-2026, America/Bogota. Base local/remota b3f39f528b7a9b9796d363d1d3dbc276152c1355, main inicialmente limpia. [CI de esa base 40929730419 SUCCESS](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40929730419); no es CI del código nuevo.

**Dictamen: COMPLETA Y VERIFICADA EN ENTORNO AISLADO. Conexión a cuentas reales y publicación pendientes.** Criterios 14.8: paquete recuperable, importación/ejecución nativa, reglas/errores probados, manifiesto y hashes válidos, compatibilidad Atlas y propuesta editorial preparada. No se certifica integración real con proveedores.

## Arquitectura y versiones

AI Lead Qualification & Instant Alerts: Tally autenticado → validación/reglas → ledger Google Sheets → Slack interno solo HIGH → confirmación del recibo. MVP determinista; sin modelos IA, pagos o mensajes a clientes. 21 nodos incorporados: Webhook 2.1, Edit Fields 3.4, Code 2, If 2.2, HTTP Request 4.4, Respond to Webhook 1.4, Stop and Error 1 y Sticky Note 1. OAuth nativo Sheets/Slack; operaciones mediante HTTP Request y APIs oficiales. Exportación final inactiva y sin bindings privados, pinData o metadata de instancia.

Importación, activación solo en test, ejecución por webhook de producción y re-exportación reales: n8n 2.45.6, imagen oficial sha256:45edf89655fd66dd55ea9336c1791ad14777599fdbf6c5aec6db583ede99a40b. La imagen lleva Node 26.12.1; Atlas conserva Node 24.19.0. HTTPS/OAuth sintéticos y red Docker interna sin salida a proveedores. No comunicaciones reales. Recursos de test propios retirados; contenedores Atlas anteriores conservados.

Score disposición 0/2/4 + plazo 0/2/4 + detalle 0/2; HIGH≥8, MEDIUM≥4, LOW inferior. Email sintáctico, límites, consentimiento, form ID y fecha ISO válida. Dedupe form/event, no email. Requiere executor dedicado y concurrencia de producción 1: Sheets no tiene inserción única transaccional. No garantía exactly-once con múltiples instancias/escritores. Ledger acotado y conciliación explícita.

Lecturas con retry acotado; append/Slack/update sin retry automático. Resultado incierto →202 y revisión manual, sin repetir efectos ciegamente. Alertas sin email/empresa/texto libre. Retención de payloads/ejecuciones deshabilitada; recuperar desde respuesta original Tally y ledger privado.

## Paquete privado recuperable

El propietario eligió descargar desde los archivos del entorno. Guardar copia privada antes de reemplazar el workspace; no hay copia remota privada configurada y este disco no garantiza conservación permanente.

- ZIP: .private/phase14/ai-lead-qualification-v1.0.0-private.zip, 59.973 bytes, 29 entradas, CRC y recuperación de diez archivos verificados. SHA-256: 0349bfb69e8c68c85d1ca7a28b7dcea546a254a4df787ebeb02c8c5946ac5c55.
- Workflow: 29.885 bytes; SHA-256 574ffdd07b6c803cd07383bcddbe7c79cf7ea4c2c461bed35c6dda292bcbadcd.
- Manifiesto schemaVersion=1: SHA-256 cc5accbc096ee9bafe833caaf664a1a2dbc5e347b3ec9dcc0d75702be12e41be.
- Diez descargables, 69.157 bytes: JSON, README, tres guías proveedor, contrato/reglas, operaciones/seguridad, compatibilidad/evidencia, ejemplos y fuentes/licencia. Incluye además manifiesto, fuente privada, tests y propuesta. work/, SQLite, claves TLS y credenciales de test excluidos.
- Evidencias incluidas: evidence/n8n-results.json, logic-tests.txt, asset-inventory.json, research-inventory.json, atlas-package-check.json. Hashes individuales/fuentes y alcance real, sin bytes del producto en Git público.

Checker genérico de solo lectura: directorio privado explícito/inventario exacto/POSIX/symlinks/hardlinks/límites/secretos/SHA/estructura n8n. No DB, red, carga o publicación. Siempre publication=NOT_AUTHORIZED y runtimeImportVerified=false: estructura no certifica ejecución.

```sh
node --conditions=react-server --import tsx scripts/blueprint-package-check.ts --directory /ruta/privada/package
```

## Editorial, fuentes y riesgos

owner/editorial-proposal.json propone qualify-tally-leads-with-n8n-and-slack; conserva la guía Activepieces route-a-form-submission-into-a-review-queue. Enlaces solo a slugs existentes de n8n, automation y guías. Intención long-tail cualitativa; no volúmenes/rankings/precios. Ningún registro editorial insertado/editado. Licencia MIT propuesta y atribución al proyecto pendientes de aprobación; no autor humano inventado.

Fuentes oficiales: tag n8n 2.45.6, tallyforms/n8n-nodes-tallyforms, discovery Sheets v4 revisión 20261019, Slack SDK y credenciales nativas n8n; hashes/fechas en ZIP. Ayuda web/cuenta Tally inaccesibles: confirmar soporte/plan de header Authorization, campos/consentimiento, entrega/retry y permisos reales. No se afirma validación HMAC. Si no admite header, detener activación y revisar un mecanismo oficial; no desactivar auth. Revisión privacidad/retención/licencia pendiente.

## QA y fallos corregidos

- Lógica privada: 9 grupos PASS, 18 combinaciones scoring, validación/ledger/recibos/carreras.
- n8n nativo: 17 escenarios PASS: 403 sin efectos, HIGH/duplicado, MEDIUM/LOW, inválidos, read401/read429/incompleto, append rechazado/incompleto/timeout tras commit, Slack429/rechazo/incompleto/timeout, confirmación fallida y concurrencia serializada. Replay no duplica efectos conocidos.
- npm run check: 86 unitarias PASS, lint/TypeScript/Prisma validate; build PASS.
- node scripts/test-blueprints.mjs: 27 PASS, 19 paquete/backend/storage + 8 UI, PostgreSQL efímero/Chromium. S3 simulado, no Neon.
- Fallos intermedios privados corregidos: webhookId/ruta nativa, registro posterior a liveness, separador de CAs TLS de fixture, opciones Tally scalar/array, fechas y recibos incompletos. Sin TLS/auth deshabilitados. El ZIP inicial fue rechazado por auto-coincidencia del escáner con su literal; regenerado/verificado.

Sin deps/lockfile/esquema/16 migraciones/catálogo/credenciales/flags alterados. Sin push, carga Neon, deploy Render, publicación o servicios activados. Etapa 15 verifica por separado descarga Atlas del paquete real y persistencia remota.
