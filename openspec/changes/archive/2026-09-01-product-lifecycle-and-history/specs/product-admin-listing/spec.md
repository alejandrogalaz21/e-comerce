## MODIFIED Requirements

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

## ADDED Requirements

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
