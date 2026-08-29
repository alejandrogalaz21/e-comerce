# Proposal: dashboard-product-filters (TK-036)

## Why

TK-039 le dio al API la capacidad de filtrar y ordenar el catálogo, pero **el dashboard no la usa**:
la lista de productos sigue mandando solo `page`, `limit` y `q`. La capacidad existe y no se ve.

El objetivo declarado por el usuario es **poder verificar las importaciones**. Hoy eso no se puede
hacer desde la interfaz, por tres razones concretas:

1. **El orden miente.** El DataGrid declara `paginationMode="server"` pero no `sortingMode`, y sus
   columnas son ordenables por defecto. Hacer click en "Price" ordena **las 10 filas cargadas de
   las 87** y presenta el resultado como si fuera el orden del catálogo. Es un fallo silencioso:
   parece que funciona.
2. **No existe la columna que importa.** El import hace upsert por SKU: una fila que ya existía se
   actualiza sin mover su `createdAt`. La tabla solo muestra "Created at", así que lo que un
   segundo import tocó queda invisible. `updatedAt` es el dato que hace verificable el pipeline.
3. **No hay filtros.** Para responder "¿qué quedó sin stock después de importar?" o "¿qué hay en
   Electronics entre 10 y 50?" hay que ir a Swagger.

Además, el historial de import batches no tiene buscador: con varios imports acumulados, encontrar
el de un archivo concreto es paginar a ojo.

## What Changes

**FE — lista de productos del dashboard**

- **Orden server-side**: `sortingMode="server"` conectado a `sortBy`/`sortDir`, con el modelo de
  orden viviendo en la URL. Las columnas no soportadas por el API se marcan `sortable: false` en
  vez de ofrecer un orden que el servidor no puede cumplir.
- **Columna "Updated at"**, junto a "Created at", con el mismo formato de fecha.
- **Toolbar de filtros explícita**: categoría (multi-selección, alimentada por
  `GET /products/categories`), rango de precio y disponibilidad. Los filtros activos se muestran
  como chips reutilizando `components/filters-result/`, con borrado individual y "Clear".
- **Estado en la URL** (`useSearchParams`): búsqueda, filtros, orden, página y tamaño de página.
  Recargar, volver atrás o compartir el enlace conserva la vista.

**FE — historial de import batches**

- Buscador por nombre de archivo, mismo patrón de debounce que la lista de productos.

**BE — mínimo**

- `GET /products/import/batches` acepta `?q=` sobre `filename` (hoy solo recibe `PaginationDTO`).

## Non-goals

- La tienda pública: es TK-035 y consume el mismo contrato con otra piel.
- Filtrar productos **por batch de import** ("qué creó este archivo"). Requiere columna nueva y FK
  en `products`; el reporte del batch de TK-032 ya lista las filas creadas y actualizadas con línea
  y SKU, que cubre el caso sin tocar el esquema. Si se quiere trazabilidad completa, es su ticket.
- El panel de filtros nativo de MUI (`filterMode="server"`): su `GridFilterModel` manda una
  gramática abierta de operadores por columna que habría que traducir a SQL. Ver design.md.
- Revivir la búsqueda global ⌘K que quitó TK-027.
- Guardar vistas o filtros favoritos por usuario.

## Capabilities

### New Capabilities

- `product-admin-listing`: cómo el administrador del catálogo interroga la lista de productos —
  qué puede filtrar y ordenar, qué garantiza sobre el conjunto completo frente a la página visible,
  y qué sobrevive a una recarga o a compartir el enlace.
- `import-batch-search`: localizar un import pasado por el nombre del archivo.

### Modified Capabilities

Ninguna. `product-filters` y `product-categories` (TK-039) se **consumen** tal como están; este
change no cambia sus requisitos.

## Impact

- **`web/`**: `types/product.ts` (params de orden y filtros, tipo de categoría), `actions/product.ts`
  (`getProducts` reenvía los params nuevos, `getProductCategories` nueva, `getImportBatches` acepta
  `q`), `sections/product/hooks/` (hook de categorías, query keys que incluyen los filtros),
  `sections/product/components/` (toolbar de filtros), y las vistas de lista de productos e
  historial de batches.
- **`api/`**: DTO y servicio del listado de batches para aceptar `q`.
- **Riesgo de regresión**: la lista de productos es la pantalla más usada del dashboard y su query
  key cambia de forma. Un `keepPreviousData` mal puesto hace parpadear la tabla en cada tecleo.
- **Docs**: `docs/backlog.md` (TK-036).
