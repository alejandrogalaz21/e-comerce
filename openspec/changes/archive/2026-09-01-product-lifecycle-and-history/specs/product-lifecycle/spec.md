## ADDED Requirements

### Requirement: Un producto se retira sin borrarse

El sistema SHALL permitir retirar un producto del catálogo dejando su fila en la base de datos, de
modo que las órdenes que lo contienen sigan apuntando a él y su historia siga siendo legible.

Retirar SHALL registrar **cuándo** ocurrió, no solo que ocurrió: un producto retirado sin fecha no
permite responder desde cuándo dejó de venderse.

Retirar un producto ya retirado SHALL ser inofensivo y conservar la fecha original, para que un
segundo clic no reescriba la historia.

#### Scenario: Retirar un producto vendido

- **GIVEN** un producto que aparece en al menos una orden
- **WHEN** el administrador lo retira
- **THEN** la operación tiene éxito
- **AND** la orden sigue mostrando ese producto con su precio congelado

#### Scenario: Retirar deja constancia del momento

- **WHEN** el administrador retira un producto
- **THEN** el producto queda marcado como retirado con el instante en que ocurrió

#### Scenario: Retirar dos veces

- **GIVEN** un producto ya retirado
- **WHEN** el administrador lo retira de nuevo
- **THEN** la operación tiene éxito y la fecha de retirada no cambia

#### Scenario: Retirar exige sesión

- **WHEN** se intenta retirar un producto sin token
- **THEN** la respuesta es 401

### Requirement: Un producto retirado se puede devolver al catálogo

El sistema SHALL permitir restaurar un producto retirado, devolviéndolo a la tienda con los mismos
datos que tenía. Restaurar un producto que nunca se retiró SHALL ser inofensivo.

#### Scenario: Restaurar

- **GIVEN** un producto retirado
- **WHEN** el administrador lo restaura
- **THEN** vuelve a aparecer en la tienda y en el listado por defecto del dashboard

#### Scenario: Restaurar uno que está a la venta

- **GIVEN** un producto que no está retirado
- **WHEN** el administrador lo restaura
- **THEN** la operación tiene éxito y el producto sigue a la venta

#### Scenario: Restaurar exige sesión

- **WHEN** se intenta restaurar un producto sin token
- **THEN** la respuesta es 401

### Requirement: Para quien compra, un producto retirado no existe

El sistema SHALL ocultar los productos retirados de toda superficie pública: no aparecen en el
listado, no se cuentan entre las categorías, y pedir uno por su identificador SHALL responder 404.

Esta es la razón de que el 404 sea la respuesta correcta y no un 200 con una marca: el carrito del
visitante ya trata el 404 como "ya no está disponible", así que un producto retirado se comporta
igual que uno borrado sin que el cliente necesite aprender un estado nuevo.

#### Scenario: No aparece en la tienda

- **GIVEN** un producto retirado
- **WHEN** un visitante lista el catálogo
- **THEN** ese producto no aparece, y el total del listado no lo cuenta

#### Scenario: Pedirlo por identificador

- **GIVEN** un producto retirado
- **WHEN** se solicita ese producto por su identificador sin pedir otro estado
- **THEN** la respuesta es 404, aunque quien pregunte tenga sesión abierta

#### Scenario: Un carrito que lo contiene

- **GIVEN** un carrito con un producto que después se retira
- **WHEN** el visitante abre el carrito
- **THEN** la línea se marca como no disponible y el checkout queda bloqueado hasta quitarla

#### Scenario: Comprarlo es imposible

- **GIVEN** un producto retirado
- **WHEN** se intenta crear una orden que lo incluye
- **THEN** la respuesta es 404 y no se crea ninguna orden

### Requirement: Ver lo retirado exige sesión y pedirlo a propósito

El sistema SHALL exigir una sesión para devolver productos retirados, tanto en el listado como al
pedir uno por identificador. Sin sesión la respuesta SHALL ser 401.

Ver lo retirado SHALL depender de que se pida explícitamente, no de que quien pregunte tenga
sesión: un administrador con sesión abierta que navegue la tienda SHALL ver exactamente lo que ve
un visitante anónimo, porque la tienda no pide otro estado.

El sistema SHALL permitir al administrador listar los productos retirados, los activos, o todos, y
abrir uno retirado por identificador para revisarlo y devolverlo al catálogo.

El valor por defecto SHALL ser "solo activos", de modo que un cliente existente que no conozca el
filtro siga viendo exactamente lo que veía antes.

#### Scenario: Un anónimo pide los retirados

- **WHEN** un visitante sin sesión lista el catálogo pidiendo los retirados o todos
- **THEN** la respuesta es 401 y no se revela ningún producto retirado

#### Scenario: Un anónimo pide un retirado por identificador

- **WHEN** un visitante sin sesión pide un producto indicando otro estado
- **THEN** la respuesta es 401

#### Scenario: Un administrador navegando la tienda

- **GIVEN** un administrador con sesión abierta
- **WHEN** abre la ficha pública de un producto retirado
- **THEN** ve un 404, igual que un visitante anónimo

#### Scenario: El administrador abre un producto retirado

- **GIVEN** un producto retirado
- **WHEN** el administrador lo abre desde el dashboard
- **THEN** lo ve, con su fecha de retirada y su historial completo

#### Scenario: Por defecto solo activos

- **WHEN** se lista el catálogo sin indicar estado
- **THEN** solo aparecen productos a la venta

#### Scenario: Listar los retirados

- **WHEN** el administrador filtra por retirados
- **THEN** solo aparecen productos retirados, cada uno con su fecha de retirada

#### Scenario: Listar todos

- **WHEN** el administrador pide todos los estados
- **THEN** aparecen tanto los activos como los retirados, distinguibles entre sí

#### Scenario: Estado desconocido

- **WHEN** se pide un estado que no existe
- **THEN** la respuesta es 400 nombrando los valores válidos

### Requirement: Retirar y borrar siguen siendo operaciones distintas

El sistema SHALL conservar el borrado duro como operación separada, con su comportamiento actual
intacto: borrar un producto que aparece en una orden SHALL seguir respondiendo 409, porque borrarlo
destruiría la línea que prueba la venta.

Retirar es la operación que el administrador quiere casi siempre; borrar es la que se reserva para
un producto creado por error que nunca se vendió.

#### Scenario: Borrar un producto vendido

- **GIVEN** un producto que aparece en una orden
- **WHEN** se intenta borrarlo
- **THEN** la respuesta es 409 y el producto sigue existiendo

#### Scenario: Borrar un producto nunca vendido

- **GIVEN** un producto que no aparece en ninguna orden
- **WHEN** se borra
- **THEN** desaparece de la base de datos

#### Scenario: Borrar un producto retirado y nunca vendido

- **GIVEN** un producto retirado que no aparece en ninguna orden
- **WHEN** se borra
- **THEN** desaparece de la base de datos

### Requirement: Reimportar un SKU retirado lo devuelve al catálogo

El sistema SHALL reactivar un producto retirado cuando un import CSV trae su SKU, porque el archivo
es una corrección de catálogo y quien lo sube lo está re-añadiendo a propósito.

La fila SHALL reportarse como actualizada y nunca como sin cambios, aunque sus demás campos sean
idénticos: el estado cambió, y decir "sin cambios" ocultaría precisamente lo que pasó.

#### Scenario: El SKU retirado vuelve en un archivo

- **GIVEN** un producto retirado
- **WHEN** se importa un CSV que contiene su SKU
- **THEN** el producto vuelve a estar a la venta
- **AND** la fila se reporta como actualizada

#### Scenario: Reimportar sin cambios de datos

- **GIVEN** un producto retirado cuyos demás campos coinciden exactamente con la fila del archivo
- **WHEN** se importa ese archivo
- **THEN** la fila se reporta como actualizada, no como sin cambios
