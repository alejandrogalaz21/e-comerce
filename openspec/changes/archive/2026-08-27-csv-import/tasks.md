# Tasks: csv-import (TK-009 + TK-023)

## BE
- [x] Deps: csv-parse + @types/multer; entidad `ImportBatch` (tabla import_batches, report JSONB)
- [x] `POST /products/import`: FileInterceptor 5MB (413), MIME/extensión/headers exactos (400)
- [x] Normalizador de fila (limpieza de precio, vacíos → undefined) + DTO reutilizando reglas TK-007
- [x] Upsert por SKU: insert / unchanged / update+warning (duplicados en archivo vía mapa secuencial)
- [x] Endpoints de consulta de batches (lista paginada sin report + detalle completo)
- [x] Swagger con ejemplos; 24 tests nuevos incl. integración con el fixture real — 52/52 total

## FE
- [x] Ruta y página `/dashboard/product/import` + botón Import CSV en la lista (orden antes de :id)
- [x] Types + action `importProductsCsv` + mutación `useImportProducts` (invalida lista + toast resumen)
- [x] Vista con `Upload` reutilizado (modo lista single-file), breadcrumbs, 6 stat cards, tabla de rechazadas, warnings
- [x] Errores de archivo inline (Alert); rechazo client-side de no-CSV vía dropzone; build verde; 30 vitest

## QA
- [x] Playwright: sube el CSV real — números exactos (97/88/3/0/4/2), tabla de rechazadas, warnings, idempotencia (2º import → 0 created), productos visibles en la lista, rechazo de .txt — suite completa 15/15
- [x] Verificación manual en docker end-to-end (curl + UI real)
- [x] Backlog TK-009 y TK-023 → closed

## Notas de cierre
- Dos correcciones al análisis inicial documentadas en design.md: línea 29 se acepta (sku válido,
  payload SQLi es dato inerte) y línea 89 es update+warning por la regla secuencial de duplicados.
- Fixes de infra: lock de npm 11 vs npm 10 en docker (npm 11 pineado en build stage);
  `workers: 1` en Playwright (las 3 specs comparten una sola DB).
- Futuro documentado (initial.md §4.5): guardar el CSV crudo en blob storage y changelog campo a
  campo; rate limiting del endpoint va en TK-015; el seed automático (TK-012) consumirá este pipeline.
