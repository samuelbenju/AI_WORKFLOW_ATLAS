# Diagnóstico seguro del catálogo en Render

> P0: el propietario confirmó una nueva incidencia catalog.home/P2028 el 02-11-2026 19:11:46 America/Bogota. La investigación y los experimentos están al final de este documento; la causa productiva sigue NO DETERMINADA. Los apartados del 26-10 conservan el historial. Las migraciones/importación ya confirmadas no se repiten y este executor no tiene acceso a Render/Neon.

26-10-2026 (America/Bogota). Incidente comunicado por el propietario: Render Live, Neon atlas_staging con 16 migraciones/55 tablas y rol runtime atlas_staging_app; portada muestra error genérico. Esta información remota procede del propietario, no de acceso a sus secretos/logs.

## Qué está demostrado y qué falta

Las consultas originales de homeCatalog, queryTools, queryWorkflows y facets funcionan en una DB efímera recién migrada, **vacía y sin seeds**, primero con owner y después con rol temporal NOSUPERUSER/NOCREATEDB/NOCREATEROLE, solo SELECT, sin CREATE, con default_transaction_read_only=on y sin acceso al historial Prisma. La build de producción sirve /, /tools y /use-cases con sus estados vacíos normales. No se sustituyó una consulta por arrays o datos de muestra.

Al retirar SELECT sobre la unión implícita _CategoryToTool en esa DB aislada, se reproduce un fallo real 42501 pese a que SELECT 1 sigue funcionando. Esto demuestra que una falta de permisos puede producir el síntoma y que un healthcheck de conexión no basta; **no demuestra que ésa sea la causa de Render**. No se modifican grants, roles, tablas, migraciones o datos de Neon desde esta ejecución.

Defecto de observabilidad demostrado: readCatalog descartaba todos los códigos técnicos y la inicialización por parámetro por defecto ocurría fuera de su catch. Ahora registra solo etapa fija y códigos permitidos, preserva el error público y nunca devuelve datos vacíos tras un fallo. Se capturan también errores de pool/conexión por callbacks oficiales PrismaPg. No se alteran TLS, pool, timeout, aislamiento SQL u ORM sin una evidencia que los señale.

La prueba HTTP al dominio público desde este entorno no pudo conectar y no hay conector/credenciales de logs o variables Render. No se ha verificado el comportamiento de la versión desplegada y **el incidente no se declara resuelto**. Hace falta observar el nuevo JSON seguro en Render o consultar el readiness privado tras confirmar el SHA desplegado.

## Logs temporales

Los errores del catálogo producen JSON con exactamente dos campos: stage y codes. Ejemplo de formato (42501 reproducido localmente, no observado en Render):

```json
{"stage":"catalog.home","codes":["42501"]}
```

Puede aparecer además un código Prisma, por ejemplo P2010. No se registra error.message, stack original, cause original, SQL/parámetros, tabla, hostname, URL, usuario, contraseña, token o correo. Se recorren solo envoltorios conocidos, con límites de profundidad/anchura, y se aceptan códigos de listas cerradas. Las excepciones nuevas no guardan el error original como cause. Mantener DEBUG/verbosidad de Prisma o pg desactivados: esas bibliotecas pueden tener sus propios logs fuera de esta política.

DATABASE_DIAGNOSTICS_ENABLED es true por defecto para errores de este diagnóstico; configurar false después de identificar/corregir el problema silencia esos JSON, **sin suprimir excepciones, fallos públicos o resultados privados de readiness**. No hay logs de consultas correctas ni cuerpos de requests.

## Verificar después de un despliegue autorizado; Auto-Deploy permanece Off

1. En Render, confirmar que el deployment Live corresponde al SHA publicado en la entrega. No basta un build exitoso o /api/health=200: ese endpoint solo es liveness.
2. Mantener DATABASE_URL del usuario runtime, nunca del owner; CATALOG_DEMO_MODE=false, todas las integraciones/automatizaciones deshabilitadas y presupuesto IA cero. No volver a aplicar migraciones/seed.
3. Abrir /, /tools y /use-cases. En catálogo vacío deben aparecer respectivamente “The toolkit is taking shape.”, “No tools match just yet.” y “No workflows match just yet.”, sin la pantalla de indisponibilidad.
4. Si falla, revisar en logs de Render únicamente el JSON stage/codes. Compartir solo ese JSON para continuar; no copiar URLs, variables, usuario, queries o mensajes completos del proveedor.
5. Alternativa privada: GET /api/internal/readiness?catalog=1 con Authorization: Bearer del OPS_MONITOR_TOKEN configurado privadamente. Sin token válido responde 401 antes de consultar DB. No añadir un endpoint público o poner el token en la URL.

La sonda profunda es opt-in: ejecuta SELECT 1, las consultas reales de home/directorios/facets con el mismo runtime y las comprobaciones anteriores de alertas. Devuelve catalogVerified:true si completan (200 cuando no hay alertas), o 503 con diagnostic.stage/codes sanitizados. Un 503 READINESS_TIMEOUT significa que se agotó el límite de respuesta (12 s de la sonda profunda, 4 s normal), no prueba una contraseña o DB incorrecta. Los timeouts de pg se conservan; consultas ya iniciadas pueden terminar después del límite HTTP. El resultado no certifica todos los módulos comerciales o proveedores.

Desde un entorno operativo privado con el token en su entorno, sin imprimirlo:

```bash
node --input-type=module <<'NODE'
try {
  const token = process.env.OPS_MONITOR_TOKEN;
  if (!token) throw Error();
  const r = await fetch('https://ai-workflow-atlas.onrender.com/api/internal/readiness?catalog=1', {
    headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)
  });
  const body = await r.json();
  console.log(JSON.stringify({status:r.status, ok:body.ok, catalogVerified:body.catalogVerified, diagnostic:body.diagnostic}));
} catch { console.error('No se pudo completar el diagnóstico privado. No se imprimieron credenciales.'); }
NODE
```

## Interpretación y acciones específicas

| Código permitido | Comprobar privadamente; no cambiar a ciegas |
| --- | --- |
| DATABASE_URL_INVALID | Variable runtime ausente/malformada o con comillas/espacios indebidos. Validar en gestor Render, nunca pegarla en chat. |
| 28P01 / P1000 | Autenticación, contraseña/rol o endpoint incorrecto; no sustituir por owner. |
| ENOTFOUND / EAI_AGAIN / DATABASE_NOT_REACHABLE / P1001 | DNS, host, región, acceso/red y disponibilidad. |
| TLS_CONNECTION_ERROR / P1011 / códigos de certificado | TLS/CA/nombre de servidor, sslmode y URL real. No rejectUnauthorized=false o desactivar TLS. |
| 42501 / 28000 / P1010 | Privilegios de DB/esquema/tablas/uniones/enums. SELECT 1 puede pasar y el catálogo fallar. Revisar todas las tablas requeridas, incluidas uniones; no conceder propiedad o superusuario. |
| 42P01 / P2021 / 3F000 | Base/esquema equivocado u objetos ausentes; contrastar destino/catálogo, sin reset o nuevas migraciones inventadas. |
| 42703 / P2022 | Columna/versión de esquema distinta a la build. Comparar deployment y migraciones originales antes de tocar DDL. |
| 42601 / 42883 / 42804 / PRISMA_VALIDATION_ERROR | SQL/tipos o validación del cliente; reproducir con el código/catálogo exacto antes de corregir. |
| 53300 / P2024 / P2037 / ETIMEDOUT | Límites/pool/conexiones/latencia o arranque frío; medir antes de aumentar pool/tiempos. |
| P2028 / 25001 / 25006 / 40001 / 40P01 | Transacción, modo read-only, aislamiento o concurrencia. Las lecturas RepeatableRead funcionan con rol read-only en las regresiones. |
| UNCLASSIFIED_DATABASE_ERROR | Error fuera de la lista; ampliar el clasificador de forma revisada, sin imprimir el mensaje bruto. |

Si se observa 42501, esta consulta de solo lectura, ejecutada **como atlas_staging_app** en una herramienta privada autorizada, resume privilegios sin imprimir identidad ni datos:

```sql
SELECT current_database() = 'atlas_staging' AS expected_database,
       current_user = 'atlas_staging_app' AS expected_runtime_role,
       has_schema_privilege(current_user, 'public', 'USAGE') AS schema_usage,
       has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create,
       (SELECT count(*) FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
          AND c.relname <> '_prisma_migrations'
          AND NOT has_table_privilege(current_user, c.oid, 'SELECT')) AS tables_without_select;
```

Que el owner pueda consultar no valida permisos del runtime. Un operador puede corregir grants mínimos confirmados mediante procedimiento seguro, sin usar la URL owner en Render o modificar el esquema. Esta entrega no ejecuta esos grants ni los presenta como solución ya aplicada.

## Regresiones y alcance

`node scripts/test-public-runtime.mjs` crea solo su DB/rol efímeros a partir de TEST_DATABASE_URL dedicada, aplica las migraciones sin seeds, comprueba lecturas reales/estados vacíos, redacción y denegación de una unión, HTTP de producción, privacidad de readiness y error visible en Chromium. El helper elimina solo su DB/rol al terminar. En cloud usar PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium si corresponde. Nunca ejecutar este runner con una conexión de staging; el helper exige *_test y prohíbe NODE_ENV=production. La CI convencional lo ejecuta después del build/instalación Chromium, con su Postgres efímero.

No se habilitan demos, filas ficticias, owner runtime, pagos, correo, IA o agentes para conseguir un resultado exitoso. El diagnóstico publicado permite la siguiente decisión basada en evidencia; no equivale a una causa raíz de Render confirmada.

## P0 — incidente del 02-11-2026: evidencia y límites

Base Git local/main remota96e0164f145fc5f33a9163b5035e1b58d93c3419 y CI41083370438 SUCCESS observadas. Render MCP/Neon/Firecrawl/GitHub/OpenAI Developers no exponen herramientas en esta sesión; Superpowers sí. Git/HTTPS público permiten consultar código/CI. No se repite el túnel403 de Quesito ni se infiere fallo del proveedor/credencial. Sin acceso al token de readiness: no petición autenticada remota.

**Lectura Render MCP aportada por el propietario**, no ejecutada por este agente: servicio srv-dbfprkbrjlhs73easoag, Live b3f39f528b7a9b9796d363d1d3dbc276152c1355. Ventana03-11-2026 00:10–00:13 UTC: proceso inicia00:11:21; Next listo00:11:25; catalog.home/P2028 a00:11:46.667; DatabaseOperationError a00:11:46.673; sin eventos registrados en esa ventana. Subtipo **NO DISPONIBLE**: no mensaje Prisma original. El propietario también aporta health200 y portada200 con error. El intervalo desde el arranque no prueba un arranque frío de Neon, saturación o expiración.

### Flujo y fuente efectiva

HTTP → página/metadata Next con React cache por petición → homeCatalog → readCatalog/databaseOperation → singleton PrismaClient → PrismaPg → pool pg(max5, conexión5000ms, idle30000ms) → destino runtime privado. Sin disconnect en código de la aplicación. La conexión directa/pooled, compute, límites y privilegios efectivos de Neon no son observables aquí; no se cambian.

Home ejecuta **batch**: Tool destacados con categorías/tags; UseCase destacados con categorías/tags; Article publicado/revisado con guía; Category con relaciones públicas. Directorios hacen findMany+count con RepeatableRead; facets Category+Tag. No son callbacks interactivos del código de Atlas. El compiler puede emitir varias consultas para relaciones; el motor instalado ejecuta los planes multi en secuencia dentro de la misma transacción. No se publican SQL, parámetros o datos en diagnósticos.

En el checkout: Prisma/client/adapter7.10.1 y pg8.23.1, iguales en los lockfiles de ambos commits; instalación efectiva de Render no inspeccionada. Fuente oficial [TransactionManager7.10.1](https://raw.githubusercontent.com/prisma/prisma/7.10.1/packages/client-engine-runtime/src/transaction-manager/transaction-manager.ts) HTTP200, SHA256 be2c673db33659299c91d7b1b3115586999e6967927cb5253fc05ce9af0469f0: coincide exactamente con sourcesContent del runtime/client.js.map instalado localmente. ClientEngine.requestBatch y getPrismaClient efectivos confirman que batch multi hereda **maxWait2000/timeout5000**, no solo callbacks. No se aumentan esos valores.

[Pooling oficial Neon](https://raw.githubusercontent.com/neondatabase/website/main/content/docs/connect/connection-pooling.md) HTTP200/SHA25638463122c8b5a538d6485bf8ee758d6a1fc1fdb17f391c4f368ef006cd836f76: PgBouncer transaction mode y colas servidor separadas de clientes. No acredita la versión, cuotas o estado del proyecto particular. La ruta intentada del repositorio de documentación Prisma respondió404; la definición de P2028 y plazos se acreditó con el código oficial de la versión efectiva, no con una página inexistente.

### Experimentos reales; no son pruebas de Neon

Todos en PostgreSQL loopback desechable, sin tocar atlas_staging; runtime de solo SELECT/read-only en las regresiones. Sin mocks de SQL o de transacciones. Los retardos se producen ocupando conexiones o bloqueando una tabla real, no lanzando un timeout genérico. Datos publicados y relaciones de prueba se crean únicamente allí y se retiran.

| Condición | Resultado observado |
| --- | --- |
| Primera petición directa / 24 lecturas concurrentes reutilizadas | PASS, aproximadamente105/55ms en una muestra; no rendimiento representativo de Render. |
| Cinco conexiones pg ocupadas antes del BEGIN del catálogo | P2028 al inicio, aproximadamente2014ms; liberar permite la misma consulta en5ms. |
| Tool bloqueada por transacción local durante6s | P2028 de ejecución, aproximadamente6004ms; metadata operation=rollback, timeout5000, timeTaken superior. Liberar permite la misma consulta en4ms. |
| PgBouncer1.24.1 real, transaction mode, dos conexiones servidor | Primera petición y24 lecturas PASS (15/91ms); no incompatibilidad general con este modo. No es la versión/servicio Neon. |
| Mismo PgBouncer con ambas conexiones servidor ocupadas y pool aplicación disponible | P2028 al inicio en2016ms; después de liberar PASS4ms. La fase inicio por sí sola no distingue cola pg de cola PgBouncer. |
| Terminar exclusivamente el backend de prueba bloqueado, identificado por DB/application_name únicos | Error visible y sanitizado, en este experimento UNCLASSIFIED_DATABASE_ERROR; siguiente petición reconecta y PASS. No representa todo fallo de red posible. |
| Readiness: DB no disponible / sin autorización / alerta SQL bloqueada | Liveness200 independiente, readiness503/401/deadline503; ningún valor privado en respuesta. HTTP deadline no implica cancelar SQL ya iniciado. |

PgBouncer/libcares se extrajeron de paquetes oficiales Debian a /tmp, sin instalación global/dependencias del producto; proceso solo loopback y credenciales nuevas exclusivamente de test en directorio privado eliminado al terminar. No servicio cloud, cambios del sistema o credenciales reales transferidas. Primer intento del experimento de interrupción no encontró el backend por snapshot estadístico cacheado; pg_stat_clear_snapshot en el observador local corrigió el experimento antes de terminar un único backend identificado. No se confundió ese fallo de instrumentación con una causa productiva.

### Matriz de hipótesis

Los estados siguientes distinguen prueba local de conclusión sobre el incidente. **Ninguna está CONFIRMADA como causa de Render.**

| Hipótesis | Evidencia favorable / contraria | Prueba mínima y resultado | Estado para Render |
| --- | --- | --- | --- |
| A. Expirada/cerrada | Expiración real produce P2028; peticiones sanas/recuperación pasan | Bloqueo Tool6s confirma mecanismo local; falta subtipo productivo | PENDIENTE |
| B. Batch exento de deadlines o defectuoso siempre | Código aplica2000/5000; batch sano pasa | Fuente efectiva y primeras/repetidas lecturas descartan exención e incompatibilidad general | PENDIENTE; exención DESCARTADA |
| C. Pooling incompatible con RepeatableRead | PgBouncer transaction pasa; cola servidor sí provoca P2028 | Protocolo real local1.24.1 PASS; falta configuración/versión Neon | PENDIENTE; incompatibilidad general DESCARTADA localmente |
| D. Inicio frente a ejecución/cierre | Distintos P2028 llegan idénticos al logger actual | Nuevas regresiones distinguen inicio y expiración sin modificar límites | PENDIENTE |
| E. Suspensión/reanudación Neon | Error tras arranque de Next; sin evento Render en ventana | Correlacionar compute/primer request/subtipo; sin datos de compute | PENDIENTE |
| F. Saturación | Dos colas distintas reproducen P2028 de inicio | pg5 ocupado y PgBouncer2 ocupado CONFIRMADOS como mecanismos locales; faltan métricas remotas | PENDIENTE |
| G. Latencia | Plazos wall-clock; CI local rápida | Se probó espera SQL, no RTT/reanudación Neon; faltan tiempos remotos | PENDIENTE |
| H. Adaptador/configuración | Versiones coherentes y control pasa; destino privado desconocido | Revisar solo lectura URL pooled/direct, TLS/rol/límites sin divulgar valores | PENDIENTE |
| I. SQL/aplicación | Mismas consultas con contenido, relaciones y rol SELECT pasan; error se preserva |10 regresiones runtime y91 integración PASS no descartan configuración remota | PENDIENTE |
| J. Diferencia CI/Render | CI usa PostgreSQL local efímero; Live anterior y Neon remoto | Código DB sin diferencias; no equivalencia de red/recursos/carga | PENDIENTE |
| K. Concurrencia/interrupción |24 lecturas pasan; saturación controlada falla; interrupción falla sin datos ficticios | Control, ocupación y recuperación reales locales; falta concurrencia de Render | PENDIENTE |

### Corrección acotada y próximo paso

**Defecto de observabilidad CONFIRMADO y corregido:** databaseDiagnostic convertía todos estos subtipos reales en el mismo P2028. Ahora conserva stage/codes con un código fijo adicional: TRANSACTION_START_TIMEOUT o TRANSACTION_EXECUTION_TIMEOUT. Expiración usa metadata numérica segura y operación validada, sin leer mensaje; inicio no tiene metadata y se reconoce exclusivamente por el sufijo fijo oficial cuando code=P2028. No se imprime, retorna o conserva ese mensaje/contexto. Motivo desconocido sigue P2028 sin adivinar. Regresiones RED→GREEN: dos unitarias y dos transacciones reales; pruebas negativas cubren getters/metadata inválida y material privado. Error público/cause descartado siguen iguales.

**No es una reparación de la causa del catálogo.** Pruebas locales: check93, PostgreSQL91, build, runtime10, SEO5 y E2E122/122 PASS. CI del commit nuevo se verifica después de publicar. No se modifican pool/timeouts/isolation/client, datos, esquema/16 migraciones o dependencias. El incidente permanece NO CORREGIDO EN PRODUCCIÓN; despliegue no ejecutado.

**Intervención mínima:** un despliegue exclusivamente diagnóstico necesita autorización del SHA nuevo y preflight de lectura del cliente conectado (servicio/repo/main, Auto-Deploy Off, comandos y Live/punto de recuperación reconfirmados). Tras ese despliegue, solicitar `/`, `/tools`, `/use-cases` y readiness con bearer privado si ya está configurado; compartir solo UTC, SHA, HTTP, catalogVerified y stage/codes. Si inicio: revisar ocupación/espera del pool y compute/PgBouncer antes de elegir cambio; si ejecución: revisar duración/bloqueos/recursos; si soloP2028: ampliar investigación sin inferir subtipo. Un éxito aislado o health200 no cierra el incidente. No se solicita aún desplegar esto como solución definitiva ni autoriza rollback/configuración por este runbook.

Streaming: Next16 documenta que loading/Suspense fijan HTTP200 al enviar headers; un error tardío puede conservar200. El incidente aportado es compatible con ese mecanismo. No se añade una segunda lectura completa en Proxy ni se altera SEO/HTTP global para ocultar P2028; status y contenido/readiness deben evaluarse conjuntamente hasta una corrección específica aprobada y probada.

### CI posterior y ciclo de vida del servidor de pruebas

El commit de diagnóstico6ecf8c511ddfce0a24617b8f270d97901280f6af tuvo CI41556428028 FAILURE solo en E2E; check/DB/build/runtime/SEO/Blueprint/importadores PASS. Anotación segura: timeout en catalog.spec.ts111 (published mode); lectura pública de log404. Repetición local del mismo caso3veces por proyecto→6/6 PASS. Sin detalle de traza, su acción exacta pendiente no está acreditada; se solicitó al cliente con GitHub conectado, sin reportes privados completos.

Un experimento independiente con Next real demostró que withAppServer esperaba indefinidamente a server.close cuando quedaba una petición HTTP incompleta; solo cerrar el socket del cliente permitió terminar. Regresión RED10/11: limpieza esperó7s hasta el cierre de seguridad. Se acota **solo el proceso hijo aislado propiedad del helper**: SIGTERM, gracia2s y SIGKILL si sigue activo, esperando su salida y reconociendo signalCode. Las aserciones/callback y timeout30s/retries de Playwright no se cambian; una excepción del callback sigue propagándose. No es un cambio del cierre de Render ni una reparación de P2028.

GREEN11/11 runtime, incluido cliente HTTP incompleto (~2,4s total), y check93 PASS. Consumidores del helper repetidos: SEO5, Blueprint23+8, importador10 y E2E122/122 (3,4min) PASS; revisión independiente sin hallazgos bloqueantes. Verificar CI del siguiente SHA. El defecto del helper está demostrado; que fuera la causa exacta del timeout original de CI sigue pendiente de traza. No se hace un rerun ciego ni se presenta la CI fallida como aprobada.
