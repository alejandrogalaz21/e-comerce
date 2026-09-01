# product-admin-listing Specification

## Purpose

Define cómo se lee y se opera la lista de productos del dashboard: que el orden abarque el catálogo completo y no la página visible, qué filtros ofrece y cómo se revierten, cuántas filas muestra de entrada, dónde viven sus controles, y que el estado de la vista sobreviva a la navegación.
## Requirements
### Requirement: El orden abarca el catálogo completo

La lista de productos del dashboard SHALL ordenar sobre el conjunto completo de resultados y no
sobre la página visible. Las columnas cuyo orden el sistema no puede resolver en el servidor MUST
NOT ofrecerse como ordenables.

#### Scenario: Ordenar con más resultados que una página

- **GIVEN** un catálogo de 87 productos y un tamaño de página de 10
- **WHEN** el administrador ordena por precio ascendente
- **THEN** la primera fila es el producto más barato del catálogo, no el más barato de los 10 que estaban a la vista

#### Scenario: Columna sin soporte de orden

- **WHEN** el administrador mira una columna que el servidor no sabe ordenar
- **THEN** esa columna no presenta control de orden

#### Scenario: Orden por defecto

- **WHEN** el administrador abre la lista sin haber elegido un orden
- **THEN** los productos aparecen del más reciente al más antiguo

### Requirement: La fecha de actualización es visible y ordenable

La lista SHALL mostrar la fecha de última actualización de cada producto además de la de creación, y
SHALL permitir ordenar por ella, de modo que el resultado de una importación sea verificable.

#### Scenario: Verificar qué tocó un import

- **GIVEN** que la importación actualiza por SKU los productos que ya existían, sin cambiar su fecha de creación
- **WHEN** el administrador ordena por fecha de actualización descendente después de importar
- **THEN** los productos que ese import creó o actualizó aparecen primero

#### Scenario: Ambas fechas presentes

- **WHEN** el administrador consulta la lista
- **THEN** cada fila muestra tanto la fecha de creación como la de actualización

### Requirement: Filtrado por categoría, precio y disponibilidad

La lista SHALL permitir acotar los productos por una o varias categorías, por rango de precio, por
disponibilidad y por **estado de catálogo** —a la venta, retirado, o ambos—, y SHALL permitir
combinarlos entre sí y con la búsqueda de texto. Las categorías ofrecidas SHALL ser las que existen
en el catálogo, no una lista fija.

El estado por defecto SHALL ser "a la venta", de modo que el administrador no tenga que aprender un
filtro nuevo para ver lo que veía antes, y un producto retirado no reaparezca sin que nadie lo pida.

Disponibilidad y estado SHALL ser filtros distintos porque describen cosas distintas: agotado es un
producto que sigue a la venta y volverá a tener existencias; retirado es un producto que ya no se
vende. Confundirlos escondería productos vivos entre los retirados.

#### Scenario: Filtro por varias categorías

- **WHEN** el administrador selecciona dos categorías
- **THEN** la tabla muestra únicamente productos de esas dos categorías y el total refleja ese subconjunto

#### Scenario: Filtro por disponibilidad

- **WHEN** el administrador filtra por productos agotados
- **THEN** la tabla muestra únicamente productos sin existencias

#### Scenario: Filtros combinados con la búsqueda

- **WHEN** el administrador escribe un término y además filtra por categoría y rango de precio
- **THEN** la tabla muestra solo los productos que cumplen las tres condiciones a la vez

#### Scenario: Rango de precio incompleto o incoherente

- **WHEN** el administrador ha escrito un precio mínimo mayor que el máximo
- **THEN** se le indica el problema en el formulario y la tabla no se actualiza con ese rango

#### Scenario: Origen de las categorías

- **GIVEN** que la categoría de un producto es texto libre poblado desde el CSV
- **WHEN** se importa un producto con una categoría que no existía
- **THEN** esa categoría pasa a estar disponible como opción de filtro

#### Scenario: Estado por defecto

- **GIVEN** un catálogo con productos a la venta y retirados
- **WHEN** el administrador abre la lista sin tocar el filtro de estado
- **THEN** solo ve los que están a la venta

#### Scenario: Ver los retirados

- **WHEN** el administrador filtra por retirados
- **THEN** solo ve productos retirados, cada uno distinguible de un producto a la venta

#### Scenario: Agotado y retirado no son lo mismo

- **GIVEN** un producto con existencias cero que sigue a la venta, y otro retirado
- **WHEN** el administrador filtra por agotados
- **THEN** ve el primero y no el segundo

### Requirement: Los filtros activos son visibles y reversibles

La interfaz SHALL mostrar qué filtros están aplicados y SHALL permitir quitarlos uno a uno o todos a
la vez. Un filtro que no deja resultados MUST NOT presentarse como un catálogo vacío.

#### Scenario: Retirar un filtro concreto

- **WHEN** el administrador tiene varios filtros activos y descarta uno
- **THEN** los demás siguen aplicados y la tabla se recalcula

#### Scenario: Limpiar todo

- **WHEN** el administrador limpia los filtros
- **THEN** la tabla vuelve al catálogo completo

#### Scenario: Búsqueda sin resultados

- **WHEN** una combinación de filtros no devuelve productos
- **THEN** se muestra un vacío que indica que no hay coincidencias, distinguible de un catálogo sin productos

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

### Requirement: Retirar y restaurar se hacen desde la lista

La lista SHALL ofrecer retirar un producto y restaurar uno retirado desde las acciones de su fila,
sin obligar a abrir el detalle. Es la operación que el administrador hace en tanda tras revisar un
import.

La acción de borrado SHALL seguir existiendo y SHALL seguir siendo distinguible de retirar, de modo
que nadie borre creyendo que oculta.

#### Scenario: Retirar desde la fila

- **WHEN** el administrador retira un producto desde las acciones de su fila
- **THEN** el producto desaparece de la vista por defecto y la tabla se actualiza

#### Scenario: Restaurar desde la fila

- **GIVEN** la lista filtrada por retirados
- **WHEN** el administrador restaura un producto
- **THEN** el producto sale de esa vista y vuelve a la de productos a la venta

#### Scenario: Borrar sigue siendo otra cosa

- **WHEN** el administrador abre las acciones de una fila
- **THEN** retirar y borrar aparecen como acciones distintas, y borrar advierte que es permanente

#### Scenario: Intentar borrar un producto vendido

- **GIVEN** un producto que aparece en una orden
- **WHEN** el administrador intenta borrarlo
- **THEN** se le explica que no puede borrarse porque tiene ventas, y se le ofrece retirarlo

