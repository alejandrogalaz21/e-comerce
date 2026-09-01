# dashboard-page-search Specification

## Purpose

Define cómo se localiza una página del dashboard desde el header: cómo se abre la búsqueda, sobre
qué datos corre, cómo se presenta cada resultado y qué ocurre al elegirlo.

## Requirements
### Requirement: Abrir y cerrar la búsqueda de páginas

El sistema SHALL ofrecer, desde el header del dashboard, una búsqueda de páginas que se abre con
un atajo de teclado y con un control visible, y que se cierra sin navegar a ningún sitio.

El atajo SHALL ser ⌘K en macOS y Ctrl+K en el resto de plataformas. El control visible SHALL
anunciar el atajo, para que sea descubrible sin conocerlo de antemano.

#### Scenario: Abrir con el atajo de teclado

- **WHEN** se pulsa ⌘K (o Ctrl+K) en cualquier página del dashboard
- **THEN** se abre el diálogo de búsqueda con el campo de texto enfocado

#### Scenario: Abrir con el control del header

- **WHEN** se pulsa el control de búsqueda del header
- **THEN** se abre el mismo diálogo, en el mismo estado

#### Scenario: Cerrar sin elegir nada

- **GIVEN** el diálogo de búsqueda abierto
- **WHEN** se pulsa `Esc`
- **THEN** el diálogo se cierra y la página actual no cambia

#### Scenario: El atajo no secuestra la escritura

- **GIVEN** el foco puesto en un campo de texto de la página, como el filtro de la tabla de productos
- **WHEN** se escribe la letra `k` sin la tecla modificadora
- **THEN** la letra se escribe en el campo y el diálogo no se abre

### Requirement: Buscar sobre las páginas reales del dashboard

El sistema SHALL construir los resultados a partir de la navegación vigente del dashboard, no de
una lista fija ni de datos de ejemplo. Toda página alcanzable desde el nav SHALL ser encontrable,
incluidas las anidadas bajo una sección.

La coincidencia SHALL ser parcial e insensible a mayúsculas, y SHALL considerar tanto el título de
la página como su ruta.

#### Scenario: Encontrar una página por su título

- **WHEN** se escribe `ord` en la búsqueda
- **THEN** aparece la página de órdenes entre los resultados

#### Scenario: Encontrar una página por su ruta

- **WHEN** se escribe `dashboard/status`
- **THEN** aparece la página de status entre los resultados

#### Scenario: Insensible a mayúsculas

- **WHEN** se escribe `PRODUCT`
- **THEN** aparecen las mismas páginas que al escribir `product`

#### Scenario: La lista sigue al nav

- **GIVEN** que el nav del dashboard ofrece las secciones Product, Orders y Status
- **WHEN** se abre la búsqueda sin escribir nada
- **THEN** los resultados disponibles son esas páginas y sus hijas, sin ninguna página inventada

#### Scenario: Sin coincidencias

- **WHEN** se escribe un texto que no coincide con ninguna página
- **THEN** el diálogo dice que no se encontró nada, en vez de mostrar una lista vacía

### Requirement: Presentar el resultado con su grupo y su coincidencia

El sistema SHALL mostrar, para cada resultado, el título de la página, su ruta y el grupo del nav
al que pertenece, de modo que dos páginas de nombre parecido se distingan.

El fragmento que coincide con lo escrito SHALL aparecer resaltado dentro del texto del resultado.

#### Scenario: Resaltado de la coincidencia

- **WHEN** se escribe `stat` y aparece la página de status
- **THEN** el fragmento `stat` se muestra resaltado dentro del título del resultado

#### Scenario: Agrupado por sección

- **GIVEN** resultados que pertenecen a secciones distintas del nav
- **WHEN** se muestran
- **THEN** cada uno indica a qué sección pertenece

#### Scenario: El resaltado no altera el texto

- **WHEN** el texto buscado aparece varias veces en el título
- **THEN** el título se muestra completo y sin caracteres añadidos, con cada aparición resaltada

### Requirement: Navegar a la página elegida

El sistema SHALL navegar a la ruta del resultado elegido y SHALL cerrar el diálogo al hacerlo. El
resultado SHALL poder elegirse con el ratón.

#### Scenario: Elegir un resultado

- **GIVEN** el diálogo abierto con resultados visibles
- **WHEN** se elige uno
- **THEN** la aplicación navega a esa ruta y el diálogo se cierra

#### Scenario: La búsqueda no deja residuo

- **GIVEN** que se buscó y se navegó a una página
- **WHEN** se vuelve a abrir el diálogo
- **THEN** el campo de búsqueda aparece vacío
