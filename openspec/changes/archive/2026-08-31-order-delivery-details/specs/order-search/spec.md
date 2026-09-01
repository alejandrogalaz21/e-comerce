## MODIFIED Requirements

### Requirement: Se busca por lo que identifica a una orden y por lo que contiene

Dado que una orden no tiene cliente al que buscar, la búsqueda por texto SHALL aceptar el
identificador de la orden, los datos de entrega que la orden registró —destinatario, teléfono,
correo de contacto y dirección— y el SKU o el nombre de un producto comprado en ella.

Buscar por producto SHALL considerar las líneas de la orden tal como se vendieron, de modo que una
orden siga siendo localizable por el nombre con el que se compró aunque el producto se haya
renombrado después.

Buscar por un dato de entrega SHALL considerarlo tal como la orden lo guardó, y un fragmento SHALL
bastar: quien busca recuerda un apellido, los últimos dígitos de un teléfono o la ciudad, no el
valor completo.

La búsqueda MUST distinguir mayúsculas de minúsculas en ningún caso, y un identificador parcial
SHALL bastar para encontrar su orden.

#### Scenario: Encontrar una orden por su identificador abreviado

- **GIVEN** el identificador abreviado que la aplicación muestra
- **WHEN** se busca con él
- **THEN** aparece la orden a la que pertenece

#### Scenario: Encontrar una orden por su destinatario

- **GIVEN** órdenes de destinatarios distintos
- **WHEN** se busca por el nombre de uno de ellos
- **THEN** se listan exactamente sus órdenes

#### Scenario: Encontrar una orden por un fragmento del teléfono

- **GIVEN** una orden con cierto teléfono de entrega
- **WHEN** se busca por los últimos dígitos de ese número
- **THEN** la orden aparece

#### Scenario: Encontrar una orden por el correo de contacto

- **GIVEN** una orden con cierto correo de contacto
- **WHEN** se busca por ese correo, o por un fragmento suyo
- **THEN** la orden aparece

#### Scenario: Encontrar las órdenes que van a una ciudad

- **GIVEN** órdenes con direcciones de entrega en ciudades distintas
- **WHEN** se busca por una de esas ciudades
- **THEN** se listan exactamente las órdenes que se entregan ahí

#### Scenario: Qué órdenes incluyen un producto

- **GIVEN** varias órdenes, algunas con cierto SKU entre sus líneas
- **WHEN** se busca ese SKU
- **THEN** se listan exactamente esas órdenes

#### Scenario: El producto cambió de nombre después de venderse

- **GIVEN** una orden que compró un producto con cierto nombre
- **WHEN** el producto se renombra y luego se busca por el nombre con el que se vendió
- **THEN** la orden sigue apareciendo

#### Scenario: Una búsqueda sin coincidencias

- **WHEN** se busca un texto que ninguna orden contiene
- **THEN** no se lista ninguna orden y se dice que la búsqueda no encontró resultados
- **AND** se ofrece descartar el criterio para volver a la consulta completa
