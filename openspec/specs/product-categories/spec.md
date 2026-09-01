# product-categories Specification

## Purpose

Define cómo se descubren las categorías presentes en el catálogo, con qué forma y orden se devuelven, y la garantía de que los nombres devueltos sirven tal cual para filtrar.
## Requirements
### Requirement: Descubrimiento de las categorías del catálogo

El sistema SHALL exponer las categorías existentes en el catálogo junto con el número de productos
de cada una, sin exigir que el cliente pagine el catálogo completo para inferirlas. El recurso
SHALL ser público, igual que el listado de productos.

#### Scenario: Catálogo con productos

- **WHEN** se solicita `GET /api/v1/products/categories` sobre un catálogo con productos en varias categorías
- **THEN** la respuesta es 200 con una entrada por categoría existente, cada una con su nombre y su conteo de productos

#### Scenario: Sin sesión

- **WHEN** se solicita `GET /api/v1/products/categories` sin header `Authorization`
- **THEN** la respuesta es 200

#### Scenario: Catálogo vacío

- **WHEN** se solicita `GET /api/v1/products/categories` sobre un catálogo sin productos
- **THEN** la respuesta es 200 con una lista vacía, no un error

### Requirement: Orden y forma estables

El sistema SHALL devolver las categorías en orden alfabético y sin paginación, de modo que la
interfaz pueda pintarlas como un conjunto cerrado de opciones sin lógica adicional.

#### Scenario: Orden alfabético

- **WHEN** se consultan las categorías de un catálogo que contiene `Kitchen`, `Accessories` y `Electronics`
- **THEN** vienen en ese orden alfabético, independientemente de cuántos productos tenga cada una

#### Scenario: Respuesta sin envelope de paginación

- **WHEN** se consultan las categorías
- **THEN** la respuesta es la lista directa, sin los campos de paginación del listado de productos

### Requirement: Los nombres devueltos sirven para filtrar

El sistema SHALL devolver cada categoría con el valor tal como está almacenado, de forma que ese
mismo valor pueda enviarse sin transformación al filtro `category` del listado de productos y
produzca el conteo anunciado.

Los conteos SHALL contar únicamente productos a la venta, y una categoría cuyos productos estén
todos retirados NO SHALL aparecer. El recurso alimenta los chips de la tienda pública: anunciar
`Footwear (3)` y que al pulsarlo no aparezca nada rompe la garantía que este requisito existe para
sostener.

#### Scenario: El valor devuelto alimenta el filtro

- **WHEN** se toma una categoría de `GET /api/v1/products/categories` con conteo N y se solicita `GET /api/v1/products?category=<ese valor>`
- **THEN** el envelope reporta `total` igual a N

#### Scenario: Productos sin categoría en el CSV

- **WHEN** el catálogo contiene productos importados sin categoría, a los que el import asignó el valor por defecto
- **THEN** ese valor por defecto aparece como una categoría más, con su conteo, y es filtrable como cualquier otra

#### Scenario: Una categoría con productos retirados

- **GIVEN** una categoría con tres productos, uno de ellos retirado
- **WHEN** se consultan las categorías
- **THEN** esa categoría reporta un conteo de dos

#### Scenario: Una categoría entera retirada

- **GIVEN** una categoría cuyos productos están todos retirados
- **WHEN** se consultan las categorías
- **THEN** esa categoría no aparece en la lista

