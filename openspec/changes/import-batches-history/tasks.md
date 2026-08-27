# Tasks: import-batches-history (TK-029)

## FE
- [ ] Types `IImportBatch`/`IImportBatchDetail` + actions `getImportBatches`/`getImportBatch`
- [ ] Hooks facade `use-import-batches.ts` (keys + list server-paginated + detail)
- [ ] Rutas y paths (orden antes de `:id`); páginas Helmet
- [ ] Vista lista: DataGrid server-side + Label de status + EmptyContent con CTA
- [ ] Vista detalle: reutiliza ImportSummary + ImportRejectedTable + warnings Alert
- [ ] Enlaces: "Import history" en la página de import; "View in history" post-upload
- [ ] Build estricto + vitest verdes

## QA / cierre
- [ ] e2e Playwright: import → historial → detalle con números reales del fixture
- [ ] PR creado (sin merge — revisión del usuario); backlog actualizado
