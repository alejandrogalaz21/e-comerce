# product-listing-cache Specification

## Purpose

Define qué consultas del catálogo se reutilizan, qué distingue una entrada de caché de otra, cuándo deja de ser válida, y qué ocurre cuando la caché no está disponible.
## Requirements
### Requirement: Consultas repetidas del catálogo se sirven de caché

El sistema SHALL reutilizar la respuesta de una consulta del catálogo cuando se repite con los
mismos parámetros. Dos consultas que difieran en cualquier parámetro MUST tratarse como distintas.

#### Scenario: Misma consulta dos veces

- **WHEN** se pide el catálogo dos veces con idénticos filtros, orden y página
- **THEN** la segunda devuelve exactamente el mismo contenido sin volver a consultar la base

#### Scenario: Consultas que difieren

- **WHEN** dos consultas difieren en un filtro, en el orden o en la página
- **THEN** cada una obtiene su propio resultado, sin mezclarse

#### Scenario: El contrato no cambia

- **WHEN** se compara una respuesta servida de caché con una recién calculada
- **THEN** son indistinguibles para el cliente

### Requirement: Un cambio en el catálogo invalida lo cacheado

Cuando el catálogo cambia, el sistema SHALL dejar de servir resultados anteriores. Un cliente MUST
NOT recibir un catálogo que ya no refleja lo almacenado.

Esto SHALL aplicarse a **cualquier** operación que altere el catálogo, sin importar qué parte del
sistema la origine. Comprar cambia el stock igual que editarlo, así que cuenta como cambio: para
quien consulta, el origen es indiferente.

#### Scenario: Alta de producto

- **GIVEN** una consulta ya cacheada
- **WHEN** se crea un producto que encaja en ella
- **THEN** la siguiente consulta lo incluye

#### Scenario: Modificación y borrado

- **WHEN** se modifica o se borra un producto
- **THEN** las consultas siguientes reflejan el cambio

#### Scenario: Import masivo

- **WHEN** termina un import que alteró el catálogo
- **THEN** las consultas siguientes reflejan lo importado, sin esperar a que expire nada

#### Scenario: Una compra descuenta stock

- **GIVEN** una consulta ya cacheada que incluye cierto producto
- **WHEN** alguien compra ese producto
- **THEN** la siguiente consulta muestra el stock que quedó, sin esperar a que expire nada

#### Scenario: Las categorías siguen el mismo criterio

- **WHEN** el catálogo cambia de forma que altera las categorías existentes
- **THEN** la lista de categorías refleja el cambio

### Requirement: Una caché caída degrada, nunca rompe

Si la caché no está disponible, el sistema SHALL responder igualmente resolviendo contra la base de
datos. Un fallo de la caché MUST NOT convertirse en un error para el cliente.

#### Scenario: La caché no responde

- **WHEN** se consulta el catálogo y la caché está caída
- **THEN** la respuesta llega igual, calculada contra la base de datos

#### Scenario: Guardar en caché falla

- **WHEN** la respuesta se calcula pero no se puede guardar en caché
- **THEN** el cliente recibe su respuesta igualmente

### Requirement: Solo se cachea lo que se lee sin sesión

El sistema SHALL limitar la caché a las consultas públicas del catálogo. Las operaciones que
modifican datos y las lecturas que dependen de la sesión MUST NOT servirse de caché.

#### Scenario: Operación de escritura

- **WHEN** se crea, modifica o borra un producto
- **THEN** la operación se ejecuta siempre, sin consultar la caché

#### Scenario: Lectura autenticada

- **WHEN** se consultan pedidos
- **THEN** la respuesta no proviene de una caché compartida

