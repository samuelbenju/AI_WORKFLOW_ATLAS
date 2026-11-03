# Misión 18 — estabilidad, Search Console y preparación AdSense

03-11-2026 UTC. Base main `4bcf3aa705b971bc50a77ac601caf3376eefad5b`, CI [41559123510 SUCCESS](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/41559123510) reconfirmada. Preparación técnica; no lanzamiento jurídico/comercial ni nueva publicación editorial. Esta misión no despliega el nuevo candidato.

## Evidencia y estabilidad

El propietario aporta Live 4bcf3aa / deployment `dep-dbkkaarncjis73eincn0`, P2028/TRANSACTION_START_TIMEOUT durante el primer despliegue y posterior carga correcta de portada/directorios. Esto confirma el subtipo observado de inicio, **no la causa subyacente ni estabilidad sostenida**. Las notas anteriores sobre Live b3f39f5 y falta de subtipo son históricas. No se reimporta ni se modifica Neon.

Render MCP, Neon, GitHub MCP, Firecrawl/seo-audit y OpenAI Developers no exponen herramientas en este executor. Git/HTTPS público de GitHub y Superpowers sí. No se reinstalaron plugins ni repitieron las sondas del proxy anterior. No hay métricas actuales de CPU/memoria, ocupación de pool/compute o consultas privadas de PostgreSQL. El propietario respondió con evidencia sanitizada de Render MCP y Firecrawl (03:06–03:07 UTC), registrada abajo; no se presenta como llamada ejecutada por este agente. No atribuir el bloqueo a Render caído o credencial inválida.

El batch Prisma 7.10.1 hereda maxWait 2000ms y timeout 5000ms: la investigación anterior reprodujo inicio por espera del pool pg y de PgBouncer con conexiones servidor ocupadas. Arranque frío/compute, colas, latencia y concurrencia reales todavía requieren correlación temporal remota. No se cambiaron timeouts, pool, aislamiento, SQL ni retries. Liveness `/api/health` sigue separado de readiness privado con `catalog=1`; el bearer va solo en Authorization y no se solicita su valor. Runtime11 se volvió a ejecutar tras cambiar el layout global y cubre ambos estados y errores reales aislados; no equivale a verificar Neon.

Aceptación remota sostenida pendiente (reutilizar la ventana aportada abajo, sin repetirla como diagnóstico nuevo): SHA/deployment exactos, HTTP **y contenido** de `/`, `/tools`, `/use-cases`, `/categories`, blog con vacío editorial legítimo, ficha/guía/categoría reales, búsqueda/filtros/paginación, 404 y privados; robots/sitemap/ads.txt; lectura de readiness solo si existe acceso autorizado. Correlacionar UTC/stage/codes y métricas durante primera petición, navegación normal y concurrencia moderada. Sin reinicios forzados, carga artificial o pings permanentes. Un éxito puntual no cierra P2028.

## Ventana remota aportada por el propietario

Live4bcf3aa/deployment dep-dbkkaarncjis73eincn0 reconfirmados por el cliente conectado el03-11-2026:

| UTC | Evidencia de /, /tools, /use-cases y /api/health |
| --- | --- |
| 03:06:08 | Las cuatro rutas HTTP503, Render Application loading. |
| 03:06:40 | Health200/status ok; las otras tres HTTP200 con pantalla de error del catálogo. No es aceptación funcional. |
| 03:07:07 | Health200 y contenido real correcto en las tres páginas públicas. Recuperación observada, no prueba prolongada de estabilidad. |

Logs nuevos:03:06:36.154 catalog.tools;36.363 catalog.facets.tools;37.757 catalog.home;38.952 catalog.facets.use-cases: P2028/TRANSACTION_START_TIMEOUT. No errores posteriores a03:06:39 **en el intervalo revisado**. Memoria03:07:203022340bytes (~193,6MiB), límite observado~512MiB. No muestrasCPU actualizadas durante las solicitudes; referencia previa0,15vCPU. Una muestra de memoria posterior no descarta un pico durante el fallo, ni atribuye la causa a CPU/memoria. Sin reinicio, deploy o cambios remotos. Readiness autenticado, nuevas fichas/categorías/robots y métricas Neon no incluidos en esta evidencia.

Experimento adicional aislado con **conexión PostgreSQL real**: proxy loopback retrasa únicamente el establecimiento inicial del wire3s, sin cambiar Prisma/pool/deadlines; home falla en2082ms con P2028/TRANSACTION_START_TIMEOUT. La siguiente lectura, con la misma conexión ya establecida (una conexión aceptada), pasa en14ms. Es una demora controlada de inicio, no un timeout genérico ni una simulación del compute real de Neon; demuestra un mecanismo compatible, **no confirma que Neon haya despertado o tardado3s en producción**. Scripts privados de experimento en /tmp, migraciones solo en DB temporal y cleanup ejecutado. No hay corrección especulativa de parámetros.

Falta para elegir una corrección causal: cronología compute/endpoint Neon (pooled/direct), espera/ocupación del pool de aplicación y colas servidor/PgBouncer durante03:06:34–03:06:39, CPU/event-loop del proceso en esa ventana y latencias de conexión/BEGIN. Ninguno se deduce del P2028 o del HTTP200 posterior. Obtener solo métricas/metadatos autorizados, sin SQL de usuarios, PII o cadenas de conexión. **Estabilidad: FALLO DE ARRANQUE OBSERVADO / RECUPERACIÓN OBSERVADA / CIERRE PENDIENTE.**

## Hallazgos técnicos

| Clasificación | Hallazgo y resultado |
| --- | --- |
| ERROR CONFIRMADO, corregido | GSC aceptaba una propiedad HTTPS ajena a SITE_URL e intentaba consultarla. RED en validación y frontera de transporte/persistencia; GREEN restringe al prefijo HTTPS raíz normalizado del sitio. Rechaza terceros, subrutas, usuario/password, queries, fragmentos, puerto distinto y sc-domain. No modifica snapshots anteriores; revisar su sourceRef antes de interpretar métricas históricas. |
| ERROR CONFIRMADO, corregido | Las metaetiquetas GSC/AdSense existían antes de aprobación, pero Next16 las transmitía en body al resolver metadata de la página. Primera E2E124/126: ambas plataformas fallan al exigir head; snapshot aislado confirma ambas etiquetas en body. Se emiten ahora una sola vez en el head inicial del RootLayout, con las validaciones existentes; se retiran del metadata agregado para evitar duplicados. Sin desactivar streaming global o cambiar ads.txt. |
| VERIFICADO EN AISLAMIENTO | Pruebas exigen ambas etiquetas válidas/únicas en head de HTML HTTP inicial y DOM, token inválido ausente y OAuth no incluido en HTML. No hay dependencia circular de aprobación para el método meta; la aceptación en la cuenta real Google y la persistencia entre deploys reales siguen pendientes. |
| VERIFICADO EN AISLAMIENTO | Pruebas adicionales verifican etiquetas antes de aprobación/legal/indexación, ningún script/unidad publicitaria ni petición externa, robots bloqueado, sitemap vacío y ads.txt 404 text/plain sin contenido. Sitemap aprobado conserva URLs únicas/canónicas y excluye privados/APIs/pagos/confirmación/baja. |
| NO VERIFICADO REMOTAMENTE | HTML/metadatos/headers/CWV actuales, estado Google de propiedad y sitio, token/scope efectivos, CMP real y datos de reportes. No se afirma auditoría Firecrawl o medición de campo. |
| MEJORA PROPUESTA | Verificar disponibilidad siempre activa del mismo servicio antes de solicitar rastreo/revisión publicitaria; requiere presupuesto y contraste oficial actuales. |

## Search Console: operación privada mínima

1. En [Search Console](https://search.google.com/search-console) crear **Prefijo de URL** `https://ai-workflow-atlas.onrender.com/`, nunca dominio raíz onrender.com.
2. Copiar el valor oficial content de la etiqueta HTML a `GSC_VERIFICATION_TOKEN` en el gestor de Render; no OAuth. Su aplicación requiere rebuild/deploy autorizado. No configurar nada ficticio ni pegar secretos en chat.
3. Comprobar una sola etiqueta en head de portada accesible y usar Verificar en Google. Ese resultado debe observarse antes de declarar propiedad verificada; no enviar sitemap todavía.
4. Para informes: `GSC_SITE_URL` exactamente el prefijo raíz HTTPS de `SITE_URL` y `GSC_ACCESS_TOKEN` privado con `https://www.googleapis.com/auth/webmasters.readonly`. El código no puede acreditar el scope o permiso real leyendo la cadena. Consulta manual OWNER/ADMIN y CSRF existentes; sin cron, OAuth nuevo o indexación automática.

Con dominio propio aprobado: verificar el prefijo del nuevo origen y conservar la propiedad antigua para seguimiento. La verificación DNS de una propiedad Dominio propia puede hacerse en Google por separado; el lector actual solo acepta el prefijo raíz para evitar agregar otros hosts a las métricas. No intentar verificar DNS del dominio del proveedor.

## AdSense, consentimiento y contenido

Verificar control del sitio, aprobación de Google y activar entrega son operaciones diferentes. La metaetiqueta existente permite preparar la primera sin la segunda. `/ads.txt` permanece 404 sin publisher válido, aprobación declarada y puerta pública; con ellas produce text/plain y la línea del vendedor autorizado. Publicarlo no acredita aprobación. No se cargó el script real ni se enviaron solicitudes a Google.

Conservar todas las puertas ADSENSE_ENABLED/SITE_APPROVED/PLACEMENTS_REVIEWED/CONSENT_READY, publisher/CMP/URL generada y modo. No cambiar a true ni activar Auto Ads. El modo manual requiere unidades autorizadas y Auto Ads apagado en la cuenta; el modo auto depende también de la configuración Google. Exclusión de privados/pagos/errores y contenido insuficiente, reservas de espacio, deduplicación y retirada siguen en la implementación y suites existentes. Informes manuales oficiales conservan estimaciones/moneda/calendario separados de caja y de Sandbox; sin credenciales no se inventan ceros.

La política mundial conservadora mantiene DNT/GPC/opt-out, consentimiento explícito del vendor Google y propósitos exigidos, revocación y nueva navegación cuando se retira JavaScript ya cargado. Banner de analítica no es CMP certificada. Antes de entrega real, el propietario debe comprobar certificación vigente Google/TCF de la CMP elegida, configuración de propósitos/vendor, mensajes/regiones y requisitos EEE/Reino Unido/Suiza; revisión jurídica independiente para Colombia y mercados atendidos. No se certifica cumplimiento por pasar tests.

Biblioteca local validada: 65 herramientas, 30 guías, 20 categorías, 24 etiquetas, seis DRAFT. Esto no es un nuevo conteo Neon. Conservar las ediciones humanas. Estrategia y ocho semanas existentes se reutilizan: priorizar aprobación humana/n8n, privacidad documental/AnythingLLM y extracción trazable/Docling del calendario, sin añadir artículos genéricos o publicarlos. Fuentes, fechas, pruebas originales o ejemplos conceptuales identificados, licencia/autoría y enlaces deben revisarse antes de publicación. Sin fuentes actuales recuperadas no se afirma nueva comprobación editorial de las 65 fichas.

## Hosting, fuentes oficiales y decisiones humanas

| Escenario | Decisión y límite económico |
| --- | --- |
| Continuar temporalmente Free | Sin compra nueva; sujeto a suspensión/cuotas/recursos del proveedor, arranque frío y filesystem efímero. Confirmar respuesta real de robots durante inactividad natural; no afirmar continuidad de rastreo, SLA o aptitud definitiva AdSense. |
| Mismo servicio siempre activo | Propuesta de modalidad Starter o vigente equivalente, sin crear servicio. Precio oficial actualizado **NO VERIFICABLE aquí**; referencia histórica US$7/mes de PUBLIC_LAUNCH no es cotización actual. Propietario debe contrastar compute, memoria, build/bandwidth y cuota incluidos antes de autorizar coste. Neon puede suspender independientemente: un upgrade web no demuestra reparación del timeout. |

Fuentes para contraste oficial: [Render Free](https://render.com/docs/free), [precios](https://render.com/pricing), [GSC verificación](https://support.google.com/webmasters/answer/9008080?hl=en), [AdSense conexión/verificación](https://support.google.com/adsense/answer/7584263?hl=en), [CMP certificada Google](https://support.google.com/adsense/answer/13554116?hl=en), [ads.txt](https://support.google.com/adsense/answer/7532444?hl=en). No se recuperaron esas páginas en esta sesión; no certificar sus condiciones vigentes ni elegibilidad del subdominio. Intentos acotados de fuentes Render en GitHub devolvieron404 y no se usaron como evidencia. Documentación efectiva Next16 sobre verification/other y streaming sí se leyó en node_modules: metadata resuelta puede añadirse a body. Se evita solo esa dependencia para verificación, conservando el streaming restante. Next recomienda MetadataAPI en general; la excepción acotada está sustentada por el RED y una regresión de head HTML+DOM al actualizar Next/React. Firecrawl no disponible; sin crawls ni consumo de créditos.

Puerta pública: estabilidad → catálogo real → identidad/contacto → textos legales → origen/editorial → GSC verificada → autorización humana de lanzamiento/indexación → flags. Revisar responsable/dirección/contacto, derechos y canal de solicitudes, finalidades/retención/encargados y transferencias, publicidad/afiliados/cookies, obligaciones Colombia (SIC/DIAN, RUT/facturación/tributos según actividad con asesor competente). Nada marcado legalmente aprobado. AdSense requiere además cuenta/sitio aprobados, publisher real, revisión de emplazamientos y consentimiento/CMP. Ninguna aprobación se infiere de CI.

## Validación y conservación

Resultados locales: check93 (lint/TS/unitarias), integración93, build, catálogo, runtime11, SEO5 y E2E126/126 PASS. Primera E2E124/126 falló antes del fix de head; focal4/4 y completa126/126 pasan después. Revisión independiente sin hallazgos. Logs y limitaciones en BUILD_LOG.md; CI del SHA de esta misión se consulta tras publicar. Las suites usan PostgreSQL desechable y transportes Google exclusivamente de fixture. No pruebas con escritura en Neon, importaciones, migraciones remotas, cambios de roles/secretos/planes, despliegues o activaciones. No se publica el Blueprint privado ni se acredita Object Storage remoto. Configuración efectiva de Render no leída ni alterada; Auto-Deploy Off es estado aportado por propietario, no reconfirmado por esta sesión.

**Dictamen:** preparación técnica corregida/validada según suites registradas; estabilidad remota con fallo de arranque y recuperación observados, causa/cierre pendientes; GSC sin verificación oficial observada y AdSense sin aprobación observada. Lanzamiento/indexación/monetización NO ACTIVADOS.
