# Tasks: migrations-and-seed (TK-013 + TK-012)

## TK-013 — Migraciones
- [ ] `data-source.ts` (CLI) + scripts npm migration:generate/run/revert
- [ ] Migración inicial con el schema completo actual (products, import_batches, users)
- [ ] `migrationsRun` al boot; `synchronize` off por defecto (DB_SYNC solo como override dev)
- [ ] Compose sin `DB_SYNC=true`; `.env.example` actualizado

## TK-012 — Seed
- [ ] CSV del challenge empaquetado como asset del build (nest-cli assets)
- [ ] SeedService al boot: si products está vacío → ImportService con el CSV; log del resumen
- [ ] Flag `SEED_ON_BOOT` (default true); tests del guard de seed
- [ ] Verificación: `docker compose down -v && up --build` → catálogo visible sin pasos manuales

## Cierre
- [ ] Suites BE/FE/e2e en verde contra el stack fresco
- [ ] PR con gh, merge, archivar change, backlog TK-012/TK-013 closed
