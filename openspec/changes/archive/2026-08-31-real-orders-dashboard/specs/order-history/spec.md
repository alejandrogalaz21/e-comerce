## ADDED Requirements

### Requirement: Lo que se lista son las compras que el sistema registró

La consulta de compras SHALL mostrar exclusivamente órdenes obtenidas del sistema. La aplicación
MUST NOT mostrar órdenes de demostración, ejemplo o relleno en ninguna circunstancia, incluidas la
carga inicial, el error de red y la ausencia de compras.

Cada compra registrada SHALL ser localizable en la consulta, y las compras SHALL presentarse de la
más reciente a la más antigua.

#### Scenario: Una compra recién confirmada aparece en la consulta

- **GIVEN** un sistema sin ninguna compra registrada
- **WHEN** un cliente completa una compra y luego se consultan las compras
- **THEN** se ve exactamente una compra, la suya, con su fecha, su número de líneas, su total y su estado

#### Scenario: Todavía no hay ninguna compra

- **GIVEN** un sistema sin compras registradas
- **WHEN** se consultan las compras
- **THEN** se dice que aún no hay compras y se ofrece ir a la tienda
- **AND** no se muestra ninguna fila

#### Scenario: La consulta no puede resolverse

- **WHEN** la consulta de compras falla
- **THEN** se informa del fallo y se ofrece reintentar
- **AND** no se muestra ninguna compra en su lugar

#### Scenario: Más compras de las que caben en una página

- **GIVEN** más compras registradas de las que caben en una página
- **WHEN** se avanza de página
- **THEN** se ven compras distintas de las anteriores, siempre de la más reciente a la más antigua

### Requirement: Solo se muestra lo que el sistema sabe de una compra

La consulta de compras SHALL presentar únicamente atributos que el sistema conozca de cada orden.
La aplicación MUST NOT ofrecer columnas, filtros ni acciones que no pueda sostener con datos
reales, aunque queden visualmente vacíos.

Una compra SHALL ser identificable, y su identificador MUST poder copiarse para contrastarlo contra
el sistema.

#### Scenario: No se atribuye la compra a nadie

- **GIVEN** que comprar no requiere iniciar sesión
- **WHEN** se consulta una compra
- **THEN** no se muestra ni cliente ni correo ni dirección asociados a ella

#### Scenario: No se ofrece filtrar por lo que no se puede filtrar

- **WHEN** se consultan las compras
- **THEN** no se ofrece acotar por estados que el sistema no distingue, ni por rangos de fecha, ni por cliente

#### Scenario: Una compra no se borra

- **WHEN** se consulta una compra
- **THEN** no se ofrece eliminarla, porque es un registro histórico

#### Scenario: Identificar una compra para contrastarla

- **WHEN** se consulta una compra
- **THEN** su identificador se muestra de forma abreviada y puede copiarse completo

### Requirement: El detalle de una compra prueba lo que la compra garantiza

El detalle de una compra SHALL exponer la evidencia que permite verificar, sin consultar la base de
datos, las garantías de `order-placement` y `payment-processing`.

El detalle SHALL mostrar, para cada línea, el producto comprado, la cantidad, el precio unitario
congelado en el momento de la compra y el subtotal de la línea. Cuando el precio actual del producto
difiera del precio congelado, el detalle SHALL señalar ambos, de modo que la inmutabilidad del
precio comprado sea observable.

El detalle SHALL mostrar además el estado de la compra, su fecha, su total, la clave de idempotencia
con la que se creó, y la referencia del cobro cuando fue aprobado o el motivo cuando fue rechazado.

#### Scenario: El precio comprado no cambió aunque el catálogo sí

- **GIVEN** una compra registrada de un producto a un precio dado
- **WHEN** el precio de ese producto cambia en el catálogo y luego se consulta la compra
- **THEN** la línea sigue mostrando el precio al que se compró
- **AND** se señala que el precio actual del producto es distinto

#### Scenario: Verificar que el cobro fue simulado

- **GIVEN** una compra cuyo cobro fue aprobado
- **WHEN** se consulta su detalle
- **THEN** se ve la referencia devuelta por el proveedor de pago

#### Scenario: Una compra cuyo cobro fue rechazado

- **GIVEN** una compra cuyo cobro fue rechazado
- **WHEN** se consulta su detalle
- **THEN** se ve su estado de rechazo y el motivo, y no se muestra ninguna referencia de cobro

#### Scenario: Verificar la idempotencia de una compra

- **WHEN** se consulta el detalle de una compra
- **THEN** se ve la clave de idempotencia con la que se creó, y se explica que repetir esa clave devuelve esta misma compra en lugar de cobrar de nuevo

#### Scenario: Contrastar una línea contra el catálogo

- **WHEN** se consulta el detalle de una compra
- **THEN** cada línea permite abrir el producto que se compró, para comprobar su stock actual

#### Scenario: Se consulta una compra que no existe

- **WHEN** se consulta el detalle de un identificador que no corresponde a ninguna compra
- **THEN** se dice que no se encontró y se ofrece volver a la consulta de compras

### Requirement: El total mostrado es el total registrado

Cualquier importe que la aplicación presente como total de una compra SHALL ser el total que el
sistema registró para esa compra. La aplicación MUST NOT mostrar durante el proceso de compra un
total que difiera del que se registrará.

#### Scenario: El total del checkout coincide con el registrado

- **GIVEN** un cliente que llega al paso de pago con productos en el carrito
- **WHEN** confirma la compra y consulta después esa compra
- **THEN** el total que se le mostró antes de confirmar es el mismo que el registrado

#### Scenario: El recibo coincide con la compra

- **GIVEN** una compra confirmada
- **WHEN** el comprador descarga su recibo
- **THEN** el recibo coincide con la compra registrada en líneas, cantidades, precios y total
