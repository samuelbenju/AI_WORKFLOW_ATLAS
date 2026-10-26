# Fase 13 — catálogo real y operación en staging

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

## Configuración privada única de GitHub

1. Un operador autorizado confirma en Neon el proyecto `cold-shadow-53495242`, base atlas_staging y endpoint **directo**. No cambiar contraseñas del runtime/migrador.
2. Revisar [sql/catalog-import-grants.sql](sql/catalog-import-grants.sql) para crear una credencial **nueva e independiente** de catálogo, inicialmente NOLOGIN. Es configuración de privilegios, no una migración ni parte del workflow. Si el rol ya existe, el script se detiene: inspeccionar, no reemplazarlo o ampliar permisos a ciegas. Este entorno no lo aplicó en Neon.
3. Desde una sesión privada de psql contra el destino confirmado, un operador puede ejecutar `\password atlas_staging_catalog` (entrada oculta), y después `ALTER ROLE atlas_staging_catalog LOGIN;`. No escribir la contraseña en SQL, comandos, logs, Git o chat. Usar el gestor de secretos para custodiar esa credencial nueva. No conceder membresía del propietario.
4. En [Settings → Actions secrets](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/settings/secrets/actions), agregar **CATALOG_DATABASE_URL** con la conexión directa de ese rol, TLS verify-full. La credencial de migración existente no sirve para esta operación.
5. En las variables Actions, conservar/configurar **NEON_STAGING_EXPECTED_HOST** con el hostname directo confirmado en la consola del proyecto, sin protocolo/path. No se imprime en el workflow. Es la vinculación independiente del destino; un ID de proyecto declarado por sí solo no prueba qué endpoint se usa.

No compartir el secreto por chat. Los secretos Render no se transfieren automáticamente a Actions. No hace falta añadir una clave de IA, contratar servicios o configurar Neon CLI.

## Ejecución manual autorizada

Abrir [Actions → Catalog import into Neon staging](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/catalog-import.yml).

1. **Run workflow**, branch **main**, mode **dry-run**, confirm_target `cold-shadow-53495242/atlas_staging`. dry_run_id vacío.
2. Esperar éxito y revisar Summary + artefacto `catalog-plan/plan.json`. En una base sin contenido se esperan 101 registros propuestos: 65 herramientas + 30 guías + seis borradores; categorías/tags se crean con sus primeras relaciones. Si ya hay contenido, revisar omitidos/conflictos. Un dry-run no importa nada.
3. Copiar el número público de esa ejecución desde su URL Actions. Ejecutar otra vez sobre **el mismo commit main**, mode **apply**, dry_run_id ese número y la misma confirmación. Una ejecución exitosa de apply no puede sustituir al dry-run: el artefacto incluye el modo.
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

No se crea una cuenta humana desde Codex: la elección de contraseña requiere la intervención privada del propietario. El rol OWNER de la aplicación no es propietario de PostgreSQL. No ejecutar admin:password para sustituir una cuenta ya existente: bootstrap se detiene si ya hay un OWNER/ADMIN inicializado. Recuperación es una operación humana distinta.

Después abrir `https://ai-workflow-atlas.onrender.com/login`, iniciar sesión, comprobar dashboard/CRUD/CMS y cerrar sesión. Una ventana privada debe volver a login. Verificar `SITE_URL` y `ADMIN_ORIGIN` exactos para ese HTTPS si aparece rechazo de origen; no desactivar CSRF/cookies/roles para resolverlo. Se probaron los servicios con cuentas temporales aisladas; el login humano y PowerShell en Windows requieren verificación del propietario.

## Mantenimiento y ampliación hacia 500

Agregar candidatos únicos por lotes pequeños, consultar fuentes oficiales y ejecutar manualmente `npm run catalog:research` (máximo tres solicitudes concurrentes por lote, sin llamadas IA o cron). Este comando **solo refresca evidencia de investigación**: no actualiza fichas, no importa ni publica. `--missing` permite investigar únicamente candidatos nuevos. Las redirecciones y repositorios archivados requieren revisión. No ejecutar scripts del proveedor contenidos en READMEs.

Revisar cambios de hash/URL/estado/fecha frente al Git anterior; renovar evidencia y textos de cada ficha revisada, registrar rechazos y ejecutar catalog:validate + tests. Las fuentes de publicación caducan a los 90 días; una fuente renovada debe ser revisada y actualizar el manifiesto antes de importar. Aprobar nuevo main/dry-run/apply. Nuevas revisiones de herramientas existentes se aplican por CMS, preservando cambios humanos. Archivar fichas retiradas mediante la confirmación normal de administración, sin borrados en lote. Esta metodología prepara crecimiento; no declara 500 registros investigados o publicados.

Mantener false/deshabilitados: AGENTS_ENABLED, presupuesto 0, las cinco automatizaciones, Wompi, newsletter, analítica, GA4, SEO_INDEXING_ENABLED, LEGAL_REVIEW_CONFIRMED y OPS_EXPECT_WORKER. El importador no cambia estas configuraciones ni tiene permisos sobre agentes o tablas comerciales. Lanzamiento comercial/legal sigue pendiente de LAUNCH_CHECKLIST.md.
