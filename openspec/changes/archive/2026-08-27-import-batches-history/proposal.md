# Proposal: import-batches-history (TK-029)

## Why

Gap detectado en la revisión del pipeline de import: la auditoría de batches existe en el BE
(`import_batches` + endpoints `GET /products/import/batches[/:id]`) pero **no hay ninguna vista
en el FE** — la única forma de consultar imports pasados es Swagger/curl. Para el valor central
de la trazabilidad ("¿por qué el precio de este producto cambió el martes?") el usuario del
dashboard necesita ver el historial y el reporte de cada batch sin herramientas técnicas.

## What Changes

Solo FE (los endpoints ya existen):

- **Lista** `/dashboard/product/import/batches`: DataGrid con paginación **server-side** (mismo
  patrón que la lista de productos): archivo, status (Label con color), contadores
  (insertados/actualizados/rechazados/omitidas), total de filas y fecha; acción para abrir el
  detalle. Acceso desde la página de import ("Import history") y breadcrumbs consistentes.
- **Detalle** `/dashboard/product/import/batches/:id`: cabecera del batch (archivo, status,
  fecha) + **reutiliza los componentes existentes** del resultado post-upload: `ImportSummary`
  (6 stat cards), tabla de rechazadas (línea/campo/motivo) y alert de warnings — misma UX que
  ya conoce el usuario.
- Capa de datos siguiendo la skill `fe-architecture`: types del batch, actions puras, hooks
  facade con query keys propias.
- Tests: vitest de helpers, e2e Playwright del flujo import → historial → detalle.

## Non-goals

- Cambios en BE (endpoints ya existen y están probados).
- Re-descarga del CSV original (no se almacena — gap documentado aparte).
- Filtros/búsqueda del historial (paginación simple basta para el alcance).

## Impact

`web/src/{types,actions,sections/product,pages,routes}` + e2e. Cero cambios en `api/`.
