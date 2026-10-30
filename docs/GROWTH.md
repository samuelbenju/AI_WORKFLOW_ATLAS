# Medición, crecimiento y afiliados — Fase 11

Actualización 27-10-2026: AdSense opcional y apagado preparado en [PUBLIC_LAUNCH.md](PUBLIC_LAUNCH.md), con CMP publicitaria separada de este consentimiento de analítica. Su API de informes se consulta manualmente con OAuth readonly y autorización/CSRF, sin llamadas al abrir el panel. Estimaciones oficiales puntuales separadas de ingresos confirmados; no se guardan bajo proveedor GA4/GSC ni se altera el esquema. Sin cuenta o credenciales reales verificadas.

## Estado y activación

`/admin/analytics` es privado, solo OWNER/ADMIN. Métricas consultadas en PostgreSQL, fuentes externas diferenciadas, sin llenar vacíos con demos. La implementación usa fetch/crypto nativos y el stack existente, sin nuevas dependencias. Migración 16 aditiva, `20261026001600_growth_analytics`, total 45 modelos/dieciséis migraciones; conserva el historial, lockfile y datos anteriores. La auditoría de Fase 12 está documentada en ../AUDIT_REPORT.md; sin activación de servicios.

`ANALYTICS_ENABLED=false` por defecto. La infraestructura local se prueba en DB temporales con medición habilitada explícitamente; desarrollo queda sin medición activa. Habilitar la captación requiere configurar el flag y origen exacto `ANALYTICS_ORIGIN` (HTTPS salvo loopback), y **cada navegador debe aceptar**. Abrir el panel no llama a Google/OpenAI, contrata servicios o activa cron. Las cinco automatizaciones empresariales conservan su estado deshabilitado y presupuesto cero. La cuenta humana requiere bootstrap interactivo de administrador si aún falta.

## Consentimiento y eventos propios

La UI pública ofrece aceptar/rechazar con igual jerarquía y preferencias para retirar consentimiento. Las áreas privadas, rutas API/pagos y enlaces de confirmación/baja no captan navegación. DNT/GPC prevalecen sobre cookies y elecciones positivas. Antes de aceptar no se crean identificadores de analítica; rechazar conserva solo la preferencia necesaria. La elección se guarda un año. No se cargan SDK/scripts de Google en el navegador.

Tras aceptar, identificadores aleatorios de 256 bits en cookies HttpOnly/SameSite=Lax/Secure con HTTPS; en DB solo SHA-256 del visitante/sesión. **Son identificadores seudónimos de navegador, no personas o usuarios autenticados.** Visitante: cookie de 30 días; sesión: 30 minutos renovables por actividad. Consentimiento versionado y fecha persistidos. Una sesión nueva conserva el visitante si la cookie aún existe. El total de usuarios internos activos se presenta aparte del tráfico público.

El navegador solo puede registrar PAGE_VIEW, SEARCH (sin término), TOOL_VIEW y CAMPAIGN_CLICK. Rutas canónicas públicas validadas y, en fichas, existencia/publicación/no-demo verificada. No queries, fragmentos, emails, IP, user-agent, parámetros libres o importes de navegador; no fingerprinting. La búsqueda se cuenta, no se guarda su consulta. Eventos repetidos con el mismo UUID no se duplican. Origin/JSON/tamaño, límites globales (100 sesiones/minuto, 3000 eventos/minuto) y máximo de 300 eventos por sesión. La infraestructura del host puede tener sus propios logs, fuera de estos registros de aplicación.

Los clics en campañas solo se aceptan para espacios aprobados/activos/pagados PRODUCTION y válidos según las guardias comerciales. Datos del navegador siguen siendo observaciones susceptibles a bloqueadores/bots; no acreditan audiencia auditada. La falta de eventos no demuestra falta de tráfico. El panel diferencia seguimiento no habilitado, muestra observada, registros administrativos y datos externos.

NEWSLETTER_SIGNUP/NEWSLETTER_CONFIRM/SPONSOR_REQUEST se registran únicamente desde operaciones exitosas del backend, nunca desde el endpoint del navegador. Se identifican por entidad/generación de negocio para evitar dobles conteos. El Referer se reduce a pathname del mismo origen. Confirmar newsletter utiliza la ruta de captación previamente registrada, si persisten consentimiento y sesión; no almacena token de email. El doble opt-in y consentimiento de correo siguen siendo independientes del seguimiento.

La atribución es opcional y best effort: una caída de medición no revierte el negocio guardado. Confirmaciones en otro navegador/sesión caducada/sin consentimiento pueden no atribuirse. Los totales reales de suscripciones/confirmaciones/leads se obtienen de sus tablas de negocio, también cuando no hubo tracking. No dividir esos totales por una muestra incompleta para afirmar tasas de conversión publicitaria. La proporción WON se etiqueta como estado actual de la cohorte de solicitudes creadas, no atribución causal.

Retirar consentimiento elimina todas las sesiones/eventos **locales** del identificador de navegador vigente y borra sus cookies. No borra registros de correo/CRM/pago con consentimiento/finalidad propios ni puede retirar automáticamente datos ya aceptados por Google. Sesiones de más de 90 días se eliminan por la acción administrativa de retención, con auditoría; no se activó una tarea recurrente. Debe ejecutarse ese mantenimiento o integrarlo en infraestructura autorizada antes de recoger datos a largo plazo. La prueba demuestra el borrado en cascada y conservación del negocio.

## Google Analytics 4 y Search Console

Las integraciones externas arrancan no configuradas. No hay cuentas creadas ni consultas reales autorizadas a propiedades sin credenciales. Configurar valores privados en servidor, nunca en Git, prompts o chat.

- Captación GA4: Measurement Protocol de servidor. `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` y `GA4_MODE=validation|live`; default disabled. Solo eventos propios ya consentidos/validados, con ID seudónimo y URL canónica sin query/referrer; publicidad personalizada y datos publicitarios denegados. No transmite emails, términos de búsqueda, UUID de negocio o secretos en eventos.
- Validation: POST `https://www.google-analytics.com/debug/mp/collect`; VALIDATED_TEST indica validación de contrato, **no colección real**. Live: POST `https://www.google-analytics.com/mp/collect`; un HTTP 2xx solo produce ACCEPTED_UNVERIFIED, nunca una afirmación de ingestión/atribución. La API puede aceptar sin informar errores semánticos: contrastar con un informe real de la propiedad. Secret en query exclusivamente del servidor HTTPS; conservar proxy/TLS y no registrar URL/errores crudos. Un placeholder de proxy no sirve como valor local salvo soporte explícito de sustitución para ese campo; usar configuración privada compatible y verificar recepción.
- Estado por evento: NOT_CONFIGURED → PENDING → VALIDATED_TEST/REJECTED/ACCEPTED_UNVERIFIED/FAILED/UNKNOWN. Barrera antes del I/O, timeout 3 s y sin reintentos ciegos ante incertidumbre/caída. Un PENDING tras caída requiere revisión, no replay automático. El panel muestra historial agregado sin divulgar identidades.
- Informes GA4: `GA4_PROPERTY_ID` numérico y `GA4_ACCESS_TOKEN` OAuth de solo lectura, permiso analytics.readonly en propiedad autorizada. POST fijo `https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport`, con date/totalUsers/sessions/screenPageViews. Solo consulta manual con sesión/CSRF/confirmación; guarda snapshot y auditoría. Usuarios diarios únicos **no se suman** como únicos de todo el periodo. Fechas según timezone de la propiedad, distintas potencialmente del UTC propio.
- Search Console: `GSC_SITE_URL` propiedad URL HTTPS o sc-domain autorizada y `GSC_ACCESS_TOKEN` OAuth webmasters.readonly. POST fijo `https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`, dimensiones date, datos final, sin consultas de búsqueda/personales. Fechas/calendario PST del proveedor según contrato oficial, no UTC propio. Se guardan clics/impresiones/CTR/posición reportados, sin inventar rankings o promediar posiciones sin su base.

Tokens OAuth pueden caducar; no hay login OAuth/refresh automático ni acceso ampliado a una cuenta. Configurar/renovar de forma segura. Credencial presente significa configuración, no prueba de autorización/recepción. Los errores no generan ceros ficticios ni sustituyen fuentes. Snapshots con fecha/rango/fuente explícitos; máximo 90 días/100 filas, cuerpo acotado y timeout de consulta 10 s. El panel mantiene separados datos propios e importados.

Contratos de informes contrastados mediante los discovery oficiales de googleapis/google-api-nodejs-client (HTTP 200, hashes en BUILD_LOG). Las pruebas de transporte y métricas Google son **fixtures locales identificadas**, no datos de propiedades reales. Faltan credenciales/propiedades y prueba externa autorizada para verificar Google en uso real.

## Afiliaciones

Administración de programas (hosts exactos permitidos, estado, nombre de variable de firma) y enlaces (herramienta, código, texto, URL, estado). Nuevos deshabilitados por defecto; publicación exige activarlos y herramienta PUBLISHED/no-demo. Destino HTTPS sin credenciales/fragmento/puerto alternativo, host exacto, sin parámetros obvios de secretos/contactos. Guardas de versión y auditoría. Cambiar hosts vuelve inelegibles los enlaces anteriores fuera de la lista. No se fabrican acuerdos o conversiones por activar un enlace.

La ficha muestra divulgación en inglés, enlaces rel=sponsored nofollow noreferrer y ruta `/go/[code]`. Redirección 303/no-store/noindex con destino únicamente de DB; parámetros externos ignorados, sin open redirect del visitante. Clics propios solo con consentimiento/sesión válida; HEAD/prefetch no cuentan, doble registro de navegador/servidor evitado. Se cuentan solicitudes de redirección consentidas, no compras ni personas verificadas. No hay click ID personal en la URL del socio. Deshabilitados/retirados devuelven 404 y no redirigen.

### Conversiones verificables del proveedor

No existe botón/API administrativa para escribir comisiones como verificadas. Se preparó un contrato de webhook **para proveedores que adopten explícitamente este protocolo**; no se afirma integración operativa con una red comercial particular.

1. Configurar una clave de firma exclusiva de cada socio en variable privada `AFFILIATE_PROVIDER_<SOCIO>_SECRET` (mínimo 32 caracteres). Guardar en programa solo su nombre. HMAC necesita material secreto local real, no placeholder de proxy; no pegar valores en el panel/chat. Rotación coordinada y sin mezclar socios.
2. POST JSON acotado a `/api/affiliates/webhook/{programSlug}`. Header `x-atlas-timestamp` epoch segundos; `x-atlas-signature` = `sha256=` + HMAC-SHA256 sobre `timestamp + '.' + cuerpoRaw`, hexadecimal minúscula. Ventana de cinco minutos, comparación constante. Reintentos usan timestamp/firma actuales con cuerpo estable.
3. Cuerpo estricto: eventId, conversionId, linkCode, status CONFIRMED|REVERSED, commissionMinor (cadena de entero no negativo), currency COP|USD|EUR, occurredAt ISO de la conversión original. Sin email/contactos/campos extra. El enlace debe pertenecer al programa autenticado, incluso si dejó de anunciarse; las bajas no impiden conciliar reversiones históricas.
4. Firma válida, fecha y pertenencia verificadas; idempotencia por programa/eventId y programa/conversionId, hash del cuerpo + hora firmada + verificada, conversión y auditoría transaccionales. Repetición exacta no duplica. Cambiar identidad/importe/moneda/fecha de una conversión se rechaza. REVERSED no puede volver a CONFIRMED implícitamente; evento nuevo de reversión retira comisión del agregado sin eliminar historial.
5. Importe confirmado es comisión **devengada/verificada criptográficamente con el socio**, no pago bancario recibido, comisión inventada a partir de clics o validación independiente del negocio. Sin clave/proveedor real hay estado no configurado y ninguna conversión atribuida.

El webhook no recibe cookie/ID de visitante ni crea perfiles; enlaza únicamente programa/enlace/transacción externa. El browser no puede generar conversiones firmadas. Fixtures de integración firman con claves aleatorias únicamente en DB temporal y no se presentan como conversiones externas reales.

## Dinero y coste de IA

Importes BigInt en unidades mínimas, agrupados por moneda, preservando precisión. Bruto de órdenes actuales PAID/PRODUCTION con transacción APPROVED confirmada y evento verificado/procesado; Sandbox siempre separado. No supone conciliación bancaria, tratamiento fiscal, ingresos netos, comisiones de pasarela o historial completo de reembolsos.

Gastos: entradas administrativas con referencia de comprobante, moneda/fecha/categoría; registrar no paga nada. Anulación auditada, sin eliminar historial. Referencia del operador no equivale a documento contrastado con un proveedor. Evitar duplicar en gastos las estimaciones IA que se restan por separado. Resultado parcial = bruto confirmado + comisiones verificadas devengadas − gastos registrados. No beneficio contable. Solo para USD se ofrece además estimación en micro USD tras coste IA; COP/EUR no se convierten automáticamente.

Costes IA: únicamente AgentExecution provider OPENAI; TEST_FIXTURE excluido. Uso conocido y reservas conservadoras inciertas diferenciados, todos costes monetarios estimados a tarifas del operador, **no factura**. Al abrir el panel no se ejecuta IA. Evolución por día UTC para eventos propios, altas/confirmaciones/leads y movimientos por moneda, con fuentes definidas.

## Oportunidades, experimentos y CEO

Muestra acotada de hasta 200 páginas públicas recientes (80 tools, 40 use cases, 80 artículos), ordenadas por vistas observadas. Sin eventos no afirmar bajo rendimiento demostrado. Candidatos de enlaces internos por categorías compartidas y ausencia de enlace estructurado, siempre sujetos a criterio editorial. Suscripciones confirmadas/solicitudes por contenido solo para atribuciones consentidas.

Experimentos persistidos con hipótesis, ruta, métrica, estado propuesto/en observación/completado/detenido. Gestión no cambia páginas, asigna visitantes ni lanza un test A/B automáticamente. Las observaciones del periodo no prueban causalidad, significancia o uplift. La operación editorial requiere sus propios permisos.

CEO usa la nueva herramienta limitada analytics_summary sobre el motor de Fases 9–10. Solo agregados, máximos cinco contenidos/siete días recientes y hasta siete filas por informe externo previamente importado; no recibe credenciales Google, emails, referencias de gastos o tokens. No consulta servicios externos al ejecutar esta herramienta. El worker recibe solo el flag no secreto de disponibilidad propia, además de su configuración anterior. La migración añade la capacidad al perfil CEO con conjunto original conocido y eleva promptVersion; aprobaciones antiguas necesitan revisión, sin habilitarlo o cambiar presupuestos. Las recomendaciones siguen pendientes de aprobación humana y proveedor real IA deshabilitado.

## Pruebas y operación

`npm run check`, `npm run test:db`, `npm run build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`. Los runners usan DB temporales; Google/partners/IA simulados identificados como fixtures. Pruebas de consentimiento/DNT/GPC, eventos/idempotencia/límites, fuente de suscripción/lead real local, permisos/CSRF, dinero/reversión/firmas, destino de afiliado, precisión/currency/ventanas, datos privados, informes y transporte, retención y UI móvil/axe.

Actualizar snapshot del worker propio únicamente tras comprobar cero RUNNING y flags/budgets deshabilitados. `npm run test:agent-service` comprueba daemon/cola/heartbeat/reinicio sin IA en DB/contenedor aislados. No se activan servicios comerciales, llamadas de IA, pagos o costes recurrentes en esta fase. Credenciales Google/partner y comprobaciones externas siguen pendientes; usar configuración segura, nunca secretos por chat.

## Mejora de informes y consentimiento — 28-10-2026

GA4 dispone de seis consultas manuales de solo lectura: diario, canales, países, dispositivos, páginas de entrada y páginas consultadas. Host exacto de SITE_URL y métricas totalUsers/activeUsers/sessions/screenPageViews suministradas por Google; máximo 100 filas con indicación de truncamiento y exclusión de rutas privadas, queries o desconocidas. Los snapshots anteriores permanecen; usuarios por fila no se suman como únicos del periodo. El Measurement Protocol del servidor no acredita atribución completa de canales/geografía/dispositivos o retención; no activar tracking para llenar informes.

GSC presenta sus filas diarias (clics/impresiones/CTR/posición) en tabla y conserva el registro original. AdSense incorpora impresiones, clics, pageviews, page RPM, page CTR y cobertura oficiales, de forma manual y separada de dinero confirmado. Sin credenciales/permisos reales no hay llamadas o valores de sustitución. Ver docs/PUBLIC_LAUNCH.md para límites y comprobaciones privadas.

Las rutas About/categorías están en la lista pública permitida; eventos de categorías inexistentes o sin contenido publicado se rechazan. El control de privacidad no invita a aceptar un servicio deshabilitado: informa que está apagado, sin enviar eventos. Conserva retirada de un consentimiento anterior incluso con ANALYTICS_ENABLED=false. DNT/GPC, cookies versionadas, eliminación y controles del servidor permanecen; no se recopilan IP, User-Agent, emails o términos de búsqueda.

## Etapa17 — evidencia del embudo

La tabla administrativa y el agregado CEO usan growthFunnel sobre métricas ya calculadas, sin consultas/eventos nuevos. Orgánico y descargas quedan sin cifra acreditada; cero observaciones no significa cero tráfico. No se calculan tasas entre poblaciones comerciales/consentidas diferentes. Experimentos siguen en el modelo existente; protocolo y propuestas en PHASE17_REPORT.md, sin activaciones ni ganadores inventados.
