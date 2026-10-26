# Equipo empresarial — Fase 10

## Estado real

Cinco perfiles persistentes y herramientas de servidor sobre **el motor de Fase 9**: misma cola PostgreSQL, worker Docker, reservas, cuotas, leases, cancelación, reintentos y auditoría. No hay otro scheduler, bots en memoria, fallback estático o bucles en funciones serverless. Las pruebas de generación usan `TEST_FIXTURE` en bases temporales: **no acreditan una ejecución real de OpenAI**. Faltan credencial, acceso al modelo, tarifas revisadas, presupuesto y primera tarea autorizados. No se inició Fase 11.

`npm run agents:team:init` registra/preserva los perfiles y cinco programaciones diarias. Solo los nuevos registros nacen deshabilitados, con presupuesto/tarifas cero. Es un CLI de operador con acceso a la DB; la opción equivalente del panel exige OWNER/ADMIN. Repetirlo conserva las decisiones existentes, no vuelve a habilitar ni deshabilitar configuraciones. No llama a IA ni crea ventas/contenido publicado.

## Herramientas y resultados

| Rol | Herramientas autorizadas | Lectura y resultado persistente |
| --- | --- | --- |
| CEO | business_metrics, team_reports, delegate_tasks | Recuentos de DB y órdenes brutas confirmadas PRODUCTION por moneda, Sandbox separado; prioridades/riesgos, propuestas de asignación y reporte ejecutivo. No se infieren beneficio, audiencia, atribución o conversiones de periodos no medidos. |
| Investigador | catalog_opportunities, research_sources | Herramientas/casos publicados y extractos de fuentes seleccionadas con URL, fecha y SHA-256; oportunidades y afirmaciones SOURCE_BACKED o HYPOTHESIS. |
| Editor | approved_research, editorial_context, cms_draft | Investigación aprobada y categorías; crea un Article DRAFT real y snapshot ContentDraft, o actualiza exclusivamente un borrador y versión elegidos. Propone metadatos/categorías; nunca publica. |
| SEO | seo_audit | Diagnósticos deterministas de metadatos, formato e internos cuyo destino falta o dejó de ser público; recomendaciones ligadas a IDs examinados. No altera páginas o SEO en nombre del modelo. |
| Comercial | commercial_snapshot, commercial_proposal | Solicitudes sin datos de contacto, estados agregados y paquetes activos/disponibles con precio de servidor; clasificaciones, sectores hipotéticos y ContentDraft COMMERCIAL_PROPOSAL privados con respuesta/sugerencia de precio. |

Las herramientas son funciones de servidor delimitadas, no nombres que el modelo pueda ejecutar libremente. El motor prepara el contexto autorizado antes de Responses; después valida el contrato específico y aplica únicamente el manejador permitido para ese rol en la transacción de finalización. La API de IA recibe `tools=[]` y un esquema JSON estricto, no shell, SQL, fetch dinámico ni capacidades de envío/pago. La configuración del rol no puede añadir herramientas de otro rol; se comprueba al guardar, aprobar y reclamar trabajo. El analista de catálogo de Fase 9 conserva su contrato reducido y sus pruebas.

Cada tarea empresarial produce un AgentWorkProduct ligado uno a uno a su tarea, con cuerpo estructurado, evidencia/relaciones, revisión humana y enlaces al CMS/lead cuando corresponden. AgentExecution conserva snapshot, modelo/proveedor, uso/coste estimado, errores y resultado. AuditLog registra configuración, decisiones, delegaciones, revisión, fuentes y operaciones de CMS. Informes y clasificaciones son recomendaciones; ninguna aprobación genérica equivale a publicar, contactar, contratar o cobrar.

## Fuentes y límites de investigación

Desde `/admin/agents` el operador recupera explícitamente una URL HTTPS permitida. `AGENT_RESEARCH_HOSTS` contiene hosts exactos, por defecto `raw.githubusercontent.com`. Además debe permitirse el destino en la red del entorno. Solo texto/Markdown/JSON hasta 128 KB, timeout de 10 s, sin redirecciones, IP literal, query, credenciales o puertos alternativos. Se rechazan resoluciones privadas/locales comunes, HTML y posibles secretos. Se conserva contenido, URL, digest, fecha y procedencia FETCHED. Los transportes falsos solo se admiten en DB `_test` y quedan como TEST_FIXTURE; no son aceptados por una DB normal.

No existe un buscador web ni feed de tendencias contratado. El Investigador descubre oportunidades sobre el catálogo y fuentes curadas recuperadas; no se afirma cobertura de Internet ni actualidad de tendencias sin evidencia. La comprobación de DNS previa no fija la IP del socket a través del proxy: mantener hosts de confianza administrados por el operador y restricciones de red; no habilitar dominios arbitrarios de usuarios. Los extractos enviados al modelo están acotados, no se envía un sitio completo.

SOURCE_BACKED significa que se citó una fuente del snapshot, **no que la IA haya demostrado el hecho**. Referencias inexistentes/fuera del contexto o afirmaciones respaldadas sin citas se rechazan. Una persona revisa contenido/afirmaciones y deja una nota antes de aprobar la investigación. Hipótesis conservan esa etiqueta. El Editor necesita investigación aprobada con al menos una afirmación respaldada y fuentes vigentes. Si cambia un digest hay que investigar y revisar de nuevo; no se reutiliza a ciegas una aprobación histórica.

El borrador CMS conserva las fuentes como PENDING y noindex. La revisión/publicación editorial de Fase 5 sigue siendo independiente. Aprobar el resultado empresarial no verifica automáticamente las fuentes del artículo ni lo publica. Al actualizar un borrador se exige su timestamp actual y estado DRAFT, se preservan categorías/relaciones humanas y un snapshot anterior completo. Una edición concurrente o un artículo publicado bloquean el cambio.

SEO examina hasta 30 artículos públicos, metadatos efectivos y enlaces estructurados internos. No ejecuta un crawler externo ni comprueba códigos HTTP de enlaces externos; lo indica en el informe. No accede a Search Console o métricas de buscadores. Comercial analiza hasta 10 solicitudes (o una elegida); omite email/teléfono/web y redacta esos patrones del mensaje seleccionado. No debe introducirse información sensible en briefs o notas de revisión. Las propuestas conservan precio actual de servidor y sugerencia separados, sin cambiar tarifas, estados del CRM, órdenes, campañas ni contratos.

## Coordinación y aprobaciones

1. Configurar perfiles/modelo/tarifas/límites y habilitar únicamente después de autorización. Configuración global y clave se gestionan en servidor; no se incluyen secretos en prompts.
2. Crear tarea CEO con fuentes/solicitud elegidas. Crear no llama a IA. Revisar contexto y aprobar un límite total para sus intentos; hash de configuración **y entrada** invalidan autorizaciones obsoletas.
3. Un resultado CEO válido crea hasta una propuesta por especialista con parentTaskId, clave idempotente y presupuesto cero. El CEO no habilita perfiles ni autoriza su gasto.
4. Revisar contexto de cada propuesta. Investigar primero, revisar el resultado y vincularlo al Editor; elegir un borrador/version si se desea actualizarlo. Aprobar cada llamada por separado. Los informes se guardan aun sin aprobarlos, con estado visible PENDING_REVIEW.
5. Cuando todos los especialistas del ciclo terminan, el motor propone una tarea de consolidación CEO idempotente, presupuesto cero y sin aprobación. Sus lecturas incluyen estados, fallos y resultados del ciclo. El administrador también puede preparar una consolidación manual seleccionando el ciclo, incluidos reportes parciales.
6. Aprobar la consolidación después de revisar los resultados. Esa tarea no abre otra cascada de asignaciones. Los informes no revisados mantienen su estado en el contexto, no se convierten en hechos verificados por reenviarlos al CEO.
7. Revisar/aprobar o rechazar cada resultado con nota y confirmación. La decisión es auditable e inmutable; corregir creando una nueva tarea, sin reescribir el historial.

Errores de permisos, referencias, alcance, versión CMS o resultado inválido no producen artículos/propuestas. Un resultado de proveedor ya recibido puede consumir presupuesto incluso si se rechaza: consultar ejecución/coste/alerta. Se mantienen el fencing y las reglas conservadoras de incertidumbre de Fase 9. Cancelar no recupera tokens que el proveedor ya consumió. Si se cancelan manualmente los últimos trabajos antes de una finalización del worker, puede prepararse el reporte parcial desde el panel.

## Automatizaciones e infraestructura

Las cinco programaciones diarias corresponden a investigación, borradores, SEO, análisis comercial y reporte ejecutivo. Se activan/pausan individualmente en el administrador. **Deshabilitadas inicialmente**; habilitar un calendario solo genera propuestas pendientes con presupuesto cero. El Editor requiere que una persona seleccione investigación aprobada; el calendario no evita ese requisito. No se autoriza gasto recurrente ni publicación/envío automático.

El worker Docker de Fase 9 continúa ejecutando ciclos acotados fuera de Codex/Next, con heartbeat en PostgreSQL. Tras actualizar código, comprobar ausencia de tareas RUNNING antes de `npm run agents:service -- restart` para refrescar su snapshot readonly. Preservar red/proxy/CA y envfile privado. El host debe estar activo; no se afirma despliegue externo o restauración de snapshots en otro entorno. Ver [motor](AGENT_ENGINE.md) para supervisión, recuperación y límites.

## Comprobaciones

`npm run check`, `npm run test:db`, `npm run build`, `npm run test:e2e -- --workers=1` y `npm run test:agent-service`. PostgreSQL/E2E/servicio utilizan DB temporales; nunca ejecutar fixtures sobre producción. Hay pruebas de cinco roles, coordinación completa, borrador/actualización CMS real, propuestas CRM, fuentes/SSRF, permisos, revisión, citas, contexto obsoleto, herramientas prohibidas, cuotas, cancelación, auditoría, escape de texto y UI móvil. Las llamadas de modelo siguen siendo fixtures explícitas. Para verificar OpenAI real falta una primera tarea con credenciales y consumo expresamente autorizados.
