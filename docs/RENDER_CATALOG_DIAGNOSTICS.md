# Diagnóstico seguro del catálogo en Render

> Actualización operativa Fase 13: el propietario confirmó posteriormente la portada funcional. Este documento conserva el incidente y su runbook; no afirma que el error continúe actualmente. Las migraciones de Neon ya tienen evidencia remota satisfactoria en docs/NEON_STAGING.md. El acceso directo de este executor a Render sigue no disponible: no se inventa una nueva causa ni un SHA Live observado. No repetir migraciones para diagnosticar el catálogo.

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

## Verificar después del push / autodeploy

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
