# Tasks: migrations-and-seed (TK-013 + TK-012)

## TK-013 — Migraciones
- [x] `data-source.ts` (CLI) + scripts npm migration:generate/run/revert
- [x] Migración inicial con el schema completo actual (products, import_batches, users)
- [x] `migrationsRun` al boot; `synchronize` off por defecto (DB_SYNC solo como override dev)
- [x] Compose sin `DB_SYNC=true`; `.env.example` actualizado

## TK-012 — Seed
- [x] CSV del challenge empaquetado como asset del build (nest-cli assets)
- [x] SeedService al boot: si products está vacío → ImportService con el CSV; log del resumen
- [x] Flag `SEED_ON_BOOT` (default true); tests del guard de seed
- [x] Verificación: `docker compose down -v && up --build` → catálogo visible sin pasos manuales

## Cierre
- [x] Suites BE/FE/e2e en verde contra el stack fresco
- [x] PR con gh, merge, archivar change, backlog TK-012/TK-013 closed
