# AI Workflow Atlas — especificación de producto

Fuente: prompt maestro suministrado por el propietario el 25 de octubre de 2026. Esta especificación conserva el alcance completo; su implementación se divide en doce fases y necesita autorización por fase. La primera ejecución autorizó exclusivamente la Fase 1; las autorizaciones posteriores y el estado vigente están en PROGRESS.md. Fase 12 permite auditar/preparar, sin autorización de despliegue, cobros o publicación comercial.

## 1. Identidad y propósito

AI Workflow Atlas es un nombre provisional que debe comprobarse antes del lanzamiento. Empresa digital independiente sobre herramientas, casos prácticos y automatizaciones de inteligencia artificial. `https://agentusecases.ai/` y el experimento de Alex Finn son referencias conceptuales: no copiar marcas, interfaz, artículos, bases de datos ni material protegido.

Construir software real, funcional, seguro y comercialmente utilizable: código, persistencia, integraciones y automatizaciones verificables. No limitarse a ideas, documentación o pantallas que simulan operaciones.

El propietario está en Colombia; el mercado es internacional. Público en inglés, arquitectura preparada para español, administración en español. Audiencias: emprendedores, pymes, profesionales, desarrolladores, equipos comerciales y empresas que automatizan operaciones.

## 2. Resultados comerciales

La plataforma publicará herramientas y casos de uso, ofrecerá tutoriales, atraerá tráfico orgánico, construirá audiencia y newsletter, gestionará publicidad y patrocinadores, procesará pagos, utilizará afiliaciones, registrará ingresos y gastos y generará reportes. Agentes asistirán en la operación con intervención humana limitada y aprobación según riesgo. No prometer ingresos garantizados.

El valor editorial debe ser práctico, con fuentes, instrucciones y limitaciones. No construir un directorio genérico alimentado exclusivamente con texto automático ni crear cientos de páginas de baja calidad.

Fuentes de ingresos progresivas:

- Patrocinios de portada: **Homepage Featured Sponsor**.
- Newsletter: **Newsletter Sponsorship**.
- Posición destacada: **Featured Tool Listing**.
- Contenido identificado como publicidad: **Sponsored Article**.
- Comisiones de afiliados con divulgación explícita.
- Herramientas/productos premium únicamente después de validar demanda.

Precios configurables en administración y calculados en servidor. Los precios propuestos no son contratos ni ventas. Separar ingresos brutos, pagos confirmados, comisiones, gastos y beneficio neto; distinguir Sandbox de dinero real. No inventar clientes, visitas, rankings, clics o resultados.

## 3. Arquitectura requerida

Frontend: Next.js App Router, React, TypeScript estricto, Tailwind, componentes reutilizables, diseño responsive y accesible. Backend: funcionalidades servidor de Next.js, Route Handlers y Server Actions según el caso, Zod, separación de presentación y negocio, acceso y autorización en servidor.

Persistencia: PostgreSQL, Prisma, migraciones versionadas, seed de desarrollo identificado, índices, restricciones y transacciones para operaciones coherentes. Autenticación: Auth.js o alternativa justificada, sesiones seguras, roles, rutas protegidas y permisos por operación.

Infraestructura: GitHub, CI con GitHub Actions, Vercel o compatible, PostgreSQL administrado, variables seguras, registros, backups y recuperación. Correo: Resend o compatible. Pagos: Wompi Colombia Sandbox primero, con interfaz desacoplada. IA: OpenAI Responses API cuando corresponda, proveedor desacoplado y modelos configurables.

Consultar documentación oficial y fijar versiones compatibles; introducir servicios solo cuando se necesiten. Registrar cualquier cambio de arquitectura y su motivo.

## 4. Diseño y experiencia

Identidad original, estilo SaaS tecnológico premium: fondo oscuro elegante, acentos equilibrados, tipografía profesional, espaciado consistente, componentes accesibles, navegación clara, animación discreta y buena experiencia móvil. Paleta orientativa: `#09090F`, `#151522`, `#6366F1`, `#22D3EE`, `#F8FAFC`.

Respetar teclado, foco visible, semántica, contraste, tamaños de pantalla y reducción de movimiento. Los estados vacíos deben explicar la situación sin estadísticas ficticias ni acciones que aparenten funcionar.

## 5. Plataforma pública

| Área | Capacidades finales |
| --- | --- |
| Home | Propuesta de valor, buscador, categorías, herramientas destacadas, casos de uso, contenido reciente, newsletter y espacios publicitarios identificados. |
| Tools | Directorio persistente, búsqueda real, filtros, categorías, etiquetas, paginación, ordenamiento y fichas individuales. |
| Use cases | Directorio; problema, herramientas necesarias, instrucciones, dificultad, limitaciones y referencias por caso. |
| Blog | Artículos, tutoriales, comparativas, guías, categorías, contenido relacionado y metadatos. |
| Sponsor | Oferta comercial, espacios, precios administrables, formularios y registro de solicitudes. |
| Newsletter | Consentimiento, suscripción, confirmación, gestión de bajas y campañas autorizadas. |

## 6. Administración

Panel seguro bajo `/admin`, en español. Módulos progresivos: dashboard empresarial; herramientas; casos; artículos; categorías; patrocinadores; oportunidades; campañas publicitarias; órdenes; transacciones; suscriptores; newsletter; agentes; automatizaciones; analítica; configuración; auditoría y registros.

Todo módulo que maneje datos exige autorización en servidor, validación, persistencia y trazabilidad. Cuando no haya datos, presentar estados vacíos; no usar indicadores comerciales de ejemplo como datos reales.

## 7. Patrocinios y trazabilidad comercial

Flujo: visitante → producto → solicitud → validación backend → PostgreSQL → revisión administrativa → aprobación → orden → checkout → pago confirmado → aprobación de campaña → publicación → reporte.

Registrar cada solicitud y cada transición sensible. Los importes no se aceptan del navegador. Toda publicidad y relación comercial se identifica claramente. Un pago no supone aprobación editorial o activación automática de campaña.

## 8. Pagos

Primera integración Wompi Colombia Sandbox. Proveedor desacoplado para permitir alternativas legales y técnicas para compradores internacionales. Wompi Colombia opera en COP según la premisa del producto; verificar documentación vigente al implementar. No presentar cobros internacionales o conversión de moneda como resueltos.

Requisitos: órdenes con referencias únicas; moneda e importe en unidades mínimas calculados en servidor; firma de integridad; webhooks con autenticidad verificada; idempotencia; estados y eventos persistidos; conciliación básica; entornos Sandbox/producción separados. No guardar tarjetas completas. Nunca activar campañas por la URL de retorno del navegador. Cobros reales requieren autorización explícita.

## 9. Agentes autónomos

Infraestructura propia desplegada, tareas programadas y workers cuando corresponda; no depender de mantener Codex abierto.

| Agente | Responsabilidad |
| --- | --- |
| CEO | Consolidar indicadores, priorizar tareas, coordinar agentes, detectar riesgos, reportar y proponer mejoras. |
| Investigador | Herramientas, tendencias, oportunidades, fuentes verificables e información estructurada. |
| Editor | Borradores, tutoriales, actualizaciones, organización y enlaces internos. |
| SEO | Metadatos, errores, oportunidades, arquitectura de contenido y recomendaciones. |
| Comercial | Clasificación de solicitudes, investigación empresarial, propuestas, sugerencias de precio, borradores y conversiones. |

Cada agente tiene identificador, rol, prompt versionado, herramientas permitidas, estado, configuración, límite de consumo, tareas, historial, errores, reintentos y requisitos de aprobación. Registrar ejecuciones reales y consumo. Nunca falsificar trabajo.

Fuentes externas son datos no confiables: prevenir prompt injection, limitar herramientas y destinos, separar secretos de contexto y exigir aprobación humana para publicación, comunicaciones, campañas y operaciones sensibles según riesgo.

## 10. Automatización

Tareas persistentes con programación, estados, worker, reintentos limitados, concurrencia, idempotencia, cancelación, presupuestos, logs, trazabilidad, alertas y aprobación. Reservar capacidad y gasto antes de ejecutar; no iniciar llamadas costosas sin límites. No usar bucles infinitos en funciones serverless ni depender de procesos de esta sesión para operar el negocio.

## 11. Newsletter

Captación con consentimiento verificable, confirmación cuando corresponda, baja, gestión administrativa, borradores, plantillas, historial y patrocinios identificados. No enviar sin proveedor configurado y autorización. No revelar listas ni estados de suscripción en respuestas públicas.

## 12. SEO, crecimiento y medición

Sitemap, robots, canonical, metadatos, Open Graph, datos estructurados adecuados al contenido, imágenes optimizadas, enlaces internos, páginas indexables una vez listas y RSS cuando aporte valor. Preparar Search Console y GA4 o equivalente, conversiones y seguimiento de afiliados. No activar medición sin configuración y evaluación de consentimiento aplicable.

No simular métricas ni rankings ni publicar contenido masivo de baja calidad. Las páginas incompletas de pre-lanzamiento permanecen sin indexación.

## 13. Modelo de datos progresivo

Entidades previstas: `User`, `Account`, `Session`, `Category`, `Tag`, `Tool`, `UseCase`, `Article`, `Sponsor`, `SponsorshipPackage`, `SponsorshipCampaign`, `CommercialLead`, `PaymentOrder`, `PaymentTransaction`, `PaymentEvent`, `NewsletterSubscriber`, `NewsletterCampaign`, `Agent`, `AgentTask`, `AgentExecution`, `ContentDraft`, `AuditLog`, `SiteSetting`.

No crear todas las tablas por adelantado. Cada fase añade sus modelos y migraciones respetando relaciones, restricciones y datos existentes. El registro financiero distinguirá gastos de ingresos y cantidades liquidadas de importes previstos.

## 14. Seguridad y protección de datos

Autenticación y autorización servidor, secretos protegidos, Zod, consultas seguras, prevención de inyección y XSS, sesiones seguras, limitación de solicitudes y abuso, webhooks verificados e idempotentes, auditoría, errores seguros, herramientas externas restringidas y protección de datos personales. Nunca subir secretos o cambiar permisos globales para eludir restricciones.

Preparar borradores editables de Privacy Policy, Terms of Service, Cookie Policy, Advertising Disclosure, Affiliate Disclosure y Contact. Revisar Ley 1581 de 2012, obligaciones tributarias colombianas y normas de mercados atendidos con asesoría competente antes de lanzamiento. No afirmar cumplimiento jurídico completo sin revisión.

## 15. Presupuesto y lanzamiento

Objetivo orientativo: US$0–100/mes de infraestructura cuando sea viable, excluyendo trabajo humano. **No autoriza gasto.** Inventariar hosting, PostgreSQL, dominio, correo, API IA, automatización, comisiones y otros servicios. Configurar topes y revisar precios vigentes antes de contratar; no prometer disponibilidad de planes gratuitos.

Publicación y producción, comunicaciones externas y cobros reales exigen autorización. Identidad comercial, dominio, aspectos jurídicos, tributación, backups, recuperación y costes son puertas de lanzamiento, no garantías suministradas por código.

## 16. Desarrollo incremental y continuidad

Un único repositorio. Inspeccionar primero, preservar cambios y módulos funcionales, usar versiones reproducibles, no duplicar proyectos ni repetir instalaciones exitosas. No ejecutar todas las fases, ampliar permisos innecesariamente, inventar pruebas o insistir indefinidamente ante fallos de red.

Cada solicitud ejecuta exclusivamente la fase expresamente autorizada. En la primera ejecución crear documentos de control y desarrollar solo Fase 1. Actualizar estado, arquitectura y resultados reales. Un bloqueo externo requiere un número limitado de intentos diagnosticados, registro y trabajo independiente posible.

Mantener `AGENTS.md` breve y con referencias; `PRODUCT_SPEC.md` completo; `ARCHITECTURE.md`; `PLANS.md` con 12 fases, dependencias y aceptación; `PROGRESS.md`; `BUILD_LOG.md`; `README.md`; `.env.example` sin secretos. Consultar solo archivos relevantes y evitar volver a investigar decisiones estables sin motivo. No usar agentes adicionales para tareas resolubles por esta ejecución.

## 17. Aceptación global

El producto final debe demostrar aplicación ejecutable, directorios, contenido persistente, búsqueda real, autenticación segura, gestión administrativa, solicitudes y patrocinios, órdenes y Wompi Sandbox, newsletter, agentes ejecutables, programación persistente, registros, métricas reales, seguridad, experiencia móvil, build de producción y documentación reproducible.

Ninguna fase está completa si falta un requisito crítico o su verificación. Un build correcto no demuestra integraciones no ejecutadas. `PLANS.md` define las entregas; `PROGRESS.md` informa qué existe realmente.
