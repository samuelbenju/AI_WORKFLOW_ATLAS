# Registro de construcción

## 2026-10-25 — Primera ejecución / Fase 1

### Inspección y fuentes

- Checkout existente en `/workspace/Quesito`, sin archivos ni commits; sin `AGENTS.md` previo.
- Git remoto leído correctamente a través de autenticación del entorno; repositorio inicialmente sin refs.
- Runtime: Node `24.19.0`, npm `11.9.0`; Chromium del sistema `154.0.8037.57`; Linux, 5 CPU visibles y recursos suficientes para una aplicación Next.
- Consultadas plantilla y documentación oficial Next.js vía `raw.githubusercontent.com`, y metadata de paquetes en `registry.npmjs.org`.
- El primer grupo de consultas npm falló por caché no escribible en `/home/agent/.npm`. Corrección: `--cache /workspace/.cache/npm`, conservando permisos globales y verificación TLS. Consultas posteriores correctas.

### Implementación

Base Next.js, componentes públicos y configuración de Fase 1. Sin DB ni APIs externas. Tests unitarios de configuración y E2E de comportamiento, CI y documentación permanente.

### Instalación y reproducibilidad

- Instalación inicial con `npm --cache /workspace/.cache/npm install --save-exact ...` y `install --save-dev --save-exact ...`; versiones finales en `package.json`, incluido `tsx@4.23.15` y `@axe-core/playwright@4.14.0`.
- Ejecutado `npm --cache /workspace/.cache/npm ci` después de generar el lockfile para verificar la instalación congelada que usará el script reutilizable. Exit 0, 381 paquetes añadidos. No se volvió a instalar posteriormente.
- `npm ls --depth=0`: exit 0, dependencias directas en las versiones fijadas. npm enumera también paquetes opcionales de WASM como extraneous; no hay errores de peer dependencies.
- `npm --cache /workspace/.cache/npm audit --json` final: exit 0, 0 vulnerabilidades reportadas. No equivale a auditoría integral de la aplicación.
- npm avisa que `eslint@9.39.5` está fuera de soporte. Comprobados peers actuales de `eslint-plugin-react`, `eslint-plugin-import` y `eslint-plugin-jsx-a11y`: soportan hasta ESLint 9. Se conserva configuración compatible sin `--force` ni `--legacy-peer-deps`; ADR-010 registra revisión conjunta pendiente antes del lanzamiento.

### Fallos encontrados y corregidos

1. Primer lint: dos enlaces a `/#...` requerían `next/link` y la configuración PostCSS tenía export anónimo. Corregidos; lint final sin warnings ni errores.
2. Primera prueba unitaria: 8/10 aprobadas, 2 fallidas. El refinamiento Zod invocaba `new URL` sobre valores vacíos/malformados y escapaba el error nativo. Añadido manejo dentro del refinamiento; 10/10 aprobadas y mensaje genérico sin reflejar el valor.
3. Primera tanda funcional antes de añadir axe: 12/12 E2E aprobadas. Tanda con axe: 12 aprobadas, 2 fallidas por nombre accesible de marca distinto al texto visible. Se retiró el aria-label que sobrescribía el nombre y se añadió texto de contexto solo para lectores de pantalla; reconstruida y repetida la suite completa, ahora 14/14.
4. Captura desktop inicial tomada durante la animación de entrada: portada parcialmente transparente. Se configuraron capturas con `animations: "disabled"` para revisar el estado final de la UI; no se desactivó la animación de producto ni las comprobaciones de reduced motion.

### Resultados finales ejecutados

Comando final sobre el código terminado:

```bash
NEXT_TELEMETRY_DISABLED=1 npm run check && NEXT_TELEMETRY_DISABLED=1 npm run build && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Exit 0. Resultados:

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | Aprobada, cero errores/warnings. |
| `next typegen && tsc --noEmit` | Aprobada, TS estricto + noUncheckedIndexedAccess. |
| `npm test` | 10 aprobadas, 0 fallidas/omitidas/canceladas. Default local, origen normalizado y rechazo seguro de 8 variantes inválidas. |
| `npm run build` | Aprobada con Turbopack. `/`, `/_not-found` e icono estáticos; `/api/health` dinámico. Se usó caché válida en rebuilds; generación con 4 workers. |
| `npm run test:e2e` | 14 aprobadas, 0 fallidas/omitidas; 6.6 s, 2 workers, desktop Chromium y Pixel 7 Chromium. Cada proyecto ejecutó 7 pruebas. |
| Accesibilidad automatizada | Axe WCAG 2 A/AA, 2.1 A/AA y 2.2 AA: ninguna infracción detectada en portada/navegación desktop ni menú móvil abierto. No es certificación manual completa. |
| Producción local | Playwright inició y detuvo `npm run start -- --port 3100`; HTTP 200 + HTML esperado, JSON health, HTTP 404 y navegación comprobados. |
| Desarrollo local | `NEXT_TELEMETRY_DISABLED=1 npm run dev` inició en puerto 3000. Peticiones reales a `/` y `/api/health`: 200, texto esperado y `{"status":"ok"}`. |
| Inspección visual | Capturas full-page desktop/móvil revisadas; sin desbordamiento horizontal en viewports ensayados. Capturas y reporte ignorados en Git. |

E2E también comprueba título/lang, enlaces a secciones reales, estado honesto sin formularios, ausencia de errores JS, headers de seguridad/noindex, skip link, menú móvil, vuelta desde 404 y reduced motion. No se contactaron proveedores externos para estas pruebas.

Playwright emite aviso de `NO_COLOR`/`FORCE_COLOR` heredados del ejecutor; no afecta resultados. El servidor dev añadió su bloque oficial de instrucciones a `AGENTS.md`, conservando íntegramente las instrucciones propias; se retiene este bloque para evitar cambios repetidos al arrancar. `next-env.d.ts`, `.next`, cachés, node_modules, capturas y reportes son archivos generados ignorados, no fuentes a versionar.

### Configuración cloud guardada

`update_environment_config_draft` devolvió `status: saved` y `requires_publish: true`. Campos escritos:

- `install_script`: entrar en `/workspace/Quesito`, usar caché npm escribible, desactivar telemetría para esos comandos, `npm ci`, `npm run check`, `npm run build`.
- `start_skill`: checkout existente sin worktree, límites por fase, arranque dev, readiness con HTTP/contenido, validación prod/E2E y reinicio de procesos tras snapshot.

No se añadieron secretos, variables obligatorias ni dominios. Guardar no ejecuta scripts ni publica. Falta revisión/guardado del propietario en configuración del entorno y publicación del snapshot; no se comprobó restauración en tarea nueva. No es un bloqueo de la Fase 1 local.

### Acciones externas

No se hicieron commits, push, despliegue, comunicaciones, pagos ni llamadas de IA. GitHub Actions es configuración escrita; no ejecución remota verificada. No se implementaron fases 2–12. Todo el trabajo queda en el checkout existente, con los archivos de control y avances conservados.

## Conservación de Fase 1 en Git — revisión previa al commit inicial

- Confirmado checkout `/workspace/Quesito`, rama simbólica `work` sin commits previos y origin `github.com/samuelbenju/Quesito`.
- `git ls-remote --symref origin`: acceso de lectura correcto, sin referencias remotas anunciadas. No se presume permiso de escritura por este resultado.
- Revisados 33 archivos candidatos: búsqueda de formatos conocidos de tokens, claves privadas, asignaciones sensibles y credenciales en URLs, más revisión de configuración y coincidencias. Única coincidencia: URL deliberadamente ficticia en `tests/unit/env.test.ts`, que debe ser rechazada por el validador. No se detectaron secretos reales; no se incluyeron valores privados en logs.
- `.env.example` conserva únicamente `SITE_URL=http://localhost:3000` y comentarios. `.npmrc` no contiene autenticación.
- Ampliado `.gitignore` para claves privadas, almacenes de certificados, carpetas de credenciales y archivos habituales de cuentas de servicio. Dependencias, builds, archivos `.env` privados y resultados ya estaban excluidos.
- Entrega preparada para `git add` y commit con mensaje exacto `feat: initialize AI Workflow Atlas phase 1`. El hash final se obtiene con `git rev-parse HEAD` y se comunica al propietario; no se introduce una referencia circular dentro del propio commit.
- Publicación remota pendiente de aprobación. Si el remoto sigue vacío, `git push origin work:refs/heads/main` creará `main` conservando `work` local, sin force; después comprobar la rama predeterminada de GitHub. Si aparecen commits remotos, detenerse y revisar historia antes de publicar.
- No se modificó código funcional ni se repitieron instalación, build o suite completa. Las pruebas básicas de la revisión anterior fueron aprobadas. No se inició la Fase 2.

## Revalidación solicitada — ejecución 1/12

Se verificó la Fase 1 existente; no se ejecutó create-next-app ni se reemplazó ningún componente. Raíz descubierta desde el directorio actual mediante inspección y `git rev-parse --show-toplevel`: `/workspace/Quesito`. Árbol inicialmente limpio, commit `14abcba98976aaa8c33ef83d625d7463d620d0e3`, 33 archivos versionados.

| Verificación de esta ejecución | Resultado |
| --- | --- |
| Node / npm | `v24.19.0` / `11.9.0`, compatibles con los pins existentes. |
| Escritura | Archivo temporal creado, escrito y eliminado automáticamente en la raíz del proyecto. Sin cambiar permisos globales. |
| Documentación | Los ocho archivos de control existen y tienen contenido; roadmap de doce fases presente. |
| Registro npm | Una sola prueba `npm --cache /workspace/.cache/npm ping --registry=https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=15000`; exit 0, PONG 278 ms. Sin bypass de proxy ni TLS. |
| Dependencias | `npm --cache /workspace/.cache/npm ci --offline --no-audit`; exit 0, 381 paquetes instalados desde caché. Se ejecutó por la solicitud expresa del paso 5; no se cambió el lockfile. |
| Typecheck | `NEXT_TELEMETRY_DISABLED=1 npm run typecheck`; exit 0. |
| Lint | `npm run lint`; exit 0, cero warnings/errores. |
| Build | `NEXT_TELEMETRY_DISABLED=1 npm run build`; exit 0, producción con Turbopack. Caché válida reutilizada, generación con cuatro workers. |
| Smoke de producción | Servidor temporal propio en 3300 y Chromium del sistema: portada HTTP 200/contenido correcto, ancho sin desbordamiento a 1280/393, menú móvil y navegación a `#approach`, health JSON correcto y ruta inexistente HTTP 404. Exit 0; navegador y servidor temporales cerrados. |
| Conservación | `git diff --exit-code -- package.json package-lock.json src tsconfig.json next.config.ts`: exit 0. Ningún cambio funcional o de dependencias. |

El primer intento de smoke leyó la URL inmediatamente después del click móvil y falló antes de completarse la navegación asíncrona de Next. Se corrigió únicamente el script temporal para esperar `page.waitForURL`; la repetición pasó en ambos viewports. No se modificó la aplicación ni se eliminó ninguna aserción.

Se conserva el aviso conocido de npm sobre fin de soporte de ESLint 9 y su justificación de compatibilidad ADR-010; no bloqueó instalación ni lint. No se ejecutó un nuevo audit, la suite unitaria ni la suite E2E completa; los resultados previos no se presentan como nuevos. No se inició Fase 2, no se publicó en GitHub y no se modificó configuración cloud. Los scripts reutilizables ya guardados siguen correspondiendo a este workflow.

Solo se actualizaron `PROGRESS.md` y este registro para reflejar el commit existente y la revalidación; cambios documentales disponibles en el árbol de trabajo, sin crear otro commit automáticamente.

## Ejecución 2/12 — PostgreSQL y modelo comercial

### Alcance e inspección

Leídos AGENTS.md, PRODUCT_SPEC.md, ARCHITECTURE.md, PLANS.md y PROGRESS.md. Se conservaron el commit inicial y las modificaciones documentales existentes. El propietario autorizó en esta fase todos los dominios comerciales enumerados, además de categorías/herramientas/casos inicialmente previstos. No se modificó la portada ni se implementó Fase 3.

No había psql/initdb ni bindings DATABASE_URL/TEST_DATABASE_URL. Comprobado daemon Docker local por socket con selectores de contexto/TLS eliminados para ese comando. PostgreSQL oficial 17 descargado con checksum/digest verificado y fijado a `sha256:b8faeff7712663c2773a190181e1246e37e364b887611c04658c28b44e2408fe`. Servidor observado: `17.11 (Debian 17.11-1.pgdg13+2)`.

`db:local` creó bindings aleatorios en `.env.local` ignorado por Git sin imprimir valores; solo loopback 55432, bases atlas_dev y atlas_test, volumen nombrado. La conexión externa queda disponible con DATABASE_URL privada, sin contratar servicios.

### Versiones y motor

Consultado registro oficial: Prisma CLI `latest` apuntaba a `8.0.0-rc.27`; se eligió versión estable `7.10.1` para prisma, cliente y adapter-pg, compatible con Node 24.19.0. `pg@8.23.1`, `dotenv@18.0.9` y tipos pg fijados. Consultados ejemplos oficiales de Prisma para configuración, schema y adaptador PostgreSQL.

El primer acceso a una ruta de documentación oficial antigua devolvió 404; se usaron los ejemplos oficiales existentes. El CLI nativo intentó obtener motor/checksums desde binaries.prisma.sh y recibió 403 del proxy. No se estableció PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING ni se desactivó TLS. Se guardó la adición del dominio al borrador, no se presupone acceso aplicado.

Se verificó una alternativa local con los módulos **oficiales** npm de Prisma: internals, client-generator-ts y schema-engine-wasm del mismo commit `d1b3f377ca835d73fd50954a5e22128b9ebdd6b8` que exige Prisma 7.10.1. El generador oficial produjo el cliente TypeScript y SchemaEngine generó/aplicó SQL con historial/checksums Prisma. No se inventó un migrador ni se sustituyó el ORM. La carga de un helper internals buscaba un WASM ausente en su ruta de bundle; se utilizó el export directo SchemaEngine del paquete oficial que sí incluye el artefacto. Entradas ESM del generador tenían imports sin extensión no resolubles por Node; se utilizó su entrada CommonJS publicada, sin parchear node_modules. Todos los paquetes quedaron fijados y con integridad npm en lockfile.

`scripts/prisma-wasm.mjs` aísla esas APIs internas y su limitación de estabilidad; Node emite aviso experimental de imports WASM. El flujo reproducible instala con `npm ci --ignore-scripts` y genera explícitamente, evitando hooks que descargan binarios nativos no usados. No se utilizaron artefactos cuya verificación se hubiese omitido.

### Datos implementados

21 modelos de dominio en schema.prisma, más tablas de unión generadas y 16 enums. Roles de usuarios en enum, sin implementar login/sesiones. UUID, índices de FK/estados/fechas/slugs, JSON estructurado y timestamps con zona. Dinero BigInt en unidades mínimas, Sandbox por defecto, aprobación y consumo con estados seguros. El objetivo TypeScript pasó a ES2020 tras detectar que ES2017 rechazaba literales BigInt; se mantuvo strict y noUncheckedIndexedAccess.

Cuatro migraciones aplicadas:

1. `20261025000100_initial_domain`: SQL generado por motor Prisma WASM, relaciones y unicidad.
2. `20261025000200_domain_constraints`: CHECK SQL para dinero, emails, fechas, consentimiento, aprobación, JSON y límites.
3. `20261025000300_commercial_consistency`: FK compuestas campaña/orden y evento/transacción; añade coherencia de patrocinador/paquete/proveedor/entorno.
4. `20261025000400_campaign_relation_key`: índice único compuesto exigido por el validador Prisma en una relación uno a uno. Se añadió después de detectar P1012 por unicidad insuficiente de la tupla, conservando las migraciones ya aplicadas.

Conexión solo servidor, lazy y reutilizable, máximo cinco conexiones; sin log de consultas ni secretos. Repositorios internos con Zod: borradores, búsqueda/filtros/paginación estable, snapshot de lista/total, lectura pública sin demos ni emails de autor, leads + auditoría en una transacción. No hay rutas HTTP nuevas ni proveedores externos.

Seed transaccional con upserts no destructivos y guardas NODE_ENV/nombre de DB: usuario ficticio inactivo, categorías/tag de desarrollo, tool/caso/artículo DRAFT con isDemo, cuatro paquetes inactivos sin precio y marcador de seed. No genera métricas, ventas, suscriptores o ejecuciones reales. Reejecutado dos veces; además los tests comprobaron que conserva una edición manual y no duplica registros.

### Verificación final y reproducibilidad

| Comando / comprobación | Resultado observado |
| --- | --- |
| `npm --cache /workspace/.cache/npm ci --ignore-scripts --offline --no-audit` | Exit 0, 567 paquetes desde caché; instalación limpia para comprobar el flujo guardado, sin editar lockfile. Audit ejecutado por separado después. |
| `npm run db:validate` | Schema validado por parser oficial Prisma WASM, exit 0. |
| `npm run db:generate` | Cliente oficial TypeScript generado, exit 0, ignorado en Git. |
| `npm run db:deploy` / `db:status` | Cuatro migraciones completadas en PostgreSQL, historial actual, sin checksums editados ni migraciones fallidas. |
| `npm run check` final | Validación, ESLint sin warnings, tipos y 11 unit tests aprobados; 0 fallidos/omitidos/cancelados. |
| `npm run test:db` final | Todas las migraciones aplicadas en DB temporal; segundo deploy aplicó cero; 8 tests de PostgreSQL real aprobados, 0 fallidos/omitidos/cancelados, 684 ms de tests. |
| `npm run build` final | Exit 0, generación previa y build Next 16.4.3/Turbopack; generación con cuatro workers y caché válida. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 14 aprobados en 7.7 s, desktop/móvil y axe; 0 fallidos/omitidos. Regresión de la portada sin cambios. |
| npm audit | Exit 0, 0 vulnerabilidades reportadas; no sustituye auditoría de producto. |
| `npm run db:backup` y `db:restore-check` | pg_dump -Fc privado; pg_restore --exit-on-error en otra DB; todas las tablas con igual recuento. La DB temporal se eliminó, sin sobrescribir desarrollo. |
| `npm run db:stop` / `db:local` / `db:status` | Contenedor detenido/reiniciado, health correcto e historial preservado en volumen. |
| Consulta SQL posterior al reinicio | PostgreSQL 17.11; 4 migraciones; 1 Tool, 1 UseCase, 1 Article y 4 paquetes de seed. Ninguna DB temporal de tests/restauración quedó tras las tandas terminadas. |

Los 8 tests DB ejercitan: singleton real; seed/relaciones/ediciones; repositorios y paginación; FK/unicidad/emails/fechas; captura + rollback de lead/auditoría mediante un trigger temporal que falla; importes, moneda/entorno/proveedor y ownership comercial; consentimiento/aprobación newsletter; budgets, idempotencia e intentos de modelos de agentes. Las filas con nombres de ejecución/pago son fixtures de persistencia aislados, no operaciones de IA o pagos realizados. El runner solo elimina una base aleatoria que él mismo creó desde TEST_DATABASE_URL dedicada, nunca la DB configurada del usuario.

### Límites y comprobaciones no aprobadas

- CLI nativo: bloqueado por descarga 403. No se presenta como validado; `npm run db:*` fue probado con módulos oficiales WASM.
- Introspección/drift adicional, fuera de las pruebas requeridas: primer intento por URL usó una variante retirada por Prisma; el intento con schemaDatasource y adaptador llegó a PostgreSQL pero falló por `Column type 'char' could not be deserialized from the database`. Es una limitación del tooling oficial en la descripción del catálogo. No se afirma que esa comprobación pasó ni que no exista drift. Historial/checksums, DDL, generación, constraints y lecturas/escrituras sí se comprobaron. Para ampliar esa validación, usar CLI nativo después de habilitar su dominio o una actualización conjunta probada del tooling.
- Avisos no bloqueantes: import WASM experimental en Node, ESLint 9 fuera de soporte por compatibilidad heredada, NO_COLOR/FORCE_COLOR del runner. No se ocultaron ni se desactivaron aserciones.
- No se ejecutó GitHub Actions remotamente, no se contrató DB administrada ni se verificó recuperación de producción. No se implementaron auth, pagos, envío de correo, workers/agentes ni Fase 3.

### Persistencia de configuración y Git

`update_environment_config_draft` confirmó `status: saved` y `requires_publish: true` al guardar instalación y arranque de Fase 2, además de la adición previa de binaries.prisma.sh. No se declararon secretos externos ni valores de las credenciales locales. Guardar el borrador no publica, no aplica red ni demuestra restauración en nueva tarea; el propietario debe revisar/guardar y publicar el entorno para activar el snapshot.

Conservados todos los archivos funcionales previos y las actualizaciones documentales existentes. Nuevos archivos Prisma, scripts, repositorios, tests y documentación disponibles en el árbol de trabajo. No se creó un commit ni se hizo push automáticamente en esta ejecución. El commit inicial `14abcba98976aaa8c33ef83d625d7463d620d0e3` sigue conservando Fase 1.

## Ejecución 3/12 — plataforma pública y directorios

### Inspección y decisiones

Leídos los cuatro documentos solicitados y las instrucciones del repositorio existente. Confirmada la capa de Fase 2 local, PostgreSQL accesible y un tool/caso/artículo ficticios en borrador. Se preservaron cambios previos y el remoto oficial, sin reinicializar ni publicar. Consultadas guías instaladas de Next.js para componentes de servidor, params/searchParams asíncronos y convenciones de rutas. Se reutilizaron versiones y dependencias ya instaladas.

El seed anterior no era contenido público verificado. Se definió un modo demo explícito a nivel de proceso, siempre visible en banner/tarjetas/fichas, sin publicar drafts o activar ese modo desde una URL. Modo publicado exige no-demo + PUBLISHED + fecha no futura en consultas y relaciones. En vez de inventar popularidad se añadió una selección editorial featured, identificada como tal. No se activó newsletter ni ventas; sus bloques comunican el estado real.

### Implementación

- Portada con los textos exactos solicitados, hero/buscador, categorías, herramientas destacadas, workflows editoriales, previews desde Article, bloques preparados, navegación y footer.
- Tools/use-cases con búsqueda PostgreSQL, filtros, tags/dificultad, tres órdenes, páginas de seis, parámetros Zod, links que conservan filtros y vacíos/errores honestos. Fichas con relaciones y contenido estructurado; UUID privados/credenciales/datos de usuarios no forman parte de los DTO de presentación (solo IDs de contenido cuando necesarios para render/tests).
- Rutas force-dynamic y consultas parametrizadas con snapshot RepeatableRead; cache React por petición para fichas/metadata. No arrays de contenido como fallback ni consultas descartadas silenciosamente.
- Migración `20261025000500_public_catalog` aplicada mediante motor Prisma: featured Tool/UseCase, solution UseCase e índices. No se editaron migraciones aplicadas. Cliente regenerado y schema validado.
- Seed adicional no destructivo en PostgreSQL: ocho herramientas de ejemplo con sitios de origen, seis workflows con pasos/limitaciones/referencias y dos previews. Los nombres de productos son referencias ilustrativas, no afirmaciones de pruebas, reviews o integraciones; no se inventaron estadísticas. El seed previo sigue conservado. Flag demo activado explícitamente en `.env.local` privado, sin imprimir valores de conexión.
- UI responsive con foco/labels, estados loading/error, reduced motion, links HTTP(S) sin credenciales y texto escapado. Un dominio .invalid de fixture no se presenta como enlace oficial utilizable. No hay formularios de suscripción o ventas que aparenten funcionar.
- Helper de DB temporal compartido entre tests de datos y E2E: aplica todas las migraciones y verifica segundo deploy sin cambios, carga seeds y elimina solo su DB. Las pruebas del catálogo no usan ni modifican la DB local de desarrollo.

### Fallos diagnosticados y corregidos

1. Typecheck inicial detectó inferencia string|undefined al desestructurar arrays de seed; se fijaron como tuplas readonly. No se desactivó strict.
2. Primera tanda unitaria: 15/16 aprobadas; normalización de filtros conservaba claves opcionales undefined. El parser ahora omite entradas ausentes/vacías antes de aplicar defaults; 16/16 al repetir.
3. Primera tanda E2E: 24/30 aprobadas. Los tests SQL reutilizaban un parámetro para columnas varchar y text, provocando inferencia incompatible; se asignaron parámetros distintos al fixture, sin alterar lógica de producción. Las dos pruebas afectadas se ejecutaron después correctamente en ambos proyectos.
4. Axe detectó contraste 4.46:1 del texto blanco sobre el indigo original en el botón de filtros. Se oscurecieron botones/estado de paginación manteniendo la paleta y se repitió el análisis sin excluir reglas.
5. Se añadió prueba de loading real mediante lock temporal de PostgreSQL para comprobar el fallback de streaming, sin sustituir una consulta por un temporizador ficticio. Se libera en finally.

### Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `npm run db:generate` / `db:validate` | Aprobadas con módulos oficiales WASM, sin desactivar checksum/TLS ni intentar reparar el CLI nativo. |
| `db:deploy` | Aplicada la quinta migración aditiva a desarrollo. |
| `npm run check` final | Validación, lint sin warnings, typecheck y 16 unit tests aprobados; cero fallidos/omitidos/cancelados. |
| `npm run test:db` | 10 pruebas reales aprobadas, cero fallidas/omitidas/canceladas; 899 ms de tests. Incluye aislamiento de modos, filtros/categorías/tags/dificultad y páginas sin duplicados, además de Fase 2. |
| `npm run build` final | Aprobado, Next 16.4.3/Turbopack; rutas /, /tools[/slug], /use-cases[/slug] dinámicas; caché válida reutilizada y generación con cuatro workers. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` final | 32 aprobadas, cero fallidas/omitidas, 22.4 s, dos workers y proyectos desktop/mobile. DB temporal y ambos seeds; cleanup propio al finalizar. |
| Datos en vivo | Insertar una fila propia de fixture en PostgreSQL la hizo aparecer en búsqueda y ficha tras una nueva petición; eliminada al finalizar. |
| Visibilidad | Un servidor publicado sin flag ocultó demos y sirvió un registro PUBLISHED de fixture; ningún borrador se publicó para hacer pasar la prueba. |
| Error de infraestructura | Otro servidor con conexión deliberadamente indisponible mostró error genérico/reintento, sin falso vacío ni credenciales en HTML. |
| Loading | Bloqueo SQL de lectura mostró fallback real antes de liberar DB y obtener resultados; aprobado en escritorio y móvil. |
| Accesibilidad/responsive | Axe en home, ambos directorios y ambas fichas; teclado/reduced motion y sin overflow en viewports ensayados, incluido 320 px. Capturas de home desktop y directorio móvil revisadas. No es certificación WCAG manual completa. |

No se reinstalaron paquetes, modificaron versiones o incorporaron servicios. No se ejecutó nuevo audit porque no cambió el conjunto de dependencias. Los avisos heredados WASM/NO_COLOR siguen distinguidos de fallos. No hubo comprobaciones requeridas bloqueadas por infraestructura en esta fase; el bloqueo nativo y la introspección opcional de Fase 2 continúan documentados, sin presentarlos como resueltos.

Actualizados PROGRESS, arquitectura, guías y README. Avances locales de Fases 2–3 conservados; Fase 1 sigue publicada en `samuelbenju/AI_WORKFLOW_ATLAS`. No se creó commit, hizo push, desplegó, cobró, envió correo ni inició Fase 4 en esta ejecución.

### Cierre de Fase 3

- `db:status` final: historial actual, sin migraciones editadas/fallidas. `.last-run.json` de Playwright: passed, failedTests vacío.
- `git diff --check`: sin errores. Revisión de 73 archivos legítimos del proyecto: sin patrones de tokens reales o claves privadas detectados; fixtures de pruebas siguen siendo ficticios y no se imprimieron valores privados. `.env.local`, cliente generado, node_modules, builds, reportes y backups ignorados en Git.
- HEAD publicado permanece `411621ab95c9ad10725a5c5cb74688c6ffc9e6ef`; esta ejecución no cambió refs ni origin. Los avances de Fase 3 permanecen locales junto con Fase 2.
- `update_environment_config_draft` confirmó `status: saved` y `requires_publish: true` para start_skill actualizado: PostgreSQL obligatorio al servir, quinta migración, ambos seeds, flag demo explícito, nueva readiness y wrapper E2E aislado. El install_script previo sigue correspondiendo a los comandos probados, sin reinstalación innecesaria ni cambios de red. La revisión/guardado/publicación del entorno corresponde al propietario; no se afirma snapshot publicado o restauración en tarea nueva.

## 2026-10-25 — Ejecución 4/12 / autenticación y administración

### Implementación y decisiones

Se conservó el checkout oficial y todo el trabajo local de Fases 2–3. No se reinstaló ni reconstruyó la aplicación. Autenticación local mediante scrypt nativo Node y sesiones opacas persistidas, alternativa justificada a Auth.js sin proveedor OAuth ficticio. ADR-021–025 y `docs/ADMIN.md` documentan propiedades, permisos y límites. Sin nuevas dependencias o cambios de versiones.

Migración aditiva sexta `20261025000600_admin_auth`: hash opcional validado en User, Session con digest/expiración/FK e índices, y LoginRateLimit compartido entre procesos. `db:deploy` aplicado a desarrollo y `db:status` confirma historial actual sin editadas/fallidas. Los wrappers de pruebas aplican las seis migraciones a bases propias y comprueban segundo deploy sin cambios.

Servicios de auth/CRUD solo servidor, autorización fresca por operación, Zod estricto, Origin/CSRF, límites de cuerpo, respuestas no-store y errores españoles sin SQL. Escrituras y auditoría comparten transacciones; se bloquean confirmaciones incorrectas y eliminaciones con relaciones. Roles OWNER/ADMIN, EDITOR restringido y VIEWER sin panel. Dashboard real, cuatro CRUD, filtros/páginas, configuración editorial persistente y auditoría. Shell público conservado por composición; administración española independiente con responsive, loading/error/empty. Módulos comerciales/newsletter/agentes explican que están pendientes, sin simular acciones.

La identidad humana elegida quedó solo en configuración privada 0600; el usuario debe elegir contraseña con `npm run admin:init` (TTY, doble ingreso sin eco). No se guardó una contraseña plana ni se creó un administrador humano con fixtures. `admin:password` cambia hash y revoca sesiones. El bootstrap real y sus restricciones se probaron con cuentas temporales, sin activar la identidad humana.

### Diagnósticos y correcciones

1. ESLint detectó nombre reservado `module`; renombrado. Navegación tras login usa origen absoluto local calculado para recargar el contexto autenticado y descartar estado previo. No se relajó el linter. Typecheck detectó inferencia unknown en las columnas opcionales de lista; se añadieron comprobaciones de tipo.
2. Primer intento E2E no llegó a ejecutar navegador: el helper de cuentas usaba top-level await en salida CJS de tsx. Se encapsuló en main async, sin cambiar configuración global o paquetes.
3. Primera tanda de 48: 40 aprobadas y 8 fallidas (cuatro tipos por dos proyectos). El selector de alert coincidía con el announcer Next; se acotó al error del formulario. Playwright serializaba como string JSON un cuerpo que debía ser inválido; se enviaron bytes. El test de editor autenticaba un API context distinto al navegador; se usa page.request. El label Slug incluía texto de ayuda; se dio nombre/descripción accesibles independientes. Después, 48/48 aprobadas.
4. Se agregó verificación de configuración editorial/defaults. Primera tanda de 50: 48 aprobadas y 2 fallidas por selector de label que incluía el contenido inicial del textarea. Se selecciona por rol/nombre accesible; no se cambió la lógica de persistencia para hacer pasar el test.
5. Revisión final: acciones/entidades del resumen/auditoría traducidas al español; opciones de estado conservan el estado actual en el formulario bloqueado de editor. No se habilitó publicación para ese rol. Capturas separan viewport original y 320 px.

### Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | Validación Prisma, ESLint sin warnings, tipos Next/TypeScript y 20 unitarias aprobadas. |
| `npm run test:db` | 18 pruebas reales, 18 aprobadas, 0 fallidas/omitidas/canceladas; 5.4 s. Bootstrap/hash, login, rate limit persistente, expiración/rotación/revocación, roles frescos, CRUD de cuatro entidades, integridad/confirmaciones, settings, indicadores y regresión del dominio. |
| `npm run build` último | Aprobado. Rutas privadas/login/API/admin dinámicas; directorios públicos conservados. Generación del cliente incluida. |
| Regresión pública | 32 E2E aprobadas en las tandas completas anteriores; últimas correcciones posteriores se limitaron a administración/tests/documentación. |
| Cierre E2E administrativo | `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- tests/e2e/admin.spec.ts`: 18/18 aprobadas, 0 fallidas/omitidas, 22.6 s, dos workers, desktop/móvil, sobre el último build. No se afirma una única tanda final de 50 aprobadas. |
| Privacidad/acceso | Anónimo/API sin cookie o con cookie falsa recibe 401; páginas redirigen a login. VIEWER recibe 403 en login. EDITOR no publica/elimina/configura. Inactivación revoca acceso con cookie existente. CSRF ausente/origen externo rechazados; login inválido no concede sesión. |
| CRUD/navegador | Los cuatro formularios crean/editan y conservan datos tras reload; borrado incorrecto se rechaza y confirmación actual elimina. Slugs duplicados/relaciones entrantes dan conflicto. Ajustes sobreviven reload y se aplican a nuevos formularios. |
| Accesibilidad/diseño | Axe sin infracciones en pantallas ensayadas; sin overflow hasta 320 px; capturas de dashboard en viewport original y móvil revisadas. No certificación WCAG integral. |
| Estado local | 6 migraciones aplicadas, 9 herramientas/7 casos previos conservados y 0 administradores humanos activos con contraseña. Pruebas no alteraron desarrollo. |
| Secretos/Git | Revisión automatizada de archivos legítimos sin patrones de tokens/claves privadas; .env.local 0600 y privados/generados/reportes ignorados. HEAD main sigue 411621ab95c9ad10725a5c5cb74688c6ffc9e6ef. Sin commit/push. |

Los avisos WASM experimental/NO_COLOR heredados y deprecación del adaptador pg por consultas concurrentes dentro de transacción no son fallos de estas pruebas; no se deshabilitaron validaciones. Sin cambio de dependencias no se repitió instalación/audit. Persisten las limitaciones nativas/de drift opcional ya registradas, sin bloquear las comprobaciones requeridas actuales. No se verificó CI remota, despliegue o activación de una cuenta humana.

`update_environment_config_draft` confirmó borrador guardado y requires_publish:true para start_skill de Fase 4. Se conserva install_script y no se cambian red/secretos. Activación exige revisión/guardado/publicación del entorno por el propietario; no se afirma publicación de snapshot o restauración en tarea nueva. No se inició Fase 5 ni hubo gastos/envíos/operaciones comerciales.

Revisión visual final: se esperó explícitamente el heading del dashboard antes de la captura de viewport original para evitar fotografiar el fallback de streaming. Tanda focalizada `--grep 'admin screens'`: 2/2 aprobadas en 6.5 s; capturas desktop y móvil revisadas. Solo cambió la espera del test, sin modificar código de aplicación después del cierre anterior. Revisión final de 112 archivos: sin patrones de secretos ni correo humano en archivos versionables; origin oficial confirmado y diff --check limpio.


## 2026-10-25 — Ejecución 5/12 / blog, CMS y SEO

### Inspección y alcance

Leídos AGENTS, PRODUCT_SPEC, ARCHITECTURE, PLANS y PROGRESS, guías de base/catálogo/admin y documentación Next instalada de metadata, sitemap/robots, image y proxy. Runtime cloud conectado, política restringida vigente y sin VPN; acceso a fuentes mediante proxy/CA existentes. Se conservó el checkout oficial y todo el árbol de Fases 2–4. No se inició Fase 6 ni se cambió origin/HEAD.

### Implementación

Migración aditiva `20261025000700_editorial_cms` aplicada a desarrollo, cliente generado y schema validado con el tooling WASM oficial existente. Article conserva datos anteriores y añade fuentes, noindex, imagen y revisión; ContentDraft enlaza snapshots mediante FK. No se editó SQL aplicado. Servicios transaccionales con autorización fresca, control de edición obsoleta y auditoría; conversión de formato heredado guarda el registro y relaciones originales antes de sobrescribirlo.

Blog público con consultas PostgreSQL por petición y DTOs sin credenciales; búsqueda/categorías/páginas/relacionados y bloques/fuentes/fechas. El modo demo de tools/cases no publica artículos. CMS español con editor seguro, referencias, relaciones, metadatos, preview privado, snapshots y acciones de revisión/publicación/despublicación. No se acepta status PUBLISHED mediante guardado ordinario. Revisión humana explícita por OWNER/ADMIN, invalidada al editar; los publicados pasan a borrador al guardar una edición. EDITOR no publica ni edita publicados.

SEO dinámico con canonical/OG/Twitter, BlogPosting/BreadcrumbList/CollectionPage y serialización JSON-LD que escapa cierres de script. Robots/sitemap y headers de proxy respetan bloqueo de preestreno; habilitación explícita solo con HTTPS/SITE_URL/no-demo. Privados siempre noindex. Sitemap no incluye noindex, borradores, demos o futuras publicaciones; no se inventan fechas de modificación de índices. Seis ilustraciones originales PNG locales, 1200×630 y aproximadamente 52–56 KB, next/image responsive, AVIF/WebP y allowlist local. Sin fuentes remotas/SDK en la lectura pública.

Seed editorial desarrollado y ejecutado una vez en desarrollo: seis artículos originales IN_REVIEW en los temas solicitados, sin aprobación/publicación. No destructivo, conserva ediciones y solo opera sobre _dev/_test fuera de producción. Fuentes recuperadas y leídas desde repositorios oficiales de n8n, OpenAI Python, Ollama, Google Workspace, GitHub Docs y pandas. Notas con fecha/huella/alcance, sin afirmar ejecución de integraciones o benchmarks. Un enlace histórico de tutorial n8n falló; se usó el README oficial disponible. No se amplió red ni se eludió un bloqueo. Guía y fuentes en `docs/EDITORIAL.md`.

### Diagnósticos y correcciones

1. TypeScript detectó un href indexado posiblemente undefined y un default ProcessEnv incompatible con un Pick de claves opcionales. Se mantuvo strict, se acotó el href tras comprobarlo y se tipó la política como mapa de variables opcionales.
2. Primera tanda E2E completa: 58/60. Los dos tests de portada fallaron porque el nuevo título raíz no incluía marca; Next no aplica su plantilla de título a la misma ruta raíz. Se corrigió el título de aplicación y se mantuvieron los tests y el texto exacto del hero. La suite final pasó completa.
3. Revisión de conservación detectó que un formato heredado no debía reemplazarse sin guardar el original. Se agregó snapshot íntegro previo y recuperación de bloques compatibles en el formulario; prueba PostgreSQL específica aprobada. No se eliminó ni reinicializó contenido anterior.
4. El generador local de ilustraciones emitió avisos de caché Fontconfig no escribible; los PNG se generaron correctamente, se inspeccionaron en las páginas y su optimización en Next se verificó en navegador. No se cambiaron permisos del sistema.

### Verificaciones finales

| Comando/comprobación | Resultado |
| --- | --- |
| `npm run check` | Schema oficial válido, lint sin errores/warnings, TypeScript estricto y 25/25 unitarias; cero fallidas/omitidas. |
| `npm run test:db` | 25/25 pruebas PostgreSQL, cero fallidas/omitidas/canceladas, 6.25 s; incluye las 18 previas, seed editorial, versiones, roles/revisión, publicación/edición/despublicación, enlaces, categorías/paginación/sitemap y snapshot heredado. |
| `npm run build` | Aprobado, Next 16.4.3/Turbopack; blog, CMS, robots/sitemap y proxy nuevos; rutas privadas protegidas/dinámicas. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | **60/60**, cero fallidas/omitidas, 49.7 s; dos workers, Chromium desktop/Pixel 7, sin reintentos. Aplicó siete migraciones y verificó segundo deploy sin cambios en su DB temporal. |
| Ciclo editorial real | Formulario crea y edita; reload conserva datos; preview privado no ejecuta texto script; aprobación y publicación separadas muestran página/metadata reales; despublicar retira la ficha. |
| Autorización | Anónimo redirigido/API 401; editor no puede publicar; CSRF y permisos heredados conservados. No se activó cuenta humana con fixtures. |
| SEO | Canonical/OG/article schema y noindex verificados; servidor aislado con configuración de lanzamiento permite indexar fixtures, robots bloquea privados y sitemap excluye noindex/borradores. Retirar un fixture lo elimina del sitemap en nueva petición. Desarrollo permanece bloqueado. |
| Seguridad de contenido | Bloques/URLs/mass assignment validados, texto HTML literal sin ejecución, JSON-LD seguro; referencias internas no públicas no crean href. |
| Responsive e imágenes | Axe sin infracciones en pantallas ensayadas, editor a 320 px sin overflow, portadas srcset/_next/image cargadas; capturas de artículos desktop/móvil revisadas. No se afirma certificación WCAG o CWV de producción. |
| Estado de desarrollo | 6 borradores editoriales pendientes, 0 publicados, indexación false, 0 administradores humanos activos con contraseña; no se usó su identidad en pruebas. |
| Git/secretos | 140 archivos de texto revisados sin patrones de tokens/claves privadas; .env.local 0600 e ignorado junto a artefactos. diff --check limpio; main/HEAD 411621ab95c9ad10725a5c5cb74688c6ffc9e6ef sin commit/push. |

No se añadieron dependencias o versiones; no se reinstaló ni se repitió audit. Avisos heredados WASM/NO_COLOR y deprecación pg no se ocultaron ni causaron fallos de las tandas finales. No hubo pruebas requeridas bloqueadas por infraestructura; el CLI nativo y drift opcional anteriores no se declaran resueltos.

Documentación permanente/guías actualizadas. `update_environment_config_draft` confirmó status:saved y requires_publish:true para instrucciones de arranque de Fase 5; install_script/red/bindings conservados. La activación requiere revisión/guardado/publicación del entorno por el propietario y no equivale a push/deploy. No se declara snapshot publicado/restaurado. Cuenta humana, aprobación del contenido y futura decisión de indexación siguen en manos del propietario; no se comenzó Fase 6.


## 2026-10-25 — Ejecución 6/12 / patrocinios y CRM

### Alcance y persistencia

Leídos controles permanentes, guías de base/admin/editorial y documentación Next instalada de Route Handlers. Runtime conectado; no se requirió red externa, servicios de pago o nuevas dependencias. Checkout/origin oficiales y cambios locales anteriores conservados.

Reutilizados los cuatro productos y modelos comerciales. Se agregaron consentimiento/contacto/referencia/nonce/digest y snapshot del precio solicitado, configuración de duración/disponibilidad/intake y creatividad/condiciones de campaña. CommercialNote guarda notas con actor/fecha; CommercialRateLimit comparte límites entre procesos. Propuestas usan ContentDraft COMMERCIAL_PROPOSAL con FK a lead. Campaña admite orderId null en borrador, preservando FK financieras cuando hay orden. No se fabrican órdenes para poder editar campañas.

Migraciones 8 (enums), 9 (CRM) y 10 (CHECK de requeridos) aplicadas a desarrollo. Primer intento 8 falló en el comentario antes de ALTER TYPE: executeScript del adaptador oficial separa por punto y coma. Comprobados los cinco valores originales y logs del fallo antes de DDL; corregido el comentario de la migración no aplicada, marcado el intento rolled back mediante el motor oficial y reaplicado. La fila fallida queda como auditoría, sin reset o modificación manual de checksums. No se editaron migraciones exitosas. Los wrappers aplican las diez desde cero y comprueban segunda aplicación sin cambios. db:status final actual sin fallidas pendientes/editadas.

### Funcionalidad

Página sponsor inglesa y responsive con formatos/precios/disponibilidad desde DB, beneficios sin estadísticas de audiencia, consentimiento descrito, privacidad de la solicitud y confirmación con referencia solo tras persistir. Firma HMAC local aleatoria en configuración privada 0600, nunca impresa/versionada; origen exacto, nonce, caducidad, honeypot, JSON limitado, Zod y rate limits PostgreSQL. Idempotencia y ventana de duplicados con bloqueo/unique/reintento acotado; cambio de términos pide refrescar. No exposición pública de PII o consulta de leads.

CRM español protegido por permiso commercial OWNER/ADMIN, tablas/filtros/páginas/fechas, estados solicitados, empresas manuales y vínculos, paquetes/precios, notas y propuestas privadas con snapshot. Guardar propuestas no envía mensajes. Estado WON no confirma un pago. Versiones por updatedAt evitan sobrescribir cambios concurrentes; auditoría junto a escrituras.

Campañas con borrador, solicitud de revisión, aprobación, activación, pausa/cancelación y finalización. Guardado reinicia revisión. Guardas de pago PRODUCTION, transacción/evento verificados, presupuesto/moneda/duración/periodo, contenido público y solapamientos; newsletter/Sandbox bloqueados. Componentes públicos en home/tools/artículos reconsultan condiciones, etiquetan Sponsored y enlaces sponsored/noopener/noreferrer, ocultando anuncios fuera de fecha, sin pago o en demo. No se conectó ningún proveedor ni se cambió un pago desde UI.

Seed comercial no destructivo preserva los cuatro productos y configuraciones, actualiza solo texto provisional exacto previo y no crea clientes/leads/ventas/campañas. Se conservaron precios null/por cotizar y duración pendiente por falta de una decisión comercial real del propietario.

### Diagnósticos corregidos

1. Typecheck detectó inferencia de groupBy de Prisma para el contador de nuevas solicitudes. Se usó count del estado requerido, sin desactivar strict o serializar resultados ambiguos. Lint señaló un let no reasignado de fixture; cambiado a const.
2. Primer E2E: 68/72. El test de circuito guardaba page.url antes de terminar un Link; se esperó la URL del detalle. El de campañas omitía seleccionar el paquete que pretendía probar y el navegador bloqueaba un campo relacionado obligatorio; se eligió explícitamente Homepage.
3. Repetición focalizada: circuito 2/2, campañas 0/2. El payload del formulario contenía UTC con minutos sin segundos y Zod lo rechazaba. Se corrigió la normalización con Date.toISOString, conservando validación/zonas. Check/build y suite completa posteriores aprobados.
4. Se reforzó CHECK de campos requeridos con COALESCE en una nueva décima migración, evitando que UNKNOWN/NULL se acepten como validación. No se reescribió la novena ya aplicada.

### Resultados finales

| Verificación | Resultado |
| --- | --- |
| `npm run check` | Prisma válido, lint sin warnings, TypeScript estricto y 28/28 unitarias, cero fallidas/omitidas. |
| `npm run test:db` | 33/33 pruebas PostgreSQL, cero fallidas/omitidas/canceladas, 6.67 s. Incluye firma/caducidad, consentimiento/referencia/snapshot, duplicados, CRM/roles, precios históricos, abuso persistente y guardas de campañas/periodos. |
| `npm run build` | Aprobado. Sponsor, intake/API y CRM dinámicos; aplicación existente conservada. Sin dependencias nuevas ni instalación repetida. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` final | **72/72**, cero fallidas/omitidas, 1.3 min según Playwright; desktop y móvil, dos workers sin reintentos. |
| Circuito principal | Formulario guardó referencia, contacto/consentimiento; CRM encontró la oportunidad, cambió a CONTACTED y relectura de DB/reload confirmó estado. Notas/propuestas quedaron persistidas y privadas, sin envío. |
| Precios | Cambio real en paquete desde admin se mostró en /sponsor; edición obsoleta rechazada y snapshots anteriores conservados en tests DB. |
| Privacidad/abuso | Consentimiento ausente, origen externo, firma alterada, campos monetarios del cliente y rol editor rechazados. Dos POST concurrentes devolvieron una misma referencia, sin PII en respuesta. |
| Entrega | Borrador sin orden guardado; aprobación sin condiciones rechazada. Solo un fixture con orden/transacción/evento PRODUCTION y aprobación/periodo llegó al componente con etiqueta y rel correcto; cancelar el pago lo ocultó. Todo en DB temporal, nunca una venta real. |
| Diseño | Axe sin infracciones en rutas ensayadas, formulario a 320 px sin overflow, capturas desktop/móvil de sponsor revisadas. No certificación WCAG manual o métricas de producción. |
| Desarrollo | 4 paquetes sin precios/habilitación, 0 sponsors/leads/campañas/órdenes y 0 admins humanos con contraseña; firma local disponible, indexación desactivada. No quedaron fixtures de venta en desarrollo. |
| Git/secretos | 173 archivos de texto sin patrones de tokens/claves privadas detectados, .env.local 0600/ignorado junto a artefactos. Origin oficial confirmado; main/HEAD 411621ab95c9ad10725a5c5cb74688c6ffc9e6ef sin commit/push. diff --check limpio. |

Sin pruebas requeridas bloqueadas por infraestructura. Avisos previos WASM/NO_COLOR/deprecación pg conservados, sin deshabilitar comprobaciones. CLI nativo y drift opcional siguen con sus límites históricos; no se afirma resolución. No se repitió audit al no cambiar dependencias.

Actualizados documentación y guías. Borrador cloud start_skill de Fase 6 confirmado saved/requires_publish:true, install_script/red/bindings conservados; falta revisión/guardado/publicación del entorno por el propietario. No se declara snapshot restaurado en nueva tarea ni deploy. Cuenta propia y condiciones comerciales reales siguen pendientes de su decisión. La Fase 7 no comenzó; no hubo mensajes externos, gastos, proveedores de pagos o envíos simulados.


## 2026-10-25 — Consolidación local de Fases 2–6

Revisados los 166 cambios pendientes (20 archivos modificados, 146 nuevos) y los 179 archivos legítimos totales. No hay borrados ni symlinks. Manifiesto de hashes temporal conservó evidencia de contenido; esquema Prisma (25 modelos), diez SQL/migration_lock y lockfile v3 incluidos. Dependencias root del lock coinciden exactamente con package.json y versiones instaladas.

Sin patrones de claves/tokens reales encontrados entre candidatos. .env.local/credenciales, builds, cliente generado, caché, reportes y dumps siguen ignorados. .npmrc inspeccionado por claves: save-exact, engine-strict, fund, update-notifier, sin auth. Contraseña ci_only y URLs con credenciales de rechazo son fixtures explícitas, nunca de despliegue. No se imprimieron valores privados.

Se verificó last-run E2E passed sin fallos y que ningún archivo funcional/configuración/dependencias era posterior al build final 2026-10-25T22:38:08Z o al E2E 22:40:09Z. Se conservan como evidencia vigente lint/typecheck/build, 28 unitarias, 33 PostgreSQL y 72 E2E de Fase 6. No se reconstruyó, reinstaló o repitió suites aprobadas. db:status actual y diff --check limpio.

Fetch autenticado normal del origin oficial: remote main 411621ab95c9ad10725a5c5cb74688c6ffc9e6ef; 0 ahead/0 behind antes de consolidar. No se cambió origin, hizo merge/reset, force push o publicación. Commit de implementación 62d201bc33989464f25ebf7ba80b3656b95ef358 contiene 164 archivos cambiados, incluyendo módulos/tests de Fases 2–6 y sus dependencias compartidas. PROGRESS/BUILD_LOG se conservan en un segundo commit documental, con autoría/fecha normal de Git y sin inventar historia de fases separadas.

Nueva solicitud de Fase 7 recibida durante la revisión: se atenderá después de cerrar respaldo local. La autorización de implementarla no autoriza push; la operación remota seguirá esperando aprobación expresa. No se iniciaron campañas/envíos o Fase 8.


## 2026-10-25 — Ejecución 7/12: newsletter sobre el respaldo consolidado

Autorización posterior expresa para Fase 7, conservando el requisito previo de aprobación antes de push. Parent local `dfde5d718691f29b81e88d4508538ffd65f23d77`; consolidación integrada `62d201bc33989464f25ebf7ba80b3656b95ef358`. No se reconstruyeron módulos ni se inició Fase 8.

Implementados formularios/landing, doble opt-in y baja segura, consentimiento con generaciones/eventos, panel privado, campañas/borradores/propuestas de fuentes aprobadas, audiencias y lotes manuales con aprobación separada, plantillas, interfaz de email y adaptador Resend, cifrado/outbox e historial de resultados. Migración `20261025001100_newsletter` aplicada sin modificar las previas: once migraciones/28 modelos. Extensión mínima del guard comercial para el formato Newsletter manteniendo pago/contrato/aprobación. Sin dependencias nuevas ni cambios al lockfile.

Verificación: `npm run db:validate`, `db:generate`, `db:deploy`, `db:status` correctos. `npm run check` (lint cero warnings, TypeScript y 30 unitarias) aprobado; `npm run test:db` final **44/44**, cero fallidas/omitidas, con once migraciones desde cero y deploy repetible. `npm run build` aprobado. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` final **80/80**, cero fallidas/omitidas, 1.5 minutos, escritorio y Pixel 7. Aislamiento PostgreSQL por wrapper, fixtures/cuentas privadas de test y sin correo externo. Confirmado `.last-run.json` de esa tanda como passed/failedTests vacío.

Incidencias resueltas: SELECT pg_advisory_xact_lock retorna void que queryRaw no deserializa; executeRaw oficial conserva bloqueo sin deserializar. Fixture de artículo publicada necesitaba fuente para CHECK existente, se corrigió fixture. Primer E2E 75/80: dos aserciones añadidas por error al preview privado, dos orígenes del servidor aislado distintos del configurado y una tabla móvil sin acceso por teclado. Se corrigieron pruebas/configuración y tabindex/región de tabla; no se relajaron guardias o checks. Tanda final 80/80. Comprobada captura local explícita en UI y que no establece ACCEPTED/SENT. Pruebas de protocolo Resend usan transporte falso identificado, sin solicitudes al proveedor.

Comprobados alta válida, duplicados simultáneos, invalidación, consentimiento/fecha/origen, confirmación/expiración/uso único, bajas, supresión/generaciones, autorización/CSRF/origen, borrador/edición/audiencia/lote autorizado, bloqueo sin proveedor, propuesta desde contenido aprobado y patrocinio condicionado a fixture financiera aislada. UNKNOWN persistido antes de I/O impide reenvío tras fallo. Axe en público/panel, viewport 320 px y capturas desktop/móvil inspeccionados. SQL/FK/CHECK conservados; datos reales de desarrollo: cero suscriptores/newsletters/entregas, cero administradores humanos con contraseña.

Clave NEWSLETTER_SECRET local generada sin logs en .env.local 0600; demás privados/generados ignorados. No hay API key o remitente Resend configurados. Default disabled guarda PENDING/BLOCKED sin simular envío; falta envío real autorizado, que queda bloqueado y no se presenta aprobado. README, AGENTS, arquitectura, guía NEWSLETTER, referencia comercial, PROGRESS y ejemplo de variables actualizados.

Fuentes oficiales de Resend recuperadas/leídas por HTTPS (README y src/emails/emails.ts); transporte SHA-256 `e5927850f8ae4bf4f17e1711503c3768e9f8944035bf93ce2784db5518261008`. No se utilizaron instrucciones externas como órdenes. Borrador cloud guardado con start_skill de Fase 7, variables no secretas y requisito RESEND_API_KEY para api.resend.com; `requires_publish=true`, no aplicado/publicado. install_script/membresía previos conservados. Revisión/guardado/publicación del entorno siguen en manos del propietario y no sustituyen prueba en tarea nueva ni push GitHub.

Revisión de 203 archivos legítimos (197 texto/6 imágenes) sin patrones de secretos reales o identidad privada; archivos privados excluidos, diff --check limpio. Cierre en un commit propio de Fase 7 sobre main, mensaje `feat: implement consent-based newsletter and authorized delivery`. Fetch oficial repetido: main remoto sigue `411621ab95c9ad10725a5c5cb74688c6ffc9e6ef`, ancestro de los commits locales, sin cambios remotos por incorporar. Hash y dry-run/respaldo de cierre se informan en la entrega; no se ejecuta push sin aprobación expresa. Las limitaciones históricas opcionales Prisma nativo/drift no se reinvestigaron ni se declararon resueltas.


## 2026-10-25 — Ejecución 8/12: infraestructura de pagos Wompi Sandbox

Base `d1675d7a58129853ffa7e4d5ae6cf02c02afb298` en main oficial, Fases 1–7 publicadas en la operación expresamente autorizada anterior. La fase actual implementa pagos Sandbox localmente y no autoriza otro push ni Fase 9. Se conservaron archivos funcionales y no se reconstruyó la aplicación.

Lecturas: AGENTS/PRODUCT_SPEC/ARCHITECTURE/PLANS/PROGRESS y guías de DB/comercial. Revisión de modelos existentes, permisos, restricciones y scripts; guía instalada de Route Handlers Next 16 consultada antes de crear rutas. Runtime/red observados: conexión activa, política HTTP restricted, observación de enforcement desconocida. Nombres/presencia de claves Wompi comprobados sin valores: ninguna configurada.

Intento oficial HTTPS a `https://docs.wompi.co/docs/colombia/widget-checkout-web/`: proxy rechazó túnel con 403. Búsqueda acotada de una copia oficial en GitHub no encontró una fuente verificable; no se usó código comunitario como documentación oficial ni se eludió el proxy. Por ello **no se declara revisada la documentación vigente ni validado el protocolo contra Wompi externo**. Default deshabilitado; pendientes acceso, contraste oficial, claves/cuenta Sandbox y callback HTTPS para prueba real. No se crearon cuentas comerciales o recursos facturables.

Implementación: orden calculada desde paquete COP, snapshots comercial/cobro, nonce/idempotencia/ref únicas, intentos con otra referencia/reuso/expiración, interfaz PaymentProvider y adaptador Wompi Sandbox, firma de checkout, webhook firmado + lookup autoritativo, eventos/digests/reintentos de consulta, transiciones/conciliación, historial y cumplimiento separados. Hosted checkout, sin tarjetas/POST de cargo en el servidor. Panel /admin/payments OWNER/ADMIN con filtros/paginación, órdenes/transacciones/eventos/errores, preparación/cancelación/conciliación, Origin/CSRF/JSON/Zod. Retorno público nunca confirma estado. Producción/activación real deshabilitadas; guard comercial previo conserva exigencia de pago PRODUCTION y aprobación.

Persistencia: PaymentAttempt y PaymentOrderHistory nuevos, tres modelos financieros anteriores extendidos. Migraciones `20261025001200_wompi_sandbox` y `20261025001300_payment_consistency` aplicadas. Total 30 modelos/trece migraciones; historia anterior sin cambios de checksum, sin reset/db push ni datos eliminados. Generación inicial identificó relación inversa incompleta; corregida antes de desplegar. Migración 13 añade coherencia de intento/orden/proveedor, actor y restricciones Sandbox. Todas las migraciones requeridas aplicadas también desde cero en bases de prueba; segundo deploy sin cambios. `db:status` actual sin editadas/fallidas/pendientes.

Verificación final:
- `npm run check`: esquema/generación, lint cero warnings, typecheck y **33/33 unitarias**, cero fallidas/omitidas. Una inferencia union en una aserción de fixture se corrigió con comparación del contrato completo, sin cambiar lógica o relajar comprobaciones.
- `npm run test:db`: **53/53 pruebas reales PostgreSQL** en DB temporal propia; cero fallidas/omitidas. Nuevas pruebas de precios/manipulación, referencias/idempotencia simultánea, credenciales ausentes/producción rechazada, firma y estado, referencia no firmada manipulada, duplicados, caída/reenviado del mismo evento, aprobado/rechazado/error/void, importe incoherente, estados antiguos, conciliación, vencimiento, pagos tardíos/múltiples y FK/fulfillment. Transportes Wompi son respuestas locales explícitas; no transacciones externas verificadas.
- `npm run build`: producción aprobado con TypeScript, sin ignoreBuildErrors ni cambios a herramientas/dependencias. Package-lock y manifiesto de dependencias conservados, no reinstalación.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`: **86/86 aprobadas**, cero fallidas/omitidas, 2.6 min, Chromium escritorio/Pixel 7. .last-run.json final passed/failedTests vacío. Wrappers solo crean/eliminan sus DB temporales; Wompi forced disabled evita llamadas accidentales con configuración heredada. Casos nuevos de acceso/roles/CSRF/precios, formulario→orden→DB→cancelación, proveedor no configurado y retorno manipulado sin efecto; axe/320 px y capturas del panel.

Tandas iniciales: primero 85/86, referencia larga en summary producía desbordamiento a 320 px; corregido wrapping/min-width del panel. Segunda tanda 85/86: pagos 6/6 aprobados, conflicto de serialización P2034 en eliminación de categoría del CRUD previo al compartir DB con dos workers. No se modificó el módulo de contenido ni se relajaron assertions/roles; cierre con un worker aísla flujos y pasa 86/86, mientras las pruebas PostgreSQL conservan peticiones financieras concurrentes explícitas. Sin retries automáticos del runner.

Comprobación de desarrollo: cero órdenes/intentos/transacciones/eventos/historial financieros, sin ventas o fixtures sembrados. No se inicializó contraseña humana ni se enviaron comunicaciones o campañas. Claves reales Wompi inexistentes, no hubo cobros Sandbox externos o reales. La aceptación externa queda bloqueada expresamente; no se presenta aprobación fixture como transacción del proveedor.

Documentación actualizada: PROGRESS, ARCHITECTURE, AGENTS, README, DATABASE y nueva PAYMENTS, ejemplo de variables sin secretos. Borrador cloud guardado con instrucciones de Fase 8, variables de nombre sin valores privados y dominios docs.wompi.co/sandbox.wompi.co/checkout.wompi.co, preservando red/servicios anteriores y sin declarar secretos de hashing como placeholders de proxy. install_script/membresía conservados. `requires_publish=true`: revisión/guardado/publicación del entorno pendientes, sin afirmar aplicación de red o restauración en otra tarea.

Revisión de archivos legítimos, patrón de secretos e identidad privada sin hallazgos; .env.local y dependencias/generados/reportes ignorados, diff --check limpio, lockfile sin cambios. Trabajo de Fase 8 permanece local, sin commit/push/deploy. Fase 9 no iniciada.


## 2026-10-26 — Respaldo y publicación de Fase 8 autorizados

Objetivo exclusivo: guardar/publicar los avances ya probados de Fase 8, sin nuevas funcionalidades, pagos o Fase 9. Repo oficial origin fetch/push `https://github.com/samuelbenju/AI_WORKFLOW_ATLAS.git`, rama main. Padre local y remoto verificados mediante fetch y ls-remote: `d1675d7a58129853ffa7e4d5ae6cf02c02afb298`.

Revisión: 31 archivos pendientes exclusivamente de Fase 8; 218 archivos legítimos revisados (212 texto/6 imágenes), sin patrones de secretos reales o identidad privada. Las claves de fixture son explícitas y se usan con transporte falso. .gitignore excluye .env.local, claves/credenciales, dependencias, generados y reportes; .env.example solo ejemplos y modo deshabilitado. Sin borrados de archivos anteriores, cambios al lockfile o edición de migraciones aplicadas.

Conservados esquema Prisma, migraciones 12–13 junto con las once anteriores, pruebas y lockfile ya versionado. Comparadas fechas de archivos funcionales con BUILD_ID y .last-run.json: ningún archivo posterior a las verificaciones finales anteriores; last-run passed/failedTests vacío. No se repiten suites: evidencia previa de check (33 unitarias/lint/typecheck), 53 PostgreSQL, build y 86 E2E con un worker. En esta operación solo se editan PROGRESS.md y BUILD_LOG.md para documentar el respaldo; revisión de diff --check.

Todo el avance se incorpora en un único commit exclusivo, mensaje `feat: implement Wompi Sandbox payment infrastructure`, sobre el padre comprobado. Publicación expresamente autorizada mediante push normal main→main; sin force push, modificaciones a otros repositorios ni reescritura de historial. Identificador final y resultado de verificación remota se comunican en la entrega, evitando un commit documental adicional solo para registrar su propio SHA.

Pendientes externos conservados en PROGRESS y PAYMENTS: credenciales Sandbox, callback HTTPS, acceso/contraste de documentación oficial y pago/eventos/conciliación externos no ejecutados. No se da por validado Wompi externo al publicar el código. Sin pagos reales o de prueba externos y sin iniciar Fase 9.


## 2026-10-26 — Ejecución 9/12: motor, cola y worker supervisado

Base `91754fab74d960cdde9b0ad6d78c9ed2e6dbfe91` de main publicado, árbol inicial limpio. Lectura de documentos permanentes y guía instalada de Route Handlers Next. Trabajo exclusivo de Fase 9; no worktrees/subagentes, reinitialización, cinco agentes de Fase 10, commit/push o publicación externos.

Modelo persistente ampliado sin recrear Agent/Task/Execution: configuración/nombre/roles/modelo/herramientas/estado/límites/última ejecución; tareas con aprobación/config hash, idempotencia, disparadores, leases/fencing y cancelación; ejecuciones con modelo/proveedor/ID, uso/reserva/coste/resultado/error. AgentSchedule/AgentBudgetPeriod/AgentWorkerHeartbeat nuevos. Migración `20261026001400_agent_engine` aplicada a desarrollo, total 33 modelos/catorce migraciones. DB status actual sin editadas/fallidas/pendientes; scripts de test aplican las catorce desde cero y segundo deploy sin cambios. Sin reset, SQL anterior editado o datos funcionales eliminados.

Motor: claims PostgreSQL bajo lock corto, límites de concurrencia global/agente, reserva mensual global/agente y presupuesto total por tarea antes del I/O; llamada fuera de SQL, timeout 30s y fencing de resultado tardío. dispatchedAt duradero, backoff acotado para fallo conocido/antes de despacho; incertidumbre no se reintenta y consume conservadoramente la reserva estimada. Cancelación/AbortController, resultados DRAFT, aprobación humana por tarea/consumo ligada a configuración/rol fresco, revisión de resultado sin publicación. Solo herramienta local catalog_summary con recuentos públicos; ningún shell, escritura, pago, comunicación o permiso por indicación del modelo.

Responses API nativa desacoplada, endpoint fijo y modelo por allowlist, tools=[], store=false, schema de texto, output tokens y errores seguros. Clave ausente tanto en runtime/bindings como en configuración local (nombres/presencia comprobados sin valores). AGENTS_ENABLED=false y global budget cero: ninguna llamada real ni gasto. Los proveedores inyectados en pruebas son TEST_FIXTURE en DB aislada, nunca fallback de producción. Coste estimado usa tarifas del operador y usage reportado; no se inventaron tarifas/invoices. Contrato oficial leído por HTTPS en openai/openai-node Responses, HTTP 200 y SHA-256 `a3e63cd8dfe3e124ed5ca156116219add6266fe2af9b2b90ca78a0fc01653bfe`.

Infraestructura: PID1 local no es systemd y no hay cron utilizable; Docker local responde. Se recuperó imagen oficial Node 24.19.0-bookworm-slim con digest verificado `a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df`, sin alterar daemon o registry/TLS. Worker dedicado ai-workflow-atlas-agent-worker activo, restart unless-stopped, user 1000, readonly, cap-drop, sin socket/host network, límites de recursos. Red ai-workflow-atlas_default conecta a DB por su nombre/5432; envfile mínimo 0600 fuera de Git, código/dependencias readonly y CA readonly cuando está presente. Node --use-env-proxy en worker y comandos dev/start conserva egress de credenciales; no se deshabilita TLS ni se elude proxy.

Primera creación del worker falló antes de iniciar por mountpoint node_modules ausente en runtime readonly; se creó el directorio vacío fuera del mount antes de lanzar el contenedor y se eliminó solo el contenedor fallido propio. Runtime y modelos no afectados. Servicio arrancado y luego reiniciado para actualizar su snapshot; comparadas huellas de engine/provider/admin/scripts/package con runtime, coincidencia comprobada. Heartbeats reales docker-local BLOCKED/PROVIDER_DISABLED avanzan con el daemon fuera de Codex. No se presentan esos heartbeats como IA operativa. Procesos/snapshot/host externo no se declaran restaurados en tarea nueva.

`npm run test:agent-service`: aprobado en contenedor y DB temporales propios, con catorce migraciones. Materialización real de una propuesta programada AWAITING_APPROVAL, heartbeat, reinicio del contenedor y heartbeat nuevo, misma única tarea, cero AgentExecution/llamadas IA. Cleanup solo de recursos propios. Demuestra programación/recuperación en esta instancia, sin depender de proceso Next o Codex abierto; requiere host/Docker activos para continuidad.

Panel /admin/agents privado OWNER/ADMIN con configuración/límites, registro deshabilitado de analista, tareas manuales/por evento administrativo, presupuesto y aprobaciones, cancelación, programación/pausa, historial/resultados/alertas y uso/estimados/heartbeat. Servicios y rutas mantienen Origin/CSRF/Zod/límites JSON y autorización fresca. No acceso editor/anónimo o ejecución de herramientas arbitrarias.

Verificaciones finales:
- `npm run check`: schema, generación, lint sin warnings, typecheck y **35/35 unitarias**, cero fallidas/omitidas. React lint detectó Date.now en render; cálculo de frescura movido al DTO de servidor sin desactivar la regla. Ajustadas inferencias TypeScript antes de cerrar.
- `npm run test:db`: **62/62 PostgreSQL reales**, cero fallidas/omitidas, DB temporal aislada. Casos de permisos, aprobación, creación/idempotencia, concurrencia/reservas/cuotas, configuración invalidada, proveedor deshabilitado, resultado DRAFT TEST_FIXTURE, rate limit/backoff, incertidumbre sin replay, leases/interrupciones antes/después, cancelación/abort, presupuestos programados, eventos, fencing/zombies y contrato Responses sin herramientas. Sin llamadas OpenAI reales.
- `npm run build`: aprobado, sin dependencias nuevas/reinstalación/cambio al lockfile. Generación y compilación TS operativas; proxy nativo activado en comandos de ejecución Node.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`: **92/92**, cero fallidas/omitidas, 2.8 min, Chromium desktop/Pixel 7. .last-run.json passed, failedTests vacío. Nuevos casos protegen API/roles/CSRF/precios/estado, registro/configuración/formulario→tarea→cancelación/DB, programación y ausencia de IA ficticia; axe/320px y capturas. Primer E2E 91/92: selector de agente también coincidía con una tarea homónima de desktop al iniciar móvil; se acotó por resumen/rol del agente, sin cambiar funcionalidad o relajar aserciones; cierre 92/92, sin retries.

Desarrollo conserva cero agentes/tareas/ejecuciones/programaciones de negocio; solo heartbeats del mantenimiento real. Sin administrador humano artificial, contraseñas públicas, comunicaciones, campañas, cobros o compras. La primera ejecución real de análisis queda pendiente de clave/autorización, acceso al modelo, tarifas vigentes y budgets conservadores.

Actualizados AGENTS, PROGRESS, ARCHITECTURE, README, DATABASE, ejemplo de variables y nueva AGENT_ENGINE. Borrador cloud guardado con instrucciones de Fase 9 y requisitos API/budgets deshabilitados, ATLAS_OPENAI_API_KEY por api.openai.com (alias por reserva de nombres OPENAI_ en cloud). Conservaron install_script, membresía y otros servicios/red; añadido destino api.openai.com. requires_publish=true, aún no aplicado/publicado. Revisar/guardar ajustes y publicar entorno; no afirmar prueba en tarea nueva o autorización real de una clave por guardar metadata.

Revisión de 234 archivos legítimos (228 texto/6 imágenes), sin patrones de secretos reales o identidad privada; .env.local y runtime/envfile fuera de Git/ignorados, sin SQL aplicado editado, lockfile cambiado o archivos anteriores eliminados. diff --check limpio. Fase 9 local, sin commit/push/deploy externos; Fase 10 no iniciada.


## 2026-10-26 — Respaldo y publicación autorizados de Fase 9

Solicitud exclusiva de cierre sobre /workspace/Quesito, origin oficial samuelbenju/AI_WORKFLOW_ATLAS y rama main. Padre local y main remota confirmados mediante fetch/ls-remote: `91754fab74d960cdde9b0ad6d78c9ed2e6dbfe91`. Autorizado un único commit de Fase 9 y push normal; sin force push, modificación de otros repositorios o Fase 10.

Inspeccionados 31 archivos pendientes (15 modificados/16 nuevos), alcance exclusivo de Fase 9; 234 archivos legítimos revisados (228 texto/6 imágenes) sin patrones de secretos reales o identidad privada. Fixtures de modelo/transporte identificadas TEST_FIXTURE, sin claves desplegadas. Ejemplo de variables con placeholders, proveedor deshabilitado y límite global cero. Privados y envfile del worker fuera de Git; reglas de exclusión comprobadas.

Conservados Docker worker/daemon/helper, interfaz/proveedor/motor/panel, esquema/migración 14 y trece anteriores, pruebas unitarias/PostgreSQL/E2E/servicio, guías y lockfile ya versionado sin cambios. Sin borrados o SQL aplicado modificado. Archivo .last-run.json final passed/failedTests vacío; ningún archivo funcional/test posterior al E2E, ni source de aplicación posterior al build. No se repiten pruebas: evidencia previa aprobada de 35 unitarias, 62 PostgreSQL, 92 E2E con un worker, lint/typecheck/build y verificación de servicio real en DB/contenedor de test.

Consulta de solo lectura a PostgreSQL: heartbeat docker-local reciente, BLOCKED/PROVIDER_DISABLED; IA no habilitada, presupuesto global cero, API key ausente y cero ejecuciones/programaciones de negocio. No se invocó tick, no se reinició/habilitó un servicio o programación y no hubo llamadas externas de IA, pagos o gasto.

Solo PROGRESS.md y BUILD_LOG.md se editan en esta operación; el resto permanece idéntico a la revisión previa, con diff --check limpio. Commit exclusivo `feat: implement autonomous agent execution infrastructure` sobre el padre remoto comprobado; publicación normal main→main expresamente autorizada. SHA y comprobación posterior del remoto/árbol/ausencia de cambios pendientes se comunican en la entrega, evitando un commit documental adicional solo para su propio identificador.

Se mantienen documentados los bloqueos de OpenAI real: credenciales autorizadas, acceso al modelo, tarifas/límites y presupuesto/primera tarea aprobados. TEST_FIXTURE no se considera integración real. La publicación Git no aplica/publica el borrador cloud ni prueba restauración de procesos en otra tarea. Fase 10 no iniciada.

## 2026-10-26 — Fase 10: equipo empresarial sobre motor común

Solicitud expresa de Fase 10, checkout /workspace/Quesito y origin oficial conservados; padre main `806e48bb502764f56a3f2282ed40e499eb5bcecc`. No reconstrucción de módulos, nuevo motor/worker independiente, commit/push automático o Fase 11. Se leyeron documentos permanentes, contratos de Next y guías de motor/DB/administración. Se aplicó cloud-environment-runtime y onboarding: política restricted, VPN no configurada, observaciones actuales sin bindings/clave IA; no se intentó una llamada pagada ni se eludió proxy/TLS.

Migración aditiva `20261026001500_business_agents` aplicada a desarrollo: parentTaskId, approvedInputHash y automationKey, AgentSource y AgentWorkProduct con FK/índices/restricciones/revisión y relaciones de fuentes/CMS/lead. Total 35 modelos/quince migraciones. `db:status` actual sin migraciones pendientes/editadas/fallidas. Pruebas aplican las quince desde cero y segundo deploy sin cambios. Catorce SQL anteriores y package-lock.json conservados sin modificaciones; sin reset/db push, borrados o credenciales en esquema/ejemplo.

Perfiles CEO/Investigador/Editor/SEO/Comercial con herramientas exactas, instrucciones versionadas, contratos Zod/JSON Schema diferenciados y manejadores de persistencia reales. Se reutiliza Agent/Task/Execution y el motor de reservas, cuotas, aprobación, concurrencia, leases/fencing, recuperación/cancelación/reintentos. El proveedor sigue con tools=[]/store=false y salida estructurada; una petición de herramienta/publicación/pago del modelo se rechaza, no se ejecuta. Contexto y configuración ligados a aprobación por hash. RBAC/Origin/CSRF y autorización fresca por servicio; no acceso anónimo/editor al equipo.

Herramientas: CEO lee métricas DB, bruto de órdenes PRODUCTION confirmadas agrupado por moneda y Sandbox separado, sin afirmar beneficio/audiencia/atribución. Investigador lee catálogo/casos y extractos de fuentes seleccionadas, citas comprobadas contra snapshot, hipótesis diferenciadas. Captura administrativa explícita HTTPS de hosts permitidos, DNS anti-destinos privados comunes, timeout/128 KB/MIME/redirecciones/secretos; URL/fecha/digest/procedencia persistidos. No buscador/feed de tendencias o crawler externo configurado. Fetch no verifica factualidad y la limitación de DNS a través del proxy queda documentada.

Editor requiere investigación humana aprobada con evidencia vigente y afirmación respaldada; crea Article DRAFT noindex con fuentes PENDING y ContentDraft real, o actualiza solo borrador/version elegidos preservando snapshot anterior y categorías/relaciones humanas. Revisar AgentWorkProduct no publica ni verifica automáticamente fuentes CMS. SEO comprueba metadatos/contenido y destinos internos de hasta 30 artículos públicos; no declara HTTP externo o métricas de buscadores no consultados. Comercial guarda clasificaciones y propuestas/respuestas privadas, omite contactos/redacta el mensaje y separa precio actual de sugerencia; solo paquetes activos/disponibles, sin cambiar estados/precios/órdenes/contratos/campañas o enviar comunicaciones.

Coordinación: CEO crea propuestas idempotentes por especialista, parentTaskId y presupuesto cero, cada una pendiente de aprobación. Al terminar los especialistas, el mismo motor crea una propuesta de consolidación CEO, también con presupuesto cero/sin aprobación, que lee resultados/estados/fallos. La consolidación no abre otra cascada. Selección manual de ciclo permite reportes parciales. Cinco programaciones administrables deshabilitadas por defecto; habilitarlas no aprueba consumo ni evita requisitos editoriales. Panel /admin/agents ampliado con contexto/fuentes/productos/revisión/retorno de informes.

`npm run agents:team:init` ejecutado en desarrollo, cinco perfiles y cinco calendarios realmente persistidos e idempotentes: todos deshabilitados, tarifas/presupuestos cero. Consulta final: cero tareas/ejecuciones de negocio, cero programaciones habilitadas, IA false, API key ausente y límite global cero. No se crearon cuentas humanas, recursos de pago o fuentes/modelos ficticios en desarrollo. Bootstrap humano de administrador sigue pendiente de contraseña mediante CLI interactivo sin eco.

Verificaciones:

- `npm run check`: esquema/generación oficiales WASM, lint sin warnings, typecheck y **38/38 unitarias**, sin omitidas/fallidas. Contratos de roles/herramientas y rechazo de acciones/atributos arbitrarios incluidos.
- `npm run test:db`: **72/72 PostgreSQL**, sin omitidas/fallidas, base temporal propia. Diez pruebas empresariales comprueban cinco perfiles/ejecuciones individuales con proveedor TEST_FIXTURE, delegación/consolidación, persistencia/citas/fuentes y SSRF, aprobaciones, CMS creación/actualización/snapshots, SEO internos, propuestas/precios/privacidad, versión/evidencia obsoletas, permisos/herramientas prohibidas/inyección, límites, cancelación, calendarios y auditoría. Se conservan las 62 de fases anteriores, incluidas concurrencia, reintentos e incertidumbre del motor común.
- Primeras iteraciones detectaron fixtures incorrectas: artículo publicado sin fuentes editoriales válidas y paquete comercial no disponible seleccionado sin filtro. Se corrigieron datos de prueba respetando las restricciones de producto, sin desactivarlas. El circuito final completo pasa.
- `npm run build`: producción Next 16.4.3 aprobada, rutas administrativas/previas conservadas. Sin código funcional cambiado después de ese build.
- Navegador Chromium real, wrapper PostgreSQL aislado, un worker: primera suite de 96 casos aprobó **las 92 pruebas existentes** y una nueva; tres nuevas fallaron por sincronización/selección de perfiles en el test y fixture COMPLETED sin aprobación. Se corrigieron únicamente las pruebas: esperar UI persistida, distinguir resúmenes de agentes frente a tareas y conservar actor/fecha de aprobación de fixture. Reejecución focal de las cuatro nuevas, escritorio/móvil: **4/4 aprobadas**, .last-run.json passed/failedTests vacío. No se repitieron las 92 ya aprobadas. Incluye persistencia de revisión humana, texto <script> escapado, permisos, tarea/contexto/cancelación, perfil/calendarios y ancho 320 px. Cobertura final: 92 anteriores + cuatro nuevas verificadas; no se afirma una única ejecución limpia de 96.
- Lint/tsc de las pruebas ajustadas aprobados; último ajuste de selector es una expresión regular sin cambios de tipos o aplicación.
- Docker local verificado mediante socket explícito y selectores aislados. Worker propio actualizado solo tras comprobar cero RUNNING y proveedor sin clave/budget; snapshot de engine/handlers comparado por SHA-256 y coincidente. Heartbeat docker-local reciente BLOCKED/PROVIDER_DISABLED. Se preservan imagen oficial fijada, red, proxy/CA, readonly/non-root/cap-drop, envfile mínimo 0600 fuera del checkout y política unless-stopped.
- `npm run test:agent-service`: contenedor/DB aislados, quince migraciones, heartbeat y propuesta programada persistidos, reinicio/recuperación, sin duplicados y **cero llamadas IA**. Cleanup limitado a recursos propios.

Revisión de 246 archivos legítimos (240 texto/seis imágenes), incluidos nuevos ficheros: sin patrones de claves reales, llaves privadas o identidad privada. Alertas inspeccionadas corresponden a placeholders, construcción de URLs, credenciales efímeras de CI y fixtures explícitas de rechazo; ningún secreto real incluido. .env.local, node_modules, .next, test-results/playwright-report excluidos; worker.env fuera del repositorio y 0600. No se imprimieron valores privados. diff --check limpio y lockfile intacto.

Documentación actualizada: AGENTS, ARCHITECTURE, PROGRESS, README, guía del motor y nueva docs/BUSINESS_AGENTS.md; .env.example incorpora solo host de fuentes, sin secretos. `start_skill` completo guardado mediante la skill cloud-environment-onboarding:setup, preservando los demás campos. Confirmación saved/requires_publish=true: el propietario puede revisar y guardar cambios en configuración del entorno y después publicarlo; esto no aplica runtime, publica GitHub ni prueba restauración en otra tarea. No se activaron bindings o costes.

Bloqueos externos conservados: credencial OpenAI autorizada, disponibilidad/modelo/tarifas, presupuesto y primera tarea aprobados para una ejecución real. Proveedores de prueba siguen identificados TEST_FIXTURE, no modelos reales; cero gasto/llamadas IA. Resend real y contraste/prueba externa Wompi Sandbox siguen pendientes según sus guías. No fase 11 ni autorización recurrente. Cambios de Fase 10 permanecen locales para revisión/respaldo posterior.

## 2026-10-26 — Cierre y commit local de Fase 10, publicación pendiente

Solicitud expresa de respaldo en /workspace/Quesito. Origin fetch/push exclusivo https://github.com/samuelbenju/AI_WORKFLOW_ATLAS.git; rama main, HEAD inicial `806e48bb502764f56a3f2282ed40e499eb5bcecc`. Veintinueve archivos legítimos pendientes, sin borrados; alcance de Fase 10 confirmado en código/contratos/persistencia/panel y diez pruebas PostgreSQL empresariales. Conservados motor/worker Docker/contabilidad/aprobaciones/leases/cancelación y seguridad de Fase 9; el diff los amplía por rol y no introduce otro motor. Migración 15 nueva incluida junto al esquema; catorce SQL anteriores, lockfile y pruebas existentes intactos.

Comprobación de solo lectura: CEO, Investigador, Editor, SEO y Comercial persistidos y deshabilitados, cada uno con herramientas propias, presupuesto/tarifas cero. Cinco calendarios identificados por automationKey, todos enabled=false. Cero AgentTask/AgentExecution; AGENTS_ENABLED no true, clave ausente y límite global cero. Heartbeat docker-local BLOCKED/PROVIDER_DISABLED. No se invocó tick, no se reinició/inicializó un servicio o agente, no se configuraron claves y no hubo llamadas reales OpenAI, pagos, gastos recurrentes o Fase 11.

Revisión de 246 archivos candidatos legítimos (240 texto/seis imágenes) y exclusiones Git: ningún archivo privado/generado candidato, llave privada, clave real o identidad privada detectados. Alertas corresponden a placeholders de .env.example, URLs construidas y fixtures explícitas de rechazo/CI; fuente de test con user:pass es un caso negativo, no una credencial. .env.local, dependencias/build/cliente generado y reportes ignorados; worker.env privado fuera del checkout. No se imprimen valores secretos.

Evidencia de pruebas anterior conservada y contrastada con archivos/resultados de esta instancia: check con 38/38 unitarias, 72/72 PostgreSQL, lint/typecheck/build, 92 E2E previas y cuatro empresariales en reejecución focal aprobadas, servicio Docker aislado aprobado con cero llamadas IA. Último .last-run.json passed/failedTests vacío y ningún archivo funcional posterior al BUILD_ID. No se repiten suites; esta operación solo modifica PROGRESS.md y BUILD_LOG.md antes de versionar el trabajo existente.

Verificación remota mediante ls-remote y fetch: refs/heads/main y origin/main permanecen en `806e48bb502764f56a3f2282ed40e499eb5bcecc`, sin commits remotos adicionales respecto al padre local. Preparado un único commit `feat: implement coordinated business agents`; su SHA y comprobación final del árbol se entregan al propietario. Push normal main→main se comprueba mediante --dry-run, que no publica; publicación real pendiente de aprobación expresa según instrucción 10 del propietario. No force push, reescritura/eliminación de historial ni otros repositorios modificados. Antes del push real deberá comprobarse otra vez que el remoto no cambió.

Pendientes de operación real: administrador humano por CLI interactivo, clave/modelo/tarifas y presupuesto/tarea autorizados para OpenAI. No constituyen bloqueos para conservar el commit local; la publicación en GitHub requiere la aprobación solicitada. TEST_FIXTURE sigue identificado como simulación; se conservan también los pendientes externos de Resend y Wompi.

## 2026-10-26 — Fase 11: analítica, crecimiento y afiliados (cierre, America/Bogota)

Base oficial main `1b468492d0d761f71706bf252ab25935ee3ce83d`, Fases 1–10 publicadas por push autorizado. Fase 11 implementada sobre el checkout existente y recuperada sin pérdida tras interrupción del entorno. La última tanda de ocho E2E ya había pasado; el trabajo pendiente era consolidar documentación/estado y versionar. En recuperación se comprobaron los ficheros y fechas, sin cambios funcionales posteriores al build aprobado; no se reconstruyó/reinicializó la aplicación o sustituyó código anterior. Solo documentación de cierre modificada en esta recuperación.

Persistencia: migración aditiva `20261026001600_growth_analytics` aplicada a desarrollo, 45 modelos/dieciséis migraciones. AnalyticsSession/Event/RateLimit, AffiliateProgram/Link/Conversion/Event, BusinessExpense, GrowthExperiment y AnalyticsExternalSnapshot, con claves/relaciones/índices/restricciones. Capacidad analytics_summary añadida al CEO conocido e invalidación de aprobaciones por versión, sin habilitarlo o presupuestarlo. Se mantienen quince SQL anteriores, esquema previo y package-lock.json intactos. db:status actual sin pendientes/editadas/fallidas; runners verifican despliegue desde cero y segundo deploy idempotente, sin reset/db push.

Analítica propia: opt-in versionado, cookies aleatorias HttpOnly/Secure/SameSite y hashes; DNT/GPC, sin términos de búsqueda/queries/IP/UA/email en eventos, rutas públicas verificadas y datos privados excluidos. Eventos de navegador acotados, UUID idempotente, rate limit y límites de sesión. Conversión de newsletter/lead solo desde persistencia de servidor, atribución opcional y consentimiento independiente del correo; retirada elimina sesiones/eventos locales, conserva negocio con finalidad propia. Retención administrativa auditada, sin cron activado. Los identificadores son seudónimos, no personas/audiencia auditada; sin observaciones no se afirma ausencia de tráfico.

Panel privado /admin/analytics con periodos UTC, tráfico/contenido/atribución, datos de suscripción y leads, campañas y evolución diaria; ingresos PRODUCTION solo con evidencia de pago confirmado y fecha no futura, Sandbox separado. Gastos registrados/anulación auditada y comisiones verificadas devengadas separados del bruto y costes IA estimados/reservas conservadoras. BigInt y monedas independientes, sin FX o neto inventados. TEST_FIXTURE excluido del coste OPENAI; consultar el panel/CEO no ejecuta IA. Oportunidades de enlaces internos por categorías/estructura y muestra acotada; experimentos como propuestas/observaciones sin lanzar A/B o afirmar causalidad.

Afiliados: CRUD de programas/hosts/enlaces a herramientas, estados nuevos deshabilitados, URLs HTTPS/hosts exactos y divulgación rel=sponsored nofollow noreferrer. /go/[code] redirige solo a DB con 303/no-store/noindex, no open redirect por query; clic consentido, HEAD/prefetch excluidos. Conversiones únicamente por contrato de proveedor HMAC con ventana/comparación constante, pertenencia programa/enlace, identidad/importe/moneda/fecha, idempotencia/digest/prueba y reversión sin eliminar historial. Ninguna red comercial/cuenta externa declarada operativa sin configuración/adopción del protocolo.

Google: GA4 Measurement Protocol servidor, sin SDK en navegador, modos disabled/validation/live; solo datos consentidos, estado PENDING antes del I/O y sin replay ciego; VALIDATED_TEST no es colección y ACCEPTED_UNVERIFIED no prueba ingestión. Informes GA4 Data y Search Console OAuth readonly, endpoints fijos, respuestas acotadas, importación manual auditada, snapshots y calendarios de proveedor separados de UTC propio. Fuente oficial googleapis/google-api-nodejs-client leída por HTTPS mediante proxy/CA, HTTP 200: analyticsdata-v1beta SHA-256 `48a7b50c090802d16bdc1771f74e7ab46a3cf54d4795a531b7fd62ac2ab56f7c`; searchconsole-v1 `e2c365a28d6fbaa53da22530f354d532e12c7047f92eddf059a7e89463c134c4`. Se usó base oficial searchconsole.googleapis.com/webmasters/v3 y runReport v1beta. No se verificó propiedad real ni se invocó captación Google con credenciales reales.

CEO: misma infraestructura de Fases 9–10, herramienta analytics_summary agregada y snapshots previamente importados, sin claves Google, contactos, referencias de gastos o consultas externas por el agente. Resultados/recomendaciones siguen sujetos a aprobación y límites. La lectura directa de indicadores actuales fue comprobada en la recuperación.

Pruebas conservadas de implementación:
- npm run check: schema/generación oficiales WASM, lint/typecheck y **42/42 unitarias**. Contratos de rutas/eventos, privacidad, destinos, dinero BigInt/currency y periodos UTC.
- npm run test:db: **82/82 PostgreSQL**, cero omitidas/fallidas. Diez casos nuevos de crecimiento: consentimiento/DNT/GPC/cookies codificadas, idempotencia/límites/caducidad/PII, altas y confirmación de correo + solicitudes comerciales reales locales con atribución, roles, afiliados/hosts/estado/firma/replay/reversión, gastos/experimentos/CEO sin datos privados, exclusión de Sandbox/sin evidencia/futuros, Google con transportes fixture, retirada/retención sin borrar negocio. Se conservan las 72 de fases previas.
- La tanda completa de navegador de 104 casos aprobó las **96 E2E anteriores** y dos nuevas; seis nuevas fallaron por decodificación de cookie y pruebas de login/selectores. Se corrigió el lector real de cookies URL-encoded de Next y se cubrió regresión; las pruebas usan la sesión del navegador y selectores de combobox. Se detectó/corrigió serialización BigInt en validación de gastos.
- Axe detectó áreas pulsables pequeñas en summary y tablas desplazables sin foco. Correcciones ya presentes al reanudar: min-height 44 px/espaciado y regiones etiquetadas con tabIndex=0. Última tanda anterior a interrupción: **8/8 nuevas E2E** aprobadas escritorio/móvil, sin infracciones axe detectadas y ancho 320 px. No se desactivó ningún control/assertion.
- npm run test:agent-service aprobado en DB/contenedor aislados, dieciséis migraciones, heartbeat/programación/reinicio/idempotencia, cero llamadas IA. Es evidencia local de infraestructura, no ejecución real del modelo.

Comprobaciones finales ejecutadas durante recuperación:
- npm run lint, npm run typecheck y npm run build aprobados de nuevo en esta instancia. Evidencia /tmp/atlas-growth-recovery-final.log.
- PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1 tests/e2e/growth.spec.ts: **8/8 aprobadas**, 22.7 s, escritorio/móvil, consentimiento/retirada, permisos/CSRF, divulgación/redirección/clics, gastos/anulación/experimentos y axe. .last-run.json passed/failedTests vacío. No se repiten 42 unitarias, 82 PostgreSQL o las 96 E2E anteriores sin cambios funcionales. Cobertura final diferenciada; no se afirma una única ejecución limpia de 104 casos.
- Solo lectura a DB: cinco perfiles y cinco automatizaciones deshabilitados, tarifas/budget global cero, clave IA ausente, cero ejecuciones; tracking false, GA4 captación disabled/no configurada, informes GA4/GSC no configurados. Cero sesiones, programas, gastos y snapshots ficticios en desarrollo. Se comprobó ceoGrowthSummary contra datos actuales sin llamar al modelo.
- El worker se conserva sin reinicio, conforme a recuperación. Comparadas huellas: engine y team-tools coinciden con código actual; growth/metrics del snapshot debe refrescarse mediante procedimiento existente antes de habilitar el worker, por filtros financieros finales. Esto no impide validar el código actual y preparar su commit; no se afirma que ese snapshot ejecute ya los cambios finales. No se reinician servicios para resolverlo sin la operación de despliegue correspondiente.

Seguridad/conservación: revisados 266 archivos legítimos (260 texto/seis imágenes), sin claves/llaves privadas/identidad privada reales detectadas. Alertas revisadas son placeholders/URLs construidas/CI/fixtures explícitas. .env.local, cliente/dependencias/build/reportes ignorados, envfile del worker fuera de Git. Sin borrados funcionales, lockfile intacto y diff --check limpio. .env.example solo configuración/hosts/placeholders, todos los proveedores deshabilitados por defecto.

Documentación: AGENTS/ARCHITECTURE/README/PROGRESS, esta evidencia y docs/GROWTH.md contienen contratos, configuración, fórmulas, límites/privacidad/retención y pendientes reales. Cierre de 44 archivos en commit exclusivo `feat: implement analytics and affiliate growth`; SHA en la entrega sin commit adicional para insertarse a sí mismo. Remoto oficial main verificado en `1b468492d0d761f71706bf252ab25935ee3ce83d`, padre local. Push normal main→main preparado mediante dry-run y pendiente de aprobación expresa antes de publicar; sin force push ni cambios a otros repositorios.

Pendientes externos: propiedad/credenciales Google y comprobación autorizada real, socios que adopten/configuren el webhook y evidencia real, administrador humano por CLI y OpenAI con clave/modelo/tarifas/budget/tarea aprobados. Todos siguen deshabilitados sin configuración válida. Snapshot del worker requiere refresco antes de habilitación. No servicios de pago/cuentas/llamadas reales de IA/gastos recurrentes o Fase 12 activados.

## 2026-10-26 UTC — Fase 12: auditoría integral y preparación, sin lanzamiento

### Alcance y conservación

Solicitud expresa de ejecución 12/12 sobre `/workspace/Quesito`, sin reconstruir/reinicializar o eliminar archivos funcionales. Leídos controles AGENTS/PRODUCT_SPEC/ARCHITECTURE/PLANS/PROGRESS/BUILD_LOG/README y guías de dominio. Aplicada habilidad `cloud-environment:cloud-environment-runtime` ya anunciada: estado observado running/current, sin bindings de proveedor, proxy/CA y daemon local conservados. No delegación, despliegue, servicios comprados, correos externos, IA real, cobros o publicaciones comerciales. Cuenta humana no inicializada.

Git inicial limpio con Fase 11 en `86c5323ba939d34d152b4f1c14e47f7022e2c895` sobre `1b468492d0d761f71706bf252ab25935ee3ce83d`; la remota oficial main sigue en ese padre, comprobada con ls-remote. Fase 11 pendiente de aprobación de push; esta auditoría no creó commit/push de Fase 12. Conservadas fases previas, 45 modelos y 16 migraciones; sin cambios del esquema, SQL aplicado o package-lock.json.

### Hallazgos corregidos

- Motor: falta de revalidación del aprobador después del claim; se consulta antes de dispatch, durante polling y antes de persistir. Revocación cancela el resultado, registra APPROVER_REVOKED y conserva consumo observado.
- Motor: uso reportado fuera de reserva/límites podía desbordar contadores SQL o contabilidad. Se valida safe integer/tokens/coste contra límites; USAGE_OUT_OF_BOUNDS falla con reserva acotada incierta, tokens no confiables cero, lease cerrado y sin producto persistido. No es garantía de factura del proveedor: requiere conciliación y techo externo.
- Comercial: ON_HOLD ahora excluye orden de condiciones de campaña, entrega pública, crecimiento y agregado anterior del CEO. Conserva requisito PRODUCTION firmado/confirmado y aprobación/contrato/fechas; Sandbox nunca activa anuncios.
- Newsletter: diez timeouts secuenciales podían exceder duración de función; lote de dos por autorización humana, maxDuration 60 s en handlers de newsletter/agentes/analítica. No envíos/cron automáticos.
- Preparación: CSP básica base/object/frame/form, HSTS solo con SITE_URL HTTPS, seis páginas legales explícitas con estado de revisión e identidad pública, readiness con bearer privado, gates de lanzamiento y CLI de retención dry-run. CSP no usa nonces/script-src; no se declara defensa integral de XSS.
- Nueva ruta genérica legal causó HTTP 200 en URLs inexistentes por streaming. Primera E2E: 104 aprobadas/cuatro fallidas (404 y política desconocida en dos dispositivos). Corregida con seis rutas explícitas; segunda ejecución completa **108/108**. Sin retries que oculten el fallo.
- Chequeo inicial de lanzamiento contó como activa una fila histórica rolled-back resuelta (migración 8). Se filtran intentos revertidos, exigiendo exactamente una aplicación activa/terminada y checksum coincidente por SQL; prueba rechaza duplicados, editados e incompletos. No se borró/modificó el historial, ni un checksum.
- Primer lint detectó Link interno en signup y const de fixture, corregidos. No requerían cambios de dependencias.

### Instalación y dependencias

Runtime conservado Node 24.19.0/npm 11.9.0. Instalación aislada con copia de package/lock en `/tmp/atlas-phase12-repro-1pn5w1bb`, sin reemplazar node_modules del checkout. Primer npm ci falló ENOENT por caché heredada `/home/agent/.npm` no escribible; se corrigió solo el destino de caché:

`npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/atlas-phase12-npm-cache`

Salida 0, lock idéntico byte por byte al del repositorio. SHA-256 del lock: `d8a014b9e76545fd21dd3bf5f2bc77a036fa5ab8d8cba404c50a7e3f692e25af`. `npm ls --all --omit=optional`: salida 0. `npm audit --json`: salida 0, info/low/moderate/high/critical/total = 0. Sin nuevas dependencias o actualizaciones; versiones/peers fijados. ESLint 9 fuera de soporte, aviso de pg concurrent query para futura versión 9 y advertencia WASM experimental se registran como pendientes de compatibilidad, no fallos ocultos. No cambios de sudo/permisos globales, proxy, CA o integridad Prisma.

### Comprobaciones finales ejecutadas

| Comando / prueba | Resultado |
| --- | --- |
| `npm run check` | Salida 0; validación oficial WASM, ESLint cero warnings/errores, generación de cliente, Next typegen, TypeScript estricto y **45/45 unitarias**. |
| `npm run test:db` | Salida 0; **87/87** PostgreSQL real en DB temporal, migraciones desde cero/segundo deploy idempotente, seed/integridad/constraints/roles, contenido/CRM/newsletter/webhooks/agentes/growth y cinco pruebas nuevas de auditoría. DB temporal eliminada por su runner. |
| `npm run build` | Salida 0; build Next de producción, seis rutas legales y readiness incluidos. No migración/seed/provider externo en build. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1` | Ejecución final completa **108/108**, desktop + mobile, sin reintentos; navegación/404/DB error/loading, búsqueda/filtros/paginación, auth/CRUD/CMS, CRM/newsletter/pagos/agents/growth, políticas/noindex/headers, teclado/320 px/axe. |
| `npm run db:status` | Salida 0, historial actual sin SQL editado, pendiente o fallo no resuelto. 16 migraciones activas; intento rolled-back histórico conservado. |
| `npm run agents:service -- restart` | Solo contenedor local propio; antes: cero RUNNING, cinco perfiles/calendarios deshabilitados, sin key o presupuesto. Refresca snapshot obsoleto de Fase 11 y las correcciones actuales. |
| `npm run test:agent-service` | Salida 0; DB/contenedor temporal, heartbeat persistente, propuesta debida, restart/recovery y sin duplicar; **cero AgentExecution/llamadas IA**. |
| Comparación de snapshot | engine.ts, team-tools.ts y growth/metrics.ts idénticos entre checkout y worker. Heartbeat local fresco BLOCKED/PROVIDER_DISABLED esperado. |
| `npm run db:backup` | Salida 0; `.cache/backups/atlas-dev-1792995193734.dump`, privado 0600 y excluido de Git. |
| `npm run db:restore-check -- .cache/backups/atlas-dev-1792995193734.dump` | Salida 0; restauración a DB temporal aislada, conteos de todas las tablas iguales a desarrollo; solo su DB de ensayo eliminada. No backup/PITR productivo externo verificado. |
| `npm run ops:maintenance` | Salida 0, DRY_RUN, cero sesiones analíticas antiguas, lote máximo 1000. No se ejecutó --apply ni borrado de negocio. |
| `npm run launch:check` | Salida **2 esperada**, BLOCKED_PENDING_RELEASE_REVIEW. Historial/firma local/newsletter key/no-capture correctos; resto de puertas/evidencia productiva pendientes. No despliegue ni falso verde. |
| `git diff --check` | Sin errores de whitespace. |

Pruebas reales de DB y navegador, **no** de proveedor de IA/pagos/email/Google. Respuestas TEST_FIXTURE y eventos de contrato local se identifican explícitamente como pruebas; no transacciones, ingresos o tráfico comercial real. Capturas mobile/contact y homepage inspeccionadas visualmente además de comprobación automatizada; demos y borrador legal visibles. Otros navegadores/dispositivos, carga representativa y prueba HTTPS del dominio final pendientes.

### Circuitos integrados

Nuevo `zzzzz-launch.test.ts`: artículo publicado fixture → paquete del servidor → solicitud consentida → PostgreSQL → lead/empresa/WON → orden → checkout Sandbox → evento checksum/consulta provider fixture → una transacción tras dos recepciones. La campaña Sandbox no pasa aprobación/entrega. Una orden **separada, PRODUCTION ficticia** con evidencia en DB temporal prueba revisión/aprobación/activación/slot durante periodo y retirada inmediata por ON_HOLD. No se promovió un pago Sandbox o vendió un anuncio real. Falta proveedor de cobros productivo y transacción Sandbox externa.

Tarea programada → propuesta única presupuesto cero → aprobación con límite humano → CEO/snapshot/analytics_summary → TEST_FIXTURE → producto PENDING_REVIEW → aprobación/report/audit persistentes. Pruebas anteriores preservadas cubren los cinco especialistas, delegación, citas/procedencia, borrador CMS, permisos de herramientas, rechazo malicioso, límites, reintentos, fencing y cancelación. Dos nuevas regresiones prueban revocación durante el proveedor y uso MAX_SAFE_INTEGER fuera de límites; lectura de readiness verifica token/worker ausente/orden retenida sin emitir alertas externas.

### Seguridad, documentación y bloqueos

Revisión de archivos versionables (281 texto/seis imágenes; 287 total), búsqueda de claves/Pem/tokens/URLs/email privado y coincidencia con bindings privados configurados: **cero secretos reales detectados**. Ocho coincidencias de URL revisadas: placeholders en .env.example, credenciales efímeras CI, fixtures explícitas y URL construida del helper local; sin valores privados guardados. Ningún email humano privado incluido. `.env.local` 0600, backups/caché/generados/reportes/node_modules ignorados. No se afirma una certificación absoluta de seguridad por este escaneo.

README/ARCHITECTURE/PLANS/PROGRESS/BUILD_LOG/PRODUCT_SPEC/AGENTS/.env.example y guías afectadas actualizados. Nuevos AUDIT_REPORT.md (doce puntos), LAUNCH_CHECKLIST.md (puertas/evidencia/responsables pendientes) y docs/PRODUCTION.md (operación, migraciones, backup, rollback, incidentes, límites y plan comercial). CI serial por DB compartida y vercel.json preparados, sin despliegue o crons; no se ejecutó CI remota. MIGRATION_DATABASE_URL solo operativa; runtime requiere rol mínimo propio. Las políticas son borradores noindex, revisión real/identidad/contacto/fecha pendientes; no cumplimiento jurídico declarado.

Estado desarrollo final: cinco agentes/cinco automatizaciones deshabilitados, cero RUNNING/AgentExecution, AGENTS_ENABLED false/presupuesto global cero/sin key, tracking false, Resend/Google/Wompi no configurados o deshabilitados. Readiness local DB sana/sin leases vencidas/emails UNKNOWN antiguos/órdenes productivas retenidas, pero no equivale a salud del destino o proveedores. No web/DB productivos, cuenta humana, dominio/certificado, backup externo, monitor/alertas reales o habilitación comercial verificados. Faltan credenciales y pruebas autorizadas Resend, Wompi Sandbox, OpenAI, Google y socios, revisión oficial Wompi vigente, revisión jurídica/fiscal Colombia e internacional. **Solo proveedor Sandbox implementado: falta proveedor productivo para cobrar/entregar publicidad real.** Lanzamiento comercial no listo y sin autorización de despliegue/publicación/gasto. Repositorio y cambios locales conservados para revisión/respaldo posterior.

Cierre Git de la auditoría: `main`, HEAD `86c5323ba939d34d152b4f1c14e47f7022e2c895`; remota oficial observada `1b468492d0d761f71706bf252ab25935ee3ce83d`, cero commits detrás/uno delante. **50 archivos pendientes de Fase 12 (29 modificados, 21 nuevos)**, sin staging/commit/push. Revisión final de 287 archivos y diff sin whitespace confirma conservación del lockfile, esquema e historial SQL y ausencia de coincidencias de secretos privados. No se declara GitHub sincronizado con estos cambios locales.

## 2026-10-26 (America/Bogota) — Neon staging: preflight y bloqueo de configuración CLI

- Base existente main limpia, HEAD 70984e42d862d8c47e34531648f8c531698cb42e, origin oficial. Documentos de control y operación solicitados consultados. Sin reconstrucción o duplicación de aplicación/base.
- Backup privado fuera del repositorio en /workspace/.cache/neon-staging-preflight-1793031718549: .env.local 0600 y hashes de todos los archivos versionados. Verificación posterior al intento: ningún archivo versionado cambiado; .env.local idéntico byte por byte, modo 0600.
- `npm i -g neon@latest --cache /tmp/atlas-neon-npm-cache --no-audit --no-fund`: salida 254, ENOENT mkdir /home/agent/.local/lib. Sin sudo, chmod de sistema o alteración del prefijo global. Fallback `npx --yes --cache /tmp/atlas-neon-npm-cache neon@latest --version`: salida 0, versión 8.11.4. Sin dependencia nueva en package/lock.
- Ayuda oficial de init/login consultada. -y nunca abre navegador e init instala herramientas de agentes por defecto. Se añadió --no-agent-setup para preservar herramientas existentes; --services postgres conserva el único servicio autorizado.
- Ejecutado init -y con org-purple-boat-02914113, cold-shadow-53495242, rama production, servicio postgres y --no-agent-setup, respetando proxy/CA (NODE_USE_ENV_PROXY=1). Salida 1: ENOENT mkdir /home/agent/.config/neon. Log privado /tmp/atlas-neon-init.log, sin credenciales expuestas. Se detuvo ante problema de permisos según instrucción del propietario; no se intentó eludirlo ni activar otro método de autenticación.
- No se generó neon.ts. No se ejecutaron config plan, deploy, login, creación/alteración de recursos, conexión PostgreSQL, migraciones, seed o pruebas de datos. No se puede confirmar organización/proyecto remoto, intención staging efectiva, contenido vacío o ausencia de datos comerciales en Neon. La política declarada no lista hosts Neon; autorización HTTPS/TCP aún no probada, sin afirmar una denegación no observada. No binding NEON_API_KEY listo.
- Las 16 migraciones/esquema/Prisma 7/adaptador pg, credenciales y aplicación conservados. No check/build/db:status o suites repetidas: no hubo cambio funcional ni acceso Neon, y la instrucción exige detenerse ante permisos/autenticación. No presentar evidencia local anterior como prueba de Neon.
- Documentado en docs/NEON_STAGING.md el uso oficial --config-dir para intervención del propietario y neon login, revisión/plan antes de deploy, validación de destino/SQL, roles runtime/migrador distintos y TLS verify-full, procedimiento existente de migraciones y preparación de Railway (no ejecutada). Solo cambios documentales: esa guía, PROGRESS.md y BUILD_LOG.md. Sin commit/push o despliegue; sin agentes, email, Wompi, modelos IA o servicios adicionales habilitados.

## 2026-10-26 (America/Bogota) — Workflow manual Neon, solo lectura

Base 70984e42d862d8c47e34531648f8c531698cb42e. Estado inicial: BUILD_LOG.md/PROGRESS.md modificados y docs/NEON_STAGING.md nuevo por intento anterior; trabajo preservado e integrado en la documentación de este mismo respaldo Neon. Propietario confirma base atlas_staging vacía y secreto directo configurado en Actions; no se intentó obtener/exponer el secreto desde este entorno ni se usó Neon CLI.

Creado .github/workflows/neon-staging-check.yml: solo workflow_dispatch, gate de repositorio oficial/main, contents:read, checkout sin persistir credenciales, Node 24, npm ci --ignore-scripts --no-audit --no-fund sin secretos en ese paso. Único env de conexión del paso SQL: secrets.MIGRATION_DATABASE_URL. Validación de host Neon directo sin -pooler, puerto/base; campos explícitos pg ignoran overrides de URL. TLS rejectUnauthorized/servername/minVersion, socket cifrado/autorizado, arranque read-only y timeouts. Única sentencia SELECT sin parámetros del visitante: current_database, server_version/server_version_num, transaction_read_only y conteo pg_class/pg_namespace public. No consulta _prisma_migrations, db:*, seed, bootstrap, modelos o tablas de contenido. No escrituras SQL, aprovisionamiento o despliegue. Salida JSON/Summary acotada a base conocida, versión numérica, flags TLS/direct/read-only y conteo; errores redactados por etapa, sin error.message/stack/URL/host/credenciales.

Validaciones ejecutadas:
- YAML mediante js-yaml existente y aserciones de eventos, permisos, versión Node, secreto en un único paso y SQL/controles read-only: aprobadas. Una primera aserción buscaba la palabra dotenv incluso en un comentario que decía que no se usaba; se corrigió el validador para verificar imports, sin cambiar la protección del workflow.
- Heredoc extraído: node --check aprobado.
- actionlint 1.7.12 oficial, descargado desde release GitHub con SHA-256 verificado contra checksums de esa release; actionlint -oneline .github/workflows/neon-staging-check.yml: salida 0, sin hallazgos. Binario solo en /tmp, sin dependencia/configuración nueva del proyecto. El ejecutable llamado go del entorno no admitía el subcomando de instalación, por lo que se utilizó la release oficial para la validación.
- Ocho casos con pg simulado en /tmp, sin sockets/red: válido con URL sslmode=disable sigue forzando TLS; secreto ausente, host -pooler, URL de otra base, host no Neon, certificado no autorizado, servidor que reporta otra base y sesión writable se rechazan. Todos pasan, sin revelar host/credencial fixture. Son pruebas del control, no de Neon.
- git diff --check sin errores. No se repiten lint/typecheck/build/E2E generales: solo workflow/documentación, ningún cambio de aplicación, dependencias, esquema o SQL versionado.

Sin credenciales reales detectadas en archivos preparados; .env.local permanece privado. No commit remoto, dispatch o conexión real a Neon en esta ejecución; resultado Actions y conteo real pendientes tras publicación autorizada y ejecución manual. No migraciones (16 intactas), agentes, pagos, correos, OpenAI o Railway activados. Guía actualizada con ejecución Actions/Run workflow/main y alcance del secreto/read-only. Commit local preparado para aprobación separada de push.

## 2026-10-26 (America/Bogota) — Activación Neon autorizada, ejecución remota bloqueada

Autorización leída del adjunto ACTIVACIÓN COMPLETA DE NEON STAGING: commits/push normales y workflows manuales permitidos; solo 16 migraciones originales en el destino exacto tras guardas. Cuatro archivos documentales/workflow previamente staged se conservaron. No cambios de aplicación, esquema, Prisma, SQL, dependencias o lockfile. No nueva migración.

Diagnóstico real: gh 2.46.0; `gh api repos/samuelbenju/AI_WORKFLOW_ATLAS --jq '{full_name,default_branch,permissions}'` falló con `Get "https://api.github.com/repos/samuelbenju/AI_WORKFLOW_ATLAS": Forbidden`. Política inspeccionada sin api.github.com, observación actual de entorno running pero política unknown y sin bindings listos de API GitHub. No se eludió proxy ni se reutilizaron credenciales de transporte Git para otro destino. Poder publicar Git no certifica acceso a Actions. No ejecución real de workflow, enlace de run, conexión o migración Neon demostrados.

Preparados check/migrate: workflow_dispatch/main/repo oficial, Node 24, npm ci --ignore-scripts, permisos mínimos, secreto de migración solo en el paso PG, concurrencia compartida sin cancelación de DDL. Migración exige run ID de check completado exitoso del mismo commit/evento/ref/workflow, confirma destino, ejecuta check/build sin secreto y vuelve a inspeccionar inmediatamente antes de deploy. No eventos push/PR para la DB externa. Flags IA/presupuesto/Wompi/newsletter/analítica/SEO/legal apagados.

Guardas en scripts/neon-staging.ts: TLS con certificado/hostname; endpoint directo us-east-1, DB y current/session_user exactos; referencia de proyecto independiente (GUC neon.project_id o variable de host comprobado en consola; faltante bloquea); 16 ficheros inmutables/hash de schema/lock/runner del SHA base 70984e42d862d8c47e34531648f8c531698cb42e; solo base vacía o catálogo completo con historial idéntico y cero filas de negocio. Objetos públicos/roles/historial inesperados bloquean. Las escrituras se delegan únicamente a `npm run db:deploy` del runner WASM original, con URL normalizada verify-full y sin fallback DATABASE_URL. `npm run db:status` y comparación completa posteriores. Sin seeds, admin, cleanup o reset. Si deploy falla, no se retransmiten stderr/stdout privados; se identifican solo migraciones conocidas no terminadas consultables. Comparación por catálogo/checksums, sin afirmar una introspección Prisma/drift nativa no ejecutada.

Revisión SQL: exactamente 16 directorios, migration_lock PostgreSQL, esquema y runner iguales a la base publicada. No DROP TABLE/SCHEMA o TRUNCATE; ALTER TABLE DROP CONSTRAINT antiguos son ajustes de relaciones sobre objetos creados por la secuencia, no eliminación de datos. La actualización final del perfil CEO solo afecta al perfil existente conocido; en DB vacía no inserta nada. SQL compatible verificado al aplicar en PostgreSQL local efímero por motor oficial. No editar checksums o historial para continuar.

Pruebas reales LOCALES:
- Referencia en DB efímera del helper existente, limitada al servidor local de tests loopback 55432: 16 aplicadas, segundo deploy sin cambios, catálogo guardado (sin datos) en scripts/neon-staging-manifest.json. 55 tablas incluyendo historial, 486 columnas, 72 FK, 230 restricciones, 182 índices, 75 valores enum.
- Primer generador ad hoc con --import tsx interceptó incorrectamente el import WASM; se detuvo antes de la conexión. Corregida invocación local usando Node 24 nativo para tipos después del helper .mjs; sin modificar el ejecutor WASM, paquetes, checksums o esquema.
- `node scripts/test-neon-staging.mjs`: guarda acepta catálogo completo sin datos; inserción sintética SiteSetting y ALTER de columna exclusivamente dentro de transacciones de la DB efímera producen rechazo; rollback restaura estado. Dominio inesperado también rechazado. Solo DB efímera creada por helper eliminada, ninguna operación sobre Neon. Avisos Node de módulo TS sin type y WASM experimental, sin error funcional.
- `npm run check`: validación/generación Prisma, lint cero warnings/errores, TypeScript y **50/50 unitarias** aprobadas (cinco nuevas de configuración, destinos, manifiesto, historial e identidad de proyecto). Tests no invocan proveedor externo.
- `npm run build`: salida 0 con generación Prisma y build de producción. Sin conexión Neon o migración implícita en build. Tests nuevos de la guarda no cambian aplicación; no suites E2E contra staging ni repetición de suites anteriores sin motivo.
- actionlint 1.7.12 de ambos workflows: salida 0. git diff --check sin errores. No Neon CLI.

Estado local consultado read-only: cinco agentes y cinco automatizaciones deshabilitados, cero AgentExecution; AGENTS_ENABLED no true/presupuesto cero; Wompi/newsletter/analítica/SEO/legal deshabilitados. .env.local intacto. No secretos reales preparados para Git; claves/URLs privadas/backups/logs excluidos. No servicios de pago, emails, modelos, publicación comercial o Render desplegados.

Render elegido por el propietario: guía docs/RENDER_STAGING.md con build incluyendo dev deps/generación, start por PORT, Node 24, runtime PostgreSQL mínimo separado del owner, pool/HTTPS/health/bootstrap interactivo futuro y restricciones Free sujetas a revisión oficial. Sin crear contraseñas para chat, roles o recursos. Backup/branch Neon previo no se creó: no hay acceso API/cuota/coste comprobados; línea base vacía y hashes NO son respaldo/PITR. db:status, estructura y versión Neon siguen sin observación real; Neon no listo para conectar Render hasta resolverlo. Publicación normal de la preparación autorizada; dispatch real queda sujeto al bloqueo API, no a una aprobación extra del propietario para las mismas operaciones ya autorizadas.

### Resultado del push y operación real de Actions

Publicado d85ff0e2ecfd8baa1935985aa1c744e4924f901f por push normal (70984e4..d85ff0e), 11 archivos de preparación, preservando la aplicación y las 16 migraciones. Ejecutado después `gh workflow run neon-staging-check.yml --repo samuelbenju/AI_WORKFLOW_ATLAS --ref main`, salida 1, mensaje exacto no sensible: `Get "https://api.github.com/repos/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/neon-staging-check.yml": Forbidden`. Registro privado /tmp/atlas-neon-actions-dispatch.log. No ejecución creada o URL de run, no workflow migrate iniciado y ninguna escritura Neon. No se repiten llamadas denegadas o se buscan rutas de bypass. La CI convencional puede activarse por el push con su Postgres efímero propio; no se afirma su resultado remoto porque no hay acceso API. Los workflows de Neon solo admiten dispatch manual.

Actualizado informe obligatorio de doce puntos en docs/NEON_STAGING_REPORT.md y estado de PROGRESS. Estado: preparación publicada, activación remota bloqueada, no listo Neon→Render. Falta habilitar acceso API permitido/autenticado y comprobar vínculo del proyecto (GUC o variable de host independiente), luego ejecutar/check y migrate con evidencia real. No se confunde el catálogo local o los tests simulados con una conexión Neon exitosa. No se requiere nuevo secreto ni aprobación de las mismas operaciones ya autorizadas; sí resolver la capacidad faltante del entorno. Sin alteración de modelos, SQL, claves, costes o servicios.

## 2026-10-26 (America/Bogota) — Render Live con error de catálogo: reproducción y diagnóstico seguro

Base local limpia en 843710e53e16c440ff52e6386bb44ba1066529b0. Leídos AGENTS, progreso/planes, configuración db/client/url, public-catalog/homeCatalog y dependencias de páginas; guías runtime/Render y código oficial instalado del adaptador PrismaPg 7.10.1/pg 8.23.1. Propietario confirma 16 migraciones/55 tablas en Neon y rol atlas_staging_app: dato externo, no comprobación de esta sesión. No herramienta Render/logs/variables privadas disponible. Política declarada no lista ai-workflow-atlas.onrender.com; GET controlado por proxy/CA normal no pudo acceder. No se eludió la red; se pidió al propietario habilitar ese dominio para comprobar la publicación. No se declara corregida la causa remota ni resuelta la versión Live.

Reproducción antes de modificar SQL: helper existente crea DB PostgreSQL local efímera con 16 migraciones y SIN seed; owner y un LOGIN temporal NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT con SELECT realizan SELECT 1, count y home/tools/use-cases/facets correctamente, con resultados vacíos. Por ello no hay defecto demostrado en el SQL por falta de filas. El probe de referencia no usó credenciales Neon y retiró DB/rol propios al terminar.

Corrección acotada: readCatalog descartaba la información técnica y los default params creaban el cliente fuera del catch. Se mueve adquisición al límite observado; excepción pública sigue siendo genérica y se lanza, nunca arrays de fallback. Clasificador puro permite únicamente etapas/códigos cerrados y envoltorios conocidos/recorrido acotado, sin leer mensajes o copiar metadatos SQL/identidad. Nueva excepción no retiene cause original. Server logger serializa exactamente stage/codes y omite duplicados de la misma excepción. DATABASE_URL inválida emite solo código fijo. Callbacks oficiales onPoolError/onConnectionError, sin alterar conexión, max=5, timeout=5000, TLS, Prisma o transacciones. log:[] permanece, sin query logging.

Readiness privado existente: autorización bearer previa a consultas, opt-in ?catalog=1 prueba home/directorios/facets con el mismo usuario; 503 con diagnóstico sanitizado si falla. Sin token 401. No endpoint público nuevo. Límite normal 4 s y profundo 12 s con READINESS_TIMEOUT explícito; no se etiqueta cualquier fallo de un probe como prueba de DB caída. Operaciones de lectura pendientes pueden terminar tras timeout HTTP; el proveedor conserva sus propios timeouts. Logs temporales pueden deshabilitarse con DATABASE_DIAGNOSTICS_ENABLED=false sin ocultar fallos.

Pruebas finales:
- `npm run check`: validación/generación Prisma, lint cero warnings/errores, TypeScript y **54/54 unitarias**. Cuatro nuevas comprueban wrappers Prisma/SQLSTATE, autenticación/TLS/DNS/pool/esquema, getters hostiles/ciclos y ausencia de cause privada.
- `npm run build`: salida 0, producción Next y cliente Prisma generados. No implica acceso a Neon.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/test-public-runtime.mjs`: **4/4**, DB/rol temporal read-only, sin CREATE y sin acceso a historial; queries vacías, captura de configuración inválida dentro del catch, denegación de SELECT sobre _CategoryToTool reproduce 42501 y se sigue lanzando; logs contienen solo stage/codes y no URL/rol/password/nombre de tabla. Restauración del grant solo en DB efímera de test, no en Neon. HTTP de producción sirve los tres vacíos; readiness sin token 401, autorizado 200, permiso retirado 503 con 42501; Chromium ve error en vez de falso vacío. No se insertaron registros en esa DB de catálogo. DB/rol efímeros retirados por helper.
- Iteraciones del test nuevo: se sustituyó top-level await por before del runner tsx/CJS; un assert intentaba encontrar error de boundary cliente en HTML bruto y se pasó a comprobación DOM real con Chromium. El espía de console.error reconoce únicamente el aviso fijo pg de consultas concurrentes que puede emitir Node; todos los demás mensajes se exigen JSON stage/codes. No se silenció un error de producto ni se modificó SQL para pasar.
- `npm run test:db`: **87/87** sobre DB temporal del runner existente. Nunca contra staging.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`: **108/108**, escritorio/móvil, sin retries. Tests previos usan sus fixtures/seed solo en DB aisladas, no se habilitaron demos/seed en la aplicación de Render.
- Lint/TypeScript finales reejecutados por cambios del test, sin errores. actionlint 1.7.12 del CI modificado y git diff --check aprobados. CI añade el runner de runtime después de build y Chromium, usando Postgres efímero/credenciales CI, sin conexión externa.

Hipótesis remotas pendientes: credencial/endpoint/base, TLS/CA, DNS/red, permisos (incluidas uniones), pool/latencia, esquema/columnas/versiones y transacción. No se cambian por conjetura: el runbook relaciona códigos con comprobaciones read-only y exige usar el runtime, no el owner. Falta JSON seguro de Render o readiness autorizado y verificación pública del SHA desplegado. Se conservaron .env.local y todos los SQL/modelos/lockfile; sin cambios de datos o privilegios Neon, admin humano, servicios, pagos, IA o correo. docs/RENDER_CATALOG_DIAGNOSTICS.md especifica verificación y límites; no afirma causa raíz Render demostrada.

## 2026-10-26 (America/Bogota) — Fase 13: catálogo real, importación y operación privada

Solicitud adjunta de 25.389 bytes leída. Autorizados cambios/commits/push normales y publicación de contenido revisado en atlas_staging; no nuevas compras o servicios. Estado inicial main limpia, local/remota e7a3bbbfa70d8e48d8db0e29ec8f84f36102bd4d, origin oficial. El propietario ahora confirma portada Render funcionando visualmente: se registra como evidencia del propietario, sin inventar acceso remoto o explicación de la causa anterior. Documentos/modelos/servicios/rutas/workflows existentes revisados y reutilizados. Guía cloud runtime/red consultada; sin delegación, bypass de proxy o nuevas dependencias.

Investigación controlada mediante HTTPS normal: 70 repositorios oficiales y READMEs consultados, hasta tres candidatos concurrentes por lote y límites de tamaño/timeout/redirect. Evidencia URL final/fecha/hash y fragmentos breves en research.json; originales completos solo en cache ignorada. No se ejecutaron instrucciones externas o instaladores. Cinco excluidos tras revisar fuentes actuales: Flowise y Roo Code archivados; Continue sin mantenimiento; Semantic Kernel con sucesor Microsoft Agent Framework; Gemini CLI con transición/limitaciones. Perplexica→Vane, MindsDB→MindsHub y Goose→aaif-goose revisados, sin conservar la descripción histórica del producto distinto. Se verifican código distribuido/purpose documentado, no uso práctico, SaaS, disponibilidad de planes/precios o benchmarks.

Biblioteca original en inglés: 65 fichas, 30 guías de cuatro pasos con limitaciones/referencias, seis artículos estructurados DRAFT/noindex, 20 categorías/24 tags. Seis tools y tres guías destacadas por cobertura editorial. Meta 200 no se rellena con supuestos; vacíos de cobertura y rechazos documentados. No seeds demo/fallbacks de arrays en consultas públicas.

Importador dedicado reutiliza Prisma/modelos/contratos Zod/auditoría. No nueva migración o esquema. Normalización, URLs sin secretos/query, identidad por slug/nombre/hostname y excepción explícita GitHub por repositorio, referencias/fechas/evidencia. No UPDATE/DELETE de contenido existente; conflictos, demos/archivados/no-publicados bloquean, cambios humanos se conservan. Lotes de cinco, Serializable, pool de una conexión; cada lote es atómico. Un fallo capturado conserva conteo de registros previamente confirmados y códigos sanitizados, sin cause privada; nuevo dry-run permite retomar tras interrupción. Drafts pueden relacionarse con tools DRAFT sin hacerse públicos; los publicados exigen tools realmente publicados.

Workflow catalog-import.yml: solo workflow_dispatch/main/repo oficial, contents:read/actions:read, checkout sin credenciales persistentes, Node 24, npm ci --ignore-scripts, concurrencia compartida Neon, flags seguros apagados. Solo el paso PG recibe CATALOG_DATABASE_URL; nunca migración/owner/runtime como fallback. TLS verificado/host directo independiente/base atlas_staging/rol exacto atlas_staging_catalog/PG17/no privilegios elevados. Compara las 16 migraciones/checksums y catálogo existente; solo lectura del historial, nunca deploy/seed/reset/db push. Rechaza DML amplio, lectura privada o privilegios de edición/DDL; script SQL de concesiones mínimas NOLOGIN queda preparado para operador, no ejecutado aquí. Apply exige run exitoso y artefacto dry-run del mismo SHA, modo correcto, máximo 24h y fingerprint aún idéntico. Artifacts solo contienen slugs conocidos, acciones y hashes/conteos, sin credenciales/datos privados.

Administración: mismo bootstrap scrypt/lock/roles existente; nuevo --staging valida TLS/identidad runtime antes del ingreso oculto. Wrapper PowerShell restaura variables y evita ficheros/argumentos de contraseña. No crea cuenta humana, no endpoint bootstrap y no cambia contraseñas existentes. PowerShell no instalado en este executor Linux: ejecución Windows/login remoto pendientes del propietario, no declarados probados.

Pruebas finales verificadas:
- `npm run check`: validación/generación Prisma, lint sin warnings, TypeScript estricto y **61/61 unitarias**. Siete nuevas cubren contenido/evidencia/normalización/duplicados/URLs/estados/guardas de conexión. Lint y typecheck se ejecutaron también tras las últimas correcciones de CLI.
- `npm run build`: **salida 0**, Next producción y generación del cliente; no llama Neon ni aplica migraciones.
- `npm run test:db`: **87/87**, DB efímera propia, regresión de todas las fases anteriores, sin persistencia en staging.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:catalog-import`: **9/9** con 16 migraciones y dos roles efímeros. Permisos mínimos reales e inspección SQL compartida; no lectura de usuarios/contactos o edición/DDL por importador; dry-run cero inserts; pérdida de INSERT revierte el lote completo; importación de 101 registros y relaciones; reimportación cero duplicados; preservación manual, plan obsoleto/archivado/identidad duplicada rechazados; búsqueda/filtros/paginación/facets/home; los 95 slugs sirven el H1 esperado; seis drafts no exponen contenido; protección administrativa en navegador; 1440/390px sin overflow y axe sin infracciones detectadas. Test final comprueba también tools/use-cases DRAFT relacionados invisibles al público. Solo DB y roles propios temporales retirados; nunca datos Neon.
- Iteraciones del test nuevo: los primeros asserts asumían 404/307 HTTP síncronos para notFound/redirect dinámicos; Next transmite 200 tras enviar headers. Se sustituyeron por comprobación de contenido/ausencia de draft y redirección real en Chromium, sin tocar permisos o rutas. Axe necesitaba browser.newContext en vez de browser.newPage: corregido el harness. Estas tandas fallidas se conservan como historial; los nueve finales pasan, sin retries que oculten defectos. Se corrigió además la resolución de relaciones de una guía DRAFT para aceptar tools DRAFT, con regresión explícita.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`: **108/108**, escritorio/móvil, unos 3,5 minutos, sin retries. Suites usan únicamente sus DB/cuentas/fixtures aislados, no publican datos de demostración en staging.
- actionlint oficial 1.7.12 de workflow importación/CI aprobado; git diff --check sin errores. Lockfile/Prisma/16 SQL/runner de migraciones conservados. Revisión de secretos: cero bindings privados en archivos versionables; coincidencias de DSN son fixtures explícitos/ejemplos y configuración efímera de CI, no credenciales reales. .env.local idéntico a copia privada inicial; cinco agentes/cinco schedules locales deshabilitados, cero ejecuciones. Flags ausentes mantienen defaults seguros; los tests nuevos y el workflow los fijan apagados.

Bloqueos reales: GET al API GitHub y Render no disponible por proxy. `gh api repos/samuelbenju/AI_WORKFLOW_ATLAS --jq ...` respondió **Forbidden**, registro privado /tmp/atlas-phase13-actions-access.log. No binding Neon listo en este entorno ni extracción de secretos de otro servicio. No importación, creación de rol, bootstrap humano o consulta de staging ejecutados; no afirmar catálogo visible o SHA Live. Hay autorización de push, y permiso Git de transporte comprobado previamente, pero eso no prueba acceso a Actions. Publicación de código/preparación queda sujeta al resultado Git real; instrucciones mínimas para dry-run→apply, secreto independiente, OWNER y verificación Render en docs/CATALOG_OPERATIONS.md. Informe completo A–O en docs/PHASE13_REPORT.md. La fase no está completada operativamente mientras falten esas comprobaciones.

Interrupción breve del acceso al executor antes del respaldo: entorno informado unavailable, status del proveedor running; volvió a responder y se verificaron checkout/cambios/logs intactos. No reset, clean, reinicio o reconstrucción. No nuevos gastos, servicios, cobros, IA, correos, tracking, indexación o automatizaciones habilitados.

## 2026-10-26 noche (America/Bogota; 27-10 UTC) — activación operativa Fase 13

Solicitud maestra de activación leída, incluido el cierre truncado después del punto M del informe; se conserva el objetivo completo explícito anterior. Base local/remota b5319e2ba2d7c8beb94adb4700468dabd2753e69, main limpia, origin oficial. Node 24.19.0/npm 11.9.0 y versiones fijadas Next 16.4.3/Prisma 7.10.1 sin cambios. Documentos requeridos, workflows, importador, bootstrap, SQL y guardas revisados. Skill cloud runtime/red consultada. Entorno running/current, sin bindings listos Neon/Render/host esperado, sin conector de proveedor disponible. No se extraen valores privados ni credenciales Git para otro destino.

Consulta API real `gh api .../actions/runs?branch=main&per_page=10`: salida 1, Forbidden; evidencia privada /tmp/atlas-phase13-activation-actions.log. Git HTTPS sí permite comprobar main. Lectura HTTPS normal de las páginas públicas originales de GitHub (no proxy alternativo, API tunelizada o bypass) devuelve 200 y metadatos de UI muestran:
- conexión Neon 40372875357, SUCCESS, commit 843710e53e16c440ff52e6386bb44ba1066529b0;
- migración Neon 40373255135, SUCCESS, mismo commit;
- CI 40402836767, SUCCESS en main, commit b5319e2ba2d7c8beb94adb4700468dabd2753e69 confirmado en la página individual.
El propietario proporciona el informe SQL remoto 16/16 migraciones, 55 tablas, 72 FK, dbStatus PASS, COMPLETE. No se vuelve a marcar pendiente ni se reejecuta esa migración. El HTML público no contiene el JSON SQL completo: se distinguen estado SUCCESS observado y métricas aportadas. Página del workflow catalog-import: sin runs; no se inventa ID, dry-run, plan o apply. No hay sesión de datos Neon o gestor de secretos autenticado, por tanto existencia real de rol/secreto/OWNER y totales de contenido no verificables; no se asume que falten. Health de Render continúa ACCESS_UNAVAILABLE desde el proxy normal, sin respuesta de la aplicación observable; no se atribuye un fallo a la aplicación ni se afirma SHA Live.

Defecto demostrado: has_table_privilege no detecta GRANT SELECT(email) ON User. Se añadió una prueba negativa en DB/rol generados por el helper aislado; produjo Missing expected rejection, con limpieza de la concesión en finally. Se corrigió scripts/catalog-privileges.ts con consultas parametrizadas, has_any_column_privilege para SELECT/INSERT/UPDATE/REFERENCES y allowlists de columnas especiales. No admite AuditLog.metadata ni _prisma_migrations.logs. Auditoría sigue INSERT + SELECT(id), historial sigue SELECT de cuatro columnas; no necesita más privilegios o edición de esquema. Los seis casos negativos pasan después, y la configuración mínima existente sigue válida. No hay GRANT/REVOKE sobre roles Neon/runtime; solo contra el rol aleatorio de test.

Pruebas finales de esta continuación:
- npm run catalog:validate: 65 herramientas, 30 guías, seis DRAFT, 20 categorías, 24 tags; sin repetir investigación o modificar sus hashes/textos.
- npm run check: schema/generación, lint cero warnings, TS estricto y 61/61 unitarias, salida 0. npm run build: salida 0.
- npm run test:db: 87/87 en DB temporal; test:catalog-import: 10/10, incluidos permisos por columna, atomicidad/idempotencia/conservación/publicación/relaciones/95 slugs/navegación móvil.
- node scripts/test-public-runtime.mjs con Chromium de sistema: 4/4, lectura pública/errores/readiness privado en DB/rol temporales sin seed.
- npm run test:e2e -- --workers=1 con Chromium de sistema: 108/108, sin retries, unos 3,4 minutos. Fixtures y cuentas únicamente en DB efímera, nunca Neon. Solo se repitió la prueba afectada al reproducir/corregir la guarda; las otras suites actuales no se vuelven a ejecutar por cambios documentales.
- actionlint 1.7.12 de CI/catalog-import y git diff --check correctos. Comparación contra b5319e2: biblioteca/evidencia/candidatos/rechazos, Prisma/schema/16 SQL/lockfile/runner iguales. .env.local intacto; sin creación de servicios, reinicio de PostgreSQL, semillas/migraciones staging o activación de agentes/correo/IA/pagos/tracking.

Actualizados solo documentos operativos/control necesarios: evidencia Neon/CI ya satisfactoria, historial de inicialización claramente separado, guarda corregida, instrucciones psql con contraseña oculta y comprobación condicional de OWNER. La elección de contraseña humana y la configuración privada no pueden sustituirse por una cuenta fixture o un endpoint bootstrap. Corrección y publicación normal autorizadas; el SHA final/CI posterior se verifican tras el push. No se declara completada la activación remota o importado el catálogo.


## 27-10-2026 — preparación de lanzamiento público, SEO y AdSense

Se inspeccionó main local/remota 4bbcfe9f198c2bef8c4e6182a4be356700253661, árbol inicialmente limpio, remoto oficial, Node 24.19.0/npm 11.9.0 y dependencias fijadas existentes. Skill cloud runtime/red y documentación relevante revisadas. Sin nueva instalación, otra aplicación/worktree o cambio de ORM/esquema/migraciones/lockfile. Política actual restringida, sin bindings Neon/Render/Google; permiso general de red concedido pero el proxy sigue impidiendo Render y ayuda Google. API GitHub real responde Forbidden. No se extraen credenciales de Git ni se elude el proxy. Web pública de GitHub sí permite observar CI base 40448939535 SUCCESS, conexión Neon 40372875357 SUCCESS, migraciones 40373255135 SUCCESS; propietario aporta 16/16, 55 tablas y 72 FK. No repetir migraciones staging. Workflow catálogo consultado: sin runs. No dry-run/apply ni escritura Neon, OWNER, secreto/rol configurado o despliegue Render observados. No asumir que esos recursos falten.

Implementación sobre módulos existentes: PUBLIC_LAUNCH_CONFIRMED y revisión legal válida como puertas SEO, verificación HTML GSC con token real suministrado por propietario, Organization/WebSite y breadcrumbs visibles/JSON-LD sin ratings/precios. AdSense apagado, publishers/slots validados, aprobación de sitio/ubicaciones y CMP certificada requeridas, script oficial deduplicado, preferencia local de retirada sin identificador y TCF estricto/DNT/GPC. No banner casero certificado ni asumir aceptación de analítica como publicidad. Auto Ads depende también de configuración/exclusiones en cuenta Google; modo manual no neutraliza un Auto Ads remoto encendido. Reserva manual de espacio, navegación de documento completo tras SDK y retirada con recarga. ads.txt solo con publisher/aprobaciones/publicación válidos. API de informes manual readonly/autorización fresca/CSRF, decimales exactos, dominio filtrado, estimación/fuente/calendario explícitos y auditoría; no nueva tabla o integración de estimaciones en dinero confirmado. Sin credencial UI no configurada y sin consultas.

Contrato Management API v2 contrastado con discovery oficial Google, HTTP200, SHA256 e9b26c609fc32f38e40895ed9dc172cf3a7470698c6304e368bd3b8398fd0a64. TCF API oficial IAB recuperada por HTTPS desde repositorio primario, SHA256 746134cbcc44001176b5ecf5aad1b5dba9e5c1d30ad8c6da6a2e3e1bcc36b192. No son pruebas con cuenta/CMP Google reales. Documentación oficial de precios/Free de Render y políticas de ayuda Google inaccesibles: no se afirman condiciones vigentes comprobadas; propuesta always-on con referencia histórica US$7/mes queda pendiente de cotización y autorización, sin compra. Comportamiento de robots en Free dormido requiere verificación, no se inventa respuesta del host.

Defecto real reproducido: fichas ausentes tools/use-cases/blog respondían HTTP200/noindex. notFound en metadata y desactivar streaming de metadata no resolvían el envío previo del estado loading; se retiró ese ajuste global innecesario. Corrección final: Proxy Node consulta solo identidad pública mediante servicio/singleton y visibilidad existentes, antes de headers; faltantes se reescriben a vista 404 existente con status404. Fallos PostgreSQL siguen lanzando diagnóstico sanitizado; no se convierten en ausencia. Streaming de válidos conservado y consulta adicional pendiente de medición en destino. Pruebas verifican 404 real/noindex de slugs y borrador, más los 95 slugs publicados del importador en DB aislada.

Pruebas locales:
- npm run check final: validación/generación Prisma, lint cero warnings, TypeScript estricto y **66/66 unitarias**. Lint/typecheck y build repetidos solo tras correcciones que afectaban sus resultados; build final salida0.
- npm run test:db: **87 regresiones existentes aprobadas** y tres casos nuevos. Primera tanda del nuevo caso revocación esperaba403, contrato existente correctamente devuelve401 para usuario inactivo; se corrigió el assert sin cambiar auth y se reejecutaron solo los **3/3 afectados**, todos aprobados. No fallos de integración pendientes; no se presenta la tanda inicial 89/90 como aprobada.
- catalog:validate: **65 tools,30 useCases,6 DRAFT,20 categorías,24 tags**; biblioteca/fuentes/hashes intactos, sin investigación repetida o publicación.
- test:catalog-import **10/10**, test-public-runtime **4/4**, bases/roles propios efímeros, lectura vacía/errors/readiness/95 slugs/relaciones/idempotencia/permisos y conservación sin modificar Neon.
- E2E completa **122 casos**, primera tanda final118 aprobados/cuatro fallos. Dos detectaban pérdida de marca en el título home introducida por el cambio: restaurado título explícito original, sin debilitar test. Dos eran del nuevo harness administrativo: fixture request usa contexto independiente de page, se cambió a page.request para compartir sesión, sin modificar autenticación. Tras build actualizado, se repitieron solo **4/4 afectados** en escritorio/móvil, todos aprobados. Los otros118 no se repitieron innecesariamente; no se afirma que la primera tanda completa fuese verde.
- Pruebas positivas nuevas de CMP/SDK: **6/6** focalizadas tras corregir SQL parametrizado del fixture (varchar/text) y su entrega/estado inmediato TCF al registrar listener. Navegadores interceptan TODAS las solicitudes; CMP y SDK son fixtures identificados, cero anuncios/clics/impresiones Google reales. Cobertura de consentimiento/retirada, carga única, Auto/manual, espacio móvil/axe, documentos nuevos, DNT/GPC y exclusión sensible; el runner normal fuerza flags apagados.
- actionlint oficial1.7.12 de todos los workflows y git diff --check aprobados. Revisión de secretos: cero bindings privados en archivos versionables; coincidencias DSN solo ejemplos/fixtures/CI efímera conocidos. Integridad: 20 archivos protegidos idénticos, incluidos16 SQL, schema, lockfile y .env.local; diff de data/catalog/package.json/Prisma vacío.

Documentación actualizada: procedimiento único PUBLIC_LAUNCH.md, calendario editorial propuesto (no publicaciones), README/arquitectura/planes/especificación/progreso/checklist/editorial/crecimiento/producción y variables de ejemplo. Legales siguen borradores pendientes; LEGAL_REVIEW_CONFIRMED no se activa. Cinco agentes/schedules, correo, pagos, IA, tracking/indexación y servicios siguen sin activación por esta ejecución. SHA/CI posteriores a push se informan con evidencia real aparte para evitar un commit artificial autorreferente.

Auditoría adicional de dependencias runtime: `npm audit --omit=dev --json` salida0, cero vulnerabilidades reportadas en esta consulta. No certifica ausencia de vulnerabilidades ni cambia el aviso histórico de ESLint dev/EOL.

## 27-10-2026 — incidente real y bootstrap restringido del catálogo

Checkout/remote main 1fe6f9afbe61a571322ba9a203887340f6fe4741, limpio al comenzar, Node24.19.0/npm11.9.0. Lectura pública de Actions: CI40566049699 SUCCESS y catálogo40570443429/40570577609 FAILURE. El propietario aporta el error exacto STAGING_CONFIGURATION_MISSING, secciones Actions vacías y ejecución SQL satisfactoria de creación de atlas_staging_catalog NOLOGIN. No volver a crear el rol o migrar: el error ocurre antes de conectar. GET autenticado a la ejecución40570577609 vuelve a fallar Forbidden. Render health no accesible desde este proxy, sin respuesta HTTP de la aplicación observable; no se atribuye un fallo a Render o PostgreSQL. Sin bindings/gestor autenticado para configurar secrets o sesión Neon. No se generan credenciales reales que no puedan custodiarse.

Nuevo workflow manual neon-catalog-bootstrap.yml: contents:read, oficial/main/SHA/confirmación exactos, puerta temporal NEON_CATALOG_BOOTSTRAP_ENABLED y concurrencia neon-staging-database. Reutiliza MIGRATION_DATABASE_URL exclusivamente como operador y CATALOG_DATABASE_URL como credencial ya custodiada en privado. No cambia runtime/migrador; no crea roles/concesiones/tablas/funciones, no migra ni escribe contenido. Preflight comprueba PG17/TLS/historial/checksums/esquema/rol y permisos efectivos por el helper existente ahora parametrizable. Inicializa solo NOLOGIN con SCRAM; una cuenta LOGIN se comprueba sin rotación. Exige privilegios de ALTER ROLE y protección de parámetros/consultas/errores local a la transacción; rechaza auditoría activa o incapacidad de proteger el verificador, sin ampliar permisos. Solo booleans/estados/códigos de lista cerrada; sin secretos en inputs, archivos, logs o artefactos. Commit incierto se señala con credentialCommitted=null y no provoca rotación automática. Tras éxito el propietario debe cerrar la puerta temporal; este executor no puede deshabilitar el workflow por API.

Verificación local, nunca Neon:
- npm run check: esquema/generación, lint cero warnings, TypeScript y 71/71 unitarias. Un fixture nuevo necesitó declarar NODE_ENV para el tipo Next ProcessEnv; corregido, tanda final aprobada.
- npm run build y catalog:validate: salida0; 65 tools,30 useCases,6 DRAFT,20 categorías,24 etiquetas.
- node scripts/test-catalog-bootstrap.mjs: siete comprobaciones reales en DB/rol efímeros, incluidas autenticación SCRAM, rollback, mínimos privilegios, operador insuficiente, auditoría no desactivada, rechazo sin permisos de logging y conservación de contraseña LOGIN. Registrado también en CI. Las migraciones del helper se ejecutan únicamente en su DB aleatoria local.
- test:catalog-import: primera tanda9/10 por ausencia del Chromium descargado de Playwright; no fallo de consultas/importación. Reejecución con PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium según README:10/10, incluidos todos los slugs y navegación móvil/escritorio. No se repiten suites generales de E2E/pagos/IA sin cambios de aplicación.
- actionlint1.7.12 oficial, descarga comprobada con checksums publicados, valida todos los workflows; git diff --check aprobado. Revisión de diff/archivos nuevos sin secretos reales detectados. Los32 archivos protegidos versionados de Prisma/16 migraciones/manifiestos de catálogo/package/lockfile coinciden con la base; .env.local no modificado.

PROGRESS y CATALOG_OPERATIONS reflejan el incidente y cinco pasos privados, sin declarar ejecución Neon o despliegue. No dry-run exitoso, apply, conteos SQL, OWNER o SHA Live nuevos observados. Agentes/automatizaciones, IA, correo, Wompi, analítica, AdSense/indexación y servicios permanecen sin activación. Commit/push normal autorizados por el propietario; SHA/CI posteriores se informan tras su comprobación, sin commit documental artificial autorreferente.

## 28-10-2026 — restricciones Neon y corrección del diagnóstico de bootstrap

Base local/remota d4641f210a84643ede4a6bd74b116792ca0197b7 limpia. El propietario aporta JSON exacto de run40585973261: tres configuraciones presentes y fallo BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE en inicialización, credentialCommitted=false. Páginas públicas confirman FAILURE. Según la secuencia del código de ese SHA, conexión/TLS/identidad del operador, PG17, historial16/checksums/esquema, mínimos privilegios y autorización ALTER ROLE habían pasado antes del rechazo. No se vuelve a diagnosticar ausencia de Secrets, migraciones o rol. No se verificó autenticación como catálogo. GET API autenticado al run actual sigue Forbidden; no hay binding de datos Neon para una nueva sesión SQL directa.

Hallazgos verificados en fuentes primarias recuperadas por HTTPS/TLS mediante el proxy autorizado:
- Neon manage/roles: neon_superuser no es superusuario PostgreSQL; contraseñas suministradas por SQL deben ser texto plano, hashes no soportados. SHA25631d8aae5fad9f037050b8400025bf08c67e731d8bc19ffb6124a1020c5571a1f.
- Neon reference/compatibility: parámetros configurables con contexto user; log_min_error_statement=panic documentado como valor de servicio. SHA25685b62560bff7b6f961657d76a0549808abcf580237328bc1e01e7df4e0db6f22.
- PostgreSQL REL_17_STABLE guc_tables.c: log_statement y otros controles del bootstrap son PGC_SUSET. SHA2562cfae3aedd719b7acbbb43c203172ca9fce098fa11a53c63045cf17724886d2b. CREATEROLE/ADMIN no implica SET sobre parámetros.
- SDK oficial @neondatabase/api-client2.7.3 descargado solo como referencia en /tmp, no instalado en el proyecto: spec pública incluye reset_password, sin una inicialización separada documentada para el rol existente sin password. SHA256dacf72ea2d63110b3694c705313e0b2104e9652ae1be3fc01ceebe7b17059c44. No se intenta otro reset, token nuevo, API alternativa o recreación. Console ya rechazó ese caso, según evidencia del propietario. PostgreSQL documenta que psql password cifra antes de enviar ALTER ROLE; eso no garantiza ausencia de verificadores y no resuelve el contrato Neon de texto plano.

Defecto del bootstrap anterior: pruebas locales con superusuario no demostraban compatibilidad con Neon. El catch genérico perdía el control rechazado y el método SCRAM no era un protocolo Neon soportado. No se considera seguro quitar controles ni enviar plaintext como sustitución sin garantías administrativas del proveedor. El parámetro exacto remoto todavía no puede recuperarse del JSON antiguo; no se convierte una reproducción local en evidencia de configuración Neon.

Corrección: inspección SELECT de parámetros con lista fija, contexto/SET efectivo/boolean de valor protector (null si no observable), sin valores de configuración, host, URL o material de autenticación. La ruta remota usa BEGIN READ ONLY: si NOLOGIN, informa originalFirstBlocker y se detiene antes de vincular cualquier contraseña/verificador o ejecutar ALTER ROLE; incluso con permisos de logging disponibles rechaza la inicialización Neon no soportada. LOGIN previamente inicializado solo se verifica con TLS/historial/privilegios, sin rotar. Helper SCRAM restringido a loopback para tests PostgreSQL, rechazando Neon y otros hosts antes de consultar. Mismo workflow manual/guardas/concurrencia/permisos, sin nuevos secretos o eventos. Título/paso actualizados para expresar inspección/verificación, no prometer inicialización. Método administrativo SQL oficial y riesgos explicados en CATALOG_OPERATIONS; escritura detenida, requiere procedimiento privado confirmado por Neon o aprobación explícita de una excepción de riesgo que no se da por concedida.

Validación: npm run check salida0 (Prisma, lint, TypeScript,75/75 unitarias); repetidas solo las9/9 del bootstrap tras acotar el helper a loopback. test-catalog-bootstrap:8/8 comprobaciones PostgreSQL reales en DB/roles aleatorios locales. Nuevo operador CREATEROLE+ADMIN sin superusuario reproduce SET log_statement →42501 aun con valor protector, y conserva NOLOGIN/passwordNULL; informe disponible dentro de BEGIN READ ONLY. Se mantiene rechazo de auditoría, falta de permisos, rollback, autenticación SCRAM aislada y no rotación de LOGIN. No pruebas destructivas sobre Neon, nuevas migraciones, credenciales reales, grants de producción, modificación de auditoría global, servicios o despliegues. Las suites completas de aplicación quedan a cargo de la CI del push autorizado, sin repetición local innecesaria.

## 28-10-2026 — SEO, descubrimiento, rendimiento y medición protegida

Base main local/remota **5af53c41e29dbe387a9675e6da749379819623b9**, checkout limpio al iniciar. Estado operativo actualizado con nueva evidencia: [apply 40714352948](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40714352948) SUCCESS observado en GitHub público sobre esa base. El propietario confirma **101 registros creados**, 65 herramientas/30 guías/seis DRAFT y sitio mostrando contenido. Las 16 migraciones, 55 tablas/72 FK ya confirmadas no se vuelven a ejecutar. No hubo nueva sesión SQL Neon, bootstrap, importación remota o cambio de roles/credenciales. Los bloqueos de importación anteriores son históricos.

Cambios: hubs de las categorías existentes, About/metodología, herramientas relacionadas y artículos realmente publicados, metadatos/canonicals de paginación, filtros/vacíos noindex, sitemap sin drafts/índices vacíos y CollectionPage/ItemList fiel al contenido visible. Las tarjetas usan DTOs ligeros y menos prefetch; los datos nunca se sustituyen por JSON estático o errores convertidos en vacíos. Metadatos/página comparten lectura solo dentro de la petición. Informes administrativos GA4 por seis dimensiones, host exacto y filtros de privacidad; AdSense con métricas oficiales adicionales y sin sumar estimaciones a pagos. Analítica apagada informa ese estado sin pedir aceptación innecesaria y conserva retirada de consentimiento anterior.

### Comandos y resultados locales

- `npm run check`: validación Prisma, lint sin warnings, generación Next/Prisma, TypeScript y **80 unitarias PASS** sobre código final. No se añadieron dependencias al proyecto.
- `npm run build`: producción PASS; nuevas rutas dinámicas de categorías/About. Build no migra, siembra o inicializa administradores.
- `npm run test:db`: **91 PASS**, PostgreSQL real efímero. Incluye CRUD/autorización, CMS, pagos/webhooks, agentes simulados, reportes manuales Google, host/rutas privadas y auditoría. Ninguna llamada Google/OpenAI/Resend/Wompi real.
- `node scripts/test-public-runtime.mjs`: **4 PASS**, rol runtime temporal de solo lectura, catálogo vacío normal, fallo de join sanitizado y readiness privado. No se confunde salud del proceso con catálogo operativo.
- `npm run test:catalog-import`: **10 PASS**, DB/roles temporales; idempotencia, conservación, slugs de las 65 herramientas/30 guías por HTTP y seis DRAFT con **404 estricto**. No importación o escritura en Neon.
- `node scripts/test-seo-catalog.mjs`: **5 PASS** (incluye subpruebas), PostgreSQL/browser propios. Categorías reales en 390/1440 px, navegación y axe sin violaciones, paginación/canonical, filtros/vacíos noindex, JSON-LD, categorías ocultas/ausentes 404, sitemap sin los seis DRAFT ni blog vacío y privacidad apagada/retirada sin eventos o sesiones. La configuración legal/indexable positiva existe únicamente en el fixture aislado.
- `npm run test:e2e -- --workers=1`: se ejecutó la suite completa de **122 casos**; 120 pasaron y dos conservaron el texto anterior del CTA/H1. Tras actualizar la comprobación a la navegación/título nuevos, el rerun dirigido de ambos dispositivos pasó **2/2**. No se oculta la primera ejecución ni se afirma una segunda suite completa local. Tras el ajuste de privacidad, `tests/e2e/growth.spec.ts` pasó **8/8**. Los transportes publicitarios de pruebas están interceptados; cero impresiones/clics publicitarios reales.
- `npm run catalog:validate`: **PASS**, 65/30/seis DRAFT/20/24. Biblioteca, fuentes y hashes existentes se conservan.
- `actionlint .github/workflows/*.yml`: **PASS**, incluido nuevo paso SEO aislado en CI. No se modifican workflows operativos secretos o sus eventos manuales.
- `npm audit --omit=dev --json`: **0 vulnerabilidades de dependencias de producción** reportadas por el registro. No equivale a auditoría jurídica, de proveedores o ausencia de todo riesgo.
- Los 65 enlaces oficiales: **HEAD 200**, solo disponibilidad, sin instalación/ensayo/benchmark de herramientas. No se cambia automáticamente ninguna fecha de verificación editorial o registro importado.

Los fallos iniciales del nuevo runner SEO fueron de sincronización de streaming y uso del contexto Playwright requerido por axe; corregidos con espera explícita de elementos y `browser.newContext`, sin relajar assertions, permisos o accesibilidad. El primer render con metadata dependiente de DB produjo una regresión LCP local (mediana ~2,56 s home/~2,45 s tools); se detectó antes de publicar y se corrigió separando introducción/encabezados del contenido asíncrono mediante Suspense. Las consultas siguen propagando sus errores. La medición final se repitió después de ese cambio y del ajuste de privacidad.

### Comparación de rendimiento reproducible, laboratorio aislado

Node 24.19.0, Next 16.4.3, Chromium del sistema, Lighthouse **13.6.0**, mismo equipo y catálogo de prueba de 65 herramientas/30 guías; sin anuncios/tracking/proveedores externos. Tres ejecuciones móviles por ruta antes y después, sin suites pesadas en paralelo. Baseline tomada con el build anterior antes de modificar la aplicación; resultados finales con build actualizado. Los perfiles y JSON Lighthouse permanecen en `.cache/seo-profile` ignorada; solo métricas no sensibles se conservan aquí.

| Medida | Antes | Después | Alcance |
| --- | --- | --- | --- |
| JSON de DTO de seis herramientas | 5313 bytes | 2814 bytes | Reducción del 47,0 % en campos seleccionados/serializados, no tamaño HTTP comprimido. |
| JSON de DTO de seis guías | 9490 bytes | 3178 bytes | Reducción del 66,5 %; descripciones/instrucciones completas se conservan en detalle. |
| Requests Next prefetch al recorrer portada | 42 móvil / 46 escritorio | 26 / 26 | Mismo recorrido a 390/1440 px; requests observados, no conteo de SQL o visitantes. |
| LCP /, mediana (rango) | 910.43 ms (905.19–914.08) | 906.09 ms (902.86–906.18) | Tres muestras de laboratorio, no p75 de campo. |
| TBT /, mediana | 35.0 ms | 14.5 ms | TBT no es INP. |
| LCP /tools, mediana (rango) | 908.31 ms (906.01–2408.97) | 910.60 ms (905.49–911.94) | Tres muestras de laboratorio, no p75 de campo. |
| TBT /tools, mediana | 36.5 ms | 33.0 ms | TBT no es INP. |
| CLS / y /tools | 0 en las seis muestras | 0 en las seis muestras | Sin creatividades externas; no garantiza estabilidad de anuncios futuros. |

Lighthouse rendimiento final 1,00 en las seis muestras; baseline home 1,00 y tools 0,98–1,00. Las diferencias de pocos milisegundos y el outlier previo de tools no prueban una mejora estadística o una experiencia equivalente en Render Free. **No se midió INP ni CWV de campo/p75**, red real, latencia Neon o arranques en frío. No se declara cumplimiento de esos objetivos o ranking/ingreso/aprobación publicitaria.

Reproducción opcional, solo con TEST_DATABASE_URL local dedicado `_test` y build actual: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium ATLAS_LIGHTHOUSE_CLI=/ruta/local/a/lighthouse/cli/index.js node scripts/profile-catalog.mjs after`. Lighthouse se instaló para QA fuera del proyecto, en `/tmp`; no cambia manifiestos/lockfile. El script rechaza hosts remotos, crea una DB efímera mediante el runner existente y no acepta una URL pública que pueda generar tráfico o anuncios reales. `before` es una etiqueta para una medición del código de referencia, no recupera versiones automáticamente.

### Conservación, estrategia y límites remotos

Esquema/16 migraciones/biblioteca/manifest/lockfile idénticos a la base (`git diff --exit-code` sobre esas rutas); `.env.local` no editado y permanece ignorado. Revisión de patrones y diff sin secretos reales: coincidencia de URL en `.env.example` revisada como placeholder explícito, no una credencial. Sin cambios de contraseñas, servicios, flags de activación, datos humanos, publicaciones DRAFT, anuncios o presupuesto. El control legal/publicación/indexación y CMP existente se conserva.

Investigación cualitativa con recursos oficiales recuperados y brechas de la biblioteca, sin herramientas SEO autenticadas/volúmenes/dificultad inventados. Estrategia y revisión de los seis DRAFT en docs/SEO_STRATEGY.md, calendario de ocho semanas en docs/EDITORIAL_CALENDAR.md. PSL incluye onrender.com y contrato oficial AdSense contempla dominio/subdominio: no prueba elegibilidad del sitio. La ayuda Google/Render y el sitio Render no fueron accesibles por la política de red; requiere contraste del propietario, no se interpreta como caída. La confirmación del propietario del catálogo operativo se conserva y no se vuelve a presentar como pendiente.

Publicación de esta entrega: commit/push normal autorizados, sin force push; SHA/CI nuevos se verifican después de publicar y se informan en la entrega. Ningún éxito anterior se atribuye al nuevo código. El SHA Live y comportamiento público del nuevo despliegue deben contrastarse en Render; no se observó un deploy desde este cloud. No se activan SEO/Google/AdSense, legales, IA, agentes, pagos, email o servicios de pago.

## 29-10-2026 — Blueprint Engine, entrega 1 backend

Base local/remota comprobada 9a824bf833712a3ab44fac12e7c7289f96d9aa07, árbol inicialmente limpio; CI de referencia 40733346624 aprobada. Inspeccionados UseCase/relaciones, control editorial, auth, analítica, SiteSetting/AuditLog, docs de Route Handlers Next 16 y control de red cloud. Sin conectores privados/credenciales remotas disponibles y sin necesidad de ellos para este backend.

Implementación: contrato Zod estricto; SiteSetting por versión + auditoría atómica; save/verify/publish/withdraw con autorización fresca, Origin/CSRF, revisión optimista y versiones selladas. Asociación por slug y revisión vigente de guía. Archivos privados por hash, límites de bytes/formato/secretos/rutas/permisos, sin enlaces o blobs públicos. GET anónimo gratuito revalida aprobación y guía, entrega bytes exactos con attachment/digest/no-store/noindex/nosniff; errores sanitizados y ocho lecturas simultáneas por proceso. Sin archivos reales, componentes, uploads, nuevas herramientas, migraciones o cambios en el contenido importado.

Resultados locales reales:

- `npm run check`: Prisma validate, ESLint sin warnings, TypeScript/Next y **82 unitarias PASS** (dos nuevas sobre manifiestos y estados).
- `npm run build`: **PASS**, rutas API Node dinámicas. Build no migra o publica releases.
- `node scripts/test-blueprints.mjs`: **9 PASS**, incluye subpruebas. PostgreSQL y archivos privados temporales propios; transición/roles, bytes JSON/Markdown exactos, metadata sin rutas/identidad privada, guía DRAFT/demo/futura/editada, SHA/credenciales/estructura/HTML/permisos/symlinks/hardlinks, inmutabilidad/concurrencia/retirada, medición consentida sin eventos, admisión 429, GET HTTP 200, HEAD 405, APIs privadas 401/CSRF 403 y retiro autorizado →404. No SQL contra Neon.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`: **122/122 PASS**, desktop/móvil, catálogo/CMS/auth/SEO/privacidad/comercial y módulos anteriores preservados.
- CI añade `node scripts/test-blueprints.mjs` después del build; resultado remoto se verifica para el nuevo SHA y se informa en la entrega. Ningún éxito previo se atribuye al código nuevo.

Correcciones durante QA: el primer fixture HTTP enviaba Origin de un puerto distinto de la configuración (403 correcto); helper de tests fija ADMIN_ORIGIN al servidor aleatorio salvo override explícito, conservando CSRF. El fixture de sesión caducada intentó expiresAt<startedAt y fue rechazado por el CHECK existente: corregidas fechas del fixture sin tocar SQL. Una tanda coincidió con reconstrucción de .next y su servidor temporal no arrancó; se repitió después del build secuencial. La tanda final nueva pasa sin omitir controles.

Medición: detectado CHECK AnalyticsEvent que no admite descargas. Se prepara descriptor BLUEPRINT_DOWNLOAD_REQUEST, contexto consentido/sesión vigente, DNT/GPC/origen y clave de deduplicación; no se habilita observer en la ruta real ni se escriben eventos falsos, contadores o auditoría por GET. Se requiere autorización futura para persistir ese tipo, con límites/retención/retirada. No estadísticas de descargas o finalizaciones ficticias.

Almacenamiento: .private/ ignorado o raíz privada absoluta; POSIX y objetos revisados, sin proveedor o disco contratado. Store efímero local de pruebas no demuestra durabilidad en Render Free. Riesgos y contrato de la próxima UI en docs/BLUEPRINT_ENGINE.md. No se afirma detección infalible de secretos arbitrarios/ofuscados, seguridad frente a operador privilegiado, importación oficial n8n/Make o descargas remotas: son verificaciones independientes.

Conservación: esquema, 16 migraciones, data/catalog, package.json y lockfile se comparan con la base; .env.local no editado, sin cambios de roles/credenciales, revisión legal/SEO/AdSense o flags comerciales. Solo fuente/tests/documentación; no workflow completo o archivo descargable publicado en GitHub. Commit/push normales, sin force, se realizan tras revisión del diff y pruebas; SHA/CI finales se informan sin crear un commit artificial para su propio hash.

Cierre del contrato de entrega 1: añadida consulta de servidor por slug de guía y cursor público para que la UI futura no lea registros privados. Prueba real de 22 releases fixture a través de las transiciones autorizadas, paginadas 20+2, sin duplicados, sin drafts y con guías no públicas excluidas. Estos registros/objetos son desechables, exclusivamente en DB local `_test`; no se crean en Neon. El cambio requiere una nueva CI específica del SHA final; no se atribuye la CI del primer commit a esta ampliación.

CI intermedia: 40904626211 SUCCESS para 8d35f5c; 40906556625 FAILURE para 448f67c, en el paso SEO previo al runner nuevo. El log de ese paso requiere acceso no disponible (URL web 404); no se afirma un error de blueprints o de Neon. El runner SEO original pasó localmente también con CPU Chromium limitada 4x y navegación adelantada; no se reprodujo la causa remota exacta. Se sustituyen observaciones instantáneas de metadata/H1 por asserts web-first que esperan el mismo valor esperado, sin modificar la aplicación, robots o controles legales/SEO. Se añade diagnóstico de fallo en anotaciones CI con solo archivo fijo/línea numérica, sin valores o mensajes privados. Suite SEO corregida: 5/5 PASS local, check 82/82; las sondas de ralentización se retiraron. El siguiente resultado remoto se valida de nuevo para su SHA final.

Corrección de seguridad comprobada: una sonda sintética mostró que una URL autenticada escrita con escapes Unicode de JSON no era rechazada por el filtro previo al parseo. Se aplica el mismo filtro también a cada cadena JSON decodificada. La regresión usa JSON genérico válido para que no pueda pasar por un rechazo de estructura n8n ajeno al secreto. Prueba HTTP adicional: guardar el manifiesto del fixture es posible como DRAFT; verify rechaza el archivo, revierte la transacción y la descarga permanece 404. No contiene credenciales reales ni workflows completos. Nuevo build y runner de blueprints 9/9 PASS; solo un SHA con esta corrección y su CI final se considera entregado.
