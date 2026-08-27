# Tasks: user-seed-import-attribution (TK-030)

## BE
- [ ] Migración `imported_by` + entidad + Swagger
- [ ] Guard JWT en `POST /products/import` + registro de `req.user.email`
- [ ] Seed idempotente de usuario admin (`SEED_ADMIN_PASSWORD`) antes del seed de catálogo
- [ ] Seed de catálogo firma `importedBy: 'seed'`
- [ ] .env.example + tests (seed user, importedBy persistido) — suites verdes

## FE
- [ ] `endpoints.auth` a rutas reales; sign-in JWT funcionando contra el API
- [ ] Página de import exige sesión (CTA sign-in con returnTo)
- [ ] "Imported by" en historial y detalle de batches
- [ ] Build + vitest verdes

## QA / cierre
- [ ] e2e autenticados (helper de sesión) + caso sin sesión + aserción de atribución
- [ ] Verificación manual en docker (login → import → historial muestra el email)
- [ ] README: credenciales demo; PR sin merge; backlog actualizado
