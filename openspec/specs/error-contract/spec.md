# error-contract Specification

## Purpose

Define qué forma tiene una respuesta de error del API, qué garantiza cada campo, qué información
nunca sale al cliente, y cómo se traducen los fallos de integridad de la base de datos a estados
HTTP de manera uniforme en todo el sistema.

## Requirements
### Requirement: Toda respuesta de error tiene la misma forma

Cualquier error que devuelva el API SHALL responder con `statusCode`, `error`, `message`, `path` y
`timestamp`. Ninguna ruta MUST devolver una forma distinta, cualquiera que sea la capa donde se
originó el fallo.

#### Scenario: Recurso inexistente

- **WHEN** se solicita un producto que no existe
- **THEN** la respuesta incluye los cinco campos, con `path` igual a la ruta pedida y `timestamp` del momento del fallo

#### Scenario: Fallo de validación

- **WHEN** una petición incumple una regla de validación
- **THEN** la respuesta incluye los cinco campos

#### Scenario: Falta de autenticación

- **WHEN** se accede sin sesión a una ruta protegida
- **THEN** la respuesta incluye los cinco campos, `error` entre ellos

#### Scenario: Conflicto de negocio

- **WHEN** una compra se rechaza por falta de stock
- **THEN** la respuesta incluye los cinco campos

#### Scenario: Fallo inesperado

- **WHEN** ocurre un error no previsto
- **THEN** la respuesta sigue teniendo la misma forma, sin excepción

### Requirement: El campo de error es un código estable

El campo `error` SHALL contener un código en mayúsculas destinado a que un cliente ramifique sobre
él, y MUST NOT limitarse a repetir en prosa el estado HTTP. Un código MUST significar siempre lo
mismo entre respuestas.

#### Scenario: Ramificar por el código

- **WHEN** un cliente recibe un error
- **THEN** puede decidir qué hacer leyendo `error`, sin analizar el texto de `message`

#### Scenario: Código propio de un caso de negocio

- **GIVEN** un fallo que el dominio ya identifica, como la falta de stock o el rechazo del cobro
- **WHEN** se devuelve al cliente
- **THEN** conserva su propio código en lugar de ser sustituido por uno genérico

#### Scenario: Fallo sin código propio

- **WHEN** el fallo no trae un código de dominio
- **THEN** se le asigna uno derivado de su estado HTTP, igual para todos los fallos de ese estado

### Requirement: Los detalles de un error se conservan

Cuando un error aporta datos que explican el fallo, la respuesta SHALL conservarlos junto a los
campos comunes. La normalización MUST NOT descartarlos ni cambiarlos de sitio.

#### Scenario: Conflicto de stock

- **WHEN** una compra se rechaza porque falta stock
- **THEN** la respuesta sigue indicando de qué producto se trata, cuánto se pidió y cuánto quedaba

#### Scenario: Varios mensajes de validación

- **WHEN** una petición incumple varias reglas a la vez
- **THEN** la respuesta las enumera todas en lugar de reducirlas a una

### Requirement: Un mismo fallo de base de datos produce siempre el mismo estado

Los fallos de integridad de la base de datos SHALL traducirse a estados HTTP de forma uniforme en
todo el sistema. Dos módulos MUST NOT responder distinto ante el mismo fallo.

#### Scenario: Recurso duplicado

- **WHEN** se intenta crear un recurso cuya clave única ya existe
- **THEN** la respuesta indica conflicto, sea cual sea el módulo que lo atendió

#### Scenario: Recurso todavía referenciado

- **GIVEN** un producto que aparece en una orden
- **WHEN** se intenta borrarlo
- **THEN** la respuesta indica conflicto y explica que el recurso está en uso, en lugar de presentarse como un fallo interno

### Requirement: Un fallo interno no revela detalle interno

Ante un fallo no previsto, la respuesta SHALL limitarse a un mensaje genérico. El detalle técnico
MUST registrarse en el log del servidor y MUST NOT viajar al cliente.

#### Scenario: Error inesperado de base de datos

- **WHEN** la base de datos falla por una causa no contemplada
- **THEN** el cliente recibe un mensaje genérico, sin nombres de columna, valores ni trazas

#### Scenario: El detalle queda registrado

- **WHEN** se produce ese mismo fallo
- **THEN** el detalle completo queda en el log del servidor para poder diagnosticarlo

