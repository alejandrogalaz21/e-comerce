# Tasks: csv-import (TK-009 + TK-023)

## BE
- [ ] Deps: multer types + csv-parse; entidad `ImportBatch` (tabla import_batches, report JSONB)
- [ ] `POST /products/import`: FileInterceptor 5MB, MIME/extensión, headers exactos
- [ ] Normalizador de fila (limpieza de precio, vacíos → undefined) + DTO reutilizando reglas TK-007
- [ ] Upsert por SKU: insert / unchanged / update+warning (incluye duplicados dentro del archivo)
- [ ] Endpoints de consulta de batches (lista paginada + detalle)
- [ ] Swagger con ejemplos; tests unitarios + integración con el fixture real (números exactos)

## FE
- [ ] Ruta y página `/dashboard/product/import` + botón Import CSV en la lista
- [ ] Types + action `importProductsCsv` + mutación `useImportProducts` (invalida lista)
- [ ] Vista con `Upload` reutilizado, breadcrumbs, resumen, tabla de rechazadas, warnings
- [ ] Manejo de errores de archivo (400) inline; misma UX del dashboard; build verde

## QA
- [ ] Playwright: sube el CSV real, valida resumen y productos importados
- [ ] Verificación manual en docker end-to-end
- [ ] Backlog TK-009 y TK-023 → closed al archivar
