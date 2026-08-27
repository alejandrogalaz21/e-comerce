# Tasks: import-batches-history (TK-029)

## FE
- [x] Types `IImportBatch`/`IImportBatchDetail` + actions `getImportBatches`/`getImportBatch`
- [x] Hooks facade `use-import-batches.ts` (keys + list server-paginated + detail)
- [x] Rutas y paths (orden antes de `:id`); páginas Helmet
- [x] Vista lista: DataGrid server-side + Label de status + EmptyContent con CTA
- [x] Vista detalle: reutiliza ImportSummary + ImportRejectedTable + warnings Alert
- [x] Enlaces: "Import history" en la página de import; "View in history" post-upload
- [x] Build estricto + vitest verdes

## QA / cierre
- [x] e2e Playwright: import → historial → detalle con números reales del fixture
- [x] PR creado (sin merge — revisión del usuario); backlog actualizado
