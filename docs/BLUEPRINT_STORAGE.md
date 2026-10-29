# Reporte entrega 1.5 — almacenamiento privado

29-10-2026. Base conservada: `96105c4cad3684546026cc56b8ec07216c17b67f`. Estado: **adaptadores implementados y probados localmente; Neon Object Storage pendiente de configuración y verificación remota**. No se ha creado un bucket/credencial ni se ha cargado un blueprint real. No se modifica PostgreSQL remoto, esquema, migraciones, roles, catálogo o declaraciones comerciales.

## Proveedor y límites comprobados en documentación oficial

Fuentes consultadas el 29-10-2026: [overview](https://neon.com/docs/storage/overview), [planes](https://neon.com/docs/introduction/plans#object-storage), [autenticación](https://neon.com/docs/storage/authentication), [buckets](https://neon.com/docs/storage/buckets), [compatibilidad S3](https://neon.com/docs/storage/s3-compatibility). Se consultaron sus fuentes oficiales en [neondatabase/website](https://github.com/neondatabase/website/tree/main/content/docs/storage), porque el acceso directo a neon.com está bloqueado en este cloud.

- Free: **5 GB de objetos por proyecto**; transferencia pública **5 GB/mes por proyecto compartidos con PostgreSQL y otros productos**. No asumir transferencia ilimitada. Planes pagados: $0.023/GB-mes de objetos; documentación sin cargo por operación; egress excedente pagado $0.10/GB. No se cambia el plan, no se autoriza gasto. La cuota compartida puede afectar también la disponibilidad de PostgreSQL; revisar uso en Console antes de activar descargas.
- Regiones documentadas: us-east-1, us-east-2, eu-central-1 y ap-southeast-1. La región declarada del proyecto existente es compatible; **su disponibilidad concreta, cuota y bucket no se han inspeccionado en Console**.
- Objetos persistentes del proveedor, separados del disco efímero de Render. Ramas heredan objetos copy-on-write; nuevas escrituras/borrados en hija no alteran padre. Credenciales de una rama sirven también a sus descendientes: no aislar una prueba usando solo otra credencial ancestral.
- Scopes `storage:read` y `storage:write` (este último incluye lectura y borrado). No consta granularidad por bucket/solo insertar: usar credenciales distintas runtime/operador, rama correcta y custodia privada. No se concede a Render escritura.
- S3 path-style/SigV4. ACL/policy solo lectura por S3; nivel private se administra en Console/API. Versioning y lifecycle se almacenan pero **no se aplican**; no son backup, inmutabilidad WORM o retención automática. Throttling puede responder 503 SlowDown; sin bucles de reintento del runtime.

Si Object storage no aparece en este proyecto/región, **no activar el backend ni crear otro proyecto**. El adaptador queda preparado. Alternativa a evaluar separadamente: bucket privado S3-compatible de otro proveedor con cuota gratuita y condiciones verificadas; no configurado, contratado o certificado aquí. Local solo sirve en desarrollo/test y no soluciona la persistencia de Render Free.

## Arquitectura y conservación

`BlueprintStorageProvider`: `put`, `read`, `exists` (solo metadata), `inspect` (lectura/validación integral), `operationalInfo` (solo backend/capacidad persistente, no prueba de conectividad). Factory de servidor, sin endpoints arbitrarios del visitante o fallback entre proveedores. En producción no se elige local implícitamente si no hay raíz/backend explícito; una configuración ausente produce error seguro.

`LocalPrivateStorage` conserva raíz/objetos y nombres de entrega 1, permisos POSIX 0700/0600, anti-symlink/hardlink/ruta. Carga mediante temporal privado + link exclusivo atómico; no reemplaza objetos. `NeonObjectStorage` usa SDK AWS fijado en lockfile, HTTPS/verificación TLS, hostname limitado a endpoints de rama Neon y región documentada, credenciales explícitas, sin redirects regionales, deadline 8 s y un solo intento. No cambia configuración de bucket o DB.

Antes de cada operación S3 se comprueba ACL de propietario sin grants delegados/públicos y ausencia de policy Allow. API de privacidad no disponible/ambigua → fallo cerrado; no relajar para hacer pasar una prueba. GetObject consume stream acotado al tamaño aprobado y revalida formato/UTF-8/secretos/SHA. HeadObject solo informa presencia/tamaño; **no certifica bytes íntegros**. Descargar siempre vuelve a leer/validar y reautorizar la release.

Clave S3 `objects/sha256/<digest>`; no nombres/rutas del navegador. Carga valida los bytes primero, omite objeto existente íntegro, rechaza objeto existente corrupto, envía `If-None-Match: *` y confirma bytes después. La documentación no promete soporte de esa precondición: se debe probar en destino; la defensa adicional es que cada clave admite exclusivamente los bytes de su SHA. No se depende de versionado S3; un escritor privilegiado del proveedor aún puede alterar/borrar objetos, pero la API nunca entrega bytes corruptos. No hay operación de borrado ni presignado público. Privacidad del bucket también requiere control operacional continuo fuera de Atlas.

SiteSetting conserva manifiestos/estados y AuditLog operaciones; nunca Base64, bytes o secretos. Descargar no escribe eventos. La medición consentida de entrega 1 sigue preparada/sin persistencia. Versiones anteriores conservan digest y lectura local; cambiar proveedor requiere copiar/verificar sus objetos fuera del flujo público, **no** editar releases selladas ni hacer fallback.

## Configuración privada mínima del propietario

1. En [Console del proyecto](https://console.neon.tech/app/projects/cold-shadow-53495242), confirmar proyecto, rama `production` usada como staging, región y plan Free. En Object storage crear/elegir un único bucket **private** para Atlas, sin modificar PostgreSQL, Auth, Functions u otros servicios.
2. En Settings → Credentials crear credencial de rama **storage:read** para Render y otra **storage:write** solo para el operador. Guardarlas directamente en el gestor privado. No compartir valores en chat, GitHub, artefactos o comandos visibles. El expiry de credenciales no se debe asumir aplicado: revocar explícitamente cuando corresponda.
3. Copiar de Connect → Storage el endpoint real y región; en Render configurar `BLUEPRINT_STORAGE_BACKEND=neon`, `BLUEPRINT_OBJECT_ENDPOINT`, `BLUEPRINT_OBJECT_REGION`, `BLUEPRINT_OBJECT_BUCKET`, `BLUEPRINT_OBJECT_ACCESS_KEY_ID` (token_id), `BLUEPRINT_OBJECT_SECRET_ACCESS_KEY` (s3_secret_access_key). Ninguna variable es NEXT_PUBLIC. No sustituir DATABASE_URL o credenciales PostgreSQL.
4. En terminal privada del operador, con credencial de escritura independiente y DATABASE_URL runtime autorizado, crear un DRAFT mediante API administrativa existente y cargar cada archivo explícito con la CLI inferior. La contraseña de Atlas se introduce sin eco, se autentica/limita con el servicio existente y se revoca su sesión al terminar. No acepta contraseñas por argumentos. Staging exige identidad runtime mínima/TLS/host/base confirmados; local-test solo loopback y base `_test`.
5. Validar `stored:true`, `integrity:verified`; completar revisión humana y transiciones existentes VERIFIED/PUBLISHED. Comprobar descarga, reinicio y redeploy de prueba autorizado, retirada→404 y error/corrupción→503, sin tocar datos de catálogo. Devolver solo estados, SHA y resultados no sensibles. **Estas pruebas remotas no se han ejecutado.**

```bash
node --conditions=react-server --import tsx scripts/blueprint-upload.ts \
  --target staging --blueprint ID --version 1.0.0 --file-id export \
  --source /absolute/private/reviewed.json --email YOUR_OPERATOR_EMAIL --confirm-upload
```

La CLI no crea manifiestos, publica, migra o borra; exige OWNER/ADMIN, DRAFT sin sellar y coincidencia exacta de tamaño/hash declarados. Registra solo digest/tamaño/backend/resultado. Un fallo tras almacenar y antes de auditar puede dejar un objeto privado huérfano; salida `UPLOAD_NOT_CONFIRMED`, nunca publicación ficticia. Inspeccionar antes de reintentar. No borrar huérfanos sin política de retención y análisis de referencias.

## Evidencia y límites

Pruebas de S3 con transporte **simulado**, explícitamente etiquetadas: comandos/privacidad/no reemplazo/bytes/integridad/timeout/red/configuración. Pruebas locales reales de archivos/POSIX, carga auditada/RBAC y descarga HTTP sobre PostgreSQL efímero. Reiniciar un adaptador simulado o leer disco local tras recrear un objeto de clase **no demuestra persistencia en Neon**. Resultados finales en BUILD_LOG.md. No se provisiona infraestructura ni se publica un archivo descargable en GitHub.

Cuotas, proveedor/región, ACL/policy compatibles, credenciales/scopes reales, persistencia tras Next/redeploy, backup externo y disponibilidad siguen siendo dependencias remotas. Render Free puede suspenderse; no pings ni tráfico artificial. Mantener límites de descarga y observar uso de egress (no se introduce contador por GET).
