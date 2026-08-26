# Tasks: products-crud (TK-007)

## BE
- [ ] Entidad `Product` alineada al contrato (sku UNIQUE, DECIMAL, CHECKs, weight_kg nullable)
- [ ] DTOs con validaciones del CSV + sanitización + `@ApiProperty` con ejemplos
- [ ] Service: create (category default, 409 sku), findAll paginado, findOne, update, remove reales
- [ ] Swagger con ejemplos y códigos de error documentados
- [ ] Tests unitarios del service (Jest, repo mockeado) en verde
- [ ] Actualizar seed fixture si aplica (products.json ya no matchea la entidad)

## FE
- [ ] types + envelope de paginación + wire types
- [ ] actions puras + mapper ACL (string decimal → number)
- [ ] hooks facade: queries con params + 3 mutaciones con invalidación y toasts
- [ ] endpoints reales en lib/axios
- [ ] Form RHF+zod espejando validaciones BE; DataGrid server-side; delete real
- [ ] UI simplificada al contrato (fuera campos del template que no existen)
- [ ] Build estricto verde

## Tooling / QA
- [ ] Storybook instalado + stories de componentes reutilizables
- [ ] Playwright instalado + e2e del flujo CRUD completo
- [ ] Verificación end-to-end en docker (crear/editar/borrar desde la UI real)
- [ ] Docs: README/API docs actualizados; backlog TK-007 → closed al archivar
