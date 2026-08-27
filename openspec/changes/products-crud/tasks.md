# Tasks: products-crud (TK-007)

## BE
- [x] Entidad `Product` alineada al contrato (sku UNIQUE, DECIMAL, CHECKs, weight_kg nullable)
- [x] DTOs con validaciones del CSV + sanitización + `@ApiProperty` con ejemplos
- [x] Service: create (category default, 409 sku), findAll paginado, findOne, update, remove reales
- [x] Swagger con ejemplos y códigos de error documentados
- [x] Tests unitarios del service (Jest, repo mockeado) — 10/10 en verde
- [x] Seed fixture actualizado al contrato nuevo (products.json)

## FE
- [x] types + envelope de paginación + wire types
- [x] actions puras + mapper ACL (string decimal → number)
- [x] hooks facade: queries con params + 3 mutaciones con invalidación y toasts
- [x] endpoints reales en lib/axios
- [x] Form RHF+zod espejando validaciones BE; DataGrid server-side; delete real
- [x] UI simplificada al contrato (12 archivos del template eliminados)
- [x] Build estricto verde

## Tooling / QA
- [x] Storybook instalado + 5 stories de componentes reutilizables (`npm run storybook`)
- [x] Playwright instalado + e2e del flujo CRUD completo — 5/5 pasando (`npm run test:e2e`)
- [x] Verificación end-to-end en docker (create desde la UI → 201 → lista revalidada; shop con datos reales)
- [x] Docs: API_ENDPOINTS.md reescrito; dashboard público vía `CONFIG.auth.skip` (decisión spec §10.2)
- [x] Backlog TK-007 → closed

## Cobertura de tests de los casos del CSV (agregada post-cierre)
- BE Jest: 28 tests (10 service + 18 DTO con el ValidationPipe real — XSS, SQLi, trims, límites, whitelist)
- FE Vitest: 28 tests (schema zod, mapper ACL decimal/NULL, applyServerFieldErrors)
- Playwright: 11 e2e (5 CRUD + 6 casos CSV en la UI real, incluida la verificación de que la tabla sobrevive al SQLi)

## Notas de cierre
- Hallazgo UX (no bloqueante): en viewports < ~1300px el DataGrid virtualiza la columna de acciones
  fuera de vista (scroll horizontal para llegar al menú). Anotado para pulido futuro.
- `DB_SYNC=true` sigue vigente — el schema nuevo se formaliza como migración en TK-013.
