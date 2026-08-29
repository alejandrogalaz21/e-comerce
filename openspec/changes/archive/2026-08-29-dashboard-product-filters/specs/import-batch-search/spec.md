## ADDED Requirements

### Requirement: Localizar un import por el nombre del archivo

El sistema SHALL permitir buscar dentro del historial de importaciones por el nombre del archivo
subido, con coincidencia parcial e insensible a mayúsculas, sobre el conjunto completo de batches y
no sobre la página visible.

#### Scenario: Coincidencia parcial

- **WHEN** se busca un fragmento del nombre de un archivo importado
- **THEN** el historial muestra los batches cuyo nombre contiene ese fragmento

#### Scenario: Insensible a mayúsculas

- **WHEN** se busca el nombre de un archivo con una combinación de mayúsculas distinta a la original
- **THEN** el batch aparece igualmente

#### Scenario: La búsqueda abarca todo el historial

- **GIVEN** un historial con más batches de los que caben en una página
- **WHEN** se busca un archivo que está en una página posterior
- **THEN** ese batch aparece en el resultado

#### Scenario: Sin coincidencias

- **WHEN** se busca un nombre que ningún batch tiene
- **THEN** el historial se muestra vacío indicando que no hay coincidencias, y el total es cero

#### Scenario: Caracteres comodín en el término

- **WHEN** el término de búsqueda contiene caracteres con significado especial para la coincidencia parcial
- **THEN** se tratan como texto literal y no alteran el conjunto de resultados

#### Scenario: Búsqueda combinada con la paginación

- **WHEN** una búsqueda deja más resultados de los que caben en una página
- **THEN** la paginación recorre únicamente los batches que coinciden
