# P0 — consultas de directorios, 03-11-2026

Base569b00e. Evidencia externa aportada: catalog.use-cases/P2028/TRANSACTION_START_TIMEOUT16:17:43UTC, /use-cases?q=presentation HTTP200 con error. No observación independiente Render/Neon en este executor. No se afirma que569b00e fuera el SHA Live de ese incidente sin una comprobación externa.

## Mecanismo y estrategias

Prisma7.10.1/adapter-pg usa inicio2s y expiración lógica5s en sus batches; pg permite adquirir conexión durante5s. Reproducción RED real: cinco conexiones ocupadas, liberación2600ms, queryTools con búsqueda falla~2063ms con P2028/TRANSACTION_START_TIMEOUT. No equivale a ETIMEDOUT de red. Ambos directorios tenían el mismo batch RepeatableRead. Metadata y render comparten resultado mediante React.cache; búsquedas no usan caché persistida; por ello siguen expuestas al batch. Proxy solo comprueba slugs de detalle, no la URL de búsqueda del incidente.

| Estrategia | SQL, microbenchmark vacío local | Tiempo observado | Consistencia |
| --- | --- | --- | --- |
| Batch anterior RepeatableRead |3eventosPrisma|24ms|Snapshot transaccional; adquisiciónPrisma2s. |
| A secuencial findMany/count |2|5ms|Dos snapshots; una publicación/revocación intermedia puede cambiar el total. |
| B Promise.all |2|12ms|Dos snapshots; puede solicitar dos conexiones por visitante. |
| C sentencia parametrizada |1|3ms|Filas, relaciones y conteo comparten snapshot de sentencia. |

Eventos query de Prisma, no captura de todos los comandos de control o paquetes del driver. Muestras únicas, loopback, sin contenido: no percentiles, benchmark de gran volumen o predicción Render. Elegida C por una sola adquisición y consistencia, no por prometer3ms. SQL común cerrado para Tool/UseCase, filtros parametrizados, EXISTS de taxonomía evita duplicar resultados, selección de tarjetas únicamente, página6 y orden estable con id. CTE cuenta todo lo elegible y agrega solo la página; página fuera de rango sigue devolviendo total real con items vacío. El motor usa snapshot de una sentencia incluso bajo READ COMMITTED: no se degrada filas/conteo a dos lecturas independientes al quitar RepeatableRead en estas dos funciones. Home mantiene su transacción; facetas y caché no cambian.

GREEN con5conexiones retenidas2600ms: tools2607ms y use-cases2605ms, una sentencia cada uno. Cinco segundos de conexión existentes intactos; no retries ni parámetros nuevos. Se retiran los plazos lógicos de transacción Prisma para estas lecturas; ni antes ni después hay garantía de cancelación SQL bloqueado. ETIMEDOUT sigue siendo un fallo posible y su relación física con el incidente remoto NO DETERMINADA.

| Solicitudes concurrentes locales | ms del grupo | SQL | Máximo conexiones ocupadas muestreado | Pendientes máximas |
| --- | --- | --- | --- | --- |
|1|5|1|1|0|
|5|18|5|5|0|
|10|10|10|5|5|
|20|21|20|5|15|

Cero errores en estas muestras; polling1ms, no captura garantizada de picos inferiores. Tiempo de grupo incluye adquisición/ejecución; no se inventa una separación de latencia de red/SQL/compute que no fue instrumentada. Espera controlada2600ms y cola pg5000ms se distinguen de ejecución SQL mediante experimentos existentes. No se hizo carga en Render. No se implementan retries: no necesarios para resolver la regresión y podrían multiplicar demanda/latencia; no se afirma haber medido un beneficio inexistente.

## Seguridad, regresiones y límites

Casos publicados con relaciones reales comparan búsquedas vacías/fixture/cadena adversarial, categoría/etiqueta/dificultad, tres órdenes y páginas1/2/999. Integración y E2E existentes cubren páginas con múltiples registros, DRAFT/demo/futuro, revocación y caché invalidada por revisión PostgreSQL. Permisos mínimos y falta de grants fallan sanitizados; no sustitución por vacío. Se añade interrupción real del backend de una consulta de directorio bloqueada y recuperación posterior sin retry automático. Entrada adversarial es parámetro, identificadores son solo constantes privadas.

Streaming: Suspense/loading puede comprometer headers200 antes de que catálogo/metadata termine. generateMetadata utiliza los mismos lectores deduplicados; puede fallar después de iniciado el stream. No atribuir todo a error.tsx ni agregar otro Suspense. La regresión HTTP/navegador detecta explícitamente200conerror como catalogUsable:false. Health sigue liveness, readiness permanece privado. No skeleton permanente ni cambios SEO globales.

No cache nuevo, dependencias, cambios de Prisma/migraciones, Blueprint, roles, datos/envs/servicios remotos o deploy. Riesgos: SQL ahora expresa proyección/filtros que deben actualizarse junto al contrato de tarjetas; casts enum a texto pueden afectar planes de índices con mayor volumen. CTE solo materializa columnas de tarjeta/orden, no instrucciones/descripciones privadas. Totales requieren recorrer coincidencias; sin garantía de latencia constante. Infraestructura y home todavía pueden fallar. Se requiere CI propia y autorización de SHA para deploy manual; no reparación productiva certificada.

Logs locales /tmp/p0-directories-red.log y /tmp/p0-directory-{check-final,db,build-final,runtime-final2,seo,e2e}.log. Resultados finales y CI se registran al cerrar. No ejecutar esta prueba sobre Neon.


Validación local final: check96 (lint/TS/Prisma/unitarias), PostgreSQL99, build, runtime16, SEO6 y E2E126/126 PASS. Runtime verifica /tools y /use-cases?q=presentation con error visible y HTTP200/500/503 como fallo funcional; no catálogo vacío ficticio. Revisión independiente sin bloqueos; materialización reducida a columnas de tarjeta y riesgo de casts enum documentado. Sin cambios en schema/16migraciones/deps/Blueprint/envs/Neon/Render. CI propia se verifica tras push, no reutilizar CI base. Despliegue y validación productiva pendientes de autorización.
