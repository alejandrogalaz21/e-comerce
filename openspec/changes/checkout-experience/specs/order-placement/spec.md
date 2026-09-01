## ADDED Requirements

### Requirement: La compra registra cómo se paga

Comprar SHALL exigir el método de pago, y la orden SHALL guardarlo junto al resto de lo que
registró de esa compra.

El sistema MUST NOT ofrecer un método que no sepa modelar. En particular, un pago que ocurre fuera
del sistema —al entregar el pedido— MUST NOT cobrarse por el proveedor simulado ni registrarse como
pagado: eso afirma un dinero que nadie entregó. Ofrecerlo requiere antes un estado para una orden
hecha y todavía no pagada, y una forma de sacarla de ahí.

Un método que el sistema no reconozca SHALL rechazarse nombrando los válidos, en lugar de aceptarse
y quedar registrado como algo que no ocurrió.

#### Scenario: Comprar diciendo cómo se paga

- **WHEN** se compra indicando uno de los métodos que el sistema acepta
- **THEN** la compra se registra con ese método

#### Scenario: Comprar sin decir cómo se paga

- **WHEN** se intenta comprar sin método de pago
- **THEN** la compra se rechaza nombrando el dato que falta

#### Scenario: Un método que el sistema no ofrece

- **WHEN** se intenta comprar con un método que el sistema no reconoce
- **THEN** la compra se rechaza indicando cuáles son válidos, y no se registra ninguna orden

## MODIFIED Requirements

### Requirement: La compra registra dónde se entrega

Comprar SHALL exigir una dirección de entrega y un correo electrónico de contacto, y el sistema
MUST rechazar una compra que no los traiga en lugar de registrar una orden que nadie puede entregar
ni sobre la que nadie puede escribir.

El correo SHALL validarse como tal antes de aceptar la compra: un texto que no es una dirección de
correo MUST rechazarse, porque un contacto inválido es indistinguible de no tener contacto en el
momento en que hace falta usarlo.

El teléfono de entrega SHALL aceptarse tal como lo entrega un autocompletado del navegador, que
guarda los dígitos sin su prefijo internacional. Un número completo y válido MUST NOT rechazarse por
la forma en que fue escrito, y el país que le corresponde SHALL deducirse del propio número. La
corrección MUST NOT alterar un número que ya es válido en el país seleccionado.

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

#### Scenario: Un teléfono que llega del autocompletado

- **GIVEN** un teléfono guardado por el navegador como dígitos, sin su prefijo internacional
- **WHEN** el comprador lo autocompleta en el formulario de entrega
- **THEN** se acepta como el número internacional que es, y se muestra a qué país pertenece

#### Scenario: Un número nacional del país ya elegido

- **GIVEN** un país seleccionado en el formulario
- **WHEN** el comprador escribe un número nacional válido de ese país
- **THEN** se conserva como ese número, y no se reinterpreta como el de otro país

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
