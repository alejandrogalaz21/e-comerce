# Proposal: csv-import (TK-009 + TK-023)

## Why

Requerimiento central del challenge: importar productos desde CSV. El archivo de ejemplo trae
trampas intencionales (XSS, SQLi, precios inválidos, filas vacías, SKUs duplicados) — la forma de
resolver cada caso **es** la entrevista. Todas las decisiones ya están tomadas en initial.md §1 y
§4: import parcial (no todo-o-nada), upsert por SKU, validación por capas, reporte por fila, y
trazabilidad vía `import_batches`.

## What Changes

- **BE**: endpoint `POST /products/import` (multipart, límite 5MB, MIME/extensión validados),
  parser `csv-parse` (nunca split manual — el CSV trae comas y comillas escapadas dentro de
  campos), pipeline de validación por fila reutilizando el sanitizador y las reglas de TK-007,
  normalización (limpieza de símbolos de moneda en price, category default, weight vacío → NULL),
  upsert por SKU (insert / no-op / update+warning), entidad `ImportBatch` con contadores y
  reporte JSONB, endpoints de consulta de batches. Tests unitarios con el CSV real como fixture.
- **FE**: página nueva `/dashboard/product/import` (pedido explícito del usuario: página
  adicional, no un modal) con botón **Import CSV** en la lista de productos. Reutiliza el
  componente `Upload` existente, breadcrumbs y patrones de UX del dashboard. Muestra el resultado
  del batch: resumen (insertados/actualizados/sin cambio/rechazados) + tabla de filas rechazadas
  con motivo + advertencias. Mutación React Query que invalida la lista de productos.
- **e2e**: Playwright sube el CSV real del challenge y verifica el resumen y los productos.

## Non-goals

- Seed automático al levantar docker (TK-012, consumirá este pipeline).
- Guardar el archivo crudo en blob storage y changelog campo a campo (documentado como futuro,
  initial.md §4.5 "nivel mínimo viable").
- Rate limiting del endpoint (TK-015).

## Impact

`api/src/modules/products/**` (submódulo import + entidad ImportBatch), `web/src/{types,actions,
sections/product,pages,routes}/**`, fixtures del CSV real en `api/test` y `web/e2e`.
