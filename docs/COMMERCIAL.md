# Patrocinios y CRM — Fase 6

## Entrega y límites

`/sponsor` consulta los cuatro paquetes de PostgreSQL y permite solicitudes reales. `/admin/sponsors` contiene el CRM de solicitudes, empresas, paquetes y campañas. Solo OWNER/ADMIN tienen permiso `commercial`; EDITOR/VIEWER/anónimo no acceden a datos de contacto, notas, propuestas o configuración comercial.

No se inventa audiencia, tráfico, conversiones, clientes o ingresos. Los paquetes existentes sin precio se conservan como **por cotizar**, duración por acordar y lista de interés. Recibir una solicitud no reserva un espacio ni confirma un pago. No se implementó checkout, conciliación con proveedor, envío de propuestas ni newsletter; corresponden a sus fases. Los estados financieros que el módulo puede leer son los persistidos por el dominio de pagos, no verificaciones nuevas ante un proveedor.

## Configuración y productos

```bash
npm run db:status
npm run commercial:secret
npm run db:seed:commercial
```

`commercial:secret` prepara una clave aleatoria de firma de 32 bytes en `.env.local` privado (0600), sin imprimirla y sin reemplazar una existente. No es una contraseña de usuario. En producción configurar `SPONSOR_FORM_SECRET` (64 caracteres hexadecimales minúsculos) mediante gestión privada de secretos, compartido entre instancias; no versionarlo. Rotarlo invalida formularios pendientes y cambia los digests de control de duplicados. `SPONSOR_ORIGIN` debe coincidir exactamente con el navegador; usa SITE_URL o localhost:3000 por defecto. HTTPS obligatorio fuera de loopback. No confiar en Host ni ampliar orígenes automáticamente.

El seed solo permite bases reales `_dev`/`_test` fuera de producción. Mantiene cuatro tipos únicos y conserva precios, disponibilidad, duración y ediciones. Reemplaza únicamente la descripción provisional exacta de Fase 2 por una descripción comercial del formato. No crea empresas, leads, campañas, ventas o datos de audiencia.

| Producto | Entrega prevista |
| --- | --- |
| Homepage Featured Sponsor | Bloque de portada identificado como Sponsored y enlace comercial. |
| Newsletter Sponsorship | Solicitud de interés; entrega bloqueada hasta implementar newsletter y sus condiciones. |
| Featured Tool Listing | Bloque pagado separado de los listados independientes, vinculado a una herramienta pública. No modifica featured editorial. |
| Sponsored Article | Disclosure comercial junto al artículo público/revisado y enlace del patrocinador. No elimina revisión de afirmaciones/fuentes. |

`/admin/sponsors/packages`: ID/tipo estables, nombre/descripción, precio entero en unidades mínimas, moneda COP/USD/EUR, duración de 1–366 días, recepción de solicitudes, disponibilidad AVAILABLE/WAITLIST/UNAVAILABLE y habilitación de campañas. 100 unidades mínimas representan una unidad monetaria. Precio null significa por cotizar, no cero/gratis. API no acepta importes del formulario público. La habilitación de campañas desde administración exige precio y duración. Disponibilidad es una decisión administrativa para nuevas solicitudes; las fechas contratadas se revisan por campaña.

El formulario permite solicitudes de cotización/interés para paquetes que aún no están habilitados para entrega, siempre que acceptingInquiries sea true y disponibilidad no sea UNAVAILABLE. Esto se indica en la interfaz. No se presentan como reservas disponibles. Cerrar solicitudes no anula automáticamente contratos existentes; deshabilitar el paquete sí impide su entrega pública.

## Circuito de solicitud

1. Visitante elige paquete, empresa, contacto, email, web HTTPS, campaña, fecha preferida opcional y consentimiento explícito.
2. Token firmado ligado a UUID de formulario y timestamp, caducidad de una hora. POST exige Origin exacto y rechaza cross-site. JSON acotado a 16 KB, Zod estricto y honeypot. No se fetchan las URLs recibidas.
3. Se valida que el paquete acepte consultas y que su updatedAt siga siendo el mostrado. Cambios de términos devuelven conflicto para revisar antes de guardar.
4. Rate limit PostgreSQL compartido: 60 solicitudes nuevas por minuto globales y 3 por email cada 15 minutos. Emails se convierten en claves HMAC, sin almacenar IP o confiar en X-Forwarded-For. Los contadores persisten al rechazar exceso y expiran; entradas viejas se limpian. No se presenta como solución completa frente a spam distribuido.
5. UUID único y digest HMAC del contenido normalizado + versión del paquete: reintentos devuelven la misma referencia, un UUID reutilizado con otro contenido da 409 y el mismo contenido en 24 horas no crea una oportunidad duplicada. Bloqueo/transacción/uniqueness y reintento acotado de serialización protegen concurrencia.
6. Se guardan Lead NEW, referencia aleatoria ATLAS, fecha, consentimiento/versionado, contacto y snapshot del paquete/precio/moneda/duración. Lead y auditoría se confirman juntos. No se crea Sponsor ni se fusiona una empresa basándose en información pública no verificada.
7. Respuesta real contiene solo `received` y `reference`, sin ID interno, email, precio controlado por cliente o API pública de consulta de leads. La UI confirma guardado solo tras éxito; errores conservan el formulario.

El consentimiento describe uso de datos para evaluar/responder la solicitud; no autoriza newsletter ni publicidad. Registro de fecha/texto versionado en DB. Antes de una exposición comercial real el propietario debe completar identidad/contacto del responsable, retención y políticas operativas; no se afirma cumplimiento jurídico integral por incluir una casilla.

## CRM

- `/admin/sponsors`: búsqueda por empresa/email/referencia, filtros NEW/CONTACTED/NEGOTIATING/WON/LOST, páginas de 12, fechas UTC e indicadores reales. Ganada significa estado de oportunidad, nunca confirmación de pago.
- `/admin/sponsors/leads/[id]`: solicitud y snapshot original, consentimiento, estado, vínculo con empresa elegida por administrador, hasta 50 notas y 20 propuestas recientes. Notas son registros propios con autor/fecha; no se guardan como datos públicos o falsos envíos. El historial permanece en DB.
- `/admin/sponsors/companies`: crear/editar empresas y contactos, consultar vínculos; no envía emails. Creación desde lead requiere pulsación explícita del administrador. Primeras 200 empresas por nombre, límite visible.
- Propuestas: ContentDraft COMMERCIAL_PROPOSAL privado, DRAFT, texto/vigencia y snapshot de condiciones actuales del paquete. No hay botón de envío ni aceptación ficticia. El precio histórico del lead no cambia al modificar el paquete.
- Escrituras protegidas por sesión/rol/Origin/CSRF, Zod estricto y transacciones con auditoría. updatedAt evita sobrescribir cambios de otro operador. No se exponen edición de pagos, secretos o acceso de editor a CRM.

Se conservaron etiquetas anteriores de LeadStatus para no borrar historia y mantener integridad de Fase 2. El CRM escribe exclusivamente los cinco estados solicitados; los estados históricos se identifican como tales y no se convierten en WON automáticamente.

## Campañas y publicidad

Se pueden guardar campañas en borrador con empresa/paquete, creatividad como texto, URL HTTPS, UTC inicio/fin, contenido vinculado y orden existente opcional. El borrador no exige inventar una orden. Guardar una edición retira aprobación/activación y exige revisión de nuevo.

Flujo: DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE, con acciones explícitas. Pausar vuelve a borrador; cancelar detiene; completar exige que el periodo haya terminado. Ningún estado de lead cambia este flujo automáticamente.

Aprobar/activar exige confirmación humana y, en servidor:

- Paquete habilitado y formato de entrega implementado. Newsletter bloqueado en Fase 6.
- Orden de la misma empresa/paquete, PAID, PRODUCTION, fecha de pago no futura, transacción APPROVED y evento verificado/procesado con fechas válidas. Sandbox, pendientes, faltantes o marcas manipuladas por el cliente no satisfacen el requisito. Esta fase no crea ni modifica esas pruebas de pago desde UI.
- Creatividad y URL completas, contrato con importe/moneda iguales a la orden, duración y fechas coherentes, periodo no terminado.
- Herramienta/artículo correspondiente publicado, no demo y no futuro; artículo revisado.
- Sin solapamiento con otra campaña aprobada/activa en el mismo espacio y fechas; bloqueo SQL durante la decisión.

Los componentes consultan de nuevo las condiciones públicas por petición: ACTIVE, aprobación, periodo vigente, paquete habilitado, pago/transaction/evento vigentes, snapshot financiero/duración y contenido público. Si se cancela la orden o termina el periodo, dejan de mostrar el bloque. En modo demo no se muestra publicidad real. Los enlaces externos comerciales usan `rel="sponsored noopener noreferrer"`, y el bloque lleva Sponsored con el nombre del patrocinador, sin métricas de audiencia.

Portada, directorio/ficha de herramientas y ficha de artículo preparados. No se envía un newsletter o se marca un Sandbox como venta para llenar espacios. Actualmente no hay campañas reales ni ventas configuradas en desarrollo. La posibilidad de leer estados de pagos no equivale a integrar el proveedor futuro de Fase 8.

## Migraciones y recuperación del incidente observado

8: cuatro valores nuevos de LeadStatus preservando anteriores. 9: campos de paquete/lead/campaña, FK de propuesta y modelos CommercialNote/CommercialRateLimit; orderId de campaña nullable para borradores. 10: CHECK que usa COALESCE para rechazar valores requeridos NULL además de FALSE. Se conservan FK financieras/restrictivas y migraciones anteriores. Total: 25 modelos y diez migraciones.

El primer intento de migración 8 falló **antes de DDL**: el adaptador oficial pg de esta versión implementa executeScript con split por punto y coma y separó un comentario. Se verificaron los cinco valores originales del enum y que ninguna sentencia nueva hubiese aplicado. Se quitó el punto y coma del comentario de la migración aún no aplicada y se usó `SchemaEngine.markMigrationRolledBack({migrationName:"20261025000800_crm_statuses"})` para conservar el intento fallido como auditoría. Después se aplicaron 8–10 correctamente. No se resetearon DB, checksums o datos.

No repetir ese procedimiento a ciegas en otra migración: confirmar estado real y efectos parciales, revisar el SQL y usar mecanismos oficiales con evidencia/backup. Una migración ya aplicada no se edita. Los wrappers de pruebas aplican las diez desde cero y verifican segundo deploy sin cambios. Evitar puntos y coma dentro de comentarios/strings o bloques de procedimientos en nuevas migraciones hasta actualizar y validar el adaptador oficial; no se parcheó node_modules.

## Verificación y pendientes

`npm run check`, `npm run test:db`, `npm run build` y `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Bases temporales propias, contraseñas/cuentas `.invalid` y estados financieros de fixture explícitos; no se publican anuncios o ventas ficticias en desarrollo. El circuito requerido se prueba con formulario real, lectura CRM, cambio de estado y relectura PostgreSQL.

La cuenta humana sigue requiriendo `npm run admin:init` y contraseña ingresada sin eco. Precios/condiciones reales quedan en manos del propietario. No se inició Fase 7, no se envió comunicación externa, no se desplegó ni hizo push automáticamente. Indexación de preestreno sigue bloqueada.
