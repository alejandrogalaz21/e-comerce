# order-search Specification

## Purpose
TBD - created by archiving change orders-search-and-address. Update Purpose after archive.
## Requirements
### Requirement: Buscar y filtrar órdenes se resuelve sobre todas ellas

La consulta de órdenes SHALL resolver la búsqueda, el filtro por estado y el acotado por fechas en
el servidor, sobre el conjunto completo de órdenes registradas.

El sistema MUST NOT ofrecer un criterio que se aplique únicamente a la página visible: un control
que aparenta filtrar todo mientras filtra una página miente, y es peor que su ausencia.

El total y la paginación que se informan SHALL corresponder a los criterios aplicados, no al
catálogo completo de órdenes.

#### Scenario: La orden buscada está fuera de la primera página

- **GIVEN** más órdenes de las que caben en una página
- **WHEN** se busca una orden que quedaría en una página posterior
- **THEN** aparece igualmente

#### Scenario: El conteo acompaña al filtro

- **GIVEN** un conjunto de órdenes con estados distintos
- **WHEN** se acota a uno de esos estados
- **THEN** el total informado es el de las órdenes que cumplen el criterio, no el de todas

#### Scenario: Criterios combinados

- **WHEN** se aplican a la vez búsqueda por texto, estado y rango de fechas
- **THEN** solo se listan las órdenes que cumplen los tres

### Requirement: Se busca por lo que identifica a una orden y por lo que contiene

Dado que una orden no tiene cliente al que buscar, la búsqueda por texto SHALL aceptar tanto el
identificador de la orden como el SKU o el nombre de un producto comprado en ella.

Buscar por producto SHALL considerar las líneas de la orden tal como se vendieron, de modo que una
orden siga siendo localizable por el nombre con el que se compró aunque el producto se haya
renombrado después.

La búsqueda MUST distinguir mayúsculas de minúsculas en ningún caso, y un identificador parcial
SHALL bastar para encontrar su orden.

#### Scenario: Encontrar una orden por su identificador abreviado

- **GIVEN** el identificador abreviado que la aplicación muestra
- **WHEN** se busca con él
- **THEN** aparece la orden a la que pertenece

#### Scenario: Qué órdenes incluyen un producto

- **GIVEN** varias órdenes, algunas con cierto SKU entre sus líneas
- **WHEN** se busca ese SKU
- **THEN** se listan exactamente esas órdenes

#### Scenario: El producto cambió de nombre después de venderse

- **GIVEN** una orden que compró un producto con cierto nombre
- **WHEN** el producto se renombra y luego se busca por el nombre con el que se vendió
- **THEN** la orden sigue apareciendo

#### Scenario: Una búsqueda sin coincidencias

- **WHEN** se busca un texto que ninguna orden contiene
- **THEN** no se lista ninguna orden y se dice que la búsqueda no encontró resultados
- **AND** se ofrece descartar el criterio para volver a la consulta completa

### Requirement: Solo se filtra por estados que el sistema distingue

El filtro por estado SHALL ofrecer únicamente los estados que una orden puede tener. El sistema
MUST rechazar cualquier otro valor en lugar de devolver una lista vacía, que sería indistinguible
de "no hay órdenes en ese estado".

#### Scenario: Acotar a las órdenes rechazadas

- **GIVEN** órdenes pagadas y rechazadas
- **WHEN** se acota a las rechazadas
- **THEN** solo se listan esas

#### Scenario: Un estado que no existe

- **WHEN** se pide filtrar por un estado que el sistema no reconoce
- **THEN** la petición se rechaza indicando cuáles son válidos

### Requirement: El rango de fechas acota por cuándo se compró

El acotado por fechas SHALL aplicarse al momento en que la orden se registró, y SHALL admitir
cualquiera de sus dos extremos por separado.

El sistema MUST rechazar un rango cuyo inicio sea posterior a su fin, en vez de devolver una lista
vacía que parecería un resultado legítimo.

#### Scenario: Solo un extremo

- **WHEN** se acota únicamente desde una fecha
- **THEN** se listan las órdenes registradas a partir de ella, sin límite superior

#### Scenario: Un rango invertido

- **WHEN** se pide un rango cuyo inicio es posterior a su fin
- **THEN** la petición se rechaza explicando el problema

#### Scenario: El día completo cuenta

- **GIVEN** una orden registrada durante cierto día
- **WHEN** se acota un rango que incluye ese día en cualquiera de sus extremos
- **THEN** la orden aparece, independientemente de la hora a la que se registró

