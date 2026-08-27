# Proposal: auth-login-and-route-protection (TK-031, absorbe TK-030)

## Why

Hoy **cualquiera puede reescribir el catálogo**: crear, editar y borrar productos, o subir un CSV
que hace upsert masivo, son operaciones abiertas sin identidad. El proyecto ya tiene todas las
piezas para cerrarlo — módulo `auth` con JWT funcional, `AuthGuard` heredado del template, y el
usuario demo sembrado por migración — pero están desconectadas: el guard del FE está apagado con
`CONFIG.auth.skip = true` y el sign-in apunta a rutas que ya no existen.

Esto también cierra el gap de auditoría de TK-030: `import_batches` responde *qué, cuándo y con
qué resultado*, pero no **quién**. Sin identidad en la petición, esa columna no se puede llenar.

Actualiza la decisión de `initial.md` §10.2 ("sin autenticación"): la auth deja de ser un punto de
extensión teórico y pasa a proteger exactamente la superficie que muta datos, sin cerrar la tienda.

## What Changes

- **Login end-to-end** con el usuario demo (`demo@demo.com` / `demo`): sign-in real contra
  `POST /api/v1/auth/sign-in`, token persistido, sesión restaurada al recargar, y logout.
- **Frontera de protección** (decisión del usuario): **las compras siguen públicas** — un cliente
  navega el catálogo y compra sin cuenta. Se exige sesión para el alta y gestión de productos, el
  import CSV y su historial, el status y el CRUD de usuarios.
- **BE**: guard JWT reutilizable en `common/guards/` aplicado a los endpoints protegidos, con 401
  documentado en Swagger. El identificador del usuario autenticado queda disponible vía decorador.
- **FE**: `AuthGuard` activo sobre `/dashboard/*`, interceptor de request en `lib/axios` que
  adjunta el token, manejo de 401 (limpiar sesión y enviar a sign-in preservando el destino), y la
  UI de sesión (usuario actual + logout) reusando componentes ya existentes del layout.
- **Atribución de imports (ex TK-030)**: columna `imported_by` en `import_batches` poblada con el
  email del usuario autenticado; el historial y el detalle de batches muestran "Imported by".
- **BREAKING**: los endpoints de escritura de products, el import y sus consultas dejan de aceptar
  peticiones anónimas — devuelven 401 sin `Authorization: Bearer`.

## Capabilities

### New Capabilities

- `auth-session`: ciclo de vida de la sesión — credenciales del usuario demo, emisión y validación
  del JWT, persistencia y restauración en el cliente, expiración y logout.
- `route-protection`: la frontera público/protegido en ambos lados — qué endpoints exigen sesión,
  qué rutas del FE están tras el guard, y el comportamiento observable ante una petición sin token
  o con token inválido.
- `import-attribution`: registro y exposición del actor que ejecutó cada import de catálogo.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío — este change introduce las tres capacidades desde cero.

## Impact

- **`api/`**: `common/guards/` (guard JWT reutilizable) y `common/decorators/` (usuario actual);
  controladores de `products`, `import`, `status` y `users`; migración que agrega `imported_by` y
  la entidad `ImportBatch`; specs de los controladores protegidos.
- **`web/`**: `auth/context/jwt` y `auth/guard`, `config-global.ts` (`auth.skip`), interceptor en
  `lib/axios.ts`, rutas de `dashboard`, layout (UI de sesión), vistas de import e historial de
  batches, y los specs e2e que ahora deben autenticarse antes de operar el dashboard.
- **Docs**: `initial.md` §10.2 (decisión actualizada), `README.md` (credenciales demo y qué queda
  público), `docs/backlog.md` (TK-031 y cierre de TK-030).
- **Riesgo de contrato**: los e2e y cualquier consumidor del API que hoy escriba sin token dejan de
  funcionar hasta adoptar el header.
