## MODIFIED Requirements

### Requirement: La compra registra dónde se entrega

Comprar SHALL exigir una dirección de entrega y un correo electrónico de contacto, y el sistema
MUST rechazar una compra que no los traiga en lugar de registrar una orden que nadie puede entregar
ni sobre la que nadie puede escribir.

El correo SHALL validarse como tal antes de aceptar la compra: un texto que no es una dirección de
correo MUST rechazarse, porque un contacto inválido es indistinguible de no tener contacto en el
momento en que hace falta usarlo.

La dirección y el correo SHALL quedar guardados como parte de la orden, con los mismos valores que
el comprador proporcionó. Un cambio posterior en cualquier otro sitio MUST NOT alterarlos: como el
precio de cada línea, son datos congelados en el momento de la compra.

Guardar la dirección y el correo MUST NOT alterar el importe. El total se sigue derivando
exclusivamente de las líneas compradas.

#### Scenario: Comprar sin dirección

- **WHEN** se intenta comprar sin dirección de entrega
- **THEN** la compra se rechaza indicando qué falta, y no se crea ninguna orden ni se descuenta stock

#### Scenario: Comprar sin correo de contacto

- **WHEN** se intenta comprar sin correo electrónico
- **THEN** la compra se rechaza nombrando el dato que falta, y no se crea ninguna orden ni se descuenta stock

#### Scenario: Un correo que no es un correo

- **WHEN** se compra aportando un texto que no es una dirección de correo válida
- **THEN** la compra se rechaza señalando el correo, y no se crea ninguna orden

#### Scenario: La dirección se conserva tal cual

- **GIVEN** una compra confirmada con cierta dirección
- **WHEN** se consulta esa orden más tarde
- **THEN** la dirección es exactamente la que se dio al comprar

#### Scenario: El correo se conserva tal cual

- **GIVEN** una compra confirmada con cierto correo de contacto
- **WHEN** se consulta esa orden más tarde
- **THEN** el correo es exactamente el que se dio al comprar

#### Scenario: La dirección no cambia el total

- **GIVEN** dos compras idénticas en líneas y cantidades, con direcciones distintas
- **WHEN** ambas se confirman
- **THEN** las dos registran el mismo total

#### Scenario: Una dirección incompleta

- **WHEN** se compra con una dirección a la que le falta algún dato obligatorio
- **THEN** la compra se rechaza nombrando el dato que falta
