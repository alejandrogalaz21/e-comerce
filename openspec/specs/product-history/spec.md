# product-history Specification

## Purpose
TBD - created by archiving change product-lifecycle-and-history. Update Purpose after archive.
## Requirements
### Requirement: Todo cambio de un producto queda registrado

El sistema SHALL registrar cada alta, modificación y borrado de un producto, guardando el instante,
la operación, la fila antes y después del cambio, y qué campos cambiaron.

El registro SHALL producirse en la base de datos, no en el servicio de aplicación. Un registro
escrito por el servicio solo captura lo que pasa por el servicio, y en este sistema el catálogo lo
escriben al menos tres caminos distintos: el CRUD, el import CSV y las migraciones. Es el mismo
razonamiento por el que el control de stock vive en un `SELECT ... FOR UPDATE` y no en código: la
garantía pertenece al lugar que nadie puede rodear.

#### Scenario: Alta de producto

- **WHEN** se crea un producto
- **THEN** queda una entrada de historial con la operación de alta y el estado inicial

#### Scenario: Cambio de precio por el CRUD

- **WHEN** el administrador cambia el precio de un producto
- **THEN** queda una entrada con el precio anterior, el nuevo, y `price` entre los campos cambiados

#### Scenario: Cambio a través del import CSV

- **GIVEN** un producto ya existente
- **WHEN** un import CSV lo actualiza
- **THEN** queda una entrada de historial, igual que si el cambio hubiera venido del CRUD

#### Scenario: Escritura directa en la base de datos

- **WHEN** se modifica una fila de productos con SQL directo, sin pasar por la API
- **THEN** queda igualmente una entrada de historial

#### Scenario: Retirar y restaurar

- **WHEN** un producto se retira y después se restaura
- **THEN** quedan dos entradas, cada una nombrando el campo de retirada entre los que cambiaron

#### Scenario: Borrado

- **WHEN** se borra un producto que nunca se vendió
- **THEN** queda una entrada con la operación de borrado y el último estado conocido de la fila

### Requirement: Una escritura que no cambia nada no ensucia el historial

El sistema SHALL registrar únicamente los cambios reales. Guardar una fila con valores idénticos a
los que ya tenía NO SHALL producir una entrada de historial.

Sin esta regla el historial se llena de ruido en cada reimportación del catálogo y deja de servir
para lo que existe: contar qué cambió de verdad.

#### Scenario: Reimportar un catálogo idéntico

- **GIVEN** un catálogo importado
- **WHEN** se reimporta exactamente el mismo archivo
- **THEN** no se añade ninguna entrada de historial

### Requirement: El historial de un producto es consultable

El sistema SHALL exponer el historial de un producto por su identificador, paginado y en orden
cronológico inverso, de modo que lo más reciente se lea primero.

El recurso SHALL exigir sesión: es información de administración, no de catálogo.

#### Scenario: Consultar el historial

- **GIVEN** un producto con varios cambios
- **WHEN** el administrador consulta su historial
- **THEN** recibe las entradas de la más reciente a la más antigua, con la forma paginada habitual

#### Scenario: Producto sin cambios posteriores al alta

- **WHEN** se consulta el historial de un producto recién creado
- **THEN** recibe una sola entrada, la del alta

#### Scenario: Sin sesión

- **WHEN** se consulta el historial sin token
- **THEN** la respuesta es 401

#### Scenario: Identificador inexistente

- **WHEN** se consulta el historial de un identificador que no corresponde a ningún producto
- **THEN** la respuesta es 404

### Requirement: El historial sobrevive al producto

El sistema SHALL conservar las entradas de historial de un producto borrado, incluida la entrada
del propio borrado. Un historial que se borra con lo que documenta no es una auditoría.

#### Scenario: Historial de un producto borrado

- **GIVEN** un producto con historial que después se borra
- **WHEN** se consultan las entradas de ese identificador
- **THEN** siguen existiendo, con la entrada del borrado como la más reciente

### Requirement: El administrador ve la historia del producto en pantalla

La interfaz SHALL mostrar el historial de un producto en su detalle, como una línea de tiempo que
nombra qué cambió en cada momento y no solo que hubo un cambio.

Para un cambio de valor la interfaz SHALL mostrar de qué a qué, porque "cambió el precio" no
responde la pregunta que lleva a alguien a mirar el historial.

#### Scenario: Ver la línea de tiempo

- **GIVEN** un producto con varios cambios
- **WHEN** el administrador abre su detalle
- **THEN** ve las entradas en orden cronológico inverso, cada una con su instante

#### Scenario: Un cambio de precio se lee de un vistazo

- **GIVEN** una entrada donde cambió el precio
- **THEN** la interfaz muestra el valor anterior y el nuevo

#### Scenario: Producto sin historial visible

- **GIVEN** un producto creado antes de que existiera el registro
- **WHEN** el administrador abre su detalle
- **THEN** se indica que no hay historial, en vez de una lista vacía sin explicación

