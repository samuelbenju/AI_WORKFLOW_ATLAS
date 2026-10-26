# Informe de activación Neon — 26-10-2026 (America/Bogota)

**Resultado: preparación publicada; activación remota bloqueada. Neon no se declara listo para Render.** No se ha demostrado una conexión real a Neon desde Actions ni aplicado migraciones remotas en esta sesión.

| Punto solicitado | Evidencia y resultado |
| --- | --- |
| 1. Workflow de conexión | Publicado neon-staging-check.yml, exclusivamente manual/main, TLS/read-only/destino/proyecto y sin credenciales en logs. |
| 2. Ejecución real | **No iniciada.** `gh workflow run neon-staging-check.yml --repo samuelbenju/AI_WORKFLOW_ATLAS --ref main` salió 1: Get https://api.github.com/repos/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/neon-staging-check.yml: Forbidden. No hay URL de run que entregar. |
| 3. Conexión Neon | No verificada desde este entorno/Actions. El secreto sigue en GitHub, no se solicitó, descargó o imprimió. |
| 4. Versión PostgreSQL Neon | 17.11 según el propietario; no observada por esta ejecución. La guarda exige 17 y registra la versión real solo si pasa la conexión. |
| 5. Migraciones aplicadas en Neon | Ningún deploy remoto iniciado por esta sesión. No se infiere el estado actual de la DB sin consulta real. |
| 6. Estado de las 16 | Archivos originales, hashes, orden, lock, esquema y ejecutor conservados. 16 aplicadas e idempotentes en DB **local efímera**, no Neon. Estado remoto no consultado. |
| 7. db:status Neon | No ejecutado. Se invocará después del deploy con guardas y sin exponer errores privados. |
| 8. Tablas Neon | Sin conteo real observado. Referencia local: 55 tablas totales, 486 columnas, 72 FK, 230 restricciones, 182 índices, 75 valores enum. No confundir referencia con migración remota. |
| 9. Pruebas | npm run check aprobado: validación/generación Prisma, lint, TypeScript y 50/50 unitarias. Build de producción aprobado. Guarda/integración local efímera aprobada (datos, drift y dominio inesperados rechazados), actionlint 1.7.12 de ambos YAML sin hallazgos. Sin E2E destructiva o tests contra staging. |
| 10. Modificaciones | Dos workflows, guarda compartida, manifiesto de SQL/catálogo, pruebas locales, guías Neon/Render/operación, PROGRESS y BUILD_LOG. No cambios de aplicación, modelos, migraciones, ORM, dependencias, lockfile o .env.local. |
| 11. Commit de implementación | d85ff0e2ecfd8baa1935985aa1c744e4924f901f, publicado mediante push normal sobre 70984e42d862d8c47e34531648f8c531698cb42e. El informe/registro del intento fallido se conserva en un commit documental posterior; SHA remoto definitivo en la entrega. Sin reescritura de historial. |
| 12. Antes de Render | Acceso API de GitHub/Actions, identidad de proyecto verificada, check real exitoso y migración/status/catálogo remotos; luego rol runtime mínimo separado, URL privada runtime, variables/HTTPS/health, decisiones de Free/backup y autorización de despliegue. |

## Desbloqueo necesario

Permitir api.github.com en la política admitida del entorno y disponer de acceso autenticado con permisos de consultar/iniciar Actions para el repositorio oficial. La autorización del propietario para esas operaciones ya existe; no es necesario volver a pedir permiso para los mismos commits/push/migraciones condicionales. No se elude la denegación por otro endpoint o extrayendo credenciales Git. No compartir secretos por chat.

Si PostgreSQL no expone neon.project_id, configurar la variable de repositorio **NEON_STAGING_EXPECTED_HOST** con el hostname directo obtenido independientemente de la consola del proyecto cold-shadow-53495242. Solo hostname, nunca URL/password; no se imprime. Esto evita autoaprobar el destino usando únicamente el propio secreto. La guarda falla antes de escribir si no puede establecer ese vínculo.

Después: ejecutar primero check en main y registrar su URL/ID real. Solo si pasa, ejecutar migrate con ese connection_run_id para el mismo SHA y confirm_target exacto. Si un dato/objeto/historial/destino difiere, detenerse sin borrado o reset. Documentación completa: NEON_STAGING.md y RENDER_STAGING.md.

Enlaces a las **definiciones**, no a ejecuciones:
- https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/neon-staging-check.yml
- https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/workflows/neon-staging-migrate.yml

No se creó rama/backup Neon sin poder comprobar acceso/cuota/coste; no se compraron servicios. Cinco agentes y cinco automatizaciones locales siguen deshabilitados, presupuesto cero y cero ejecuciones. Sin Render desplegado, pagos, correo, IA real, indexación o cuenta administrativa humana.
