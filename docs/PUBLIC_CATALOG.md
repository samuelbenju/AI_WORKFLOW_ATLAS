# Plataforma pública — Fase 3

La portada y los directorios consultan PostgreSQL mediante Prisma en componentes de servidor. No hay arrays de herramientas/casos como sustituto de consultas ni se convierten errores de DB en resultados vacíos.

## Rutas y datos

| Ruta | Comportamiento |
| --- | --- |
| `/` | Hero, buscador GET, categorías, herramientas/casos seleccionados editorialmente, previews de artículos, espacio publicitario sin ventas activas y newsletter pendiente. Datos de contenido desde DB. |
| `/tools` | Búsqueda en nombre/resumen, categoría, tag, orden, páginas de seis registros y vacíos explícitos. |
| `/tools/[slug]` | Descripción, categorías/tags, enlace oficial seguro y casos relacionados de la misma visibilidad. |
| `/use-cases` | Búsqueda en título/problema/solución, categoría, tag, dificultad, orden y paginación. |
| `/use-cases/[slug]` | Problema, solución, herramientas, pasos, dificultad, limitaciones y referencias proporcionadas. |

Query params: `q` (máximo 100 caracteres), `category`, `tag`, `difficulty` (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`), `sort` (`recent`, `name`, `name-desc`), `page` (1–10000). Las formas GET se pueden compartir/marcar y funcionan sin requerir JS para aplicar filtros. Los formularios reinician la página; los enlaces de paginación conservan filtros. Valores vacíos equivalen a ausencia; valores inválidos/ambiguos muestran un estado con enlace de reinicio. Un número de página sin resultados ofrece volver a la primera conservando filtros.

Lecturas públicas seleccionan campos de contenido; no emails de usuarios, credenciales o registros operativos. Búsquedas parametrizadas, orden estable con desempate por UUID, lista/total en transacción RepeatableRead. Detalles memoizados solo dentro de una petición mediante React cache. Rutas `force-dynamic`: no se publica un snapshot de catálogo tomado durante build ni se sustituye la DB por contenido estático.

## Modo publicado y modo de desarrollo

Por defecto (`CATALOG_DEMO_MODE=false` o ausente), solo se muestran registros con `isDemo=false`, `status=PUBLISHED` y fecha de publicación no futura. Las mismas condiciones se aplican a relaciones, facets y previews. Sin registros aprobados aparece un estado vacío real. No se implementa todavía una interfaz de publicación; es alcance de Fase 4/5.

Para recorrer datos de desarrollo en una base `_dev` o `_test`:

```bash
npm run db:deploy
npm run db:seed
npm run db:seed:catalog
```

Después configurar **explícitamente** `CATALOG_DEMO_MODE=true` en `.env.local` privado o en la configuración del proceso, y reiniciar el servidor cuando corresponda. Este entorno local ya tiene ese flag activado. No imprime ni sustituye las credenciales existentes.

El modo demo consulta únicamente `isDemo=true` y DRAFT. Incluye un aviso persistente y etiquetas en tarjetas/fichas. No convierte drafts normales en públicos ni cambia estados en PostgreSQL. Un parámetro de navegador no permite activar el modo. Las pruebas también ejecutan un servidor con el flag desactivado para comprobar el aislamiento.

El seed de Fase 3 añade 8 herramientas de ejemplo, 6 workflows originales y 2 previews de lectura, más categorías/tags y relaciones. Se conserva el seed anterior de Fase 2; por ello puede haber ejemplos adicionales. Las menciones a productos externos son ilustraciones con enlaces a sus sitios/documentación, no reviews, certificaciones o integraciones ejecutadas. No se inventaron cifras de tráfico, ventas o rendimiento. Las inserciones son transaccionales, repetibles y no sobrescriben ediciones ni registros no-demo con slugs en conflicto. No se publican artículos ni se envían mensajes.

## Selección editorial y alcance

La migración `20261025000500_public_catalog` añade `featured` a Tool/UseCase, `solution` a UseCase e índices de selección. Es aditiva y no cambia migraciones aplicadas ni borra datos. `featured` es una elección editorial explícita; **no** es señal de patrocinio, visitas o popularidad. La portada evita llamar “populares” a casos que no tienen métricas verificadas.

Fase 5 enlaza artículos públicos revisados en `/blog`; los previews heredados se conservan sin publicarse. Fase 6 incorpora `/sponsor` y bloques de publicidad aprobada/activa/pagada/en periodo, siempre etiquetados y fuera del modo demo; `COMMERCIAL.md` describe condiciones y CRM. El bloque newsletter declara que las suscripciones no están abiertas: no hay formularios que aparenten registrar suscriptores sin su fase de consentimiento/proveedor.

## UI y fallos

Diseño original basado en la identidad oscura existente, tipografía del sistema, iconos locales y sin fuentes/imágenes remotas. Cards, filtros, paginación y detalles adaptables; foco visible, labels, skip link, menú móvil nativo y reduced motion. La paleta de botones se oscureció ligeramente para cumplir contraste AA.

`loading.tsx` presenta el fallback real de navegación/SSR. `error.tsx` muestra un error genérico y reintento; no expone DSN o SQL ni muestra un catálogo ficticio. Los slugs desconocidos o invisibles usan `notFound`. Next puede transmitir un shell HTTP 200 antes de resolver un error/notFound dinámico; la respuesta HTML y el estado visual deben evaluarse junto con el status. La ruta global inexistente se sigue comprobando con HTTP 404.

HTML/Markdown externo no se interpreta como HTML: los textos se escapan mediante React. Las instrucciones/referencias se validan como JSON estructurado con límites. Enlaces ejecutables o con credenciales se rechazan; enlaces externos usan noopener/noreferrer e indican nueva pestaña. Un dominio `.invalid` de una fixture no se presenta como sitio oficial utilizable.

`/api/health` sigue siendo solo liveness. La portada y directorios requieren DB accesible y las migraciones actuales. Fallar health/readiness o una consulta nunca activa una lista estática.

## Comprobación reproducible

```bash
npm run check
npm run test:db
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

No hubo cambios de dependencias en esta fase, así que se reutilizó la instalación existente. Los tests unitarios cubren parámetros y links/JSON; los tests de PostgreSQL incluyen seed, filtros, aislamiento de modos, páginas sin duplicados y selección editorial.

E2E necesita un build actual y `TEST_DATABASE_URL` dedicada `_test` con CREATEDB. `scripts/test-public.mjs` usa el mismo aislamiento seguro que `test:db`: crea una DB aleatoria, aplica todas las migraciones dos veces, carga los dos seeds, inicia Playwright y elimina solo su DB. No usa ni borra el catálogo de desarrollo. Tests directos con Playwright requieren el wrapper para asegurar ese aislamiento. Las pruebas de cambios en vivo solo insertan/eliminan fixtures propias en esa DB temporal.

La suite verifica navegación, búsqueda, categoría/tag/dificultad, orden/paginación, fichas, enlaces oficiales/relaciones, vacíos/inputs inválidos, modo publicado, viewport de 320 px y axe. Provoca una caída de conexión en otro servidor aislado y una espera real con bloqueo SQL para verificar errores/carga. Las capturas son artefactos ignorados en Git. Ninguna prueba confirma integración con los proveedores enlazados ni constituye una certificación manual WCAG.

No se inició Fase 4 ni se hizo deploy/push. El repositorio oficial sigue siendo `samuelbenju/AI_WORKFLOW_ATLAS`; los avances de Fases 2–3 deben conservarse/revisarse para una publicación futura autorizada.
