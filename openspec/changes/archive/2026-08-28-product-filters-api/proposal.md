# Proposal: product-filters-api (TK-039)

## Why

El catálogo hoy solo se puede interrogar de dos formas: `?q=` (texto libre) y `?category=` (exacto,
un único valor). Eso alcanzaba para el buscador del DataGrid admin, pero deja fuera todo lo que las
dos pantallas siguientes necesitan — la tienda pública (TK-035) y la toolbar de filtros del
dashboard (TK-036): rango de precio, disponibilidad y orden por columna.

Hay además un defecto observable hoy: el DataGrid de productos declara `paginationMode="server"`
pero no `sortingMode="server"`, así que al hacer click en una cabecera ordena **solo las 10 filas
que tiene cargadas de las 87** — parece que funciona y miente. No se puede arreglar en el FE porque
no existe un orden server-side al que conectarse.

Y nadie puede enumerar las categorías: `category` es `varchar(100)` de texto libre con default
`Uncategorized`, poblado desde el CSV. Sin un endpoint que las liste, ni el dropdown de filtro, ni
los chips del home, ni el mapa de iconos por categoría tienen de dónde partir.

Se hace **antes y por separado** de las dos pantallas a propósito: si el contrato de filtros se
construyera dentro de TK-035 o TK-036, ambas tocarían el mismo DTO en paralelo, o una quedaría
bloqueada por la otra. Cierra la deuda de BE que TK-008 dejó abierta.

## What Changes

Solo `api/` — ninguna pantalla cambia en este change.

- **Rango de precio**: `minPrice` / `maxPrice` en `ProductFiltersDto`, cada uno opcional, no
  negativos, y con validación cruzada de que `minPrice <= maxPrice` (400 explícito, no un listado
  vacío silencioso).
- **Disponibilidad**: `inStock` booleano → `stock > 0`. Es el filtro que la tienda pública necesita
  para no ofrecer lo que no puede vender.
- **Orden explícito**: `sortBy` con **whitelist estricta** (`name`, `price`, `stock`, `createdAt`) y
  `sortDir` (`asc` / `desc`). Default `createdAt desc`, que es el orden fijo de hoy — sin cambio de
  comportamiento para quien no mande los params. Un valor fuera de la whitelist es 400 y **nunca**
  llega a construir SQL.
- **`category` multi-valor**: `?category=Electronics,Tools` filtra por cualquiera de ellas. Un solo
  valor se sigue comportando exactamente igual que hoy — no es breaking.
- **Nuevo `GET /products/categories`** (público, sin paginación): categorías distintas con su
  conteo de productos, ordenadas alfabéticamente. Es la fuente que consumirán el dropdown del
  dashboard, los chips del home y el fallback del icono por categoría.
- **Migración**: índice btree en `price` (los filtros de rango sin índice degradan a seq scan sobre
  toda la tabla) y el índice que necesite el conteo de categorías.
- Swagger con ejemplos por parámetro y tests unitarios del armado de la query.

## Non-goals

- Cualquier cambio de FE: la tienda pública es TK-035 y la toolbar del dashboard es TK-036. Este
  change se verifica contra Swagger y tests.
- Búsqueda global cross-entity (la ⌘K que quitó TK-027) — sigue descartada.
- Un motor de queries genérico estilo `GridFilterModel` de MUI, con operadores arbitrarios por
  columna. La superficie de filtros es cerrada y explícita a propósito.
- Caché de resultados en Redis: es TK-038 y va después, encima de este contrato ya estable.
- Filtros por rango de fecha, de peso o por SKU exacto: superficie que nadie del challenge va a
  ejercitar.

## Capabilities

### New Capabilities

- `product-filters`: cómo se interroga el catálogo — qué combinaciones de filtro y orden acepta
  `GET /products`, qué rechaza, y qué garantiza sobre la paginación cuando hay filtros activos.
- `product-categories`: la taxonomía observable del catálogo — cómo se descubre qué categorías
  existen y cuántos productos tiene cada una.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío, las dos capacidades nacen aquí.

## Impact

- **`api/`**: `modules/products/dto/product-filters.dto.ts` (params nuevos + validación cruzada),
  `products.service.ts` (`findAll` y un `findCategories` nuevo), `products.controller.ts`
  (`GET /products/categories` declarado **antes** de `GET /products/:id` para que `categories` no
  se parsee como un UUID), una migración de índices, y specs unitarios.
- **Contrato**: aditivo. Un cliente que hoy manda solo `page`/`limit`/`q`/`category` recibe
  exactamente la misma respuesta, en el mismo orden.
- **Desbloquea**: TK-035 (tienda pública) y TK-036 (filtros del dashboard, incluido el arreglo del
  orden server-side), que a partir de aquí avanzan en paralelo sin tocar `api/`.
- **Docs**: `docs/backlog.md` (TK-039 y la nota de deuda de TK-008).
