# order-history Specification

## Purpose
TBD - created by archiving change real-orders-dashboard. Update Purpose after archive.
## Requirements
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

Esta regla se aplica a lo que el sistema sabe en cada momento, no a una lista fija: los datos de
entrega —destinatario, teléfono, correo de contacto y dirección— pasan a estar permitidos porque
ahora existen como dato de la orden, mientras que el cliente sigue sin existir. El correo que la
orden guarda es el contacto de esa entrega, no una cuenta: la aplicación MUST NOT presentarlo como
cliente registrado, ni ofrecer navegar de él a un historial de compras suyas.

#### Scenario: No se atribuye la compra a ningún cliente

- **GIVEN** que comprar no requiere iniciar sesión
- **WHEN** se consulta una compra
- **THEN** no se muestra ninguna cuenta asociada a ella, ni se ofrece ver "las demás compras" de quien la hizo

#### Scenario: Se muestran los datos de entrega porque la orden los guarda

- **WHEN** se consulta una compra que registró datos de entrega
- **THEN** se ven el destinatario, su teléfono, su correo de contacto y su dirección, porque son datos de la orden y no una atribución a un cliente

#### Scenario: No se ofrece filtrar por lo que no se puede filtrar

- **WHEN** se consultan las compras
- **THEN** no se ofrece acotar por cliente ni por estados que el sistema no distingue

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

### Requirement: El detalle muestra dónde se entrega la orden

El detalle de una compra SHALL mostrar los datos de entrega que se registraron con ella
—destinatario, teléfono, correo de contacto y dirección—, junto a las líneas y a la evidencia del
pedido.

Las órdenes registradas antes de que un dato de entrega se guardara no lo tienen. En ese caso el
detalle SHALL decir que no se registró, y MUST NOT dejar un bloque vacío que se lea como un fallo
de carga.

#### Scenario: Una orden con sus datos de entrega

- **GIVEN** una compra confirmada con dirección y correo de contacto
- **WHEN** se consulta su detalle
- **THEN** se ven esos datos tal como el comprador los dio

#### Scenario: Una orden anterior a que se guardaran direcciones

- **GIVEN** una orden registrada antes de que el sistema guardara direcciones
- **WHEN** se consulta su detalle
- **THEN** se dice que no se registró ninguna dirección, y el resto del detalle se muestra completo

#### Scenario: Una orden anterior a que se pidiera el correo

- **GIVEN** una orden registrada cuando el correo todavía no se pedía
- **WHEN** se consulta su detalle
- **THEN** se dice que no se registró ningún correo, y el resto de los datos de entrega se muestra completo

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

### Requirement: El listado deja leer los datos de entrega de un vistazo

La consulta de compras SHALL presentar los datos de entrega de cada orden de forma que se puedan
leer y comparar entre filas, sin abrir el detalle de cada una.

Cada dato de entrega que se muestre SHALL ocupar su propio lugar en la fila: agrupar varios en una
misma celda impide alinearlos y compararlos entre órdenes.

El teléfono SHALL mostrarse indicando a qué país corresponde su prefijo, con la misma lectura que
ofrece el formulario donde se capturó: un número en formato internacional sin esa referencia obliga
a descifrar la lada.

El reparto del espacio de la tabla SHALL asignarse a las columnas con contenido variable. La
aplicación MUST NOT dejar espacio muerto entre columnas mientras un dato queda truncado.

Una orden sin cierto dato de entrega SHALL mostrar su ausencia de forma explícita, distinguible de
un dato vacío por error.

#### Scenario: Comparar destinatarios entre órdenes

- **GIVEN** un listado con varias órdenes de destinatarios distintos
- **WHEN** se recorren las filas
- **THEN** el destinatario, el teléfono, el correo y la dirección se leen cada uno en su propia columna, alineados entre filas

#### Scenario: De qué país es el teléfono

- **GIVEN** una orden con un teléfono en formato internacional
- **WHEN** se mira su fila
- **THEN** se ve a qué país corresponde su prefijo, igual que en el formulario donde se capturó

#### Scenario: Una orden sin datos de entrega

- **GIVEN** una orden registrada antes de que se guardaran los datos de entrega
- **WHEN** se mira su fila
- **THEN** las columnas correspondientes indican explícitamente que el dato no se registró

### Requirement: El recibo de una compra se puede obtener en cualquier momento

El recibo de una compra SHALL poder descargarse desde el detalle de esa compra, y no únicamente en
el momento en que se confirma. Un comprobante que solo existe mientras un diálogo está abierto se
pierde al cerrarlo, y la compra ya registrada es la fuente que puede reproducirlo.

El recibo descargado desde el detalle SHALL coincidir con la compra registrada en líneas,
cantidades, precios y total, igual que el que se obtiene al terminar la compra: ambos SHALL
reproducir la misma orden.

Mientras el recibo se genera, la aplicación SHALL indicar que está en curso, y si no puede
generarse SHALL decirlo en vez de quedarse sin respuesta.

#### Scenario: Descargar el recibo de una compra anterior

- **GIVEN** una compra registrada hace tiempo, con su diálogo de confirmación cerrado desde entonces
- **WHEN** se abre su detalle y se pide su recibo
- **THEN** se descarga un recibo de esa compra

#### Scenario: El mismo recibo por los dos caminos

- **GIVEN** una compra confirmada
- **WHEN** se obtiene su recibo al terminar la compra y después desde su detalle
- **THEN** ambos coinciden en líneas, cantidades, precios y total

#### Scenario: El recibo tarda en generarse

- **WHEN** se pide el recibo desde el detalle
- **THEN** mientras se genera se indica que la descarga está en curso
- **AND** si la generación falla se informa del fallo
