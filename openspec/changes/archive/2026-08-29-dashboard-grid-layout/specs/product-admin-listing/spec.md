## ADDED Requirements

### Requirement: La tabla muestra de entrada una cantidad útil de filas

La lista de productos SHALL mostrar al menos 20 filas por página cuando no se ha pedido otro tamaño,
y el tamaño por defecto MUST estar entre las opciones que el administrador puede elegir.

#### Scenario: Entrar a la pantalla

- **GIVEN** un catálogo con más de 20 productos
- **WHEN** el administrador abre la lista sin indicar tamaño de página
- **THEN** ve 20 filas en la primera página

#### Scenario: Elegir otro tamaño

- **WHEN** el administrador despliega las opciones de tamaño de página
- **THEN** el valor por defecto aparece entre ellas y puede volver a seleccionarlo tras cambiarlo

### Requirement: Los controles de la tabla comparten línea con los filtros

La lista de productos SHALL presentar en la misma línea que los filtros los controles que actúan
sobre la presentación de la tabla: la selección de columnas visibles y el restablecimiento del
diseño guardado. La pantalla MUST NOT dedicar una banda propia a esos controles.

#### Scenario: Recorrer la pantalla

- **WHEN** el administrador mira la zona entre el encabezado y la primera fila de la tabla
- **THEN** encuentra filtros y controles de columnas en una sola línea, sin bandas intermedias vacías

#### Scenario: Abrir el panel de columnas

- **WHEN** el administrador usa el control de columnas desde esa línea
- **THEN** se abre el panel de columnas de la tabla y ocultar o mostrar una columna surte efecto

#### Scenario: Restablecer el diseño

- **GIVEN** anchos o visibilidad de columnas guardados
- **WHEN** el administrador mira esa misma línea
- **THEN** encuentra ahí la acción de restablecer el diseño

### Requirement: La tabla no deja espacio vacío bajo las filas

El alto de la tabla SHALL seguir a la cantidad de filas mostradas. Cuando la página contiene menos
filas de las que caben, la pantalla MUST NOT dejar un bloque en blanco entre la última fila y el pie
de la tabla.

#### Scenario: Pocos resultados

- **GIVEN** un filtro que deja 3 productos
- **WHEN** el administrador mira la tabla
- **THEN** el pie con la paginación queda inmediatamente bajo la tercera fila

#### Scenario: Página completa en una pantalla corta

- **GIVEN** una página con el tamaño por defecto de filas en una ventana de poca altura
- **WHEN** el administrador recorre la tabla
- **THEN** el pie con la paginación sigue siendo alcanzable

### Requirement: La pantalla se llama igual en todos lados

La lista de productos del dashboard SHALL identificarse con un nombre que describa su contenido, y
ese nombre MUST ser el mismo en el encabezado de la pantalla, en la miga de pan y en la entrada del
menú de navegación que lleva a ella.

#### Scenario: Llegar desde el menú

- **WHEN** el administrador abre la entrada del menú que lleva a la lista de productos
- **THEN** el encabezado de la pantalla que se abre coincide con el nombre de esa entrada

#### Scenario: Leer el encabezado sin contexto

- **WHEN** el administrador mira el encabezado de la pantalla
- **THEN** el nombre indica que se trata de la lista de productos, sin depender de la miga de pan para entenderlo

## MODIFIED Requirements

### Requirement: La vista sobrevive a la navegación

El estado de la lista —búsqueda, filtros, orden y paginación— SHALL formar parte de la dirección de
la página, de modo que recargar, volver atrás o abrir el enlace en otro sitio reproduzca la misma
vista. Un parámetro ausente de la dirección SHALL significar «el valor por defecto vigente», no un
valor congelado: si el valor por defecto cambia, un enlace que omitía ese parámetro MUST reflejar el
nuevo valor.

#### Scenario: Recargar

- **WHEN** el administrador recarga la página con filtros y orden aplicados
- **THEN** la tabla vuelve con los mismos filtros, el mismo orden y la misma página

#### Scenario: Volver atrás

- **WHEN** el administrador aplica un filtro y usa el botón de atrás del navegador
- **THEN** vuelve al estado anterior de la tabla en vez de abandonar la pantalla

#### Scenario: Compartir la vista

- **WHEN** se abre en otra sesión el enlace de una lista filtrada
- **THEN** se muestra el mismo subconjunto de productos

#### Scenario: Cambiar de filtro estando en una página avanzada

- **WHEN** el administrador está en la página 5 y cambia un filtro
- **THEN** la tabla vuelve a la primera página del nuevo resultado en vez de a una página vacía

#### Scenario: Enlace guardado sin tamaño de página

- **GIVEN** un enlace guardado que no incluye el tamaño de página
- **WHEN** se abre después de que el tamaño por defecto haya cambiado
- **THEN** la tabla usa el tamaño por defecto vigente

#### Scenario: Tamaño de página explícito

- **GIVEN** un enlace que fija el tamaño de página
- **WHEN** se abre
- **THEN** la tabla respeta ese tamaño aunque difiera del valor por defecto
