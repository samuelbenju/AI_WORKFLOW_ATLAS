# Lanzamiento público, SEO y monetización

28-10-2026. Una sola aplicación, Render Free + Neon existentes, Node 24/Next 16/Prisma 7. Base de la mejora SEO: `5af53c41e29dbe387a9675e6da749379819623b9`. **Preparación técnica no equivale a lanzamiento, indexación o aprobación de AdSense.**

## Estado comprobable y bloqueos

| Área | Evidencia y límite |
| --- | --- |
| Git | Main local/remota 5af53c41 coincidente y limpia antes de cambios; CI base [40704775983](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40704775983) SUCCESS observada. La CI nueva debe comprobarse por su SHA al publicar, sin atribuirle el éxito anterior. |
| Neon | [Conexión](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40372875357) y [migración](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40373255135) con SUCCESS remoto observado; propietario aporta 16/16, 55 tablas, 72 FK, PASS/COMPLETE. No repetir migraciones. |
| Catálogo remoto | [Apply 40714352948](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40714352948) SUCCESS sobre 5af53c41, observado en GitHub. Propietario confirma 101 registros creados: 65 herramientas, 30 guías y seis DRAFT, taxonomía 20/24 y contenido visible en Render. No repetir importación, bootstrap o migraciones. No se hizo una nueva consulta SQL Neon desde esta sesión. |
| Configuración privada | El propietario confirma rol de importación verificado y web funcional. No hay sesión privada Neon/Render/Google en este executor; no se inspeccionaron valores secretos ni se modificaron. OWNER humano, nuevo SHA Live y aprobaciones de lanzamiento se comprueban por sus canales privados; no se presupone que falten credenciales. |
| Acceso | API GitHub devuelve Forbidden. Web pública GitHub y Git HTTPS sí accesibles. Sitio Render, documentación Render/ayuda Google no accesibles por la política del proxy; el permiso general de red no cambia esa restricción. No se interpreta como caída de la aplicación. |
| Google | Ninguna propiedad, aprobación, cuenta, ingreso o CMP real verificados. No se crearon cuentas ni se enviaron anuncios, correos, pagos o solicitudes de IA. |

El lote inicial ya está aplicado. Conservar los 101 registros y las ediciones humanas; no ejecutar otro dry-run/apply como requisito de SEO. [CATALOG_OPERATIONS.md](CATALOG_OPERATIONS.md) conserva el procedimiento para futuras operaciones autorizadas y los incidentes anteriores, identificados como históricos.

Comprobar OWNER por el procedimiento booleano privado documentado. Solo si falta, Windows/Node 24: `npm ci --ignore-scripts`, `npm run db:generate`, `.\scripts\admin-staging.ps1`. Contraseña elegida por el propietario, entrada oculta, nunca chat/argumentos/Actions/Render. No cuentas predeterminadas.

## Puerta de publicación e indexación

No se modifica el entorno de Render en esta entrega. Mantener `SEO_INDEXING_ENABLED=false`, `PUBLIC_LAUNCH_CONFIRMED=false`, `LEGAL_REVIEW_CONFIRMED=false` mientras falte evidencia. Para permitir indexación, el operador debe comprobar **todas** estas condiciones:

1. Importación real y catálogo útil, sin demo; `/`, `/tools`, `/use-cases`, búsqueda/filtros/paginación y fichas relacionadas funcionan mediante Neon, sin login ni error oculto.
2. SHA Live y CI corresponden al código aprobado, HTTPS estable, origen y canonicals correctos. Render build/start según [RENDER_STAGING.md](RENDER_STAGING.md), nunca migraciones/seeds/bootstrap en esos comandos.
3. Identidad, contacto, dirección y fecha legal configurados con información pública revisada; seis textos aprobados por una persona competente, incluidas modificaciones sobre publicidad. Solo entonces `LEGAL_REVIEW_CONFIRMED=true`.
4. El propietario confirma lanzamiento tras revisar evidencia: `PUBLIC_LAUNCH_CONFIRMED=true`. Es una declaración humana sobre catálogo/sitio/dominio, **no una verificación automática** de Neon.
5. Finalmente `SEO_INDEXING_ENABLED=true`, `CATALOG_DEMO_MODE=false`, `SITE_URL=https://ai-workflow-atlas.onrender.com` (o dominio propio aprobado). Reconstruir/reiniciar para metadata y headers coherentes.

El código exige esas declaraciones y configuración legal válida, HTTPS público y demo apagada. Sin ellas: robots disallow, noindex y sitemap vacío. Privados permanecen protegidos y noindex incluso tras habilitar el sitio. Robots no reemplaza autorización. Los seis artículos continúan DRAFT y fuera del blog/sitemap; no se publicaron nuevos textos.

Mejoras: títulos/canonicals/OG existentes conservados; marca de portada conservada explícitamente; Organization/WebSite en home y breadcrumbs visibles/JSON-LD en directorios y detalles. Sin ratings, precios o reseñas inventadas. Fichas inexistentes/no publicadas se comprueban mediante un SELECT mínimo de identidad pública en Proxy antes de que el estado de carga envíe headers, y se reescriben a la vista 404 existente con HTTP 404/noindex. Metadata también usa notFound; por sí sola no impedía los HTTP 200 transmitidos por loading. Se conserva el streaming normal de páginas válidas. La lectura adicional debe medirse en TTFB/CWV de Render; no se certifican desde pruebas locales. Una caída de DB lanza el error sanitizado, no se interpreta como ficha inexistente.

## SEO y rendimiento implementados el 28-10-2026

- `/categories` y `/categories/[slug]` usan las categorías existentes y relaciones públicas PostgreSQL; nada de nuevas taxonomías o datos ficticios. Vacíos/solo drafts no crean hubs; una categoría con un solo registro es navegable pero no indexable por política editorial, no por un requisito numérico de Google.
- About explica procedencia, método y límites. Fichas enlazan herramientas por temas compartidos y artículos únicamente revisados/publicados; no promocionan los seis DRAFT. La fecha de actualización del registro no se presenta como verificación o prueba de la herramienta.
- Títulos/canonicals distintos por página de directorio; filtros/queries desconocidas, listas vacías y páginas fuera de rango noindex. `?page=2` en una ficha o About también noindex. Sin multiplicar landings de filtros. Sitemap no incluye blog vacío, borradores, demos o categorías sin cobertura; CollectionPage/ItemList y breadcrumbs reflejan solo el contenido visible.
- Selección ligera de tarjetas, memoización dentro de la petición y prefetch desactivado para fichas/listas de temas numerosas. Introducción/encabezados renderizan antes de las consultas mediante Suspense; los fallos PostgreSQL siguen propagándose. Comparación Lighthouse/DTO real y sus límites en BUILD_LOG.md, no acreditación de CWV de campo.
- [Estrategia SEO](SEO_STRATEGY.md) y [calendario de ocho semanas](EDITORIAL_CALENDAR.md): propuestas revisables, sin volúmenes/posiciones/ingresos inventados, sin publicaciones automáticas o nuevas escrituras en Neon.

## Search Console: intervención privada mínima

En [Google Search Console](https://search.google.com/search-console), con la cuenta del propietario:

1. Añadir propiedad **Prefijo de URL** exactamente `https://ai-workflow-atlas.onrender.com/`. No intentar verificar DNS de `onrender.com`, que pertenece al proveedor. Con dominio propio aprobado se puede elegir propiedad Dominio y TXT oficial.
2. Método etiqueta HTML: copiar únicamente el valor `content` que Google entregue a `GSC_VERIFICATION_TOKEN` en Render y reconstruir. El código valida y publica esa cadena en `google-site-verification`; no es token OAuth ni contraseña. No inventarlo.
3. Comprobar desde la web la etiqueta, HTTP 200 y disponibilidad; pulsar Verificar en Google. El asistente no puede certificar la propiedad sin acceso autorizado.
4. Tras cumplir la puerta anterior, comprobar robots y noindex y enviar `https://ai-workflow-atlas.onrender.com/sitemap.xml`. Inspeccionar home, tools, use-cases y una ficha/guía real. Solicitar indexación desde la UI cuando proceda; revisar excluidas, canonical, rastreo y cobertura semanalmente.
5. La integración administrativa existente usa `GSC_SITE_URL` y OAuth `webmasters.readonly` para consultar informes manualmente. Eso **no** verifica propiedad ni solicita indexación. Mantener tokens privados y renovarlos al caducar.

La indexación y posición dependen de Google; no se promete plazo o ranking. Fuente oficial que el propietario debe contrastar: [verificación](https://support.google.com/webmasters/answer/9008080?hl=en).

## Render Free y decisión de coste

Fuentes oficiales: [Free](https://render.com/docs/free), [precios](https://render.com/pricing). **No pudieron recuperarse en esta sesión; límites/precios vigentes pendientes de contraste**, no presentados como contrato actual. Referencias conocidas que deben revisarse: suspensión tras unos 15 minutos sin tráfico, arranque en frío de alrededor de un minuto, cuota mensual compartida de horas y filesystem efímero. No es una base de disponibilidad comercial garantizada.

Verificar expresamente el tratamiento de `/robots.txt` de un servicio Free dormido: si Render lo sustituye por `Disallow: /`, cambiar Next no resuelve esa capa del proveedor. Registrar HTTP/cuerpo reales durante actividad y tras inactividad natural; comprobar desde Search Console qué obtiene Google. **Es un riesgo/bloqueo de lanzamiento hasta verificarlo**, no un comportamiento observado de este servicio desde aquí. No instalar pings, bots o tráfico artificial para impedir suspensión o producir impresiones.

| Opción | Coste propuesto, no contratado | Uso |
| --- | --- | --- |
| Conservar Free/Neon actuales | Cero coste nuevo autorizado; sujeto a cuotas vigentes | Validar catálogo y staging. No certificar continuidad de rastreo/AdSense. |
| Subir el mismo servicio Render a una instancia siempre activa | Referencia histórica Starter US$7/mes, **precio y condiciones actuales por confirmar** | Propuesta mínima para evitar suspensión por inactividad. No es compra, presupuesto aprobado o garantía SEO/SLA. |
| Dominio propio opcional | Presupuesto orientativo US$10–20/año, cotización pendiente | Control DNS, marca y verificación propios; no garantiza aprobación Google. No se registró un dominio. |

Neon Free puede conservarse mientras capacidad/conexiones/retención reales sean suficientes; revisar backups/PITR y restauración antes de operar ingresos. No proponer otro PostgreSQL ni duplicar staging. Resend, Wompi, IA, workers y crons siguen sin activar; ningún upgrade automático. No declarar Free suficientemente fiable para negocio/indexación sin esas verificaciones.

## AdSense: configuración modular y apagada

El propietario debe crear/verificar su cuenta en [AdSense](https://www.google.com/adsense/) y completar identidad fiscal/bancaria directamente con Google; no por chat. Añadir el sitio real y esperar aprobación efectiva en la consola. El código preparado no concede esa aprobación. Comprobar que Google acepta el hostname del proveedor; si exige dominio propio, resolverlo con autorización antes de activación.

| Configuración | Condición real antes de habilitar |
| --- | --- |
| `ADSENSE_ENABLED` | false por defecto; true solo para entrega expresamente revisada. |
| `ADSENSE_PUBLISHER_ID` | `ca-pub-` y los 16 dígitos reales de la cuenta. Ningún ID de ejemplo en producción. Se usa también para la etiqueta oficial de verificación de cuenta, sin script. |
| `ADSENSE_SITE_APPROVED` | true solo tras aprobación real de Google, no por terminar el código. |
| `ADSENSE_PLACEMENTS_REVIEWED` | true solo tras revisar cuenta, exclusiones y preview móvil/escritorio. |
| `ADSENSE_CONSENT_READY` | true solo tras configurar/verificar una CMP certificada vigente, avisos y revisión jurídica. |
| `ADSENSE_CMP_ID` | Identificador real certificado de la CMP, nunca inferido o tomado de tests. |
| `ADSENSE_CMP_SCRIPT_URL` | URL exacta generada por Google Privacy & messaging: HTTPS fundingchoicesmessages.google.com, ruta `/i/pub-` del mismo publisher, query `?ers=1`. No aceptar scripts arbitrarios; si el tag oficial cambia, revisar el adaptador con evidencia. |
| `ADSENSE_MODE` | manual inicial; auto es soporte de carga del mismo script oficial y depende de Auto Ads en la cuenta. |
| `ADSENSE_SLOT_HOME/TOOLS/GUIDES/ARTICLE` | IDs reales de unidades responsive opcionales, configurados en Google. Sin slot en manual no se carga ese placement. |

No se inyectan scripts por configurar únicamente el publisher. Con una puerta pendiente no hay CMP comercial/script AdSense. Incluso con todas declaradas listas, AdSense espera consentimiento válido en ese navegador. `next/script` evita duplicados; SSR no ejecuta publicidad y navegación dinámica se verifica con transporte interceptado.

**Auto Ads se administra en Google, no en un `push` JavaScript.** En modo manual, Auto Ads debe estar apagado en la cuenta; el flag de la aplicación no puede neutralizar una configuración remota encendida. En modo auto, habilitarlo en Google y revisar exclusiones de `/admin`, `/login`, `/api`, pagos, formularios, confirmación/baja y páginas sin contenido; excluir áreas interactivas, limitar densidad y desactivar overlays/anchor/vignette si comprometen estos requisitos. Solo después declarar ubicaciones revisadas. Sin esa revisión el SDK permanece bloqueado.

Manual: una unidad como máximo por página elegible: home después de la propuesta de valor (al menos tres herramientas destacadas no-demo y una guía); tools/guías al final del listado (seis fichas reales y sin búsqueda); artículos publicados de al menos 600 palabras y noindex=false. Margen/etiqueta Advertisement y espacio reservado de 250px para la unidad. Sin SDK en fichas cortas de herramientas, directorio blog, formularios, legales, administración, pagos, vacíos o errores. Los sponsors directos permanecen separados e identificados; no se crean campañas vendidas. Auto Ads puede afectar CLS: medir antes de incrementar densidad, no se garantiza CWV de creatividades externas.

Un SDK cargado no desaparece al desmontar React. Después de solicitarlo, enlaces internos usan un nuevo documento; la guarda global cubre navegación programática e historial restaurado. Una retirada o señal de privacidad denegatoria recarga sin anuncios. No basta con borrar el tag del DOM.

### Consentimiento internacional

Revisar la [política europea de Google](https://www.google.com/about/company/user-consent-policy/) y [requisitos CMP](https://support.google.com/adsense/answer/13554116?hl=en), incluida la exigencia de CMP certificada compatible TCF para EEE, Reino Unido y Suiza. Es requisito del lanzamiento, **no una certificación del banner de Atlas**. Ayuda Google no fue accesible aquí; la lista/certificación y condiciones vigentes necesitan comprobación humana antes de `ADSENSE_CONSENT_READY=true`.

Solo se prepara el adaptador de **Google Privacy & messaging**; no una CMP propia. Su tag generado, mensaje publicado para el sitio, Google vendor y propósitos, regiones, política actual y botón de retirada necesitan prueba real. La certificación de un proveedor no implica conformidad jurídica de Atlas. El banner de analítica existente no otorga permiso de publicidad.

TCF `addEventListener` v2, CMP ID coincidente/loaded, TC string específica del servicio, gdprApplies=true, vendor Google 755 y consentimiento explícito a propósitos 1/2/3/4/7/9/10; sin restricciones incompatibles. Política inicial conservadora **en todo el mundo**: ausencia/rechazo/estado desconocido, gdprApplies=false, DNT, GPC u opt-out local bloquean anuncios. Puede reducir cobertura fuera de regiones TCF; no hay fallback NPA, anuncios limitados ni consentimiento supuesto. No se envían consent strings al servidor de Atlas.

`atlas_ads_off=v1` es preferencia necesaria, no identificador, un año/SameSite=Lax/Secure en HTTPS. Los controles separan retirada local de revisión de la CMP; retirar recarga para terminar JavaScript comercial. Volver a usar la elección CMP solo elimina el bloqueo local y sigue exigiendo su consentimiento. Las políticas públicas siguen marcadas como borrador hasta revisión; no se activa LEGAL_REVIEW_CONFIRMED por editar texto.

### ads.txt e informes

`/ads.txt`: 404 vacío sin publisher aprobado, publicación/legales/indexación válidas. Una vez configurados devuelve únicamente la línea Google con el publisher real y certificado público oficial, sin valores ilustrativos. Puede autorizar al vendedor con entrega todavía apagada; no acredita cuenta aprobada por sí mismo. Contrastar la línea con la cuenta real: [ayuda oficial ads.txt](https://support.google.com/adsense/answer/7532444?hl=en).

`/admin/analytics` mantiene fuentes separadas. Reportes AdSense opcionales con `ADSENSE_REPORT_ACCESS_TOKEN` OAuth **adsense.readonly**, solo servidor y credencial privada, renovable; no se solicita por chat. Abrir el panel no llama a Google. POST manual OWNER/ADMIN, Origin/CSRF/confirmación, autorización fresca antes y después del I/O, timeout 10s, sin reintentos automáticos. Endpoint fijo Management API v2, cuenta derivada del publisher y filtro exacto del hostname de SITE_URL; no suma otras webs del mismo editor.

El informe muestra `ESTIMATED_EARNINGS` reportado por Google, moneda original, decimales como cadenas, periodo/calendario de cuenta y hora de consulta. Rechaza truncamiento/formatos inválidos; una caída no crea ceros. Se audita la consulta, pero los importes no se guardan como movimientos o snapshots GA4/GSC ni se suman a pagos confirmados. Es una vista puntual, **no historial persistido, liquidación, factura o beneficio neto**. Contrato API contrastado con [discovery oficial Google](https://raw.githubusercontent.com/googleapis/google-api-nodejs-client/main/discovery/adsense-v2.json), HTTP200, SHA256 `e9b26c609fc32f38e40895ed9dc172cf3a7470698c6304e368bd3b8398fd0a64`. Esto no acredita una llamada a una cuenta real.

Patrocinios confirmados PRODUCTION, comisiones de afiliados verificadas devengadas, gastos registrados y costes IA estimados conservan sus reglas y monedas. No se calcula beneficio neto completo, FX o ingreso AdSense desde impresiones locales. No acuerdos de afiliación nuevos ni sustitución de enlaces oficiales; no conversiones desde clics. El CEO conserva agregados existentes y no recibe tokens ni inicia consultas AdSense.

## Verificación pública y operación

Después de catálogo y deploy real, guardar SHA Live/CI y comprobar desde navegador externo: home/tools/use-cases, ficha/guía relacionadas, nombre/categoría/tag/orden/página2, móvil/teclado, estado vacío por búsqueda sin resultados, slug desconocido HTTP404, seis DRAFT invisibles/blog/sitemap, login/admin autorizados y logout/anónimo rechazado. Health solo es proceso; usar readiness profundo privado según guía existente, sin publicar bearer o logs sin filtrar.

Sin anuncios reales en tests. Los runners fijan flags false; los tests positivos usan IDs sintéticos confinados a fixtures, interceptan **todo** el tráfico del navegador y sustituyen tanto CMP como SDK. Nunca bots de actividad, clics/impresiones artificiales, autoclics, tráfico comprado o incentivos para pulsar anuncios. Pruebas locales no prueban aprobación, fill, ingresos o rastreo reales.

Mantener `AGENTS_ENABLED=false`, presupuesto IA cero, cinco perfiles/schedules apagados, `NEWSLETTER_MODE=disabled`, `WOMPI_SANDBOX_ENABLED=false`, `ANALYTICS_ENABLED=false`, `GA4_MODE=disabled`, `OPS_EXPECT_WORKER=false`, demo false. Ningún cambio aquí activa proveedor/worker/cron o compra. Backups cifrados externos, restauración aislada y responsabilidad/retención siguen pendientes de verificación real; un snapshot o health verde no los sustituye.

Orden mínimo del propietario: conservar catálogo importado → OWNER privado solo si falta → SHA Live/rutas de la nueva versión → resolver Render/rastreo y legales → publicación/indexación aprobadas → propiedad GSC/sitemap → cuenta/sitio AdSense+CMP/ubicaciones aprobados → activación controlada → observar informes reales. Puede publicarse un catálogo útil sin anuncios mientras Google revisa. Calendario y búsqueda futura: [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md).

## Medición y dashboard: configuración preparada, sin activación

El control de analítica informa cuando el servicio está deshabilitado, sin solicitar una aceptación innecesaria; conserva la retirada de una elección previa. No cambia flags ni activa seguimiento.

El panel `/admin/analytics` exige OWNER/ADMIN y permite consultas Google manuales con confirmación, Origin/CSRF, auditoría y autorización comprobada de nuevo después de la llamada. Abrir la página no llama a Google. Sin token/propiedad real se muestra no configurado; la ausencia de informe nunca se sustituye por tráfico o ingresos cero.

GA4: seis informes de solo lectura — evolución diaria, canales, países, dispositivos, páginas de entrada y páginas consultadas — con usuarios, usuarios activos, sesiones y pageviews realmente suministrados. Host exacto de SITE_URL, rango acotado, hasta 100 filas, indicación de truncamiento y exclusión de rutas privadas/desconocidas/queries. Los snapshots anteriores se conservan; un dato no suministrado no se inventa. Los usuarios únicos no se suman entre días o dimensiones. GSC presenta clics, impresiones, CTR y posición diaria, con calendario de proveedor explícito; no confundirlos con visitas o ingresos.

**Límite de captación:** GA4 utiliza el Measurement Protocol del servidor, sin SDK del navegador, IP, User-Agent, referrer externo ni términos de búsqueda. Esto no acredita atribución completa de adquisición, países, dispositivos o retención. Los nuevos desgloses muestran lo que realmente exista en la propiedad y no reparan datos que no se captaron. Validar instrumentación y consentimiento en una prueba autorizada antes de interpretarlos; no activar tracking para rellenar un dashboard.

| Objetivo | Mecanismo actual y siguiente verificación |
| --- | --- |
| Lecturas de herramientas/guías y páginas de entrada | PAGE_VIEW/TOOL_VIEW consentidos, rutas públicas sin queries; lectura de guías identificable por su path, sin duplicar otro evento para la misma vista. Confirmar idempotencia, navegación y retirada de consentimiento. |
| Búsquedas | Solo evento de búsqueda y ruta del directorio; no se guardan términos potencialmente personales. Medir consultas específicas solo tras diseño de privacidad distinto y aprobación. |
| Canales, países y dispositivos | Informes GA4 de datos reales; su cobertura depende de instrumentación/configuración autorizadas. No inferir IP/referrer/dispositivo ni llenar valores ausentes. |
| Clics oficiales | Todavía no se instrumentan como evento específico. No reutilizar AFFILIATE_CLICK ni PAGE_VIEW para inventarlos; una futura instrumentación requiere contrato de evento, revisión y consentimiento. |
| Retención | Los identificadores propios expiran y la retirada borra datos consentidos; no presentar su muestra como retención global. Consultar cohortes oficiales cuando exista una integración y datos adecuados, sin inferirlos de visitas sumadas. |
| Conversiones | Suscripción confirmada, solicitud comercial y pagos verificables provienen de operaciones del servidor; afiliados requieren evidencia autenticada del proveedor. Ninguna venta se atribuye a un clic por sí solo. |

AdSense añade métricas oficiales `PAGE_VIEWS`, `IMPRESSIONS`, `CLICKS`, `PAGE_VIEWS_RPM`, `PAGE_VIEWS_CTR` y `AD_REQUESTS_COVERAGE`, además de `ESTIMATED_EARNINGS`. El parser verifica tipos, rangos, calendario y moneda; datos no suministrados aparecen como —, nunca cero inventado. RPM/CTR/cobertura no se calculan con tráfico local. Informes manuales de cuenta, no liquidaciones confirmadas; un desglose por tipo de página exige canales URL reales configurados en Google. Contrato contrastado con [discovery oficial AdSense v2](https://raw.githubusercontent.com/googleapis/google-api-go-client/main/adsense/v2/adsense-api.json), recuperado el 28-10-2026. No se hizo una llamada a una cuenta publicitaria real.

## Checklist de revisión AdSense, privacidad y dominio

Estas comprobaciones requieren la cuenta real y las políticas vigentes; la ayuda Google no fue accesible desde el cloud. Revisión humana pendiente, no una certificación o aprobación.

- [ ] Confirmar elegibilidad del sitio/hostname en el flujo oficial de AdSense; identidad, titularidad, contenido útil y cumplimiento reales. `onrender.com` figura en el [Public Suffix List](https://github.com/publicsuffix/list/blob/master/public_suffix_list.dat), comprobado el 28-10; el API Site contempla dominio/subdominio. Eso no prueba aceptación, aprobación o capacidad de verificación del hostname concreto. Valorar dominio propio por control DNS/marca con presupuesto autorizado, sin compra automática.
- [ ] Revisar About/contacto e identidad real del operador; los textos legales siguen borradores hasta revisión competente. La nueva página de metodología no inventa empresa, autoría o ensayos.
- [ ] Verificar sitio mediante el método oficial proporcionado por Google, sin inventar IDs: la etiqueta pública de cuenta existente no carga anuncios; publisher por sí solo no habilita scripts. No rebajar las puertas de ads.txt para forzar verificación.
- [ ] Comprobar rutas reales con contenido, navegación móvil/teclado, enlaces oficiales y 404. Excluir login/admin/APIs/pagos/formularios/errores/vacíos y contenido insuficiente de publicidad; revisar Auto Ads en la cuenta y desactivar formatos invasivos.
- [ ] Comprobar CMP certificada vigente/TCF para EEE, Reino Unido y Suiza, mensaje y vendor/propósitos reales, opción de rechazo, preferencias y retirada. El banner propio de analítica no certifica publicidad. Consultar [Google EU user consent policy](https://www.google.com/about/company/user-consent-policy/) y [requisitos CMP](https://support.google.com/adsense/answer/13554116); no marcar ADSENSE_CONSENT_READY o revisión legal sin esa evidencia.
- [ ] Confirmar aprobación oficial del sitio, unidades reales y ubicaciones revisadas antes de cualquier anuncio. Validar `ads.txt` con la línea que la cuenta proporcione. No habilitar ADSENSE_SITE_APPROVED por terminar código o por introducir publisher.
- [ ] Prohibir autoclics, visitas artificiales, incentivos de clic, anuncios disfrazados y tráfico de baja calidad. E2E siempre interceptados/sin impresiones reales. Comparar experiencia/CLS antes y después de una activación real autorizada; no prometer cobertura o ingresos.

El orden de activación conserva todas las puertas existentes. Esta entrega no cambia flags privados de Render, no habilita indexación, analítica, anuncios, correo, pagos o agentes y no presume revisión legal completada.
