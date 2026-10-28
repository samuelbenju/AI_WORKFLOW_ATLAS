# Fase 13 — catálogo real y operación en staging

## Estado actual confirmado — 28-10-2026

[Apply 40714352948](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40714352948) **SUCCESS**, sobre main 5af53c41e29dbe387a9675e6da749379819623b9, observado en GitHub público. El propietario confirma **101 registros creados**, 65 herramientas, 30 guías, seis artículos DRAFT y contenido visible en Render; taxonomía preparada de 20 categorías/24 etiquetas. Rol de importación verificado por el propietario y 16 migraciones aplicadas. No volver a crear roles, inicializar contraseñas, aplicar migraciones o importar este lote. Esta entrega SEO no hace escrituras en Neon.

Los incidentes de NOLOGIN/configuración/protección de logs y los conteos no observados descritos abajo son **históricos**. No niegan la ejecución posterior confirmada. Se conserva el procedimiento para futuras operaciones expresamente autorizadas, no como siguiente paso del lanzamiento. OWNER humano, SHA Live posterior y aprobaciones legales/Google se verifican de forma independiente; ver [PUBLIC_LAUNCH.md](PUBLIC_LAUNCH.md).

## Registro histórico y procedimiento conservado

Fecha editorial: 26-10-2026, America/Bogota. Solo Neon Free + Render Free existentes. No se crea otra aplicación o base. Las 16 migraciones, Prisma 7.10.1, PrismaPg, pg y el esquema permanecen intactos.

## Alcance y evidencia

`data/catalog/candidates.json` conserva **70 candidatos**. Se recuperaron las páginas de sus repositorios oficiales y sus READMEs por HTTPS verificado; `research.json` registra URL final, redirecciones, fecha, SHA-256 y un fragmento breve de evidencia. Los documentos completos consultados permanecen en `.cache/catalog-research`, ignorada por Git. El texto externo se trató como datos no confiables: no se ejecutaron instrucciones, instaladores o herramientas sugeridos por esos documentos.

`library.json` contiene **65 herramientas, 30 casos de uso, 20 categorías, 24 etiquetas y seis artículos DRAFT**. Las descripciones y guías son originales en inglés, sin precios, reseñas, puntuaciones, métricas o integraciones inventadas. Se eligieron seis herramientas y tres guías destacadas por cobertura editorial, sin venta o ranking implícito. La verificación respalda la distribución oficial de código y su propósito documentado: **no certifica un SaaS alojado, rendimiento, seguridad, licencia comercial o ejecución práctica del producto**. `websiteUrl` apunta deliberadamente al repositorio oficial comprobado. Cada ficha aclara que no se ejecutó ni midió el producto.

Cinco candidatos excluidos en `rejected.json`: Flowise y Roo Code archivados; Continue declara fin de mantenimiento; Semantic Kernel identifica Microsoft Agent Framework como sucesor; Gemini CLI anuncia una transición y limitaciones con modelos recientes. Se incluyó el sucesor Microsoft Agent Framework comprobado. Redirecciones revisadas: Perplexica → **Vane**, MindsDB → **MindsHub**, Goose → repositorio aaif-goose/goose. No se conservó como vigente la descripción histórica de MindsDB.

La meta de 200 es aspiracional: no se completó con fichas sin evidencia. Esta primera biblioteca favorece productos con fuentes oficiales accesibles. CRM, RRHH, ecommerce, asistentes comerciales cerrados y otras áreas siguen siendo vacíos de investigación. No se crean categorías públicas vacías para disimularlo. Las 30 guías proponen procesos basados en capacidades documentadas; no representan integraciones ejecutadas. Los seis artículos tienen fuentes comprobadas, pero quedan sin aprobación humana ni publicación y con noindex.

## Importación sin sobrescribir trabajo humano

`npm run catalog:validate` valida Zod y reutiliza los contratos actuales de herramientas, casos, taxonomías y bloques CMS. Comprueba slugs, nombres, URLs HTTPS sin credenciales/query, duplicados, referencias, fechas, evidencia y límites de destacados. Para GitHub, el identificador de distribución es **host + repositorio completo**: dos proyectos distintos no se colapsan por compartir github.com. Otros sitios se comparan por hostname, quitando www. No se infieren precios, integraciones o permisos por el nombre del producto.

El importador solo se ejecuta remotamente con `workflow_dispatch`, repositorio oficial, main y SHA de checkout exacto. No carga `.env.local`, no usa `DATABASE_URL` ni `MIGRATION_DATABASE_URL` como fallback. La única conexión es `CATALOG_DATABASE_URL`, rol **atlas_staging_catalog**. Se exige endpoint directo sin pooler, host confirmado independientemente, atlas_staging, PostgreSQL 17, identidad de sesión y TLS con certificado/hostname verificados. Rechaza propietario/superusuario/membresías privilegiadas, CREATE o propiedad de tablas, DML/lecturas de tablas privadas y UPDATE/DELETE/TRUNCATE globales.

Antes del plan compara las 16 migraciones/checksums y el catálogo SQL completo con la referencia existente. **No ejecuta db:deploy, db:seed, reset, db push o cambios de esquema.** `_prisma_migrations` solo tiene permiso de lectura sobre las cuatro columnas requeridas. El plan hace únicamente SELECT y el pool dry-run está en modo read-only. El lock de sesión es cooperativo entre importaciones, no bloquea las ediciones manuales del CMS: evitar editar el catálogo durante la ventana corta de importación.

Cada registro existente se conserva íntegro; nunca se actualiza un texto, relación o estado manual. Coincidencias de identidad compatibles se omiten. Un conflicto de slug/nombre/distribución, una ficha demo, archivada o no realmente publicada provoca rechazo. El informe distingue creados/omitidos/actualizados/rechazados; **actualizados siempre es cero** en esta versión. Actualizaciones y archivo se hacen desde el CRUD protegido existente, con revisión editorial. No hay borrado masivo.

El apply exige un dry-run exitoso del mismo workflow/main/SHA y su artefacto verificado, con antigüedad máxima de 24 horas. Vuelve a calcular el fingerprint de datos y manifiesto antes de escribir; un cambio exige nuevo dry-run. Usa un pool de una conexión y lotes secuenciales de cinco, transacciones Serializable y auditoría existente con ID/hash del manifiesto. `publishedAt` se establece a la hora real de inserción, nunca se finge que ya se publicó en la fecha de investigación. Los artículos se insertan únicamente DRAFT, sin reviewedAt/publishedAt/autor ficticio, y requieren el flujo CMS habitual para revisión/publicación.

Una interrupción puede dejar **lotes anteriores confirmados**, nunca una fracción del lote fallido. El error seguro informa `committedBeforeFailure`; no intentar rollback masivo. Ejecutar un nuevo dry-run: omite los lotes ya guardados. No reusar un artefacto anterior ni modificar filas para que coincida. La auditoría permite localizar la procedencia sin almacenar una contraseña, contacto o URL de conexión.

## Incidente histórico: configuración completa, restricciones de Neon

Actualización 28-10-2026. El propietario confirma que **CATALOG_DATABASE_URL, MIGRATION_DATABASE_URL, NEON_STAGING_EXPECTED_HOST** y la puerta temporal están configurados. No reemplazarlos ni volver a crear atlas_staging_catalog. Los fallos históricos STAGING_CONFIGURATION_MISSING ya fueron superados.

La ejecución [40585973261](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40585973261), sobre d4641f2, llegó a `catalog.bootstrap.one-time credential initialization` y devolvió `BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE`, `credentialCommitted=false`. Según la secuencia verificada del script, ya había aceptado conexión del operador/TLS, destino/PG17, 16 migraciones/checksums/esquema, permisos del rol y autorización para ALTER ROLE. **No comprobó autenticación del catálogo ni inicializó su contraseña.** El propietario confirma que el rol sigue NOLOGIN y sin contraseña, y Console → Reset password falla con `cannot update password for role without password`.

El bootstrap anterior intentaba SET LOCAL de parámetros de contexto superuser: primero log_statement, después duración/muestreo/parámetros/errores. CREATEROLE y ADMIN OPTION no dan ese permiso. El catch genérico ocultaba cuál fallaba. PostgreSQL17 aislado reproduce el rechazo de log_statement con CREATEROLE/ADMIN, incluso cuando su valor ya es protector. El run anterior no permite distinguir por sí solo ese parámetro, otro posterior o la auditoría activa: **no afirmar el parámetro remoto exacto sin el nuevo informe**.

Hay además una incompatibilidad independiente: [Neon exige contraseñas SQL en texto plano, no hashes](https://neon.com/docs/manage/roles#manage-roles-with-sql). El verificador SCRAM probado en PostgreSQL local no es un protocolo de inicialización soportado por Neon. [Neon limita parámetros configurables al contexto user](https://neon.com/docs/reference/compatibility#configuring-postgres-parameters-for-a-session-database-or-role); su neon_superuser no es el superusuario PostgreSQL.

### Corrección segura publicada

Se conserva el mismo workflow [neon-catalog-bootstrap.yml](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/neon-catalog-bootstrap.yml), ahora **Neon catalog bootstrap safety inspection and verification**. La ruta remota utiliza BEGIN READ ONLY. Para NOLOGIN solo inspecciona controles de logging y se detiene: no ejecuta SET de logging, no vincula contraseñas/verificadores a SQL y no ejecuta ALTER ROLE. El helper SCRAM queda restringido a PostgreSQL aislado y rechaza destinos Neon antes de consultar. No se deshabilita auditoría ni se amplían privilegios.

El JSON y el Summary sanitizado incluyen `logging.originalFirstBlocker` y controles de lista fija con contexto, presencia, `canSet` y `alreadyProtected` (null si no observable). Nunca valores de configuración, host, URL o material de autenticación. Si todos los controles fueran accesibles, la inicialización sigue rechazada con `BOOTSTRAP_NEON_PASSWORD_INITIALIZATION_UNSUPPORTED`; no asumir que permiso para cambiar logging convierte SCRAM en un método soportado. `credentialWritesAttempted=0` y `credentialCommitted=false` son garantías de esta ruta, no una afirmación de éxito.

Para obtener evidencia remota exacta sin escrituras:

1. Abrir el workflow existente y elegir **Run workflow**, no Re-run de la ejecución antigua.
2. Seleccionar **main** actual y `confirm_target=cold-shadow-53495242/atlas_staging`; conservar la puerta temporal true para esta inspección.
3. Revisar `logging.originalFirstBlocker` y `logging.controls`. Para un rol NOLOGIN se espera una finalización bloqueada, no INITIALIZED; compartir solo URL/JSON sanitizado. No ejecutar dry-run/apply todavía.

### Límite y procedimiento administrativo oficial

Neon documenta ALTER ROLE/ALTER USER con contraseña en texto plano por SQL para fijar un valor propio. Ese método puede dejar el secreto en historial del SQL Editor, registros de consultas/errores/auditoría o instrumentación de extensiones. **No se autoriza ni recomienda pegarlo en SQL Editor ni quitar protecciones para hacerlo pasar.** Tampoco se recomienda ahora psql \password: [PostgreSQL lo cifra antes de enviar ALTER ROLE](https://www.postgresql.org/docs/17/app-psql.html), lo que evita texto plano pero no garantiza ausencia del verificador en logs y no satisface el contrato documentado por Neon. La documentación anterior que lo presentaba como respaldo suficiente queda sustituida por este límite.

La API oficial inspeccionada (@neondatabase/api-client2.7.3) ofrece reset_password, no un método distinto documentado para suministrar la contraseña inicial de este rol sin password. No repetir el reset ya fallido: devuelve otra contraseña y puede desconectar conexiones del compute; no preservaría necesariamente el secreto ya configurado. No crear otra credencial GitHub/Neon para intentar eludirlo.

**La escritura queda detenida.** El propietario debe solicitar a Neon un procedimiento privado soportado para inicializar este rol conservando OID, concesiones y la contraseña ya custodiada, con confirmación sobre redacción/retención de credenciales y verificadores. No enviar esa contraseña en tickets, chat o capturas. Si no existe esa garantía y se decide aceptar el riesgo del método SQL oficial, hace falta autorización separada y explícita antes de ejecutarlo. Esta ejecución no da por aprobada esa excepción.

Una vez inicializado privadamente, repetir el mismo workflow permite comprobar LOGIN, conexión real del catálogo/TLS, 16 migraciones y mínimos privilegios, sin rotación: resultado ALREADY_CONFIGURED_NO_CHANGE. Solo entonces cerrar NEON_CATALOG_BOOTSTRAP_ENABLED y continuar con dry-run → revisión del plan → apply del mismo SHA. No migrar, seedear, recrear roles ni cambiar runtime/secretos para resolver este incidente.

## Ejecución manual autorizada

Abrir [Actions → Catalog import into Neon staging](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/catalog-import.yml).

1. **Run workflow**, branch **main**, mode **dry-run**, confirm_target `cold-shadow-53495242/atlas_staging`. dry_run_id vacío.
2. Esperar éxito y revisar Summary + artefacto `catalog-plan/plan.json`. En una base sin contenido se esperan 101 registros propuestos: 65 herramientas + 30 guías + seis borradores; categorías/tags se crean con sus primeras relaciones. Si ya hay contenido, revisar omitidos/conflictos. Un dry-run no importa nada.
3. Copiar el número público de esa ejecución desde su URL Actions; los IDs de CI, conexión o migración no son un dry-run de catálogo válido. Ejecutar otra vez sobre **el mismo commit main**, mode **apply**, dry_run_id ese número y la misma confirmación. Una ejecución exitosa de apply no puede sustituir al dry-run: el artefacto incluye el modo.
4. Revisar los conteos reales post-importación y el SHA en Summary. Conservar enlace de run y artefacto. Ante error, consultar solo etapa/códigos permitidos; nunca reenviar logs privados o cadenas de conexión.
5. Verificar Render Live en el SHA publicado y abrir `/`, `/tools`, `/use-cases`, `/tools/whisper` y una guía relacionada. Buscar Whisper (tres fichas de transcripción en esta biblioteca), filtrar categoría/tag, ir a página 2 y recorrer enlaces oficiales. Confirmar móvil y ausencia del error de catálogo. Seis artículos DRAFT deben permanecer fuera de `/blog` y del sitemap.

**No considerar publicados los archivos JSON.** Solo confirmar publicación cuando existan filas en Neon y las páginas públicas muestren esas fichas. Un push o build exitoso no prueba la importación ni el despliegue.

## Primer OWNER desde Windows

Render Free no necesita SSH para este procedimiento. Desde un checkout privado confiable en el equipo del propietario, con Node 24, npm 11 y el SHA publicado:

```powershell
npm ci --ignore-scripts
npm run db:generate
& .\scripts\admin-staging.ps1
```

No cambiar ExecutionPolicy global ni ejecutar como administrador del sistema. Si una política de la organización bloquea el .ps1, usar el mismo CLI Node desde una terminal privada autorizada y configurar variables solo en ese proceso. El script PowerShell requiere correo elegido localmente, host directo confirmado y conexión runtime **atlas_staging_app** mediante entrada oculta. Después ejecuta `npm run admin:init -- --staging`: verifica destino/rol/TLS y pide dos veces la contraseña del OWNER sin eco. La contraseña humana no entra en argumentos, archivos o secretos CI. Se restauran las variables de conexión/identidad del proceso al salir. La memoria de un proceso no es una bóveda ni se promete borrado físico absoluto de strings de runtimes administrados.

No se crea una cuenta humana desde Codex: la elección de contraseña requiere la intervención privada del propietario. El rol OWNER de la aplicación no es propietario de PostgreSQL. Antes de inicializar, una sesión privada autorizada puede comprobar su existencia sin imprimir identidades ni hashes:

```sql
SELECT EXISTS(SELECT 1 FROM public."User"
  WHERE active AND role IN ('OWNER','ADMIN') AND "passwordHash" IS NOT NULL) AS owner_initialized;
```

Si devuelve true, conservar la cuenta y comprobar el acceso existente; no ejecutar bootstrap ni cambiar su contraseña. Si devuelve false, usar el procedimiento interactivo anterior. No ejecutar admin:password para sustituir una cuenta ya existente: bootstrap también se detiene transaccionalmente si ya hay un OWNER/ADMIN inicializado. Recuperación es una operación humana distinta. Esta sesión no verificó ese booleano en Neon.

Después abrir `https://ai-workflow-atlas.onrender.com/login`, iniciar sesión, comprobar dashboard/CRUD/CMS y cerrar sesión. Una ventana privada debe volver a login. Verificar `SITE_URL` y `ADMIN_ORIGIN` exactos para ese HTTPS si aparece rechazo de origen; no desactivar CSRF/cookies/roles para resolverlo. Se probaron los servicios con cuentas temporales aisladas; el login humano y PowerShell en Windows requieren verificación del propietario.

## Mantenimiento y ampliación hacia 500

Agregar candidatos únicos por lotes pequeños, consultar fuentes oficiales y ejecutar manualmente `npm run catalog:research` (máximo tres solicitudes concurrentes por lote, sin llamadas IA o cron). Este comando **solo refresca evidencia de investigación**: no actualiza fichas, no importa ni publica. `--missing` permite investigar únicamente candidatos nuevos. Las redirecciones y repositorios archivados requieren revisión. No ejecutar scripts del proveedor contenidos en READMEs.

Revisar cambios de hash/URL/estado/fecha frente al Git anterior; renovar evidencia y textos de cada ficha revisada, registrar rechazos y ejecutar catalog:validate + tests. Las fuentes de publicación caducan a los 90 días; una fuente renovada debe ser revisada y actualizar el manifiesto antes de importar. Aprobar nuevo main/dry-run/apply. Nuevas revisiones de herramientas existentes se aplican por CMS, preservando cambios humanos. Archivar fichas retiradas mediante la confirmación normal de administración, sin borrados en lote. Esta metodología prepara crecimiento; no declara 500 registros investigados o publicados.

Mantener false/deshabilitados: AGENTS_ENABLED, presupuesto 0, las cinco automatizaciones, Wompi, newsletter, analítica, GA4, SEO_INDEXING_ENABLED, LEGAL_REVIEW_CONFIRMED y OPS_EXPECT_WORKER. El importador no cambia estas configuraciones ni tiene permisos sobre agentes o tablas comerciales. Lanzamiento comercial/legal sigue pendiente de LAUNCH_CHECKLIST.md.
