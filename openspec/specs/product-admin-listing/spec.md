# product-admin-listing Specification

## Purpose
TBD - created by archiving change dashboard-product-filters. Update Purpose after archive.
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

La lista SHALL permitir acotar los productos por una o varias categorías, por rango de precio y por
disponibilidad, y SHALL permitir combinarlos entre sí y con la búsqueda de texto. Las categorías
ofrecidas SHALL ser las que existen en el catálogo, no una lista fija.

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
vista.

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

