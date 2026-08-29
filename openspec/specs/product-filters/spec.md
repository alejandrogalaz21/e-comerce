# product-filters Specification

## Purpose
TBD - created by archiving change product-filters-api. Update Purpose after archive.
## Requirements
### Requirement: Filtro por rango de precio

El sistema SHALL permitir acotar el listado de productos por un precio mínimo, un precio máximo, o
ambos. Los límites SHALL ser inclusivos. Un rango imposible MUST NOT devolverse como una lista
vacía: SHALL rechazarse con un error de validación que nombre el problema.

#### Scenario: Solo precio mínimo

- **WHEN** se solicita `GET /api/v1/products?minPrice=20`
- **THEN** la respuesta es 200 y todos los productos devueltos tienen precio mayor o igual a 20

#### Scenario: Rango completo, límites inclusivos

- **WHEN** se solicita `GET /api/v1/products?minPrice=10&maxPrice=30` y existe un producto de precio exactamente 30
- **THEN** ese producto aparece en el resultado

#### Scenario: Rango invertido

- **WHEN** se solicita `GET /api/v1/products?minPrice=50&maxPrice=10`
- **THEN** la respuesta es 400 indicando que el precio máximo no puede ser menor que el mínimo

#### Scenario: Precio negativo

- **WHEN** se solicita `GET /api/v1/products?minPrice=-5`
- **THEN** la respuesta es 400 y no se ejecuta ninguna consulta al catálogo

### Requirement: Filtro por disponibilidad

El sistema SHALL permitir listar únicamente productos con existencias, o únicamente productos
agotados. La ausencia del parámetro SHALL significar "sin filtrar por disponibilidad".

#### Scenario: Solo con existencias

- **WHEN** se solicita `GET /api/v1/products?inStock=true`
- **THEN** todos los productos devueltos tienen stock mayor que cero

#### Scenario: Solo agotados

- **WHEN** se solicita `GET /api/v1/products?inStock=false`
- **THEN** todos los productos devueltos tienen stock igual a cero

#### Scenario: Parámetro ausente

- **WHEN** se solicita `GET /api/v1/products` sin `inStock`
- **THEN** el resultado incluye tanto productos con existencias como agotados

### Requirement: Filtro por una o varias categorías

El sistema SHALL permitir filtrar por categoría aceptando varias categorías en una sola petición.
La comparación SHALL ser insensible a mayúsculas. Enviar una única categoría SHALL comportarse
exactamente como antes de esta capacidad.

#### Scenario: Varias categorías

- **WHEN** se solicita `GET /api/v1/products?category=Electronics,Tools`
- **THEN** el resultado contiene productos de ambas categorías y de ninguna otra

#### Scenario: Categoría única, insensible a mayúsculas

- **WHEN** se solicita `GET /api/v1/products?category=electronics`
- **THEN** el resultado contiene los productos de la categoría `Electronics`

#### Scenario: Espacios y valores vacíos en la lista

- **WHEN** se solicita `GET /api/v1/products?category=Electronics,%20,Tools,`
- **THEN** los fragmentos vacíos se descartan y el filtro se aplica solo sobre `Electronics` y `Tools`

#### Scenario: Categoría inexistente

- **WHEN** se solicita `GET /api/v1/products?category=NoExiste`
- **THEN** la respuesta es 200 con una lista vacía y `total` igual a cero

### Requirement: Orden explícito y acotado

El sistema SHALL permitir ordenar el listado por un conjunto cerrado de campos y en ambas
direcciones. Un campo o una dirección fuera de ese conjunto MUST NOT llegar a formar parte de la
consulta a la base de datos: SHALL rechazarse como error de validación.

#### Scenario: Orden por precio ascendente

- **WHEN** se solicita `GET /api/v1/products?sortBy=price&sortDir=asc`
- **THEN** los productos vienen ordenados de menor a mayor precio

#### Scenario: Orden por fecha de actualización

- **GIVEN** que la importación hace upsert por SKU, de modo que una fila existente se actualiza sin cambiar su fecha de creación
- **WHEN** se solicita `GET /api/v1/products?sortBy=updatedAt&sortDir=desc` después de un import
- **THEN** los productos que ese import creó o actualizó vienen primero

#### Scenario: Orden por defecto

- **WHEN** se solicita `GET /api/v1/products` sin parámetros de orden
- **THEN** los productos vienen del más reciente al más antiguo, igual que antes de esta capacidad

#### Scenario: Campo de orden no permitido

- **WHEN** se solicita `GET /api/v1/products?sortBy=password`
- **THEN** la respuesta es 400 y el valor recibido no se usa para construir la consulta

#### Scenario: Orden estable entre páginas

- **WHEN** se recorren todas las páginas ordenando por un campo con valores repetidos, como `stock`
- **THEN** ningún producto aparece en dos páginas ni queda omitido

### Requirement: Los filtros son componibles y la paginación los respeta

El sistema SHALL permitir combinar búsqueda de texto, categorías, rango de precio, disponibilidad y
orden en una misma petición, aplicándolos todos de forma conjuntiva. El total del envelope de
paginación SHALL corresponder al conjunto filtrado, no al catálogo completo.

#### Scenario: Combinación de filtros

- **WHEN** se solicita `GET /api/v1/products?q=stand&category=Electronics&minPrice=10&inStock=true&sortBy=price&sortDir=asc`
- **THEN** cada producto devuelto cumple simultáneamente las cinco condiciones

#### Scenario: Total y última página bajo filtro

- **WHEN** un filtro deja 3 productos de un catálogo de 87 y se pide `limit=10`
- **THEN** el envelope reporta `total` igual a 3 y una única página

#### Scenario: Compatibilidad con clientes existentes

- **WHEN** se solicita `GET /api/v1/products?page=1&limit=10` tal como lo hace el cliente actual
- **THEN** la respuesta es idéntica en contenido y orden a la anterior a esta capacidad

