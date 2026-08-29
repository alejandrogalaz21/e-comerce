# import-report-review Specification

## Purpose

Define cómo se lee en pantalla el resultado de un import: qué estados de fila existen, cómo se
representan de forma consistente entre tarjetas indicadoras, badges de tabla y leyenda, en qué orden
se leen las columnas y cómo se acota una tabla larga con un filtro.

## Requirements
### Requirement: Un estado se ve igual en toda la pantalla

Cada estado de fila del reporte SHALL tener una única representación visual —etiqueta, icono y
color— y todos los elementos que lo muestren MUST tomarla de esa definición. Ningún componente del
reporte MUST declarar por su cuenta el icono o el color de un estado.

#### Scenario: Tarjeta y badge del mismo estado

- **GIVEN** un import cuyo resultado incluye filas actualizadas
- **WHEN** el administrador compara la tarjeta indicadora `Updated` con el badge de una fila actualizada de la tabla
- **THEN** ambos muestran el mismo icono y el mismo color

#### Scenario: Fila en blanco

- **GIVEN** un archivo con filas completamente vacías
- **WHEN** el administrador mira la tarjeta de filas omitidas y el badge de una de esas filas
- **THEN** los dos usan la misma representación del estado «omitida», y esa representación no la pinta como texto deshabilitado ni sugiere que se haya borrado algo

#### Scenario: Se añade un estado

- **WHEN** el reporte incorpora un estado de fila que antes no existía
- **THEN** basta con declararlo una vez para que tarjeta, badge y leyenda lo muestren de forma consistente

### Requirement: La leyenda explica los estados con su propia notación

El pie de la tabla de filas a revisar SHALL explicar cada estado que la tabla puede mostrar usando el
mismo icono y color que el badge correspondiente, y no solo su nombre en texto.

#### Scenario: Leer la leyenda

- **WHEN** el administrador mira la leyenda al pie de la tabla
- **THEN** cada entrada muestra el icono y el color del estado que describe, de modo que se puede emparejar con los badges de la tabla sin leer el texto

#### Scenario: Estado nuevo en la tabla

- **WHEN** la tabla pasa a mostrar un estado adicional
- **THEN** la leyenda lo incluye sin que haya que editarla por separado

### Requirement: El orden de columnas es el mismo en todas las tablas

Toda tabla que muestre a la vez el SKU y el nombre de un producto SHALL colocar `SKU` antes que
`Name`. La lista de productos del dashboard es la referencia; las tablas del reporte MUST seguirla.

#### Scenario: Comparar dos tablas

- **WHEN** el administrador pasa de la lista de productos a la tabla de filas a revisar
- **THEN** en ambas encuentra el SKU antes que el nombre

#### Scenario: Las tres tablas

- **WHEN** se recorren la lista de productos, la tabla de filas creadas y la tabla de filas a revisar
- **THEN** las tres presentan el mismo orden relativo entre `SKU` y `Name`

### Requirement: Las tablas largas del reporte se pueden acotar

Las tablas del reporte SHALL ofrecer un filtro de texto que acote las filas visibles, e informar
cuántas se están mostrando sobre el total. El filtro MUST operar sobre las columnas que identifican
la fila en esa tabla.

#### Scenario: Buscar dentro de las filas creadas

- **GIVEN** un import que creó 85 productos
- **WHEN** el administrador escribe un término en el filtro de la tabla de filas creadas
- **THEN** la tabla muestra solo las filas cuya línea, SKU, nombre, categoría o descripción contienen ese término

#### Scenario: Cuántas se ven

- **WHEN** hay un filtro aplicado
- **THEN** la tabla indica cuántas filas se están mostrando de cuántas en total

#### Scenario: Ningún resultado

- **WHEN** el término filtrado no coincide con ninguna fila
- **THEN** la tabla lo dice explícitamente en lugar de quedarse vacía sin explicación

#### Scenario: El encabezado no cambia

- **WHEN** el administrador filtra la tabla de filas creadas
- **THEN** el título con el total del import y su subtítulo siguen siendo los mismos, porque describen el import y no la vista filtrada

### Requirement: El filtro es un solo bloque reutilizable

El bloque de filtro SHALL estar definido una sola vez y ser compartido por las tablas que lo usan.
Una tabla con dimensiones de filtro propias MUST poder añadirlas sin duplicar el bloque.

#### Scenario: Filtro por estado en filas a revisar

- **GIVEN** que la tabla de filas a revisar filtra además por estado
- **WHEN** el administrador usa esa tabla
- **THEN** encuentra el buscador compartido y, junto a él, el selector de estado propio de esa tabla

#### Scenario: Tabla sin dimensiones propias

- **WHEN** una tabla del reporte solo necesita buscar por texto
- **THEN** usa el bloque compartido tal cual, sin controles añadidos

