# Administración — Fase 4

Panel privado en español: `/admin`; acceso en `/login`. PostgreSQL es obligatorio. No hay registro público, usuario administrador por defecto ni contraseña pública. Los seeds de desarrollo no crean cuentas con acceso. Los módulos comerciales, newsletter y agentes solo documentan capacidades futuras; no ejecutan esas operaciones.

## Primer propietario y recuperación

Desde el checkout, con las dieciséis migraciones aplicadas y `DATABASE_URL` privada:

```bash
npm run db:status
# Configurar el correo en ADMIN_BOOTSTRAP_EMAIL dentro de .env.local privado,
# o usar --email con el correo elegido. Nunca pasar una contraseña por argumentos.
npm run admin:init
```

El comando exige una terminal interactiva, pide la contraseña dos veces **sin eco** y exige entre 14 y 128 caracteres. Guarda únicamente un hash scrypt con sal aleatoria en PostgreSQL. No escribe la contraseña en archivos, variables persistentes, logs o documentación; no debe compartirse por chat. El correo elegido por el propietario de este entorno está preparado solo en configuración privada. **La cuenta humana aún requiere que su propietario elija la contraseña ejecutando este comando.**

La inicialización toma un bloqueo transaccional PostgreSQL y rechaza un segundo bootstrap si ya existe un OWNER/ADMIN activo con credenciales. No expone un endpoint web de inicialización. Quien puede ejecutar el comando con permisos de escritura de DB ya es un operador privilegiado: proteger acceso al servidor y a esa credencial.

Para Render Free + Neon staging sin shell SSH, usar el checkout privado Windows/Node 24 del propietario y `scripts/admin-staging.ps1`. Ejecuta el mismo `admin:init -- --staging`, con comprobación previa de destino, TLS y rol runtime limitado; contraseña elegida localmente sin eco. Procedimiento exacto y restricciones en [CATALOG_OPERATIONS.md](CATALOG_OPERATIONS.md#primer-owner-desde-windows). Esta entrega prepara y prueba los servicios; no crea la cuenta humana ni verifica un login remoto sin su intervención privada.

Para cambiar una contraseña o recuperar acceso sin correo transaccional:

```bash
npm run admin:password
# También admite -- --email DIRECCION si hace falta seleccionar otro administrador.
```

Exige el mismo ingreso oculto y revoca todas las sesiones de la cuenta. No existe todavía recuperación pública por email ni gestión web de usuarios/roles. Un cambio de rol o desactivación administrado por el operador en PostgreSQL se verifica en la siguiente petición. No otorgar roles mediante parámetros del navegador.

## Origen, sesiones y controles

- `ADMIN_ORIGIN` debe coincidir exactamente con el origen del navegador. Si falta, usa `SITE_URL` o `http://localhost:3000`. Por ejemplo, acceder por `127.0.0.1` cuando se configuró `localhost` requiere ajustar el origen. No se aceptan comodines ni se deriva la confianza del Host de la petición.
- Fuera de localhost/127.0.0.1/::1, se exige HTTPS. En HTTPS la cookie se llama `__Host-atlas_session`, es Secure, HttpOnly, SameSite=Lax, path=/ y sin Domain. HTTP solo se admite en loopback para desarrollo, con `atlas_session`.
- Tokens aleatorios de 32 bytes, solo su SHA-256 en DB. Caducidad fija de ocho horas, sin renovación implícita. Cada petición resuelve la sesión y consulta estado/rol actuales; cookies manipuladas, expiradas o revocadas no autorizan. Login rota una sesión anterior; logout elimina la sesión y la cookie. No se guardan credenciales o tokens en localStorage.
- Todas las mutaciones comprueban Origin exacto y rechazan Sec-Fetch-Site cross-site. CRUD/configuración/logout además requieren token CSRF ligado a la sesión, enviado en header. Login solo devuelve la cookie; no permite callback externo.
- Limitación de login en PostgreSQL, compartida entre procesos: 5 intentos por correo cada 15 minutos y 60 globales por minuto. La ventana se actualiza atómicamente. Login correcto limpia el contador de su correo. Ausencia de cuenta/contraseña inválida produce el mismo mensaje y derivación scrypt ficticia; no se publica existencia de cuentas.
- Scrypt nativo de Node: N=131072, r=8, p=1, sal de 16 bytes y digest de 64, comparación constante. No se almacena ni registra contraseña reversible. No se añadió una dependencia criptográfica propia.
- Respuestas privadas no-store, JSON estricto y limitado a 64 KB (4 KB login), Zod, consultas parametrizadas y texto escapado por React. No HTML arbitrario, URLs ejecutables o con credenciales. Errores no exponen consultas/DSN/hash. No se exportan usuarios o contraseñas por APIs de contenido.

Alternativa a Auth.js (ADR-021): este alcance tiene una cuenta local administrada por operador y no requiere OAuth/proveedores externos. Sesiones opacas persistidas, revocables y autorización explícita evitan añadir un proveedor sin configurar o un acceso simulado. Los mecanismos criptográficos son APIs estándar Node; los servicios propios y sus límites quedan probados y documentados.

## Permisos y CRUD

| Operación | OWNER / ADMIN | EDITOR | VIEWER / anónimo |
| --- | --- | --- | --- |
| Panel y lectura de contenido | Sí | Sí | No |
| Crear/editar categorías y etiquetas | Sí | Sí | No |
| Crear/editar herramientas/casos borrador o en revisión | Sí | Sí | No |
| Publicar/archivar/destacar/cambiar marca demo | Sí | No | No |
| Editar registros publicados/archivados | Sí | No | No |
| Eliminar | Sí | No | No |
| Configuración/auditoría detallada | Sí | No | No |
| CRM/contactos/paquetes/campañas | Sí | No | No |

`/admin/tools`, `/admin/categories`, `/admin/use-cases` y `/admin/tags`: creación, lectura, edición y eliminación reales. Listas buscan nombre/slug y paginan de 12 en 12, con filtro de estado donde existe. Formularios incluyen relaciones existentes; los enlaces siguen reglas del catálogo público. Estado demo/publicado inválido se rechaza, sin publicar el seed para que el panel aparente funcionar.

Cada operación HTTP autoriza en servidor y cada servicio vuelve a consultar al actor. Escrituras y auditoría comparten transacciones Serializable. Slugs únicos y FK se verifican en PostgreSQL; conflictos se informan sin borrar o desconectar registros silenciosamente. La eliminación exige escribir exactamente el nombre actual, muestra un diálogo y rechaza relaciones entrantes de contenidos/campañas. Las asociaciones salientes de un registro eliminable se eliminan con ese registro.

Los indicadores son recuentos de DB; publicaciones excluyen demos/fechas futuras, y ejemplos se indican por separado. No hay cifras de ingresos, visitas o ventas inventadas. Configuración editorial persiste guía y estado inicial (solo borrador/revisión), y esos valores se usan en los formularios. Auditoría muestra las últimas 100 operaciones sin metadatos privados; no se afirma inmutabilidad del log.

## Módulo editorial de Fase 5

`/admin/articles` agrega editor por bloques, fuentes/SEO, preview privado, snapshots, revisión y publicación/despublicación. Conserva Origin/CSRF/roles; EDITOR prepara borradores, OWNER/ADMIN aprueban y publican. No se crea ni activa la cuenta humana por implementar este módulo. Detalles en `EDITORIAL.md`.

## Validación y límites de despliegue

```bash
npm run check
npm run test:db
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Tests de DB/E2E crean y eliminan únicamente su propia base temporal. E2E genera una contraseña aleatoria por ejecución en memoria, cuentas `.invalid` y hashes; no usa el correo humano ni crea administradores en desarrollo. No iniciar directamente el seed de test ni las pruebas mutantes sobre desarrollo/producción. El proceso E2E configura un origen loopback dedicado.

Esto verifica los controles implementados, no una auditoría de seguridad integral. MFA, recuperación por correo, UI de gestión de usuarios, política de retención automatizada de contadores/auditoría y hardening final corresponden a decisiones posteriores. Antes de exposición pública: HTTPS/origen correcto, roles DB mínimos, backups protegidos, protección de abuso en infraestructura y revisión de seguridad. No se ha desplegado ni activado una cuenta humana sin contraseña elegida por su propietario.


Fase 6: CRM en `/admin/sponsors`, separado del acceso editorial. Configurar precios, empresas, solicitudes, notas, propuestas privadas y campañas; no envía comunicaciones ni cambia estados de pagos. Operación y controles en `COMMERCIAL.md`.
