## ADDED Requirements

### Requirement: Cada import registra quién lo ejecutó

El sistema SHALL registrar en el batch de importación la identidad del usuario autenticado que
subió el archivo, de modo que la auditoría responda no solo *qué, cuándo y con qué resultado*,
sino también **quién**.

#### Scenario: Import de un usuario autenticado

- **WHEN** un usuario autenticado sube un CSV y el import se completa
- **THEN** el batch resultante queda asociado al identificador de ese usuario

#### Scenario: La atribución no depende del cliente

- **WHEN** la petición de import incluye en el cuerpo o en la query un identificador de usuario distinto al del token
- **THEN** el batch se atribuye al usuario del token y el valor enviado por el cliente se ignora

### Requirement: La atribución es consultable

El sistema SHALL exponer la atribución en el listado y en el detalle de batches, y la interfaz
SHALL mostrarla junto al resto de metadatos del import.

#### Scenario: Historial de imports

- **WHEN** un usuario autenticado consulta el historial de batches
- **THEN** cada fila incluye quién ejecutó ese import

#### Scenario: Detalle de un batch

- **WHEN** un usuario autenticado abre el detalle de un batch
- **THEN** la pantalla muestra la atribución junto a los contadores y el reporte por fila

### Requirement: Los batches sin atribución siguen siendo válidos

La atribución SHALL ser opcional a nivel de dato, de modo que los batches creados antes de existir
esta capacidad se sigan listando y consultando sin error.

#### Scenario: Batch histórico sin atribución

- **WHEN** se consulta un batch creado antes de que existiera el registro de atribución
- **THEN** el batch se devuelve y se muestra correctamente, indicando que no hay atribución disponible
