# payment-processing Specification

## Purpose

Define que el cobro sea una pieza sustituible, que su resultado forme parte de la transacción de la
compra, y que un rechazo no deje rastro en el catálogo.

## Requirements
### Requirement: El cobro es una pieza sustituible

El sistema SHALL cobrar a través de un contrato de proveedor de pago, y el registro de órdenes MUST
NOT depender de ninguna implementación concreta. Conectar otro proveedor SHALL consistir en aportar
una implementación de ese contrato, sin modificar la lógica de compra.

#### Scenario: Sustituir el proveedor

- **GIVEN** el proveedor simulado que se usa hoy
- **WHEN** se aporta otra implementación del contrato de pago
- **THEN** la compra funciona con la nueva sin cambiar cómo se registran las órdenes ni cómo se descuenta el stock

#### Scenario: Probar la compra sin cobrar de verdad

- **WHEN** se ejercita la compra en pruebas
- **THEN** se puede sustituir el proveedor por uno controlado que apruebe o rechace a voluntad

### Requirement: El resultado del cobro forma parte de la compra

El proveedor SHALL informar si el cobro fue aprobado o rechazado, y el sistema SHALL resolver ese
resultado dentro de la misma operación que registra la orden y descuenta el stock.

#### Scenario: Cobro aprobado

- **WHEN** el proveedor aprueba
- **THEN** la orden queda pagada, con una referencia del cobro que permite identificarlo después

#### Scenario: Cobro rechazado

- **WHEN** el proveedor rechaza
- **THEN** no queda orden pagada ni stock descontado, y el cliente recibe un motivo que distingue el rechazo de un fallo del sistema

#### Scenario: Rechazo frente a avería

- **WHEN** el proveedor rechaza un cobro
- **THEN** el sistema lo trata como un resultado normal del flujo y no como un error interno

### Requirement: El proveedor simulado rechaza una parte de los cobros

El proveedor simulado SHALL rechazar aproximadamente uno de cada diez cobros, de modo que la
reversión sea observable usando la aplicación y no solo en pruebas.

#### Scenario: Comprar repetidamente

- **GIVEN** un catálogo con stock suficiente
- **WHEN** se realizan muchas compras seguidas
- **THEN** una parte pequeña se rechaza y, en cada rechazo, el stock queda como estaba

#### Scenario: Reintentar tras un rechazo

- **GIVEN** una compra rechazada por el proveedor
- **WHEN** el cliente reintenta
- **THEN** puede completarla, porque el rechazo no dejó su carrito ni el catálogo en un estado inconsistente

### Requirement: El azar del proveedor simulado no llega a las pruebas

La decisión aleatoria del proveedor simulado SHALL provenir de una fuente sustituible, de modo que
las pruebas puedan fijar el resultado. Una prueba de compra MUST NOT depender del azar para saber
si el cobro aprueba o rechaza.

#### Scenario: Forzar la aprobación

- **WHEN** una prueba fija la fuente para que el cobro apruebe
- **THEN** el cobro aprueba siempre, sin repeticiones ni reintentos

#### Scenario: Forzar el rechazo

- **WHEN** una prueba fija la fuente para que el cobro rechace
- **THEN** el cobro rechaza siempre, lo que permite verificar la reversión de forma determinista

#### Scenario: Comportamiento en ejecución

- **WHEN** la aplicación corre normalmente
- **THEN** el proveedor usa la fuente real y mantiene su proporción de rechazos

