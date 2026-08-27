# Proposal: migrations-and-seed (TK-013 + TK-012)

## Why

- **TK-013**: el schema se crea con `DB_SYNC=true` (synchronize), aceptable solo durante el
  arranque del proyecto. Un entregable serio para una fintech necesita migraciones versionadas:
  el schema es código revisable, reproducible y con historial — y `synchronize` en producción es
  un riesgo conocido de pérdida de datos.
- **TK-012**: el spec (initial.md §10.3) exige que `docker compose up` deje la app usable sin
  pasos manuales. El seed importa el CSV de ejemplo **a través del pipeline real de import**
  (TK-009) — así el seed además prueba el import end-to-end en cada arranque limpio.

## What Changes

- **Migraciones TypeORM**: `data-source.ts` para el CLI, carpeta `src/database/migrations/` con
  la migración inicial (products, import_batches, users — el schema completo actual), scripts
  npm (`migration:generate|run|revert`), ejecución automática al boot (`migrationsRun`), y
  `synchronize` apagado por defecto (`DB_SYNC` queda como override explícito de desarrollo).
- **Seed automático**: al boot, si la tabla `products` está vacía, se importa el CSV del
  challenge (empaquetado como asset del build) vía `ImportService`. Idempotente por diseño
  (segundo arranque: tabla poblada → no hace nada; y si corriera igual, el upsert lo haría
  inocuo). Controlable con `SEED_ON_BOOT=false`.
- **docker-compose**: fuera `DB_SYNC=true`; el api arranca con migraciones + seed.

## Non-goals

- Datos de seed adicionales (usuarios/órdenes) — solo el catálogo del CSV del challenge.
- Rollback automático en CI — los scripts de revert quedan disponibles manualmente.

## Impact

`api/` (data-source, migración inicial, seed module, nest-cli assets, package.json scripts),
`docker-compose.yml`, `.env.example`. La DB de desarrollo existente se recrea (volumen nuevo) —
los datos actuales son de prueba.
