## Context

`/dashboard/product` reparte su alto en cuatro bandas: encabezado, filtros, una fila que solo
contiene los botones `Columns` y `Reset layout`, y la tabla.

```
  +--------------------------------------------------+
  |  List                        [Import CSV] [New]  |  <-- titulo poco descriptivo
  +--------------------------------------------------+
  |  buscador | categoria | precio | stock           |  <-- ProductFiltersToolbar
  +--------------------------------------------------+
  |                        [Reset layout] [Columns]  |  <-- banda que solo lleva controles
  +--------------------------------------------------+
  |  10 filas                                        |
  |                                                  |
  |  (hueco en blanco: altura fija de la Card)       |  <-- height: { xs: 800, md: 2 } + flexGrow
  +--------------------------------------------------+
```

Los cuatro puntos de TK-046 son el mismo problema visto por cuatro lados: la pantalla informa menos
de lo que ocupa.

## Goals / Non-Goals

**Goals:**

- Recuperar el alto que hoy gastan la banda de controles y el hueco bajo la tabla.
- Mostrar por defecto tantas filas como razonablemente caben.
- Que el nombre de la pantalla diga qué contiene, y que coincida allí donde se la nombra.

**Non-Goals:**

- Cambiar los filtros en sí, su contrato de URL o el API de listado.
- Tocar las tablas del reporte de import, que son de `import-report-consistency` (TK-043/044/045).
- Introducir densidad configurable por el usuario (compacta/cómoda). Fuera de alcance.

## Decisions

### El botón de columnas se mueve haciendo que los filtros sean el toolbar

`GridToolbarColumnsButton` abre el panel de columnas a través del `apiRef` del DataGrid, que solo
está disponible dentro del árbol de `slots`. Mover el JSX a `ProductFiltersToolbar` tal cual lo
dejaría inerte.

Tres caminos:

| Camino | Qué implica | Veredicto |
| --- | --- | --- |
| Renderizar `ProductFiltersToolbar` dentro del slot `toolbar` | Una sola banda; el contexto del grid queda disponible para todo lo que viva ahí | **Elegido** |
| Botón propio sobre `useGridApiContext` | Hay que reimplementar el panel o invocarlo a mano; se pierde el comportamiento estándar | Descartado |
| Portal desde el slot hacia la barra de filtros | Funciona, pero acopla dos árboles por una razón puramente visual | Descartado |

Se elige el primero: los filtros pasan a ser el contenido del slot `toolbar`, y `Columns` y
`Reset layout` se alinean a la derecha de esa misma línea. La banda vacía desaparece por
construcción, no por un ajuste de márgenes.

### 20 filas por defecto, y el cambio de default se declara

`DEFAULT_LIMIT` pasa de 10 a 20 y `pageSizeOptions` se ajusta para que el valor por defecto esté
entre las opciones (hoy son `[5, 10, 25]`, que no incluirían 20).

`toSearchParams` omite `limit` cuando coincide con el default, así que un enlace guardado sin `limit`
pasará a mostrar 20 filas en vez de 10. No se compensa: el parámetro ausente significa «el valor por
defecto», y esa es justamente la semántica que se quiere. Lo que sí se hace es dejarlo escrito en la
spec, para que no se descubra como sorpresa.

### La altura del grid sigue al contenido

La `Card` fija hoy `height: { xs: 800, md: 2 }` con `flexGrow`, un truco para que el grid ocupe el
alto disponible. Con menos filas que ese alto queda un bloque en blanco. Se sustituye por una altura
que siga al contenido, conservando un tope para que 20 filas no empujen el pie fuera de la vista.

Trade-off consciente: el pie de paginación deja de estar anclado abajo y sube con la tabla. Es
preferible a un hueco vacío, que es lo que el usuario señaló.

### Un nombre para la pantalla, escrito en un solo sitio conceptual

`List` pasa a un nombre que identifique la lista de productos, y ese nombre se usa igual en el
encabezado, en la última miga de pan y en la entrada del dropdown de navegación
(`config-nav-dashboard.tsx`). El dropdown ya está bajo el grupo `Product`, así que la entrada no
necesita repetir la palabra: lo que se corrige es que `List` sea el nombre de la **pantalla** en el
encabezado, donde no hay contexto que lo desambigüe.

## Risks / Trade-offs

- **Los filtros dentro del slot `toolbar` quedan atados al ciclo de render del DataGrid** → Aceptable:
  ya reciben su estado por props desde la vista y no guardan estado propio salvo el término de
  búsqueda en curso, que vive en la vista.
- **El default de 20 cambia lo que muestra un enlace ya compartido** → Se declara en la spec como
  comportamiento esperado del parámetro ausente; quien quiera 10 puede fijarlo explícitamente en la URL.
- **Altura variable con 20 filas en pantallas cortas** → Se conserva un tope de alto con scroll
  interno, de modo que el pie de paginación siga alcanzable sin desplazar toda la página.
- **Tests que asumen `DEFAULT_LIMIT = 10`** → `product-list-params.test.ts` se actualiza junto al
  cambio; el valor debe leerse de la constante y no repetirse literal en las aserciones.
