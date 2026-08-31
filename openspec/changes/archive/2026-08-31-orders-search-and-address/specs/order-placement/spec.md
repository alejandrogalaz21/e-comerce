## ADDED Requirements

### Requirement: La compra registra dónde se entrega

Comprar SHALL exigir una dirección de entrega, y el sistema MUST rechazar una compra que no la
traiga en lugar de registrar una orden que nadie puede entregar.

La dirección SHALL quedar guardada como parte de la orden, con los mismos valores que el comprador
proporcionó. Un cambio posterior en cualquier otro sitio MUST NOT alterarla: como el precio de cada
línea, es un dato congelado en el momento de la compra.

Guardar la dirección MUST NOT alterar el importe. El total se sigue derivando exclusivamente de las
líneas compradas.

#### Scenario: Comprar sin dirección

- **WHEN** se intenta comprar sin dirección de entrega
- **THEN** la compra se rechaza indicando qué falta, y no se crea ninguna orden ni se descuenta stock

#### Scenario: La dirección se conserva tal cual

- **GIVEN** una compra confirmada con cierta dirección
- **WHEN** se consulta esa orden más tarde
- **THEN** la dirección es exactamente la que se dio al comprar

#### Scenario: La dirección no cambia el total

- **GIVEN** dos compras idénticas en líneas y cantidades, con direcciones distintas
- **WHEN** ambas se confirman
- **THEN** las dos registran el mismo total

#### Scenario: Una dirección incompleta

- **WHEN** se compra con una dirección a la que le falta algún dato obligatorio
- **THEN** la compra se rechaza nombrando el dato que falta

### Requirement: Comprar refresca la vista del catálogo

Comprar cambia el stock, y el sistema SHALL asegurar que las consultas posteriores del catálogo
reflejen ese cambio, sin esperar a que expire nada previamente servido.

Esto MUST cumplirse por las mismas razones y con el mismo alcance que cuando el stock cambia al
administrar el catálogo: para quien consulta, el origen del cambio es indiferente.

#### Scenario: El stock consultado después de comprar

- **GIVEN** un producto ya consultado en el catálogo
- **WHEN** alguien lo compra y luego se vuelve a consultar el catálogo
- **THEN** el stock mostrado es el que quedó tras la compra

#### Scenario: Una compra rechazada no altera lo servido

- **GIVEN** un producto ya consultado en el catálogo
- **WHEN** una compra de ese producto se rechaza y luego se vuelve a consultar el catálogo
- **THEN** el stock mostrado es el mismo de antes, porque nunca se descontó

## MODIFIED Requirements

### Requirement: Comprar no exige tener cuenta

El sistema SHALL permitir completar una compra sin autenticación. La consulta de órdenes
registradas SHALL requerir autenticación.

No tener cuenta no exime de decir dónde se entrega: la dirección se aporta en la propia compra,
porque no hay perfil del que tomarla.

#### Scenario: Compra anónima

- **WHEN** un visitante sin sesión confirma una compra aportando su dirección de entrega
- **THEN** la compra se completa y la respuesta incluye la orden con sus líneas, su total y esa dirección

#### Scenario: Consultar órdenes sin sesión

- **WHEN** se intenta listar o abrir órdenes sin autenticación
- **THEN** el acceso se deniega

#### Scenario: Consultar órdenes con sesión

- **WHEN** un usuario autenticado consulta las órdenes
- **THEN** obtiene el listado y puede abrir el detalle de cualquiera con sus líneas y precios congelados
