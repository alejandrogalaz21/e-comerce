# Tasks: user-seed-import-attribution (TK-030)

## BE
- [x] Migración `imported_by` + entidad + Swagger
- [x] Guard JWT en `POST /products/import` + registro de `req.user.email`
- [x] Seed idempotente de usuario admin (`SEED_ADMIN_PASSWORD`) antes del seed de catálogo
- [x] Seed de catálogo firma `importedBy: 'seed'`
- [x] .env.example + tests (seed user, importedBy persistido) — suites verdes

## FE
- [x] `endpoints.auth` a rutas reales; sign-in JWT funcionando contra el API
- [x] Página de import exige sesión (CTA sign-in con returnTo)
- [x] "Imported by" en historial y detalle de batches
- [x] Build + vitest verdes

## QA / cierre
- [x] e2e autenticados (helper de sesión) + caso sin sesión + aserción de atribución
- [x] Verificación manual en docker (login → import → historial muestra el email)
- [x] README: credenciales demo; PR sin merge; backlog actualizado
