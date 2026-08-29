# Design: user-seed-import-attribution (TK-030)

## Contrato de auth (ya existente, se conecta)

- `POST /api/v1/auth/sign-in` `{ email, password }` → `{ ...user, accessToken, refreshToken }`
- `GET /api/v1/auth/me` (Bearer) → user
- FE guarda `accessToken` en `sessionStorage['jwt_access_token']` y lo setea en axios
  (`auth/context/jwt/utils.setSession`) — mecánica del template, hoy desconectada porque
  `endpoints.auth` apunta al mock (`/api/auth/*`). Se corrige a `/api/v1/auth/*`.

## Usuario seed (BE)

- En el SeedService (junto al seed de catálogo, ANTES de él): si no existe el email admin →
  crear con repo de User + bcrypt (mismo hashing que UsersService).
- Credenciales: email `admin@ecommerce.local`, password `SEED_ADMIN_PASSWORD` (env, default
  `Admin123!` — documentado en README y .env.example como credencial de demo local).
- Flag `SEED_ON_BOOT` existente aplica a ambos seeds. Idempotente: usuario existente → skip.

## Atribución

- Migración `add-imported-by-to-import-batches`: `ALTER TABLE import_batches ADD imported_by
  varchar(255) NULL`.
- Entidad: `importedBy` → columna `imported_by`, `@ApiProperty` nullable.
- `POST /products/import`: `@UseGuards(AuthGuard('jwt'))` — sin token → **401** (documentado en
  Swagger). El controller pasa `req.user.email` al service → `batch.importedBy`.
- Seed de catálogo llama al service con `importedBy: 'seed'`.
- GET batches (lista y detalle) incluyen `importedBy`.

## FE

- `lib/axios.ts`: `endpoints.auth` → rutas reales. Verificar shape que espera
  `auth/context/jwt/action.ts` (campo `accessToken` coincide con el BE).
- Página de import (`product-import-view.tsx`): con `useAuthContext().authenticated === false`
  → en lugar del uploader, `EmptyContent`/Alert "Sign in required to import" + botón a
  `paths.auth.jwt.signIn` con `returnTo` de vuelta a la página. Autenticado → flujo normal.
- Batches: columna "Imported by" en el DataGrid del historial y fila en el detalle
  (`importedBy ?? '—'`; el seed aparece como `seed`).
- Types: `IImportBatch.importedBy: string | null`.

## e2e

- Helper de auth: request context hace sign-in con el admin seed → `addInitScript` que siembra
  `sessionStorage['jwt_access_token']` antes de cargar la app.
- Specs que importan por UI (`product-import`, `product-import-batches`) usan el helper; nuevo
  caso: sin sesión, la página de import muestra el CTA de sign-in y no el uploader.
- Aserción de atribución: el historial muestra `admin@ecommerce.local` en la fila del batch
  subido por UI (y `seed` si hay batch del seed).

## Testing BE

- Seed spec: crea admin cuando no existe / skip cuando existe.
- Import service spec: `importedBy` persiste en el batch.
- Controller: 401 sin token (spec liviano o verificación e2e/manual documentada).
