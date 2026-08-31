## MODIFIED Requirements

### Requirement: Un cambio en el catálogo invalida lo cacheado

Cuando el catálogo cambia, el sistema SHALL dejar de servir resultados anteriores. Un cliente MUST
NOT recibir un catálogo que ya no refleja lo almacenado.

Esto SHALL aplicarse a **cualquier** operación que altere el catálogo, sin importar qué parte del
sistema la origine. Comprar cambia el stock igual que editarlo, así que cuenta como cambio: para
quien consulta, el origen es indiferente.

#### Scenario: Alta de producto

- **GIVEN** una consulta ya cacheada
- **WHEN** se crea un producto que encaja en ella
- **THEN** la siguiente consulta lo incluye

#### Scenario: Modificación y borrado

- **WHEN** se modifica o se borra un producto
- **THEN** las consultas siguientes reflejan el cambio

#### Scenario: Import masivo

- **WHEN** termina un import que alteró el catálogo
- **THEN** las consultas siguientes reflejan lo importado, sin esperar a que expire nada

#### Scenario: Una compra descuenta stock

- **GIVEN** una consulta ya cacheada que incluye cierto producto
- **WHEN** alguien compra ese producto
- **THEN** la siguiente consulta muestra el stock que quedó, sin esperar a que expire nada

#### Scenario: Las categorías siguen el mismo criterio

- **WHEN** el catálogo cambia de forma que altera las categorías existentes
- **THEN** la lista de categorías refleja el cambio
