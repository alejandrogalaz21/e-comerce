# Tasks: product-filters-api (TK-039)

## DTO y validación
- [x] `ProductFiltersDto`: `minPrice`/`maxPrice` (`@Type(() => Number)`, `@IsNumber`, `@Min(0)`, opcionales)
- [x] Validador de clase `minPrice <= maxPrice` con mensaje explícito
- [x] `inStock`: `@Transform` de `'true'`/`'false'` → boolean, `@IsBoolean`, opcional
- [x] `sortBy` (`@IsIn(['name','price','stock','createdAt','updatedAt'])`) y `sortDir` (`@IsIn(['asc','desc'])`)
- [x] `category`: `@Transform` que parte por coma, trimea, descarta vacíos y deduplica → `string[]`; `MaxLength` sobre el crudo
- [x] `@ApiPropertyOptional` con ejemplo y descripción en cada parámetro nuevo

## Servicio
- [x] `findAll`: `andWhere` de rango de precio, disponibilidad y `LOWER(category) IN (:...categories)`
- [x] Orden por **mapa literal** `sortBy` → columna de entidad (el string del cliente no llega a `orderBy`), default `createdAt desc`
- [x] `addOrderBy('product.id')` como desempate para que la paginación sea estable
- [x] `findCategories()`: `GROUP BY category`, conteo, orden alfabético

## Controller
- [x] `GET /products/categories` `@Public()` declarado **antes** de `GET /products/:id` (si va después, el `ParseUUIDPipe` responde 400)
- [x] Swagger: `@ApiQuery` de los params nuevos y `@ApiResponse` del recurso de categorías

## Base de datos
- [x] Migración con índice btree en `price` (up y down)
- [x] Verificar que las migraciones corren limpias sobre volumen vacío y sobre una base ya poblada

## Testing
- [x] Unitarios del armado de query: rango, disponibilidad, multi-categoría, combinación conjuntiva
- [x] Unitario de seguridad: `sortBy` fuera de la whitelist → 400, y el valor nunca alcanza el `orderBy`
- [x] Unitario de orden por `updatedAt`: el upsert del import mueve `updatedAt`, no `createdAt`
- [x] Unitario de paginación estable: recorrer todas las páginas ordenando por `stock` sin repetidos ni omitidos
- [x] Unitario de compatibilidad: `?page=1&limit=10` devuelve lo mismo que antes del change
- [x] Test de ruteo: `GET /products/categories` no entra por el handler de `:id`
- [x] `findCategories` sobre catálogo vacío → lista vacía, no error

## QA / cierre
- [x] Verificación manual en Swagger con el catálogo del fixture (87 productos)
- [x] Confirmar que el envelope `total` refleja el conjunto filtrado en todos los casos
- [x] Backlog: TK-039 a `closed` con enlace al change; actualizar la nota de deuda de TK-008
