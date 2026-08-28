## 1. BE — Infraestructura de auth reutilizable

- [x] 1.1 `common/guards/jwt-auth.guard.ts`: guard nombrado sobre `AuthGuard('jwt')`, que respeta el decorador `@Public()` vía `Reflector`
- [x] 1.2 `common/decorators/public.decorator.ts`: `@Public()` para marcar endpoints abiertos
- [x] 1.3 `common/decorators/current-user.decorator.ts`: `@CurrentUser()` para leer el usuario del request sin tocar `req` en los controladores
- [x] 1.4 Registrar el guard como `APP_GUARD` global en `app.module.ts` (falla cerrado por defecto)
- [x] 1.5 Fijar de forma explícita la expiración del token en la configuración del módulo JWT (Open Question del design)
- [x] 1.6 Tests unitarios del guard: request sin token → 401; con token válido → pasa; endpoint `@Public()` → pasa sin token

## 2. BE — Aplicar la frontera público/protegido

- [x] 2.1 Marcar `@Public()`: `GET /health`, `GET /products`, `GET /products/:id`, `POST /auth/sign-in`, `POST /auth/sign-up`
- [x] 2.2 Verificar que quedan protegidos por omisión: `POST/PATCH/DELETE /products`, `POST /products/import`, `GET /products/import/batches*`, `/status/*`, `/users/*`
- [x] 2.3 Documentar 401 en Swagger para cada endpoint protegido y añadir `addBearerAuth` al `DocumentBuilder` si no está
- [x] 2.4 Tests de los controladores protegidos: sin token → 401 y la operación no ocurre; con token → comportamiento normal
- [x] 2.5 Test de regresión de la superficie pública: catálogo y detalle responden 200 sin token

## 3. BE — Atribución de imports (ex TK-030)

- [x] 3.1 Migración que agrega `imported_by` (varchar nullable) a `import_batches`
- [x] 3.2 Campo en la entidad `ImportBatch` + exposición en el detalle y el listado de batches
- [x] 3.3 `ImportController` toma el email desde `@CurrentUser()` (nunca del cuerpo) y lo pasa al servicio
- [x] 3.4 Tests: el batch queda atribuido al usuario del token; un `importedBy` enviado por el cliente se ignora; un batch histórico sin atribución se serializa sin error

## 4. FE — Sesión funcional

- [ ] 4.1 `lib/axios.ts`: interceptor de request que adjunta `Authorization: Bearer <token>` (reemplaza el uso de `axios.defaults` del template, que no aplica a nuestra instancia)
- [ ] 4.2 `endpoints.auth` apuntando a las rutas reales `/api/v1/auth/*`
- [ ] 4.3 Conectar `auth/context/jwt` (provider, `signInWithPassword`, restauración de sesión al arrancar) contra el API real
- [ ] 4.4 `config-global.ts`: `auth.skip = false`
- [ ] 4.5 Interceptor de respuesta: ante 401, limpiar sesión y redirigir a sign-in preservando el destino (`returnTo`)
- [ ] 4.6 Vitest del interceptor y del mapeo de errores de auth

## 5. FE — Protección de rutas y UI de sesión

- [ ] 5.1 `AuthGuard` activo sobre todo `/dashboard/*`; tienda, detalle y checkout permanecen fuera del guard
- [ ] 5.2 `GuestGuard` en las rutas de auth para no mostrar el login a quien ya tiene sesión
- [ ] 5.3 Sign-in: revisar `jwt-sign-in-view` — mensajes de error del servidor inline, y precargar/documentar las credenciales demo para el evaluador
- [ ] 5.4 UI de sesión en el layout del dashboard: usuario actual + logout, reutilizando componentes existentes (sin reintroducir el chrome falso eliminado en TK-027)
- [ ] 5.5 Historial y detalle de imports muestran "Imported by"
- [ ] 5.6 Build estricto verde (tsc + eslint sin warnings)

## 6. QA y documentación

- [ ] 6.1 Playwright: fixture de sesión con el usuario demo reutilizando el estado de almacenamiento
- [ ] 6.2 Adaptar los specs existentes del dashboard (products CRUD, import, batches) para que se autentiquen
- [ ] 6.3 Specs nuevos: dashboard sin sesión redirige a login; tras login aterriza en el destino solicitado; la tienda y la compra siguen operando **sin** sesión
- [ ] 6.4 Verificación end-to-end en docker desde volumen vacío: login demo, alta de producto, import, y compra anónima
- [ ] 6.5 `README.md`: credenciales demo, qué queda público y qué exige sesión
- [ ] 6.6 `docs/initial.md` §10.2: actualizar la decisión "sin autenticación" con el alcance real y su justificación
- [ ] 6.7 Cerrar TK-031 y TK-030 en `docs/backlog.md` al archivar el change
