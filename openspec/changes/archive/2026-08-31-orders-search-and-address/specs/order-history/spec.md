## ADDED Requirements

### Requirement: El detalle muestra dónde se entrega la orden

El detalle de una compra SHALL mostrar la dirección de entrega que se registró con ella, junto a
las líneas y a la evidencia del pedido.

Las órdenes registradas antes de que la dirección se guardara no la tienen. En ese caso el detalle
SHALL decir que no se registró ninguna, y MUST NOT dejar un bloque vacío que se lea como un fallo
de carga.

#### Scenario: Una orden con su dirección

- **GIVEN** una compra confirmada con una dirección de entrega
- **WHEN** se consulta su detalle
- **THEN** se ve esa dirección con los datos que el comprador dio

#### Scenario: Una orden anterior a que se guardaran direcciones

- **GIVEN** una orden registrada antes de que el sistema guardara direcciones
- **WHEN** se consulta su detalle
- **THEN** se dice que no se registró ninguna dirección, y el resto del detalle se muestra completo

### Requirement: Por qué falló una orden se ve sin abrirla

La consulta de compras SHALL permitir conocer el motivo del rechazo de una orden fallida desde el
propio listado, sin necesidad de abrir cada una.

#### Scenario: Varias órdenes rechazadas en la lista

- **GIVEN** un listado con órdenes rechazadas
- **WHEN** se consulta el motivo de una de ellas desde el listado
- **THEN** se obtiene sin abrir su detalle

#### Scenario: Una orden pagada no ofrece motivo

- **WHEN** se mira una orden pagada en el listado
- **THEN** no se le atribuye ningún motivo de rechazo

## MODIFIED Requirements

### Requirement: Solo se muestra lo que el sistema sabe de una compra

La consulta de compras SHALL presentar únicamente atributos que el sistema conozca de cada orden.
La aplicación MUST NOT ofrecer columnas, filtros ni acciones que no pueda sostener con datos
reales, aunque queden visualmente vacíos.

Una compra SHALL ser identificable, y su identificador MUST poder copiarse para contrastarlo contra
el sistema.

Esta regla se aplica a lo que el sistema sabe en cada momento, no a una lista fija: la dirección de
entrega y el acotado por fechas pasan a estar permitidos porque ahora existen como dato, mientras
que el cliente sigue sin existir.

#### Scenario: No se atribuye la compra a ningún cliente

- **GIVEN** que comprar no requiere iniciar sesión
- **WHEN** se consulta una compra
- **THEN** no se muestra ni cliente ni correo ni cuenta asociados a ella

#### Scenario: Se muestra la dirección porque la orden la guarda

- **WHEN** se consulta una compra que registró una dirección de entrega
- **THEN** esa dirección se muestra, porque es un dato de la orden y no una atribución a un cliente

#### Scenario: No se ofrece filtrar por lo que no se puede filtrar

- **WHEN** se consultan las compras
- **THEN** no se ofrece acotar por cliente ni por estados que el sistema no distingue

#### Scenario: Una compra no se borra

- **WHEN** se consulta una compra
- **THEN** no se ofrece eliminarla, porque es un registro histórico

#### Scenario: Identificar una compra para contrastarla

- **WHEN** se consulta una compra
- **THEN** su identificador se muestra de forma abreviada y puede copiarse completo
