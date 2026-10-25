# Blog, CMS y SEO — Fase 5

## Rutas y datos

`/blog` consulta PostgreSQL: búsqueda en título/resumen, categorías con artículos visibles y páginas de seis con orden estable. `/blog/[slug]` muestra bloques, fuentes, fechas UTC, tiempo de lectura calculado del texto, categorías, tabla de secciones y artículos relacionados por categoría. Las herramientas y casos relacionados solo enlazan si están publicados. Una caída de DB presenta un error con reintento; no hay arrays de contenido como fallback.

El blog siempre exige artículo PUBLISHED, no demo, fecha no futura, revisión editorial y formato de cuerpo versión 1. **CATALOG_DEMO_MODE no publica borradores del blog.** Los previews antiguos se conservan en DB y pueden revisarse desde administración, pero no se convierten automáticamente en artículos. Al guardar una conversión, la transacción conserva antes una copia íntegra del registro y sus relaciones en ContentDraft; los bloques heredados compatibles se reutilizan. La portada enlaza únicamente artículos que cumplen el mismo contrato. Desconocidos, borradores y artículos retirados no exponen contenido público.

## Trabajo editorial

`/admin/articles` requiere sesión/rol en servidor. Buscar, filtrar por estado y paginar; crear/editar en formularios; preview privado de la versión guardada. Categorías y etiquetas reutilizan los módulos reales existentes. No hay un segundo sistema de taxonomías.

1. Crear un borrador, añadir texto útil, categorías, fuentes y metadatos.
2. Guardar como **En revisión**. Guardar no publica. Cada guardado conserva una versión en ContentDraft con FK al artículo y actor, y auditoría en la misma transacción.
3. Comprobar cada fuente: URL HTTPS, título, explicación de lo que respalda y fecha. La casilla de fuente registra la comprobación del operador; no es una certificación automática del contenido.
4. OWNER/ADMIN confirma que verificó afirmaciones y fuentes, y pulsa **Aprobar revisión**. Se comprueban formato, fuentes, categoría, SEO y enlaces internos públicos. EDITOR puede preparar borradores/en revisión; no aprobar ni publicar.
5. **Publicar artículo** es una operación explícita posterior, con versión vigente y revisión aprobada. No hay scheduler ni publicación automática del seed.
6. **Despublicar artículo** lo devuelve a borrador, elimina fecha pública y aprobación. Editar/guardar un artículo ya publicado también lo retira e invalida la revisión: el formulario lo avisa antes de guardar. El usuario debe repetir revisión/publicación. EDITOR no edita publicados/archivados.

Las escrituras usan transacciones Serializable, autorización fresca y control de concurrencia con `expectedUpdatedAt`. Se rechaza una edición obsoleta con 409; los timestamps avanzan de forma monótona en estos servicios. No se permiten campos arbitrarios de autor/revisor/status publicados por mass assignment. API protegida `/api/admin/articles[/id]`: GET, POST/PUT para contenido y PATCH para transiciones; Origin/CSRF y límites JSON de 256 KB para el editor, 4 KB para acciones. No existe endpoint público de mutación ni cambio de roles.

## Edición segura y enlaces

No se acepta HTML ejecutable, Markdown con HTML o atributos libres. El cuerpo JSON tiene versión y una unión Zod estricta: párrafo, encabezado h2/h3, lista, código, nota y enlace interno. React escapa el texto, incluido código que contenga etiquetas. JSON-LD escapa `<` y separadores Unicode antes de insertarse como script de datos.

Los enlaces internos se seleccionan por entidad/UUID y etiqueta, no por URL arbitraria. El servidor comprueba existencia al guardar y publicación al revisar/publicar. La presentación resuelve destinos vigentes y no expone href/slug de contenido retirado; si un destino se despublica después, el texto permanece y se indica indisponibilidad. Las asociaciones herramientas/caso se filtran también. Renombrar slugs requiere actualizar enlaces externos conocidos: esta fase no crea redirecciones históricas automáticas.

Los bloques/formularios y referencias están acotados; no hay fetch automático de URLs proporcionadas por el editor, uploads, iframes ni servicios remotos de imágenes. Se conservan las últimas diez versiones en la vista; el historial completo permanece en DB. No se implementó restauración automática de versiones o edición colaborativa en tiempo real.

## SEO e indexación

`SITE_URL` fija el origen canónico sin confiar en Host del visitante. Canonical y OG/Twitter de páginas públicas se generan con datos persistidos. Artículos incluyen BlogPosting y BreadcrumbList, y el listado CollectionPage/ItemList con los resultados realmente visibles. Sin ratings, ventas o resultados enriquecidos garantizados.

`SEO_INDEXING_ENABLED=false` por defecto. Activarlo requiere **las tres condiciones**: flag explícito true, SITE_URL HTTPS con host no loopback y CATALOG_DEMO_MODE distinto de true. Este entorno permanece en preestreno, sin activar indexación ni lanzar un dominio.

| Situación | Comportamiento |
| --- | --- |
| Preestreno/demo/origen no elegible | Robots disallow `/`, X-Robots-Tag noindex/nofollow y metadatos noindex; sitemap vacío deliberadamente. |
| Configuración de lanzamiento explícita | Robots permite contenido público, bloquea admin/api/login y anuncia sitemap canónico. |
| Admin/login/API | Siempre noindex/nofollow, con independencia del flag. Autorización real separada; robots no protege datos. |
| Búsquedas/filtros/query desconocida | noindex/follow. Listados paginados tienen canonical propio normalizado; no se añaden filtros al sitemap. |
| Artículo con noindex individual | Sigue siendo público, meta noindex/follow y exclusión del sitemap. No es un control de acceso. |
| Borrador/demo/futuro/no revisado/retirado | No ficha pública ni sitemap; no existe preview público mediante parámetros. |

`src/proxy.ts` aplica únicamente headers SEO por petición; no sustituye guards de autenticación. `robots.ts` y `sitemap.ts` son dinámicos. El sitemap consulta herramientas/casos y artículos publicados/no-demo/no-futuros, y excluye artículos noindex. Usa updatedAt real para detalles; no inventa fecha de modificación de páginas de índice. Si supera 50.000 URLs falla explícitamente y requiere partición; no trunca silenciosamente. No se afirma disponibilidad/indexación real en buscadores ni se registró Search Console o analítica.

Antes de lanzamiento, configurar el origen real, revisar contenido y decisiones del propietario, ajustar flag y reconstruir/reiniciar para mantener metadata/entorno coherentes. No cambiar los controles solo para hacer visible una demo. RSS se aplaza hasta contar con publicaciones aprobadas y una decisión de distribución; no es requisito crítico de esta fase.

## Imágenes y móvil

Seis ilustraciones abstractas originales locales de 1200×630, sin descargar imágenes de terceros. `next/image` utiliza dimensiones explícitas, sizes responsive, carga diferida en tarjetas y preload de portada de artículo. AVIF/WebP configurados; solo se admiten rutas de imágenes `/editorial/**`, sin remotePatterns ni SVG arbitrario del editor. El CMS ofrece esas seis opciones y exige alt al elegir portada. OG usa una portada real de la misma biblioteca.

Las páginas públicas son Server Components sin editor/SDK en el bundle de lectura. Pruebas de ancho/axe/imágenes comprueban escenarios móviles; no equivalen a una medición de Core Web Vitals en producción.

## Contenido inicial y evidencia de fuentes

`npm run db:seed:editorial` prepara seis artículos originales en inglés sobre automatización empresarial, productividad con IA, evaluación de herramientas, marketing, desarrollo y datos. Reutiliza categorías existentes cuando hay coincidencia y agrega Data analysis. Solo DB real terminada en `_dev`/`_test` y fuera de producción; transacción no destructiva, no sobrescribe filas existentes. No crea un usuario administrador, revisión aprobada o publicación.

Los borradores quedan IN_REVIEW, isDemo=false, sin reviewedAt ni publishedAt, y conservan snapshot ContentDraft. Las fuentes se pudieron recuperar y leer desde los repositorios oficiales. Sus notas registran fecha, alcance y SHA-256 del contenido consultado. Que una fuente sea accesible no verifica automáticamente cada recomendación del artículo ni demuestra ejecución de una integración. **Todos requieren revisión humana antes de publicar.**

| Tema | Fuente oficial consultada | Alcance |
| --- | --- | --- |
| Automatización empresarial | https://github.com/n8n-io/n8n/blob/master/README.md | Capacidades declaradas de workflows, código y aprobaciones; el piloto propuesto no fue ejecutado. |
| Productividad | https://github.com/openai/openai-python/blob/main/README.md | Responses API y manejo de peticiones; no se invocó una API ni se midió ahorro. |
| Herramientas | https://github.com/ollama/ollama/blob/main/README.md | Interfaces y opciones locales/cloud; no se ejecutaron modelos o benchmarks. |
| Marketing | https://github.com/googleworkspace/apps-script-samples/blob/main/solutions/automations/mail-merge/Code.js | Sheets/Gmail draft/envío y estado de ejemplo; no se envió correo ni se atribuye al sample un sistema completo de consentimiento/aprobación. |
| Desarrollo | https://github.com/github/docs/blob/main/content/actions/get-started/quickstart.md | Workflow y tests en GitHub Actions; no se ejecutó CI remota ni despliegue para redactar el artículo. |
| Datos | https://github.com/pandas-dev/pandas/blob/main/doc/source/getting_started/intro_tutorials/03_subset_data.rst | Selección booleana/isin/notna/loc; ejemplo ilustrativo, sin dataset privado o benchmark. |

Se consultó además el README de Google Workspace Samples como contexto. Un primer enlace histórico de tutorial n8n no se pudo recuperar; se usó el README oficial disponible, sin reintentos masivos o cambios de red. No se copiaron artículos ajenos ni se generaron páginas masivas.

## Verificación

`npm run check`, `npm run test:db`, `npm run build` y `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Los wrappers siguen creando/eliminando solo su DB temporal, ahora con las siete migraciones y el seed editorial. Fixtures públicos de E2E son exclusivamente datos de prueba en esa DB; no publican el contenido inicial de desarrollo ni inicializan la cuenta humana.

Persisten las limitaciones de infraestructura/hardening anteriores de DATABASE/ADMIN. La contraseña humana sigue pendiente del ingreso seguro mediante `npm run admin:init`; no se pide por chat. No se desplegó, publicó en GitHub, activó indexación ni comenzó Fase 6.
