## MODIFIED Requirements

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
