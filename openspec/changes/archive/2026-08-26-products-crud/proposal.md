# Proposal: products-crud (TK-007)

## Why

El requerimiento central del challenge. La entidad `Product` actual es del template (title/slug/
sizes/gender, precio `float`) y no coincide con el contrato del CSV; `update()`/`remove()` son
stubs; el FE tiene el CRUD simulado contra un mock muerto. Este change alinea todo al contrato
real con validaciones fintech-grade derivadas del análisis del CSV (initial.md §1 y §3).

## What Changes

- **BE**: entidad `Product` rediseñada al contrato CSV (`sku` UNIQUE, `price DECIMAL(10,2)`,
  `stock` CHECK ≥0, `weight_kg` nullable, `category` default "Uncategorized"). CRUD completo
  (create/findAll paginado/findOne/update/remove reales), validaciones `class-validator` por
  campo según los hallazgos del CSV, sanitización anti-XSS de name/description, 409 en SKU
  duplicado, Swagger con `@ApiProperty` + ejemplos, y **tests unitarios** del servicio.
- **FE**: módulo product conectado al API real siguiendo la skill `fe-architecture`:
  endpoints reales, **mapper ACL** (DECIMAL-string → number en un solo lugar), types recortados
  al contrato, mutaciones React Query (create/update/delete con invalidación + toasts),
  DataGrid con datos del server, formulario RHF+zod espejando las validaciones del BE, y UI
  simplificada al contrato (fuera colors/sizes/ratings del template).
- **Tooling FE**: **Storybook** (stories de los componentes reutilizables) y **Playwright**
  (e2e del flujo CRUD completo contra el stack docker).
- **Legacy**: todo código de product que no siga la estructura por capas se migra o elimina.

## Non-goals

- Búsqueda/filtros avanzados (TK-008), import CSV (TK-009/023), migraciones TypeORM (TK-013 —
  se mantiene `DB_SYNC=true` temporal), exception filter global (TK-014).

## Impact

`api/src/modules/products/**` (+ specs), `web/src/{types,actions,sections/product,pages}/**`,
Storybook y Playwright como dev-tooling nuevo en `web/`.
