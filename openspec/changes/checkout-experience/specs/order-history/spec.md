## ADDED Requirements

### Requirement: El comprobante dice con qué se pagó

El detalle de una compra y su recibo SHALL indicar el método con el que se pagó, junto al resto de
la evidencia del pedido.

Las órdenes registradas antes de que el método se guardara no lo tienen. En ese caso SHALL decirse
que no se registró; el sistema MUST NOT atribuirles un método, porque sería inventar un hecho sobre
un cobro.

#### Scenario: Una compra con su método

- **GIVEN** una compra pagada con uno de los métodos que el sistema acepta
- **WHEN** se consulta su detalle y se descarga su recibo
- **THEN** ambos dicen con qué se pagó

#### Scenario: Una orden anterior a que se guardara el método

- **GIVEN** una orden registrada cuando el método todavía no se pedía
- **WHEN** se consulta su detalle
- **THEN** se dice que no se registró, y el resto de la evidencia se muestra completa

### Requirement: Confirmar una compra se hace viendo lo que se compra

El paso donde la compra se confirma SHALL mostrar las líneas que componen el importe —qué producto,
cuántas unidades y a qué precio—, no solo el total.

Todo paso del proceso de compra que presente un importe SHALL presentarlo contrastado con el
catálogo, con el mismo criterio que el carrito: un total sin verificar es exactamente lo que
`order-history` prohíbe mostrar.

#### Scenario: Confirmar sabiendo por qué se cobra

- **WHEN** el comprador llega al paso de pago
- **THEN** ve cada línea con su cantidad y su precio, y el total que resulta de ellas

#### Scenario: Un paso intermedio que muestra un total

- **GIVEN** un paso del proceso de compra que muestra el importe sin listar el carrito completo
- **WHEN** el comprador llega a él
- **THEN** ese importe también está contrastado con el catálogo
