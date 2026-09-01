## ADDED Requirements

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
