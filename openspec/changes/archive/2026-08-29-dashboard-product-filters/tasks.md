# Tasks: dashboard-product-filters (TK-036)

## BE (mínimo)
- [x] DTO del listado de batches: `q` opcional con `trimText` y `MaxLength`, sobre `PaginationDTO`
- [x] `findAllBatches`: `ILIKE` sobre `filename` con `escapeLikeWildcards`, total reflejando el filtro
- [x] `@ApiQuery` de `q` en `GET /products/import/batches`
- [x] Unitarios: coincidencia parcial, insensible a mayúsculas, comodines literales, sin resultados

## FE — contratos y datos
- [x] `types/product.ts`: ampliar `IProductListParams` (`minPrice`, `maxPrice`, `inStock`, `sortBy`, `sortDir`, `category` como lista); tipo `IProductCategory`; `q` en `IImportBatchListParams`
- [x] `lib/axios.ts`: `endpoints.product.categories`
- [x] `actions/product.ts`: `getProducts` reenvía los params nuevos omitiendo los vacíos; `getProductCategories`; `getImportBatches` acepta `q`
- [x] `sections/product/hooks/use-product.ts`: `productKeys.categories()`, `useGetProductCategories` con `staleTime` alto, invalidada por las mutaciones existentes

## FE — estado en la URL
- [x] Helper de lectura/escritura de los search params (búsqueda, filtros, orden, página, tamaño)
- [x] Los handlers del grid escriben en la URL; los modelos se derivan de leerla — sin `useEffect` de sincronización
- [x] Cualquier cambio de búsqueda, filtro u orden resetea la página a 1

## FE — lista de productos
- [x] `sortingMode="server"` conectado a `sortBy`/`sortDir`
- [x] `sortable: false` en las columnas que el API no ordena (`sku`, `category`, `weightKg`, acciones)
- [x] Columna "Updated at" con el mismo formato que "Created at"
- [x] Toolbar de filtros: categoría multi-selección con conteo, rango de precio, disponibilidad
- [x] El rango de precio solo llega a la URL cuando es coherente; error en el campo mientras no lo sea
- [x] Chips de filtro activo con `FiltersResult`/`FiltersBlock`: borrado individual y "Clear"
- [x] Vacío distinguible: sin coincidencias vs catálogo sin productos
- [x] Preservar `keepPreviousData` al ampliar los params (que la tabla no parpadee al teclear)

## FE — historial de batches
- [x] Buscador por nombre de archivo con el mismo debounce que la lista de productos
- [x] Vacío con el término buscado

## Testing
- [x] Vitest del helper de search params: ida y vuelta, valores ausentes, reseteo de página
- [x] e2e: importar el fixture → ordenar por "Updated at" desc → las filas del import salen primero
- [x] e2e: filtrar por categoría + rango de precio → el total cambia y los chips reflejan lo aplicado
- [x] e2e: aplicar filtros, recargar y volver atrás → la vista se conserva
- [x] e2e: ordenar por precio con más de una página → la primera fila es el mínimo del catálogo
- [x] e2e: buscar en el historial de imports por nombre de archivo

## QA / cierre
- [x] `npm run build` (tsc estricto + eslint) y `npm test` verdes en `web/`; `npm test` verde en `api/`
- [x] Verificación manual contra el fixture del challenge: TC-01, TC-02 y TC-03 en [`docs/testing/`](../../../docs/testing/README.md) (85 productos creados, orden por `Updated at` verificado contra la base)
- [x] Backlog: TK-036 a `closed` con enlace al change (al archivar)
