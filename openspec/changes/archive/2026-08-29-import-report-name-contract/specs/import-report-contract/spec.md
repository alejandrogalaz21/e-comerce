## ADDED Requirements

### Requirement: Toda fila del reporte llega identificada

El reporte de un import SHALL incluir el SKU y el nombre en cada fila rechazada y en cada
advertencia, cualquiera que sea la regla que la produjo. La ausencia de esos campos MUST tratarse
como una violación del contrato y no como un estado posible.

#### Scenario: Fila rechazada por SKU duplicado

- **GIVEN** un archivo donde un mismo SKU aparece en varias líneas y cada una trae nombre
- **WHEN** se consulta el reporte del import
- **THEN** cada una de esas líneas rechazadas incluye el SKU y el nombre que traía el archivo

#### Scenario: Fila rechazada por validación

- **GIVEN** una fila rechazada porque alguno de sus campos no es válido
- **WHEN** se consulta el reporte
- **THEN** la fila incluye el SKU y el nombre tal como venían en el archivo

#### Scenario: Advertencia por SKU existente

- **GIVEN** una fila que sobrescribe un producto ya almacenado
- **WHEN** se consulta el reporte
- **THEN** la advertencia incluye el SKU y el nombre de esa fila

### Requirement: Una celda vacía se reporta como vacía, no como ausente

Cuando el archivo trae la celda del nombre o del SKU vacía, el reporte SHALL enviar el campo con
cadena vacía. El sistema MUST NOT omitir el campo ni sustituirlo por un valor nulo para expresar que
la celda estaba vacía.

#### Scenario: Fila sin nombre en el archivo

- **GIVEN** una fila rechazada cuya columna de nombre venía vacía
- **WHEN** se consulta el reporte
- **THEN** la fila incluye el campo de nombre con cadena vacía

#### Scenario: Distinguir vacío de fallo

- **WHEN** se comparan una fila cuyo nombre venía vacío y otra rechazada por SKU duplicado con nombre
- **THEN** la primera trae cadena vacía y la segunda trae su nombre, de modo que ningún caso correcto produce un campo ausente

### Requirement: Los reportes ya almacenados siguen consultándose

La pantalla de detalle SHALL abrir los reportes generados antes de que este contrato existiera,
aunque les falten los campos ahora obligatorios, y MUST indicar el dato faltante sin error.

#### Scenario: Abrir un reporte antiguo

- **GIVEN** un import ejecutado antes de este cambio, cuyas filas rechazadas no llevan nombre
- **WHEN** el administrador abre su detalle
- **THEN** el reporte se muestra completo y las celdas sin dato aparecen marcadas como vacías

#### Scenario: Abrir un reporte nuevo

- **GIVEN** un import ejecutado después de este cambio
- **WHEN** el administrador abre su detalle
- **THEN** ninguna fila rechazada o advertida carece del campo de nombre o de SKU
