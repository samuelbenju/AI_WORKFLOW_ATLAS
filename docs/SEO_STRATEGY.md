# SEO y crecimiento orgánico — plan de ocho semanas

28-10-2026. Inglés como idioma público principal. Se trabaja con el catálogo existente, sin nuevas publicaciones, migraciones o escrituras en Neon. El apply [40714352948](https://github.com/samuelbenju/AI_WORKFLOW_ATLAS/actions/runs/40714352948) figura SUCCESS; el propietario confirma 101 registros creados y contenido visible. Los conteos editoriales de este documento proceden de la biblioteca versionada, no de una nueva consulta SQL remota.

## Evidencia y alcance de la investigación

Se revisaron los 65 perfiles, sus relaciones con 30 guías, 20 categorías, 24 etiquetas y seis borradores. Los 65 enlaces oficiales devolvieron HTTP 200 en una comprobación HEAD del 28-10-2026. Eso no prueba instalaciones, seguridad, precios, exactitud o rendimiento de los productos. Se conservan las fuentes/hashes editoriales del 26-10; una comprobación de disponibilidad no actualiza su fecha de verificación sustantiva.

Se consultaron recursos primarios públicos de [Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners), [LangChain](https://github.com/langchain-ai/langchain) y [n8n](https://github.com/n8n-io/n8n). Sus READMEs oficiales fueron recuperados por HTTPS; sirven para comparar formatos y cobertura observable. No se obtuvo una SERP, Search Console, Keyword Planner, Ahrefs o Semrush. **No hay volúmenes, dificultad, posiciones ni potencial económico medidos.** Las prioridades siguientes son decisiones editoriales cualitativas basadas en intención, cobertura y posibilidad de aportar una comprobación útil.

| Recurso observado | Contenido observable | Oportunidad diferenciada para Atlas |
| --- | --- | --- |
| Microsoft AI Agents for Beginners | Curso por lecciones y ejemplos de agentes. | Checklist breve de aprobación, fallo y cancelación para una tarea empresarial concreta; enlazar aprendizaje avanzado, sin copiar el curso. |
| LangChain | Inicio técnico, componentes y ecosistema de construcción de agentes. | Explicar cuándo un flujo determinista basta y cuándo considerar estados/agentes; criterios observables y límites antes de elegir framework. |
| n8n | Automatización visual, código y opciones de ejecución. | Especificación del proceso independiente del proveedor: datos mínimos, cola de revisión, permisos, deduplicación y recuperación. No afirmar conectores ejecutados. |

Son recursos que compiten por atención sobre esos temas; esta comparación no demuestra que ocupen una posición concreta en Google ni que falte ese contenido en toda la web. Contrastar después con consultas e impresiones reales de la propiedad verificada.

## Intenciones y clusters prioritarios

Reutilizar `/categories/[slug]`, las fichas y guías existentes. Las combinaciones de filtros siguen noindex; no crear un landing por variación trivial de palabra clave. Los números son asociaciones por categoría y no sumas de visitantes o demanda.

| Prioridad | Consulta de trabajo, por validar con GSC | Intención y recurso útil | Cobertura actual y decisión |
| --- | --- | --- | --- |
| P1 | how to add human approval to an AI workflow | Resolver un proceso: diagrama de decisiones y checklist. | `automation` 4 herramientas/3 guías. Enlazar n8n y la guía de aprobación; evitar una lista genérica de “best tools”. |
| P1 | prepare PDFs for AI search with source references | Preparar documentos: muestra pública pequeña y comprobación por página. | `documents` 5/2, `knowledge-management` 7/2. Docling/AnythingLLM; separar extracción, recuperación y respuesta. |
| P1 | check AI spreadsheet analysis against calculations | Verificar resultados: hoja sintética y totales independientes. | `data-analysis` 3/2. PandasAI/Jupyter AI; no prometer precisión universal ni ahorro. |
| P1 | review an AI coding change before merge | Ejecutar una revisión acotada: diff, pruebas y permisos. | `coding` 6/3. Aider/Codex CLI; cualquier ejecución de modelo exige presupuesto y autorización distintos. |
| P1 | transcribe a meeting with consent and review | Lista de consentimiento, muestra autorizada y comprobación de segmentos. | `transcription` 3/3. Whisper/WhisperX/faster-whisper. No subir voz personal para producir el artículo. |
| P2 | design a support knowledge workflow without auto sending | Diseño de soporte: fuentes, revisión y límite antes del envío. | Dify y guía existente; no afirmar integración WhatsApp/correo sin prueba y fuente específicas. |
| P2 | agent workflow approval and failure states | Elegir arquitectura: transición de estados y prueba conceptual. | `agents` 7/2. LangGraph/CrewAI; no autonomía financiera ni ejecuciones en Atlas. |
| P2 | compare local model answers on a small evaluation set | Diseñar una evaluación propia y reproducible. | `local-models` 2/1. Ollama; publicar resultados solo si se ejecuta y documenta el ensayo real. |
| P2 | build a research brief with checkable citations | Investigar: tabla de afirmación/fuente/incertidumbre. | `research` 3/3. Perplexica/STORM; fuentes primarias, sin confundir cita con prueba de la afirmación. |
| P3 | choose an AI assistant for a bounded task | Descubrimiento: matriz de requisitos y riesgos. | `assistants` 2/0; falta guía directa. Añadirla solo tras revisión, sin nuevo hub duplicado de “productivity”. |
| P3 | AI developer platform evaluation checklist | Evaluar requisitos de despliegue, licencia y datos. | `developer-platforms` 3/0; falta guía directa. Evitar inferir que distribución abierta implica uso comercial gratuito. |

No priorizar por ahora “best AI tools”, “free AI tools” o “AI tools for students” como nuevas páginas: la superioridad, el coste total y la adecuación a estudiantes requieren criterios y cobertura que todavía no se han demostrado. El acceso gratuito a un repositorio no garantiza API, infraestructura o licencia gratuitas.

## Arquitectura y descubrimiento implementados

Ruta natural: portada → `/categories` → categoría existente → herramienta → guía relacionada. Los nuevos hubs leen PostgreSQL; se omiten categorías sin contenido público. Una categoría con un único registro sigue siendo navegable pero queda noindex/fuera del sitemap como política editorial de Atlas, no como umbral impuesto por Google. Las fichas muestran herramientas relacionadas por categorías/etiquetas, ordenadas alfabéticamente, sin ranking comercial. Artículos revisados/publicados enlazados desde herramientas y guías aparecen cuando realmente existan; los seis DRAFT no se muestran.

El índice de herramientas tiene 11 páginas y el de guías cinco con el tamaño actual de seis registros; los enlaces anteriores/siguientes conservan filtros. Cada página sin filtros tiene título y canonical propios. Filtros, búsquedas, queries desconocidas y páginas sin resultados son noindex. Las fichas inexistentes y los borradores responden 404 mediante la comprobación previa al streaming. About explica método, alcance y divulgaciones sin inventar autores, experiencia práctica o sociedad constituida.

El inventario detecta **35 herramientas sin guía directamente relacionada** y tres categorías sin guías (`assistants`, `developer-platforms`, `scientific-research`). No asignar relaciones automáticamente por similitud de palabras. Priorizar primero un problema útil, fuentes y una guía revisada; una ficha sin guía no es por sí sola un error. La categoría científica tiene actualmente una sola ficha y necesita una decisión editorial, no relleno para indexarla.

## Modelo editorial y revisión de los seis borradores

Ficha: propósito y destinatario explícitos; funciones atribuidas a documentación oficial; límites/requisitos; enlace oficial; relación real con guías; fecha de comprobación solo cuando exista evidencia editorial. La fecha de actualización del registro mostrada por la aplicación **no equivale a nueva revisión de fuentes o ensayo del producto**. No introducir precios, ratings, “probado por nosotros” o `SoftwareApplication.offers` sin evidencia visible y verificable.

Guía: problema, resultado propuesto, requisitos, datos autorizados, pasos, comprobaciones, errores/fallos previsibles, limitaciones y alternativas con fuentes. Las 30 guías existentes son propuestas documentadas, no ejecuciones certificadas. Un ejemplo debe identificarse como conceptual o acompañar comandos/resultados reproducidos y fecha/entorno si se ensayó de verdad. Nada se ejecuta contra datos personales o pagos para redactar contenido.

Los seis borradores conservan estado, fuentes y cuerpo en Neon. Las siguientes son tareas de revisión humana; no se han aplicado automáticamente a registros importados.

| Slug del borrador | Mejora concreta antes de solicitar publicación |
| --- | --- |
| `choose-an-ai-tool-by-the-decision-it-supports` | Sustituir recomendaciones amplias por una matriz de decisión con datos permitidos, ejecución local/externa, revisión y salida; enlazar Ollama/Open WebUI y la guía de evaluación. Indicar que no es comparativa de benchmarks. |
| `introduce-ai-at-work-with-a-reviewable-first-task` | Incorporar una plantilla de tarea acotada, responsable de aprobar y criterio para detenerse; enlazar una guía pertinente de automatización/soporte. No incluir afirmaciones generales de productividad. |
| `plan-a-no-code-automation-before-connecting-live-actions` | Añadir contrato de entrada/salida, deduplicación y tabla de fallos/reintentos; enlazar n8n y la guía de aprobación. Revalidar cada integración mencionada con documentación específica. |
| `build-a-research-brief-that-survives-a-source-check` | Incluir tabla de afirmación, fuente primaria, fecha, alcance e hipótesis; contrastar las tres referencias existentes y enlazar Perplexica/STORM. No equiparar fuente accesible con hecho verificado. |
| `use-ai-assistance-without-losing-control-of-your-code` | Adjuntar checklist de diff, pruebas, dependencias, secretos y permisos; usar un ejemplo sintético sin ejecución paga. Enlazar la guía de refactor acotado y distinguir explicación de ensayo. |
| `evaluate-ai-analysis-with-independent-calculations` | Añadir CSV sintético pequeño, sumas esperadas independientes y comprobación de filas faltantes; enlazar PandasAI y la guía de análisis. Publicar resultados numéricos solo después de reproducirlos. |

Todos tienen 11 bloques y dos o tres fuentes en la biblioteca; la longitud no es un criterio de calidad o aprobación. Registrar autor/revisor real autorizado, fuentes releídas, enlaces visibles y límites antes de `reviewedAt`/publicación. El sistema CMS retira la revisión al editar. No atribuir autoría a una persona sin su aprobación. No ampliar los textos por una cuota de palabras.

## Plan y medición

El [calendario de ocho semanas](EDITORIAL_CALENDAR.md) es relativo a la publicación revisada, no un cron. Cada recurso debe aportar una plantilla, decisión o comprobación distinta a la guía existente. Revisión semanal manual: errores/rutas, fuentes, enlaces, queries GSC reales cuando se habiliten, páginas de entrada y lecturas consentidas. Sin muestra suficiente no declarar bajo rendimiento o una mejora causal.

Antes de disponer de datos, validar navegación y tareas de usuario. Después: separar impresiones/clics/CTR/posición de GSC de sesiones/usuarios de GA4 y de eventos propios. Comparar ventanas completas con anotaciones de despliegue, volumen y límites de consentimiento. No sumar usuarios únicos entre filas/dimensiones. No estimar ingresos a partir del tráfico local.

## Idiomas y búsqueda futura

Mantener inglés, `lang=en`, sin `hreflang` inventado. Probar primero uno o dos recursos españoles revisados cuando haya responsable editorial y demanda observada. Si se aprueba, diseñar `/en/` y `/es/` o una política estable equivalente, redirects/canonicals y alternates recíprocos para traducciones completas; requiere un proyecto de migración de URLs y no se aplica ahora. No duplicar páginas por país sin contenido propio.

Con 65 herramientas/30 guías, conservar búsqueda básica PostgreSQL sin modelos externos. Evaluar sinónimos y relevancia con un corpus autorizado pequeño antes de proponer índices full-text/trigramas o una nueva migración. Búsqueda semántica, embeddings o generación de contenido requieren evaluación, API key, presupuesto y aprobación aparte; no bloquean SEO ni activan IA.

## Referencias y comprobaciones pendientes

- [Google Search Essentials](https://developers.google.com/search/docs/essentials), [contenido útil](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [paginación](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), [datos estructurados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies). La ayuda Google no fue accesible desde este entorno: contrastar su versión vigente al revisar el lanzamiento; no se afirma una aprobación de Google.
- [Google AdSense políticas](https://support.google.com/adsense/answer/48182), [CMP EEE/Reino Unido/Suiza](https://support.google.com/adsense/answer/13554116), [ads.txt](https://support.google.com/adsense/answer/7532444). Condiciones de cuenta, certificación y elegibilidad necesitan revisión oficial del propietario.
- El [Public Suffix List](https://github.com/publicsuffix/list/blob/master/public_suffix_list.dat) consultado incluye `onrender.com`; el contrato oficial AdSense admite dominios/subdominios como recurso Site. Ninguno de esos hechos acredita que Google acepte o apruebe este sitio concreto. Evaluar dominio propio con presupuesto autorizado; no se compró ni se migró nada.
- Objetivos de campo p75: LCP ≤2,5 s, INP ≤200 ms y CLS ≤0,1. Lighthouse local no acredita esos objetivos en Render, ni mide INP de usuarios reales. Medición y límites en BUILD_LOG.md.
