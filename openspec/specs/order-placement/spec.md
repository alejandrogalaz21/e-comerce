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

### Requirement: El estado de la orden refleja lo que ocurrió

Una orden SHALL registrar si fue pagada o si su cobro falló, y esos estados MUST corresponder con
lo que realmente sucedió con el stock y el cobro.

#### Scenario: Orden pagada

- **WHEN** el cobro se aprueba
- **THEN** la orden queda como pagada y el stock aparece descontado

#### Scenario: No quedan órdenes a medias

- **WHEN** se consultan las órdenes tras un cobro rechazado
- **THEN** no aparece ninguna orden pagada por ese intento

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

### Requirement: Una línea que la compra rechazaría se identifica antes de confirmar

La aplicación SHALL identificar qué línea provoca un rechazo antes de que el comprador confirme,
cuando el sistema vaya a rechazar la compra por ella: porque el producto ya no existe en el
catálogo, o porque no queda stock suficiente.

Un fallo de compra SHALL nombrar el producto que lo causó. La aplicación MUST NOT presentar un
rechazo atribuible a una línea concreta como un fallo genérico del pedido: obliga a adivinar qué
quitar.

Esta regla no sustituye a la verificación del servidor. El stock puede agotarse entre la
comprobación y la confirmación, y ese caso SHALL seguir resolviéndose con el rechazo del sistema.

#### Scenario: Un producto del carrito ya no está en el catálogo

- **GIVEN** un carrito con un producto que después se retira del catálogo
- **WHEN** el visitante abre el carrito o el proceso de compra
- **THEN** esa línea se marca como no disponible y se le ofrece quitarla
- **AND** no se le deja llegar a confirmar para descubrirlo con un error que no la nombra

#### Scenario: El stock se agota entre la comprobación y la confirmación

- **GIVEN** un carrito revisado con stock suficiente
- **WHEN** otra compra agota ese stock justo antes de confirmar
- **THEN** la compra se rechaza indicando el producto, las unidades pedidas y las disponibles
- **AND** no se registra ninguna orden ni se descuenta stock

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
