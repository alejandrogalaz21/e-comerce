# Design: product-filters-api (TK-039)

## Context

`ProductsService.findAll` hoy construye una query con `orderBy('product.createdAt', 'DESC')` fijo,
`skip/take` de `PaginationHelper`, y dos `andWhere` condicionales: el `ILIKE` de `q` (sobre name,
sku, description y category, con `escapeLikeWildcards`) y el `LOWER(category) = LOWER(:category)`.
`ProductFiltersDto extends PaginationDTO` y declara únicamente `q` y `category`, ambos `string`
opcionales con `trimText` y `MaxLength(100)`.

La migración `1787961600000-product-search-indexes` ya dejó `pg_trgm` con índices GIN sobre `name`
y `sku`, más un btree sobre `category`. No hay nada sobre `price` ni sobre `stock`.

`price` es `DECIMAL(10,2)` y el driver de Postgres lo serializa como **string**; el FE ya lo
convierte a number en `product.mapper.ts` (patrón ACL de TK-011). Eso importa aquí: los parámetros
de rango entran como número por la query string y se comparan contra una columna numérica, así que
la conversión vive en el DTO, no en el SQL.

Restricción heredada de TK-031: `GET /products` y `GET /products/:id` son `@Public()`. El endpoint
de categorías vive en la misma superficie pública — la tienda lo consume sin sesión.

## Goals / Non-Goals

**Goals:**

- Un contrato de consulta del catálogo **cerrado y explícito**, suficiente para las dos pantallas
  que vienen (TK-035, TK-036) y estable para que ambas avancen sin volver a tocar `api/`.
- Orden server-side real, para que el DataGrid deje de ordenar la página en vez del conjunto.
- Descubrir la taxonomía del catálogo sin que el cliente tenga que inferirla paginando productos.
- Aditivo: ningún cliente actual cambia de comportamiento.

**Non-Goals:**

- Operadores arbitrarios por campo, filtros dinámicos o un DSL de query.
- Facetas con conteo por filtro combinado (cuántos productos quedarían por cada categoría *dado*
  el resto de filtros activos). El conteo de `/categories` es global, no facetado.
- Caché (TK-038) y cualquier cambio de FE.

## Contrato de API (fuente de verdad para BE y FE)

```
GET /api/v1/products
  page      number   >= 1        default 1        (ya existe)
  limit     number   1..100      default 10       (ya existe)
  q         string   <= 100      ILIKE sobre name|sku|description|category  (ya existe)
  category  string   <= 200      NUEVO multi-valor: "Electronics,Tools"
  minPrice  number   >= 0        NUEVO
  maxPrice  number   >= 0        NUEVO   400 si maxPrice < minPrice
  inStock   boolean              NUEVO   true -> stock > 0 ; false -> stock = 0
  sortBy    enum     name|price|stock|createdAt|updatedAt   NUEVO  default createdAt
  sortDir   enum     asc|desc                               NUEVO  default desc

  -> 200 { data: Product[], pagination: { total, per_page, current_page, last_page, from, to } }
  -> 400 { statusCode, message: string[], error }

GET /api/v1/products/categories
  -> 200 [ { category: "Accessories", count: 2 }, { category: "Beauty", count: 1 }, ... ]
         orden alfabético, sin paginación
```

`total` en el envelope refleja **el conjunto filtrado**, no la tabla completa — es lo que ya hace
`getManyAndCount` y lo que la paginación server-side del FE necesita para calcular `last_page`.

## Decisions

### 1. El orden es una whitelist mapeada, nunca el string del cliente

`sortBy` se valida con `@IsIn(['name','price','stock','createdAt','updatedAt'])` en el DTO y, ya
dentro del servicio, se traduce por un **mapa literal** a la columna de la entidad. El string del
cliente no llega jamás a `orderBy`.

`updatedAt` está en la whitelist por una razón concreta: el import hace **upsert por SKU**, así que
una fila que ya existía no se crea sino que se actualiza — su `createdAt` no se mueve y solo cambia
`updatedAt`. Ordenar por fecha de creación deja invisible exactamente lo que un segundo import
tocó. Es el orden que hace verificable el pipeline de importación, que es el caso de uso que
priorizó el usuario.

*Alternativa descartada*: pasar `product.${filters.sortBy}` directo a `orderBy`. Aunque el
`@IsIn` ya cortaría los valores inválidos, deja la interpolación de identificadores como patrón en
el código — TypeORM no parametriza nombres de columna, así que cualquier futuro relajamiento de esa
validación se convierte en inyección. El mapa hace que el caso peor sea un `undefined`, no SQL.

Default `createdAt desc` = el comportamiento actual exacto. Se añade `addOrderBy('product.id')` como
desempate: sin él, ordenar por un campo con valores repetidos (`stock`, `category`) puede devolver
la misma fila en dos páginas distintas y saltarse otra, porque Postgres no garantiza orden estable
entre queries con `LIMIT/OFFSET`. Es el bug clásico de paginación server-side y aquí aparecería en
cuanto se ordene por `stock`.

### 2. `category` multi-valor por coma, no array repetido

`?category=Electronics,Tools`. Un `@Transform` parte por coma, hace trim, descarta vacíos y
deduplica; el `where` pasa a `LOWER(product.category) IN (:...categories)` con los valores ya en
minúsculas. Con un solo valor el resultado es idéntico al de hoy, así que no es breaking.

*Alternativa descartada*: `?category=Electronics&category=Tools` (array repetido). Es más idiomático
en HTTP pero obliga a normalizar "a veces string, a veces array" en el DTO, y la forma con coma es
la que se lee mejor en una URL compartida — que es justo lo que TK-035 quiere permitir al poner los
filtros en la query string.

### 3. `inStock=false` significa "sin stock", no "sin filtro"

El parámetro ausente no filtra; `true` filtra `stock > 0`; `false` filtra `stock = 0`. Tratar
`false` como "no filtrar" sería tirar un caso de uso real del dashboard ("enséñame lo que está
agotado") y además vuelve el parámetro ambiguo en la URL.

Se transforma con un `@Transform` explícito de `'true'`/`'false'` (todo llega como string en la
query string) y se valida con `@IsBoolean`.

### 4. `/products/categories` se declara ANTES de `/products/:id`

NestJS resuelve rutas en orden de declaración, y `:id` está anotado con `ParseUUIDPipe`. Si
`categories` se declarara después, `GET /products/categories` entraría por el handler de `:id` y
respondería **400 "Validation failed (uuid is expected)"** en vez de 404 o del listado. Es un fallo
silencioso y confuso, así que el orden de declaración va acompañado de un test que lo fija.

### 5. Las categorías se agrupan por el valor almacenado, no normalizado

`SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY category`. El pipeline de
import ya hace `trim` y aplica el default `Uncategorized`, así que el dato guardado es el
representante correcto y devolverlo tal cual permite pintarlo en un chip sin adivinar mayúsculas.

*Consecuencia aceptada*: si alguien importa `electronics` y `Electronics`, salen dos entradas
mientras que el **filtro** (case-insensitive) las trata como una — la suma de los conteos por chip
puede no cuadrar con el total. Se acepta porque normalizar con `LOWER` obligaría a elegir un
representante arbitrario para mostrar, y el catálogo real no tiene ese caso. Queda anotado como
riesgo.

### 6. Un índice btree en `price`, ninguno en `stock`

El rango de precio sin índice es un seq scan sobre la tabla entera. `inStock`, en cambio, es un
predicado de baja selectividad (casi todo el catálogo tiene stock > 0): un índice ahí no se usaría
y solo costaría escrituras. Si algún día "agotados" fuera la consulta caliente, el índice correcto
sería parcial (`WHERE stock = 0`), no uno completo — se deja anotado, no se implementa.

### 7. La validación cruzada `minPrice <= maxPrice` vive en el DTO

Con un validador a nivel de clase, para que el error salga en el mismo formato `message: string[]`
que el resto de `class-validator` y el 400 sea autoexplicativo. La alternativa —dejar pasar el rango
imposible y devolver una lista vacía— es peor: el usuario ve "no hay productos" cuando lo que hay es
un filtro mal puesto.

## Risks / Trade-offs

- **Duplicados por mayúsculas en `/categories`** → documentado en la spec como comportamiento
  esperado; el import ya normaliza el espaciado y el default, que es de donde vendría el ruido.
- **La combinación `q` + rango de precio no tiene un índice compuesto** → los índices trigram y el
  btree de `price` se evalúan por separado y Postgres decide; sobre 87 filas es irrelevante y
  optimizarlo ahora sería adivinar la carga real.
- **Superficie de query string más ancha** → mitigado porque todos los valores están acotados por
  `class-validator` (enums, rangos, longitudes) y `q` sigue pasando por `escapeLikeWildcards`; no se
  añade ninguna ruta por la que un valor del cliente llegue a formar SQL.
- **Riesgo de dependencia**: TK-035 y TK-036 quedan bloqueados hasta que esto exista. Es
  deliberado, y se contiene manteniendo el change chico y sin FE — es verificable de punta a punta
  con tests y Swagger el mismo día.
