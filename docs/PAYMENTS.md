# Órdenes y Wompi Colombia — Fase 8

Infraestructura local implementada, exclusivamente Sandbox. **No se ha ejecutado ni verificado un pago externo.** No hay claves Wompi configuradas y la política del proxy respondió 403 al consultar la documentación oficial `https://docs.wompi.co/docs/colombia/widget-checkout-web/`. Por tanto, la revisión de documentación vigente y la compatibilidad externa del adaptador siguen pendientes; las pruebas locales no las sustituyen. No se inició Fase 9.

## Configuración y puertas pendientes

- `WOMPI_SANDBOX_ENABLED=false` por defecto. Para operar contra Wompi hacen falta una cuenta de pruebas existente, `WOMPI_PUBLIC_KEY` Sandbox y los secretos **Sandbox** de integridad y eventos. Se rechazan prefijos de producción. No se crean cuentas o recursos comerciales y no se activa producción.
- La clave pública no es un secreto. `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET` permanecen en servidor, en configuración privada/gestor de secretos de hosting. Son valores reales utilizados localmente para SHA-256, **no placeholders de sustitución de un proxy HTTP**. No declararlos como secretos destinados a un host ficticio ni escribirlos en Git, logs, frontend o chat. `.env.local` está ignorado, con permisos 0600; no se inventan estas claves.
- `PAYMENT_ORIGIN` es el origen público exacto para el retorno, por defecto SITE_URL/localhost:3000. HTTPS obligatorio fuera de loopback. En producción de la aplicación, configurar también ADMIN_ORIGIN; esto no habilita cobros de producción.
- Revisión oficial pendiente de los contratos de checkout, firma/expiración, shape de evento, cabecera y consulta de transacciones. Antes de habilitar: recuperar y contrastar la documentación oficial vigente, verificar claves/ambiente y callback HTTPS accesible para Wompi. No se considera resuelta esa revisión porque pasen vectores creados localmente.
- Borrador cloud preparado para `docs.wompi.co`, `sandbox.wompi.co`, `checkout.wompi.co`, preservando destinos anteriores. Revisar/guardar ajustes y publicar el entorno para activar el snapshot. Guardar el borrador no aplica red al runtime ni prueba restauración en una tarea nueva. La denegación de red no se sorteó con otro proxy, TLS deshabilitado o peticiones directas.
- Este adaptador usa checkout hospedado y consulta por clave pública, sin crear transacciones de tarjeta desde el backend; no utiliza WOMPI_PRIVATE_KEY, PAN, CVV, tokenización ni aceptación almacenada de instrumentos. Compatibilidad del proveedor pendiente de la verificación anterior.

## Dominio y persistencia

Se reutilizan PaymentOrder, PaymentTransaction y PaymentEvent. Dos modelos nuevos: PaymentAttempt (referencia/intento de checkout) y PaymentOrderHistory (registro inmutable en la aplicación, con actor cuando corresponde). Total 30 modelos, trece migraciones aditivas. No se editaron las once anteriores.

- Orden comercial: referencia aleatoria única `ATLAS-SBX-…`, patrocinador, paquete, solicitud opcional coherente, precio/moneda comerciales y de cobro, versión del precio, fechas, estado, expiración e historial.
- Intento: referencia independiente `ATLAS-TEST-…`, proveedor/ambiente, importe/moneda, expiración y estado. La FK compuesta exige correspondencia con orden y condiciones financieras.
- Transacción: identificador del proveedor único por proveedor/ambiente, estado observado, fecha de confirmación y vínculo al intento/orden. FK compuesta impide asociar un intento de otra orden o proveedor. Pueden existir varias transacciones del proveedor en un intento; dos aprobaciones no se ocultan: quedan registradas y requieren revisión.
- Evento: digest, firma verificada o consulta de conciliación identificada por source, estado de procesamiento, errores seguros, resumen mínimo e historial de reintentos. No se almacenan payloads de tarjeta, datos del pagador o secretos.
- Campaña publicitaria: conserva su modelo, relación con orden y aprobación. El pago no activa campaña ni publicación.
- Cumplimiento: NOT_STARTED, SANDBOX_ONLY u ON_HOLD se mantienen separados del estado financiero. Un CHECK impide FULFILLED para órdenes Sandbox. No se presenta una prueba como patrocinio vendido o servicio entregado.

Migración 12 añade estructuras/campos e idempotencia de creación, conservando filas históricas con snapshot comercial nullable. Migración 13 añade FK de intento/orden/proveedor y actor, y restricciones de snapshot/cumplimiento. Los registros históricos no son rellenados con precios inventados. Se conservan restricciones anteriores de importes positivos, fechas pagadas, eventos y entornos.

## Precios y órdenes

`/admin/payments` solo OWNER/ADMIN, con autenticación/rol fresco por página, API y servicio; Origin/CSRF, JSON acotado a 5 KB, Zod estricto y respuestas privadas no-store. No hay endpoints anónimos de listas, contactos o estados de órdenes.

El navegador envía únicamente patrocinador, paquete, versión de paquete, nonce de creación y solicitud opcional. Campos como importe, moneda, ambiente o PAID se rechazan. El backend consulta el paquete disponible/habilitado y precio positivo en entero de unidades mínimas; cambios de precio/versión generan conflicto.

Para Wompi se admiten **solo paquetes con precio comercial explícito en COP**. Los campos comerciales y de cobro son separados, pero en esta fase coinciden: no hay conversión USD/EUR→COP ni tasa de cambio ficticia. Un paquete en otra moneda debe configurarse comercialmente en COP por el operador o esperar otro proveedor/cotización aprobada fuera de este alcance. Importe en centavos COP, límite seguro del contrato JSON del proveedor; no floats monetarios.

Una creación reintentada con el mismo requestId/datos devuelve la misma orden; cambiar datos con ese nonce se rechaza. Bloqueo PostgreSQL y clave única cubren concurrencia. La UI conserva el nonce tras respuesta incierta/repetida; cambiar el formulario o recargar permite una nueva solicitud intencional.

Preparar checkout no paga ni confirma. Solo órdenes Sandbox propias PENDING/no vencidas pueden hacerlo. Un intento PREPARED/PENDING se reutiliza mientras no venza; no se generan pagos paralelos desde el mismo doble clic. Tras DECLINED/ERROR se puede preparar explícitamente un intento nuevo. Intentos vencidos o inciertos exigen conciliación antes de otro checkout, para evitar reintentar a ciegas. No existe scheduler que modifique estados por fecha; los checks bloquean expirados aunque el estado almacenado siga PENDING.

## Contrato del adaptador (pendiente de contraste oficial vigente)

`PaymentProvider` desacopla checkout, verificación de evento y consulta. Implementación única WompiSandboxProvider; el cliente no selecciona proveedor/ambiente. Producción no tiene URL, factory o bandera habilitadora.

- Checkout hospedado `https://checkout.wompi.co/p/`, public-key Sandbox, reference de intento, currency=COP, amount-in-cents entero, expiration-time ISO y redirect-url controlada. Firma implementada SHA256(reference + amount + currency + expiration + integritySecret). Solo digest y clave pública llegan al navegador; secretos no.
- Consulta GET `https://sandbox.wompi.co/v1/transactions/{id}`, Bearer de clave pública, timeout 10 segundos, sin redirects ni caché. ID acotado/validado, URL fija para evitar SSRF, moneda COP e importe entero seguros. No se realizan POST de cargo desde este servidor.
- Webhook `/api/payments/wompi/webhook` (configurarlo en la cuenta Sandbox cuando haya callback HTTPS). Solo JSON, máximo 32 KB; no requiere cookie/CSRF del administrador porque autentica al proveedor mediante checksum. Sin clave/configuración devuelve 503, sin fingir evento procesado.
- Evento `transaction.updated`, environment=test, timestamp, data.transaction y signature.properties/checksum. Checksum implementado SHA256(valores de properties en orden + timestamp + eventsSecret), comparación constante de digest. Si existe X-Event-Checksum debe coincidir con el cuerpo. Se exige que estén firmados ID, status y amount_in_cents, se rechazan paths peligrosos/inexistentes/duplicados y timestamps futuros. El contrato exacto sigue sujeto al contraste oficial pendiente.

Los parámetros de retorno a `/payments/return` nunca consultan ni cambian pagos, no muestran datos privados y siempre son noindex/no-store. La página explica que el estado depende del servidor. No existe acción manual para marcar PAID/APPROVED o modificar importes desde el panel.

## Procesamiento, idempotencia y recuperación

Verificar checksum no basta para confiar en campos no firmados: **cada evento nuevo consulta la transacción en Sandbox**. Se ignora reference/currency manipulable del cuerpo; el resultado de la consulta debe coincidir en ID e importe firmados y se vincula por la referencia real a un intento. Luego se contrastan moneda, entorno e importe con la orden guardada. Si falta referencia o hay conflicto, se conserva el evento IGNORED/CONFLICT sin liquidar otra orden.

Evento único derivado de timestamp/checksum. La repetición ya procesada se reconoce sin otro asiento. Recepción y actualización financiera se separan; fallos de consulta quedan RETRYABLE y devuelven 503 para que el proveedor pueda reenviar el mismo evento. La transición se realiza atómicamente con bloqueo de la orden y el evento, transacción, historial y resultado. La consulta ocurre fuera de la transacción SQL para no mantener locks durante la red.

PENDING puede pasar a APPROVED/DECLINED/ERROR/VOIDED. Estados terminales no retroceden a PENDING; APPROVED admite VOIDED. Cambios incompatibles se registran como conflicto. APPROVED verificado por consulta marca orden PAID con ambiente SANDBOX y cumplimiento SANDBOX_ONLY. Repetidos no crean pagos nuevos. Pagos tras cancelación/vencimiento o múltiples aprobaciones quedan ON_HOLD; la retención no desaparece ante otra observación aprobada.

La conciliación requiere administrador y un ID real del proveedor. Consulta ese ID y exige correspondencia con un intento de la orden. No acepta estado o importe del navegador. Registra source=RECONCILIATION y digest; no inventa una firma webhook. Respuestas fallidas dejan historial seguro, sin cambiar la orden. Se puede repetir una consulta explícita; un resultado idéntico no duplica asientos. No hay cron, reembolsos, voids externos, reintentos automáticos de cargos o bucles de red.

Para una respuesta incierta al checkout: recuperar la misma orden/nonce, consultar el ID visible en la cuenta Sandbox o esperar el evento. No crear otro intento/orden para ocultar el estado incierto. Un ID que no pertenece al intento se rechaza; si no hay ID ni evento, resolver primero en el proveedor. Cancelar localmente no anula una transacción ya en curso; una aprobación tardía se registra y retiene. No cambiar estados por SQL para saltarse conciliación.

## Panel y comercialización

Órdenes con búsqueda/estado y páginas de 12; patrocinadores/paquetes configurados, snapshot comercial/cobro, estado/ambiente/fechas/cumplimiento, últimos 20 intentos, 30 transacciones, 20 eventos por transacción y 30 entradas de historial; últimos 50 eventos Sandbox globales con errores. Límites de lectura no eliminan historia. Crear empresas y precios sigue en el CRM; no se insertaron fixtures en desarrollo.

El guard comercial de Fases 6–7 permanece: aprobación humana + paquete/creatividad/fechas/contrato + orden del mismo producto/patrocinador **PAID PRODUCTION** con transacción/evento verificados. Esta fase solo escribe Sandbox, por tanto **ningún pago de prueba activa un anuncio o patrocinio real**. La entrega futura de pruebas aisladas no altera este guard.

## Verificación y cierre pendiente

`npm run check`, `npm run test:db`, `npm run build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Pruebas en bases `_test` temporales propias, con trece migraciones y deploy repetible; claves/firmas/respuestas locales de fixture identificadas. E2E fuerza Wompi deshabilitado para impedir llamadas accidentales con credenciales heredadas. El adaptador de integración usa un transporte falso; no se reporta como Sandbox externo.

La aceptación externa exige revisar documentación oficial accesible y efectuar checkout/pago Sandbox y evento/conciliación reales con las credenciales/callback de prueba. Esas operaciones no se ejecutaron. No hay cobros reales, publicaciones, envíos de comunicaciones, recursos de pago o Fase 9.
