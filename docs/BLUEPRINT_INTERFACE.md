# Reporte entrega 2 — interfaz de blueprints

29-10-2026. Extiende entrega 1 y [almacenamiento 1.5](BLUEPRINT_STORAGE.md); no otro backend, registro de leads, sistema de autorización o proveedor. Implementación/pruebas locales separadas de la activación remota pendiente de Object Storage. No se ha publicado un blueprint real en Neon ni en GitHub.

## Contrato de página y componentes

`/use-cases/[slug]` conserva metadata, canonical, breadcrumbs, instrucciones, herramientas/relaciones y política editorial. La sección de blueprints se carga en **Suspense**, fuera del contenido principal. Guías demo o sin releases públicas no reciben botones ni datos privados. Un fallo de registry se muestra como información temporalmente no disponible, con log de etapa/código fijo; no se inventa una lista vacía para ocultarlo.

Se reutilizan `publicBlueprintsForGuide(slug, after?)`, `publicBlueprintDescriptor(id, version)` y el GET existente. Descubrimiento acotado a 20 versiones, cursor público y orden estable; un único resultado inequívoco se muestra directamente. Con varias versiones el visitante elige expresamente mediante un formulario GET; no se selecciona el mayor SemVer por defecto. `blueprintRelease=id@version` selecciona y `blueprintAfter=id@version` pagina; ambas queries quedan noindex/canonical de guía por la política existente. El servidor comprueba también que la selección corresponde a esa guía. No nuevas landing pages o API pública.

- `BlueprintDownloadBox`: título/versión/plataforma/formato/tamaño/fechas, método real de revisión, licencia/atribución/fuentes, archivos individuales y hash declarado. Static review no se presenta como ejecución probada.
- `BlueprintDownloadButton`: único componente cliente nuevo. Fetch solo por acción del usuario, sin cookies/email/suscripción/observer; maneja 404/429/503/red/otros errores y comprueba tamaño/SHA también en el navegador antes de entregar un Blob attachment. “Your download has started” significa entrega al navegador, **no** confirmación de archivo guardado en disco. Enlaces opcionales a setup y directorio; newsletter solo si proveedor/configuración y revisión legal vigentes, sin inscripción automática. No enlace GitHub inventado.
- `BlueprintArchitecture`: HTML/CSS y lista ordenada accesible, sin librería gráfica o ejecución de JSON. Siempre **conceptual**, desde metadatos revisados o instrucciones editoriales existentes; no representa un trace/integración ejecutada. Más de seis pasos usan disclosure nativo de teclado. Fallback acotado a 20 pasos y aviso si la guía contiene más.
- `BlueprintRequirements`: requisitos/cuentas/instrucciones de credenciales/compatibilidad con fuente/limitaciones/costos declarados. Sin tiempo/precio inferido. Si faltan requisitos específicos se avisa; nunca se solicita una clave privada en Atlas. Herramientas y documentación enlazadas siguen siendo las de la guía.
- `ServiceInquiryCard`: solo con contacto explícitamente público y configuración legal revisada existente. `mailto` privado para que el usuario decida enviar; no llamada backend/CRM, reserva, promesa de disponibilidad o patrocinio disfrazado. Sin contacto autorizado no se muestra.

## Extensión compatible del manifiesto

`schemaVersion=1` conserva todos los campos anteriores y añade **presentation opcional sin defaults**. Parsear un manifiesto anterior conserva exactamente su representación/digest; no se actualizan registros previos. Solo nuevas versiones o DRAFT no sellados pueden aportar/cambiar metadata; una versión verificada sigue siendo inmutable.

```typescript
presentation?: {
  architecture?: { kind: 'conceptual'; steps: { title: string; description?: string }[] };
  requirements?: {
    prerequisites: string[]; accounts: string[]; credentialSetup: string[];
    limitations: string[]; externalCosts: string[];
    compatibility?: { description: string; source: string /* HTTPS revisada */ };
  };
  setupInstructions?: string[];
}
```

Máximo 20 pasos/instrucciones, longitudes acotadas y validación estricta. `credentialSetup` son instrucciones públicas, **no valores de credenciales**. No se debilita el filtro de archivos/secretos para aceptar esos textos. La metadata completa forma parte del digest y de la misma aprobación humana DRAFT→VERIFIED→PUBLISHED.

## Disponibilidad, seguridad y medición

La página verifica existencia/tamaño mediante metadata (`exists`), hasta cuatro operaciones simultáneas y únicamente de la release seleccionada; nunca descarga los bytes al abrir la guía. Descriptor público puede contener href, pero se extraen solo campos estrictos de archivo antes de entrar al proveedor. Falta de archivo suprime botón; fallo/configuración no disponible muestra estado temporal. Head no es garantía de integridad: cada GET posterior revalida release/guía/bytes/formato/SHA/secretos, vuelve a autorizar y mantiene límites de entrega 1.

La UI no puede publicar ni reactivar una versión, ni suplir un archivo ausente. Link/botón obsoleto tras retirada obtiene 404. No se exponen rutas de disco/bucket, credenciales, revisores o evidencias internas. Texto editorial escapado por React; no HTML arbitrario, scripts ejecutados, modelos de pago, cuentas/servicios nuevos o cambios SQL. SDK S3 solo servidor, no en bundles públicos.

La medición sigue **preparada sin persistencia** por el CHECK SQL anterior. No escrituras por GET, eventos sustitutos o activación de tracking. Descargas sin consentimiento siguen siendo gratuitas y accesibles; no crean sesiones analíticas o suscriptores.

## Verificación y dependencias

`npm run check`, `npm run build`, `node scripts/test-blueprints.mjs`, suite SEO y `npm run test:e2e -- --workers=1`. El runner añade una DB `_test` distinta para UI, con actores/objetos sintéticos locales y limpieza final. Playwright descarga bytes reales desde Next; prueba ausencia/selección de versiones/múltiples archivos/retirada/errores, privacidad/SEO, texto malicioso, 20 nodos largos, móvil/escritorio, teclado, estructura ARIA y axe. No equivale a una revisión manual con NVDA/VoiceOver o a un despliegue remoto.

Resultados y correcciones en BUILD_LOG.md; SHA/CI específicos se informan al terminar. **Pendientes remotos**: configurar/probar bucket privado en proyecto existente, confirmar persistencia Next/redeploy y runtime Render con esa configuración. Antes de publicar el primer archivo real: autoría/licencia/fuentes y compatibilidad revisadas, carga privada con readback y transiciones autorizadas existentes. No se autoriza automáticamente ninguna automatización comercial.
