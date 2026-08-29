# order-placement Specification

## Purpose

Define qué garantiza el sistema cuando alguien compra: atomicidad entre orden, stock y cobro;
imposibilidad de sobreventa bajo compras simultáneas; inmutabilidad del precio comprado;
idempotencia frente a envíos repetidos; y qué se responde cuando falta stock o el cobro se rechaza.

## Requirements
### Requirement: Comprar es una operación de todo o nada

El sistema SHALL registrar la orden, descontar el stock y resolver el cobro dentro de una única
transacción. Si cualquiera de las tres falla, el sistema MUST NOT dejar rastro de las otras dos.

#### Scenario: El cobro se rechaza

- **GIVEN** un producto con 5 unidades en stock
- **WHEN** un cliente compra 2 unidades y el cobro es rechazado
- **THEN** el stock sigue en 5, no queda ninguna orden pagada y el cliente recibe un error de pago que puede reintentar

#### Scenario: Una línea sin stock cancela la orden completa

- **GIVEN** una orden de dos productos, uno con stock suficiente y otro sin él
- **WHEN** el cliente confirma
- **THEN** no se descuenta stock de ninguno de los dos y no se crea la orden

#### Scenario: Compra correcta

- **GIVEN** un producto con 5 unidades
- **WHEN** un cliente compra 2 y el cobro se aprueba
- **THEN** quedan 3 unidades y existe una orden pagada con esas 2 unidades

### Requirement: No se puede vender más stock del que existe

El sistema SHALL impedir que compras simultáneas vendan la misma unidad más de una vez. Cuando el
stock disponible no alcanza, el sistema MUST rechazar la compra indicando qué producto lo provocó y
cuántas unidades quedaban.

#### Scenario: Dos clientes compran la última unidad a la vez

- **GIVEN** un producto con exactamente 1 unidad
- **WHEN** dos clientes confirman la compra de esa unidad simultáneamente
- **THEN** exactamente uno recibe su orden confirmada y el otro recibe un conflicto de stock
- **AND** el stock final es 0, nunca negativo

#### Scenario: Se pide más de lo que hay

- **GIVEN** un producto con 3 unidades
- **WHEN** un cliente intenta comprar 10
- **THEN** la compra se rechaza por conflicto, indicando el producto y que quedaban 3

#### Scenario: Dos órdenes con los mismos productos en distinto orden

- **GIVEN** dos clientes que compran a la vez los mismos dos productos, cada uno listándolos en orden inverso
- **WHEN** ambos confirman
- **THEN** las dos compras se resuelven sin quedar bloqueadas entre sí

### Requirement: El precio comprado queda congelado

Cada línea de la orden SHALL guardar el precio unitario vigente en el momento de la compra. Un
cambio posterior del precio del producto MUST NOT alterar ninguna orden ya registrada.

#### Scenario: El producto sube de precio después

- **GIVEN** una orden que compró un producto a 49.99
- **WHEN** el precio del producto pasa después a 59.99
- **THEN** la orden sigue mostrando 49.99 en esa línea y su total no cambia

### Requirement: El importe lo determina el servidor

El sistema SHALL calcular el total a partir del precio almacenado de cada producto y de las
cantidades pedidas. El sistema MUST NOT aceptar precios ni totales enviados por el cliente.

#### Scenario: El cliente manda un importe

- **WHEN** una solicitud de compra incluye un precio o un total
- **THEN** el sistema lo ignora y cobra el importe calculado a partir del catálogo

#### Scenario: Importes que rompen en coma flotante

- **GIVEN** una orden con líneas cuyos precios sumados son propensos a error de redondeo binario
- **WHEN** se calcula el total
- **THEN** el importe es exacto al céntimo

### Requirement: Una compra enviada dos veces se registra una vez

El sistema SHALL identificar cada intento de compra con una clave de idempotencia. Una segunda
solicitud con la misma clave MUST devolver la orden ya creada, sin crear otra ni cobrar de nuevo.

#### Scenario: Doble clic en confirmar

- **GIVEN** un cliente que confirma su compra y el botón se pulsa dos veces
- **WHEN** ambas solicitudes llegan con la misma clave
- **THEN** existe una sola orden, se descontó el stock una sola vez y hubo un solo cobro

#### Scenario: Reintento tras un corte de red

- **GIVEN** una compra que se registró pero cuya respuesta no llegó al cliente
- **WHEN** el cliente reintenta con la misma clave
- **THEN** recibe la orden ya existente en lugar de un conflicto o una orden nueva

#### Scenario: Compras distintas

- **WHEN** dos compras diferentes se envían con claves diferentes
- **THEN** se registran como dos órdenes independientes

### Requirement: Cada fallo de compra se distingue del resto

El sistema SHALL responder con un resultado distinto según la causa, de modo que el cliente pueda
saber si tiene sentido reintentar. Un fallo MUST NOT presentarse como un error genérico.

#### Scenario: Stock insuficiente

- **WHEN** falta stock
- **THEN** la respuesta indica conflicto de stock, nombra el producto y reintentar sin cambiar cantidades no procede

#### Scenario: Pago rechazado

- **WHEN** el cobro es rechazado
- **THEN** la respuesta indica que el pago no se completó y que reintentar es válido

#### Scenario: Producto inexistente

- **WHEN** la compra referencia un producto que no está en el catálogo
- **THEN** la respuesta indica que no se encontró

#### Scenario: Cantidad inválida

- **WHEN** una línea pide una cantidad que no es un entero positivo
- **THEN** la solicitud se rechaza por validación antes de tocar el catálogo

### Requirement: Comprar no exige tener cuenta

El sistema SHALL permitir completar una compra sin autenticación. La consulta de órdenes
registradas SHALL requerir autenticación.

#### Scenario: Compra anónima

- **WHEN** un visitante sin sesión confirma una compra
- **THEN** la compra se completa y la respuesta incluye la orden con sus líneas y su total

#### Scenario: Consultar órdenes sin sesión

- **WHEN** se intenta listar o abrir órdenes sin autenticación
- **THEN** el acceso se deniega

#### Scenario: Consultar órdenes con sesión

- **WHEN** un usuario autenticado consulta las órdenes
- **THEN** obtiene el listado y puede abrir el detalle de cualquiera con sus líneas y precios congelados

### Requirement: El estado de la orden refleja lo que ocurrió

Una orden SHALL registrar si fue pagada o si su cobro falló, y esos estados MUST corresponder con
lo que realmente sucedió con el stock y el cobro.

#### Scenario: Orden pagada

- **WHEN** el cobro se aprueba
- **THEN** la orden queda como pagada y el stock aparece descontado

#### Scenario: No quedan órdenes a medias

- **WHEN** se consultan las órdenes tras un cobro rechazado
- **THEN** no aparece ninguna orden pagada por ese intento

