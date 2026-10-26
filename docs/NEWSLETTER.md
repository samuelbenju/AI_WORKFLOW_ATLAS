# Newsletter — Fase 7

Implementación local operativa sobre PostgreSQL. El envío externo con Resend permanece **sin verificar**: no hay API key/remitente verificado ni destinatario autorizado para una prueba real. No se envió ninguna comunicación externa ni se inició Fase 8.

## Configuración y arranque

1. Conservar el checkout, Node 24 y dependencias fijadas existentes. `npm run db:generate`, `npm run db:validate`, `npm run db:deploy`, `npm run db:status`. Migración 11 aditiva, sin editar las diez previas. 28 modelos.
2. `npm run newsletter:secret` prepara `NEWSLETTER_SECRET` de 32 bytes/64 hex minúsculos en `.env.local` 0600 si falta, sin imprimirlo ni reemplazar valores existentes/inyectados. Es material de firma **y cifrado local**, no un secreto sustituido por un proxy HTTPS. Todas las instancias deben compartirlo. Conservarlo por separado junto a backups privados; cambiarlo invalida enlaces y hace ilegibles payloads anteriores. No rotarlo sin un procedimiento de recifrado/conciliación. No se implementó rotación automática.
3. `NEWSLETTER_ORIGIN` es el origen exacto del navegador y de los enlaces de correo; por defecto `SITE_URL` o localhost:3000. HTTPS obligatorio fuera de loopback. No se construyen enlaces desde Host suministrado por el visitante. Configurar también ADMIN_ORIGIN para el panel.
4. Por defecto `NEWSLETTER_MODE=disabled`: guarda PENDING, consentimiento y entrega BLOCKED, sin llamar al proveedor ni afirmar envío. El formulario explica el bloqueo. `RESEND_API_KEY` y `RESEND_FROM` son necesarios con `NEWSLETTER_MODE=resend`; el operador verifica su dominio y permisos de Resend. No se crean cuentas o recursos comerciales. Configurar la clave en ajustes seguros con destino exclusivo `api.resend.com`. No pegarla por chat o en Git.
5. `capture` solo funciona con `ATLAS_NEWSLETTER_TEST_CAPTURE=true` y DATABASE_URL terminada en `_test`, configurados por wrappers de pruebas. Registra CAPTURED, nunca ACCEPTED/SENT. El público y panel dicen explícitamente que no se envió correo. Una configuración capture sobre otra DB queda disabled.
6. `npm run dev -- --port 3000` o `npm run start -- --port 3000` con build vigente. `/newsletter`, formularios en `/`, `/blog` y artículos publicados; `/admin/newsletter` solo OWNER/ADMIN. La cuenta humana continúa pendiente de contraseña elegida mediante `npm run admin:init` (TTY sin eco).

Guardar ajustes del entorno, publicar su snapshot, publicar Git y desplegar la aplicación son operaciones distintas. Ninguna se realiza por preparar estos archivos.

## Captación, privacidad y consentimiento

- Formulario reutilizable con email, consentimiento obligatorio y texto versionado `newsletter-2026-10-v1`: “I agree to receive AI Workflow Atlas emails, including clearly labeled sponsorships. I can unsubscribe at any time.” La versión se conserva en código/Git y cada evento en PostgreSQL, con fecha y origen controlado home/blog/article/newsletter.
- Validación Zod estricta, máximo 5000 bytes JSON, Origin exacto, nonce/firma HMAC por origen del formulario y una hora de vigencia, honeypot y límites persistentes globales (100/hora) y por correo normalizado (3/hora). No se confía en IP de headers no verificados. Límite global es conservador y compartido por instancias; ajustar solo con evidencia de tráfico legítimo.
- Email único normalizado y bloqueo transaccional por dirección impiden duplicados concurrentes. Nuevas solicitudes y direcciones conocidas reciben el mismo contrato público `received/message`: no se devuelven ID, estado, token, direcciones o listas. No hay endpoint público para consultar suscriptores.
- Suscriptor inicialmente PENDING. Token aleatorio 256 bits, solo digest SHA-256 en la fila, expira en 24 horas y se consume una sola vez. Repetición de solicitud no duplica correos en cinco minutos. Un intento posterior permitido renueva token/generación y conserva eventos anteriores; una baja nunca se convierte en CONFIRMED sin otro doble opt-in.
- Confirmación y baja usan fragmentos URL para que el token no viaje en GET, logs de acceso o Referer. El cliente lo retira del historial antes de operar. GET nunca muta estado, incluso al abrir enlaces un escáner de correo. Acción explícita POST del usuario, origen válido y token correcto.
- Baja HMAC ligada a suscriptor/generación, sin caducidad arbitraria mientras siga vigente ese consentimiento. Idempotente, registra evento y suprime entregas preparadas. Reinscribirse invalida enlaces de generaciones anteriores. Cada plantilla de campaña incluye baja y List-Unsubscribe con enlace web; no se anuncia soporte RFC 8058 one-click porque no se implementó ese POST de correo.
- No se importan listas, no se confirma desde administración y no se venden/exportan contactos a patrocinadores. No hay borrado/retención automática. Datos de consentimiento/entregas tienen FK restrictivas y requieren política operativa antes de producción; no se declara cumplimiento jurídico integral.

## Borradores, aprobación y envíos

- Asunto, preheader, párrafos de texto seguro (sin ejecutar HTML), selección de artículos publicados/revisados y campaña comercial opcional de tipo NEWSLETTER_SPONSORSHIP. Edición con updatedAt rechaza sobrescrituras; solo DRAFT editable. Crear/guardar/proponer no envían nada.
- Propuesta editorial manual desde 1–12 artículos previamente aprobados: crea otro DRAFT y guarda IDs de fuentes. `proposeNewsletter` es la entrada futura para un agente editor; no llama IA, no activa agentes, jobs, publicaciones o envíos. Requiere autorización administrativa.
- Preparar exige revisión humana y número exacto de confirmados vigente (1–1000). Guarda destinatarios/generación, cuerpo renderizado cifrado e idempotencyKey por entrega; estado APPROVED significa audiencia preparada, **no envío autorizado**. No incluye PENDING/UNSUBSCRIBED. El límite de 1000 rechaza la preparación completa, nunca recorta silenciosamente una lista mayor.
- Preparados son inmutables. Cancelar suprime pendientes; copiar crea un nuevo DRAFT para cambios o nueva configuración. Cambio de modo/remitente requiere otro borrador/preparación; un lote capturado nunca pasa luego al proveedor real.
- Enviar exige sesión OWNER/ADMIN fresca, Origin/CSRF, updatedAt, número de audiencia y confirmación exacta `ENVIAR`. Procesa hasta dos filas por acción humana (Fase 12: timeout de proveedor 10 s, maxDuration 60 s). No hay bucle cliente, cron, reanudación automática ni scheduler. Revalidación por destinatario: consentimiento/generación, estado de campaña, disponibilidad de artículos y elegibilidad/versión del patrocinio.
- Cancelar no retira correos ya aceptados. Baja y envío se serializan sobre el suscriptor; un correo ya en curso puede terminar antes de la baja. Las filas suprimidas se identifican CANCELLED. Una campaña con resultados parciales/suprimidos no se etiqueta SENT automáticamente.

## Proveedor, historial y recuperación

`EmailService` desacopla dominio de `ResendEmailService`; usa fetch nativo POST `https://api.resend.com/emails`, Bearer, JSON, Idempotency-Key por mensaje, timeout 10 s y sin redirects. Plantillas HTML/texto escapan texto y URLs; cada destinatario recibe su propia petición, sin exponer otros contactos.

NewsletterDelivery conserva payload AES-256-GCM, consentimiento, clase, modo, intentos/fechas, ID real del proveedor y error de código seguro. Solo aceptación HTTP válida con ID real produce ACCEPTED. No equivale a delivered, opened o clicked; no hay webhooks de entrega/aperturas ni números inventados. Campaña SENT exige todas sus entregas ACCEPTED; captura local nunca lo establece.

Antes del I/O externo se guarda una barrera duradera UNKNOWN. Si el proceso/commit falla, la fila no vuelve a ser elegible de forma implícita. Una petición concurrente no repite un envío. Errores de transporte/5xx/429 son inciertos, 4xx son FAILED, configuración ausente BLOCKED. No se reintentan automáticamente UNKNOWN/FAILED; así no se repite fuera de la ventana de idempotencia de Resend. Un operador debe conciliar primero el ID/idempotencyKey y la respuesta real en el proveedor. No convertir UNKNOWN en QUEUED por SQL ni reintentar a ciegas. No se implementó un botón que eluda esta conciliación.

Los BLOCKED sin intento externo pueden procesarse en otro lote autorizado si su configuración/consentimiento/patrocinio siguen siendo los mismos. Para confirmaciones bloqueadas, el visitante puede volver a solicitar tras el cooldown y los límites: se emite un token nuevo, nunca se aprueba la dirección manualmente.

Panel: suscriptores con búsqueda/estado y páginas de 20; campañas últimas 100; historial últimos 100; eventos íntegros permanecen en DB. UI no expone payloads/tokens; vista de captura solo en DB aislada de tests y con permiso administrativo. Guardar dumps cifrados y clave privada por separado. Migrar con db:deploy; no reset/db push, no editar SQL aplicado. Backup/restauración PostgreSQL descritos en DATABASE.md; este cambio no declara un nuevo ensayo de restauración.

## Patrocinios

Asociación con campaña real del CRM. Para preparar y enviar: tipo Newsletter, ACTIVE, aprobación humana, contrato, periodo vigente, paquete habilitado y orden PAID PRODUCTION con transacción/evento verificados. El mismo guard comercial se reutiliza. Si cambian creatividad/versión o condiciones financieras, se bloquea la entrega preparada; no se sustituye el anuncio silenciosamente.

Plantilla identifica `SPONSORED · empresa`, texto y enlace `rel=sponsored`. No se crean ventas o campañas en desarrollo para llenar espacios. Pruebas usan únicamente estados financieros ficticios identificados en sus propias bases temporales, sin llamar proveedores de pagos. No se inició Fase 8.

## Verificación

`npm run check`, `npm run test:db`, `npm run build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Wrappers crean/eliminan solo su DB temporal `_test`, aplican once migraciones y comprueban deploy repetible. Pruebas de Resend con transporte falso explícito comprueban protocolo/estados; nunca se presentan como envío externo real. Tests de captura no requieren API key.

Fuentes oficiales leídas el 25-10-2026: README y transporte `src/emails/emails.ts` del repositorio [resend/resend-node](https://github.com/resend/resend-node). Transporte recuperado HTTP 200, SHA-256 `e5927850f8ae4bf4f17e1711503c3768e9f8944035bf93ce2784db5518261008`. Ver documentación vigente del proveedor al activar su dominio y realizar la primera prueba externa autorizada.
