## Context

El API expone hoy toda su superficie sin identidad: `POST/PATCH/DELETE /products` y
`POST /products/import` —la operación que hace upsert masivo del catálogo— aceptan peticiones
anónimas. En el frontend, el `AuthGuard` heredado del template existe pero está desactivado por
`CONFIG.auth.skip = true`, y el flujo de sign-in apunta a rutas del mock que ya no existen.

Las piezas necesarias ya están construidas y probadas:

- **BE**: módulo `auth` con `sign-up`, `sign-in` y `me`; `JwtStrategy` de passport con el secreto
  vía `ConfigService`; y `@UseGuards(AuthGuard('jwt'))` ya funcionando sobre `/auth/me`, lo que
  demuestra el patrón de extremo a extremo. El usuario demo se siembra por migración idempotente.
- **FE**: `auth/context/jwt` (provider, acciones, utils), `auth/guard` (`AuthGuard`, `GuestGuard`,
  `RoleBasedGuard`), y las vistas `jwt-sign-in-view` / `jwt-sign-up-view`.

Restricción de producto que condiciona todo el diseño: **la tienda y la compra son públicas**. Un
comprador no debe necesitar cuenta, así que la protección no puede aplicarse "a toda la app".

## Goals / Non-Goals

**Goals:**

- Sesión real de extremo a extremo con el usuario demo sembrado, restaurable tras recargar.
- Proteger la superficie que muta el catálogo y los datos operativos internos, dejando intactos el
  catálogo público y el flujo de compra.
- Una única forma de decidir qué es público y qué no, auditable de un vistazo.
- Cerrar la atribución de imports (`imported_by`) que arrastraba TK-030.
- Reutilizar los componentes existentes de ambos lados; no construir auth desde cero.

**Non-Goals:**

- Roles y permisos: cualquier usuario autenticado puede gestionar el catálogo. `RoleBasedGuard`
  existe en el template pero queda sin usar.
- Registro de usuarios desde la UI pública, recuperación de contraseña, verificación por email.
- Rotación de refresh tokens: la entidad `User` tiene la columna, pero el ciclo queda fuera.
- Migrar el token a cookie `httpOnly` (ver Risks).
- Proteger el catálogo público o el checkout, por decisión explícita de producto.

## Decisions

### 1. Guard global con opt-out explícito (`@Public`), no opt-in por endpoint

Se registra el guard JWT de forma global y los endpoints públicos se marcan con un decorador
`@Public()`. La alternativa —dejar todo abierto y añadir `@UseGuards` endpoint por endpoint— se
descarta por la asimetría del riesgo: **olvidar proteger** una mutación nueva es un agujero de
seguridad silencioso, mientras que **olvidar marcar público** un endpoint produce un 401 evidente
que se detecta en el primer uso o en los e2e. El sistema falla cerrado.

Ubicación según la skill `be-architecture`: el guard vive en `common/guards/` y el decorador en
`common/decorators/`, ambos agnósticos de dominio y reutilizables.

### 2. La frontera público/protegido

| Superficie | Acceso | Razón |
|---|---|---|
| `GET /health` | Público | Lo consulta la orquestación sin credenciales |
| `GET /products`, `GET /products/:id` | Público | Es la tienda; también la usa el listado admin |
| Compra (`POST /orders`) | Público | Decisión de producto: se compra sin cuenta |
| `POST/PATCH/DELETE /products` | Protegido | Alta y gestión del catálogo |
| `POST /products/import`, `GET .../batches*` | Protegido | Muta el catálogo en masa; el historial es dato operativo |
| `GET /status/db`, `GET /status/redis` | Protegido | Diagnóstico interno (versión de motor, conteos) |
| `/users/*` | Protegido | Administración de cuentas |

En el frontend la frontera se expresa por árbol de rutas: todo `/dashboard/*` queda tras
`AuthGuard`; la tienda, el detalle y el checkout permanecen fuera. El listado admin sigue leyendo
del mismo `GET /products` público — proteger la *pantalla* y proteger el *dato* son decisiones
distintas, y aquí solo la pantalla necesita sesión.

### 3. El token viaja por un interceptor de request sobre nuestra instancia de axios

El template guarda el token en `axios.defaults.headers.common` (`auth/context/jwt/utils.ts`), pero
la aplicación hace todas sus llamadas con la instancia propia de `lib/axios.ts`. Esos defaults
globales no se propagan de forma fiable a una instancia ya creada, así que el token no llegaría a
las peticiones reales. Se sustituye por un **interceptor de request en `lib/axios.ts`** que lee el
token del almacenamiento de sesión y lo adjunta. Efecto colateral deseable: las capas de arriba
(actions, hooks facade, vistas) no se enteran de la existencia del token, lo que respeta la
arquitectura del FE.

### 4. La atribución guarda el email, no el id del usuario

`import_batches.imported_by` almacena el email como `varchar` nullable, no una FK a `user`. Es un
registro de auditoría: debe conservar **lo que era cierto en el momento del import**, aunque
después el usuario se borre o cambie de email — el mismo criterio que ya usa
`unit_price_snapshot` en el diseño de órdenes. Se evita además un join en cada listado. Es
nullable para no invalidar los batches creados antes de esta capacidad.

El valor se toma **siempre del token**, nunca del cuerpo de la petición: un cliente no puede
atribuir un import a otra persona.

### 5. Los e2e se autentican una vez y reutilizan el estado

Los specs de Playwright que operan el dashboard obtienen sesión mediante el usuario demo y
reutilizan el estado de almacenamiento, en lugar de repetir el login en cada test. Los specs de la
tienda pública se mantienen deliberadamente **sin** sesión: son la prueba viva de que la compra
sigue abierta.

## Risks / Trade-offs

- **Token en almacenamiento del navegador expuesto a XSS** → El proyecto ya rechaza markup HTML en
  las entradas (TK-028) y React escapa al renderizar, así que no hay vector conocido de inyección.
  La alternativa robusta es una cookie `httpOnly` + CSRF, que exige cambiar el contrato del API y
  el manejo de CORS; se documenta como el siguiente paso natural en un despliegue real.
- **Un `@Public()` olvidado deja fuera de servicio la tienda** → Es el precio de fallar cerrado.
  Se mitiga con los e2e públicos: navegar el catálogo y comprar sin sesión son escenarios que
  fallan de inmediato si alguien protege de más.
- **Cambio incompatible para consumidores existentes** → Los e2e actuales y cualquier script que
  escriba en el API dejan de funcionar sin token. Se actualizan dentro de este mismo change; el
  README documenta las credenciales demo para el evaluador.
- **Sesión expirada a media operación** → El interceptor de respuesta limpia la sesión y redirige a
  login; el trabajo no guardado del formulario se pierde. Aceptable para el alcance; una renovación
  silenciosa por refresh token lo resolvería y queda como Non-Goal.
- **El status pasa a exigir sesión** → La página de diagnóstico deja de servir como "prueba de vida"
  anónima. `GET /health` sigue público y cubre esa necesidad para monitoreo.

## Migration Plan

1. Migración que agrega `imported_by` nullable a `import_batches` (sin backfill: los batches
   previos quedan sin atribución, comportamiento ya especificado).
2. Desplegar BE y FE juntos: el momento en que el API empieza a exigir token, el FE ya debe
   enviarlo. Un despliegue parcial dejaría el dashboard inoperante.
3. Rollback: revertir ambos servicios. La columna `imported_by` puede quedarse — es aditiva y
   nullable, no rompe la versión anterior.

## Open Questions

- **Duración del token**: hoy la define el módulo JWT del template. Conviene fijarla de forma
  explícita en configuración durante la implementación (un valor corto obliga a re-login frecuente
  sin refresh token; uno muy largo amplía la ventana si se filtra).
- **Sign-up público**: el endpoint existe y hoy es abierto. Se propone marcarlo público para no
  romperlo, pero en un producto real la creación de cuentas administrativas debería ser una
  operación protegida. A confirmar durante la implementación.
