# Design: dashboard-product-filters (TK-036)

## Context

`ProductListView` mantiene hoy dos piezas de estado local: `paginationModel` (`useState`) y
`searchTerm` con `useDebounce(400)`. Las pasa a `useGetProducts({ page, limit, q })`, cuya query key
es `productKeys.list(params)`, y el DataGrid corre con `paginationMode="server"`,
`rowCount={pagination?.total}` y una `CustomToolbar` propia que ya contiene el `TextField` de
búsqueda y el botón de borrado masivo.

Del lado del API, TK-039 dejó disponible: `q`, `category` (multi-valor por coma), `minPrice`,
`maxPrice`, `inStock`, `sortBy` (`name·price·stock·createdAt·updatedAt`), `sortDir`, más
`GET /products/categories`. La capa FE todavía no reenvía nada de eso: `getProducts` desestructura
únicamente `page`, `limit`, `q` y `category`.

`components/filters-result/` existe en el repo con `FiltersBlock` (bloque etiquetado con borde
punteado) y `FiltersResult` (contenedor con total de resultados y botón "Clear"), sin usar por
nadie todavía.

El listado de batches (`ImportController.findAllBatches`) recibe `PaginationDTO` a secas y ordena
por `createdAt DESC`.

## Goals / Non-Goals

**Goals:**

- Que el administrador pueda responder preguntas sobre **el catálogo completo**, no sobre la página
  que tiene delante.
- Que después de importar se vea de un vistazo qué tocó ese import.
- Que la vista sea reproducible: recargar, volver atrás o pasar el enlace da lo mismo.

**Non-Goals:**

- Un motor de filtros genérico; la superficie es la de TK-039 y nada más.
- Cambiar el contrato del API de productos.

## Decisions

### 1. La URL es la fuente de verdad del estado de la tabla

Búsqueda, filtros, orden, página y tamaño de página viven en `useSearchParams`. El estado local se
limita al texto sin debounce del input, que es puro detalle de tecleo.

*Alternativa descartada*: seguir con `useState`. Funciona, pero pierde la vista en cada recarga,
rompe el botón atrás (que hoy saca al usuario de la pantalla en vez de deshacer un filtro) y hace
imposible pasar un enlace a una vista filtrada. Con filtros de verdad ese coste deja de ser
aceptable — con solo `q` y paginación, era tolerable.

*Consecuencia*: la query key de React Query se deriva de los search params, así que la caché entra
gratis: volver a una combinación ya vista la sirve al instante. Requiere `keepPreviousData` para
que la tabla no parpadee entre tecleos.

### 2. Toolbar de filtros propia, no el panel nativo de MUI

`filterMode="server"` parece la opción barata, pero el `GridFilterModel` que MUI emite es una
gramática abierta: un operador por columna (`contains`, `equals`, `startsWith`, `isAnyOf`, `>`,
`<=`, `isEmpty`…) elegido por el usuario en tiempo de ejecución. Conectarlo obligaría a traducir esa
gramática a SQL en el backend, es decir, a construir un motor de queries genérico con su whitelist
por columna y por operador. Es mucha más superficie —y mucho más riesgo— que los cinco parámetros
cerrados que TK-039 ya expone.

La toolbar propia también permite algo que el panel nativo no: presentar los filtros con el
vocabulario del dominio ("In stock" / "Sold out") en vez de con operadores.

### 3. Las columnas que el API no sabe ordenar se marcan `sortable: false`

`sortingMode="server"` desactiva el orden en cliente, pero **no** oculta las flechas de las columnas
que el servidor no soporta: seguirían invitando a un click que no hace nada. `sku`, `weightKg` y la
columna de acciones se marcan explícitamente `sortable: false`; quedan ordenables `name`,
`category` no (no está en la whitelist del API), `price`, `stock`, `createdAt` y `updatedAt`.

Este es exactamente el defecto que el ticket arregla, así que la corrección no puede dejar una
versión más sutil del mismo problema.

### 4. Las categorías se cargan una vez y se cachean aparte

`GET /products/categories` tiene su propia query key (`productKeys.categories()`) y un `staleTime`
alto: es una lista corta que cambia solo al mutar el catálogo. Se invalida junto con las listas en
las mutaciones que ya existen (create/update/delete/import), porque un producto nuevo puede
estrenar categoría.

El desplegable muestra el conteo por categoría, que el endpoint ya devuelve. Ese conteo es
**global**, no facetado: no refleja el resto de filtros activos. Se acepta y se anota; calcular
facetas exige que el backend cuente por cada combinación posible, que es otro orden de complejidad.

### 5. El rango de precio se envía solo cuando está completo y es válido

El input de precio es dos campos. Mientras el usuario escribe puede existir un estado transitorio
`min > max`; mandarlo produciría un 400 de TK-039 en cada tecleo. La toolbar valida en cliente y
solo empuja el parámetro a la URL cuando el rango es coherente, mostrando el error en el campo
mientras no lo sea. La validación del servidor sigue siendo la autoridad — esta es UX, no
sustitución.

### 6. El buscador de batches reusa el patrón de productos

`?q=` sobre `filename` con `ILIKE` y `escapeLikeWildcards`, igual que el de productos, en el DTO del
listado de batches. No se busca dentro del reporte de errores: eso es un JSON grande por batch y
convertirlo en superficie de búsqueda es un ticket propio, no un añadido.

## Risks / Trade-offs

- **La tabla parpadea en cada tecleo** si la query key cambia sin `keepPreviousData` → el hook ya lo
  trae; hay que preservarlo al ampliar los params.
- **Sincronizar tres modelos del DataGrid (paginación, orden, selección) con la URL** es la parte
  frágil: un `useEffect` mal puesto genera un bucle de navegación. Mitigación: la URL es la única
  fuente, los handlers del grid escriben en ella y el componente deriva sus modelos de leerla —
  nunca al revés, y ningún `useEffect` de sincronización.
- **Cambiar de filtro sin volver a la página 1** deja al usuario en una página que ya no existe y la
  tabla sale vacía → todo cambio de filtro, búsqueda u orden resetea `page` a 1. Ya se hace con la
  búsqueda; hay que extenderlo.
- **Conteos de categoría no facetados** → anotado arriba, se acepta.
- **Regresión en la pantalla más usada del dashboard** → los e2e de Playwright existentes cubren el
  camino feliz de la lista; se amplían con filtros y orden antes de dar el ticket por cerrado.
