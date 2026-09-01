## MODIFIED Requirements

### Requirement: El visitante busca, filtra y pagina el catálogo

La tienda SHALL permitir buscar por texto, acotar por categoría y recorrer el catálogo por páginas.
La búsqueda y el filtrado MUST resolverse en el servidor, no sobre la página visible.

La tienda SHALL mostrar únicamente productos a la venta. Un producto retirado no aparece en el
listado, no se cuenta en el total, y no es alcanzable por su dirección directa.

Cuando no haya nada que mostrar, la tienda SHALL distinguir entre un catálogo vacío y una consulta
sin coincidencias, porque exigen acciones opuestas: en el primer caso no hay nada que buscar y hay
que cargar productos; en el segundo hay catálogo y lo que sobra es el criterio aplicado.

Ante un catálogo vacío, la tienda SHALL indicar que todavía no hay productos y orientar sobre cómo
cargarlos. Ante una consulta sin coincidencias, la tienda SHALL nombrar el criterio que no encontró
nada y ofrecer descartarlo.

#### Scenario: Buscar un producto que no está en la primera página

- **WHEN** el visitante busca un producto que quedaría fuera de la primera página
- **THEN** aparece igualmente

#### Scenario: Acotar por categoría

- **WHEN** el visitante elige una categoría
- **THEN** solo ve productos de esa categoría, y puede quitarla para volver al catálogo completo

#### Scenario: Recorrer el catálogo

- **GIVEN** más productos de los que caben en una página
- **WHEN** el visitante avanza de página
- **THEN** ve productos distintos de los anteriores

#### Scenario: El catálogo está vacío

- **GIVEN** un catálogo sin ningún producto
- **WHEN** el visitante abre la tienda sin haber buscado ni filtrado
- **THEN** se le dice que todavía no hay productos y se le orienta sobre cómo cargarlos
- **AND** no se le dice que su búsqueda no encontró resultados, porque no buscó nada

#### Scenario: La búsqueda no encuentra nada

- **GIVEN** un catálogo con productos
- **WHEN** el visitante busca un texto que ningún producto contiene
- **THEN** se le dice que esa búsqueda no encontró resultados, nombrando lo que buscó
- **AND** puede descartar la búsqueda para volver al catálogo completo

#### Scenario: La categoría elegida no tiene productos

- **GIVEN** un catálogo con productos
- **WHEN** el visitante elige una categoría sin productos
- **THEN** se le dice que esa categoría no tiene productos, nombrándola
- **AND** puede quitarla para volver al catálogo completo

#### Scenario: Un producto retirado no está en la tienda

- **GIVEN** un producto retirado del catálogo
- **WHEN** el visitante recorre la tienda
- **THEN** ese producto no aparece en ninguna página y el total no lo cuenta

#### Scenario: Abrir el detalle de un producto retirado

- **GIVEN** un producto retirado
- **WHEN** el visitante abre su dirección directa
- **THEN** se le dice que el producto no existe, igual que con uno borrado

## ADDED Requirements

### Requirement: Un producto retirado sale del carrito como uno borrado

La tienda SHALL tratar un producto retirado exactamente igual que uno borrado en el carrito del
visitante: la línea se marca como no disponible y el checkout queda bloqueado hasta quitarla.

Que ambos casos se vean iguales es deliberado. Para quien compra la diferencia no existe —el
producto no se puede llevar— y darle dos mensajes distintos le pediría entender una decisión de
catálogo que no le concierne.

#### Scenario: El producto se retira con el carrito abierto

- **GIVEN** un carrito con un producto que después se retira
- **WHEN** el visitante abre el carrito
- **THEN** la línea se marca como no disponible con la acción de quitarla, y el subtotal la excluye

#### Scenario: Intentar comprarlo

- **GIVEN** un carrito con un producto retirado
- **WHEN** el visitante intenta completar la compra
- **THEN** no se crea ninguna orden y se le señala la línea que sobra

#### Scenario: Restaurarlo lo devuelve al carrito

- **GIVEN** un carrito con una línea marcada no disponible porque su producto fue retirado
- **WHEN** el administrador restaura ese producto y el visitante vuelve a abrir el carrito
- **THEN** la línea vuelve a ser comprable con el precio vigente del catálogo
