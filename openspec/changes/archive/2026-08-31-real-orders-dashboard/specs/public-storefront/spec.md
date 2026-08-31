## MODIFIED Requirements

### Requirement: El visitante busca, filtra y pagina el catálogo

La tienda SHALL permitir buscar por texto, acotar por categoría y recorrer el catálogo por páginas.
La búsqueda y el filtrado MUST resolverse en el servidor, no sobre la página visible.

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
