# Design: import-batches-history (TK-029)

## Contrato consumido (ya existente en el API)

- `GET /api/v1/products/import/batches?page&limit` → envelope `{ data: ApiImportBatch[],
  pagination }`, más reciente primero, **sin** el campo `report` (excluido por peso).
- `GET /api/v1/products/import/batches/:id` → batch completo con `report: { rejected, warnings }`.
  404 si no existe.

```ts
// wire (camelCase, tal como serializa la entidad)
ApiImportBatch = { id, filename, status: 'processing'|'completed'|'failed',
  totalRows, inserted, updated, unchanged, rejected, skippedEmpty, createdAt }
ApiImportBatchDetail = ApiImportBatch & { report: { rejected: IImportRejectedRow[],
  warnings: IImportWarning[] } }
```

## Capas FE (skill fe-architecture)

- `types/product.ts`: `IImportBatch`, `IImportBatchDetail` (reutilizan `IImportRejectedRow`/
  `IImportWarning` ya definidos).
- `actions/product.ts`: `getImportBatches({page,limit})`, `getImportBatch(id)`.
- `sections/product/hooks/use-import-batches.ts`: `importBatchKeys` (list(params)/detail(id)),
  `useGetImportBatches` (server pagination + `keepPreviousData`), `useGetImportBatch`.
- Rutas: `paths.dashboard.product.importBatches` y `.importBatchDetail(id)`; registradas en
  `dashboard.tsx` ANTES de `:id` del product router (orden: list, new, import,
  import/batches, import/batches/:id, :id, :id/edit).

## UX

- **Lista** (`product-import-batches-view.tsx`): CustomBreadcrumbs (Dashboard / Product /
  Import history); DataGrid `paginationMode="server"` (patrón de product-list): columnas
  Filename, Status (`Label` success/warning/error según completed/processing/failed),
  Total rows, Created / Updated / Rejected (Rejected en rojo si > 0), Date (`fDateTime`),
  acción "View report". EmptyContent si no hay batches con CTA a importar.
- **Detalle** (`product-import-batch-detail-view.tsx`): breadcrumbs con el filename; cabecera
  (filename, Label de status, fecha); `ImportSummary` + warnings `Alert` + `ImportRejectedTable`
  reutilizados tal cual del flujo post-upload; botones "Back to history" e "Import CSV".
- **Enlaces de entrada**: botón "Import history" (icono history) en la página de import, junto
  al header; el resumen post-upload enlaza "View in history" al detalle del batch recién creado.

## Testing

- Vitest: helper de mapeo status→color de Label.
- Playwright (`e2e/product-import-batches.spec.ts`): sube el fixture real → navega al historial
  → la fila del batch aparece con 87/3/5 → abre el detalle → ImportSummary con los números y la
  tabla de rechazadas con la línea 7 → vuelve al historial. Empty state verificado con la DB
  limpia si el orden de specs lo permite (o se omite si el estado no es determinista).
