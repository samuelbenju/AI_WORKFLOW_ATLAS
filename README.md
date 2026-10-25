# AI Workflow Atlas

Plataforma independiente sobre herramientas y flujos prácticos de IA. Nombre comercial provisional. Público en inglés, administración futura en español. **Entrega actual: Fase 1**, aplicación base; sin directorios persistentes, login, newsletter, pagos ni agentes activos.

## Requisitos y versiones

Node.js 24 (fijado en `.nvmrc` a `24.19.0`) y npm 11 (`11.9.0`). Next.js 16.4.3, React 19.3.1, TypeScript estricto 5.9.3 y Tailwind 4.3.3. Dependencias exactas en `package.json` y `package-lock.json`. No hacen falta cuentas de servicios, PostgreSQL ni credenciales para esta fase.

## Instalar y desarrollar

Desde el checkout existente; no crear otro proyecto ni un worktree:

```bash
cd /workspace/Quesito
# En otros equipos: entrar en el directorio donde se haya clonado este repo.
# Si usas nvm: nvm install && nvm use
npm ci
npm run dev
```

El servidor utiliza el puerto 3000 por defecto. Se puede cambiar: `npm run dev -- --port 3001`. Para detenerlo, Ctrl+C. No sobrescribir `.env.local` existente. Opcionalmente copiar `.env.example` a `.env.local`; sin archivo de entorno la aplicación usa `http://localhost:3000` para metadata.

En el cloud restringido, si la caché por defecto no permite escritura:

```bash
npm --cache /workspace/.cache/npm ci
```

No es necesario reinstalar si `node_modules` ya corresponde al lockfile. La instalación cloud no necesita ampliar permisos del sistema.

## Configuración

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `SITE_URL` | No en desarrollo | Origen HTTP(S), por ejemplo `http://localhost:3000`. Sin ruta, query, fragmento ni credenciales. Se valida con Zod; requiere rebuild para metadata de producción. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Solo tests con navegador del sistema | Ruta al Chromium existente, en este cloud `/usr/bin/chromium`. No es variable de la aplicación. |

No hay claves activas de IA/email/pagos ni conexión DB. Sus variables se documentarán en las fases correspondientes. Nunca escribir secretos en `.env.example`, Git, logs o argumentos compartidos. No se exponen variables `NEXT_PUBLIC_`.

## Verificación

```bash
npm run check        # lint sin warnings + tipos Next/TS + tests unitarios
npm run build        # build real de producción; no ejecuta ESLint por sí mismo
npm run test:e2e     # inicia y detiene su propio servidor de producción en 3100
```

Los tests E2E necesitan un build actual y Chromium. En un equipo/CI donde no esté instalado:

```bash
npx --no-install playwright install chromium
# En Linux con permisos adecuados y dependencias de SO faltantes:
# npx --no-install playwright install --with-deps chromium
```

En este cloud se reutiliza Chromium del sistema, sin descargar ni instalar otro:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Playwright usa dos workers, escritorio y móvil, puerto 3100 reservado para su servidor, sin reutilizar procesos ajenos. Prueba navegación, render sin errores JS, honestidad del estado, HTTP 404, headers, health, teclado, ancho móvil, reduced motion y reglas automatizadas WCAG mediante axe. Reportes y capturas generados ignorados en Git. Es una base de accesibilidad, no una certificación WCAG ni una auditoría completa.

Aviso de tooling: npm marca ESLint 9 como fuera de soporte. Se mantiene 9.39.5 por las restricciones de los plugins de la configuración oficial Next; no se han forzado peers incompatibles con ESLint 10. Revisar actualización conjunta antes de lanzamiento. Ver ADR-010 en `ARCHITECTURE.md`.

## Arranque de producción local

```bash
npm run build
npm run start
```

Con el proceso activo, verificar internamente:

```bash
curl --fail --silent http://127.0.0.1:3000/api/health
curl --fail --silent http://127.0.0.1:3000/ > /tmp/atlas-home.html
```

Health debe responder `{"status":"ok"}`. Es liveness de la aplicación, **no** verificación de DB u otros servicios. Comprobar además la página en navegador; un puerto abierto no demuestra funcionalidad. No se generan enlaces públicos a localhost en onboarding.

## Estructura

```text
src/app/              rutas, layout, estilos, not-found, health
src/components/       marca, navegación, footer y diagrama ilustrativo
src/lib/config/       validación Zod y configuración en servidor
tests/unit/           contrato de configuración
tests/e2e/            navegador y contratos HTTP
.github/workflows/    CI de lint, tipos, tests, build y navegador
```

Sin base de datos en Fase 1; la Fase 2 añadirá PostgreSQL/Prisma/migraciones/seed. No se ha creado `/admin` sin protección. La portada no recopila datos personales y no contiene formularios que aparenten enviar información.

## Despliegue y operación futuros

Destino previsto: Vercel o servicio Node compatible con Next.js. Instalar con `npm ci`, construir con `npm run build`, iniciar con `npm run start` donde corresponda. Configurar `SITE_URL` real antes de build. No se ha contratado, desplegado ni publicado ningún servicio. Todas las páginas conservan `noindex, nofollow` en meta y headers durante pre-lanzamiento; no retirarlo sin revisión. SEO completo y políticas legales se implementarán en sus fases.

Los procesos locales no sobreviven necesariamente a snapshots/restauración: reiniciar según instrucciones guardadas del entorno. El snapshot conserva archivos/dependencias, no sustituye backups de la futura base de datos. Costes, dominio, auth, DB administrada, correo, Wompi Sandbox, IA y scheduler requieren configuración por fase; el objetivo US$0–100/mes no autoriza gasto.

CI escrita para GitHub Actions, todavía no ejecutada remotamente ni publicada. Usa permisos de lectura, `npm ci`, checks, build y Chromium. Ninguna acción del pipeline despliega o cobra.

## Continuar por fases

Leer `AGENTS.md`, `PROGRESS.md` y la fase pertinente de `PLANS.md`. `PRODUCT_SPEC.md` conserva el alcance integral; `ARCHITECTURE.md` explica decisiones; `BUILD_LOG.md` registra pruebas y bloqueos. No iniciar una fase posterior automáticamente. Para seguir, solicitar expresamente la Fase 2.
