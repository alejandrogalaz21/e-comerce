## Why

Ticket **TK-046** del backlog. Notas del usuario sobre `/dashboard/product`: la pantalla gasta
espacio vertical en cosas que no informan —una fila propia solo para el botón de columnas, un hueco
en blanco bajo la tabla cuando hay pocos registros— y a la vez muestra menos filas de las que caben.
El título de la página, además, es literalmente `List`, que no dice de qué es la lista.

## What Changes

- **El botón de columnas sube a la línea de filtros.** Hoy vive en una fila propia
  (`GridToolbarContainer`) cuyo único contenido son los botones `Columns` y `Reset layout`, lo que
  genera una banda vacía entre los filtros y la tabla. Ambos pasan a convivir con los filtros.
  Restricción a resolver en el diseño: `GridToolbarColumnsButton` depende del contexto del DataGrid,
  así que no basta con mover el JSX fuera del slot `toolbar`.
- **20 filas por página por defecto**, en lugar de 10, con opciones de tamaño coherentes.
  **Ojo al contrato de la URL**: `toSearchParams` omite `limit` cuando coincide con el valor por
  defecto, de modo que subir el default cambia lo que renderiza un enlace ya guardado sin `limit`.
  Es aceptable, pero debe quedar declarado.
- **Sin hueco vacío bajo la tabla.** La tarjeta impone hoy una altura fija al grid, así que con menos
  registros que esa altura queda un bloque en blanco. La altura pasa a seguir al contenido.
- **Título descriptivo.** `List` pasa a un nombre que diga qué se lista, homologado con la entrada
  correspondiente del dropdown de navegación (`config-nav-dashboard.tsx`) y con la miga de pan.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `product-admin-listing`: gana requisitos sobre la densidad por defecto de la tabla, la ubicación de
  los controles de columnas respecto de los filtros y la identificación de la pantalla. El requisito
  existente «La vista sobrevive a la navegación» se toca en su borde: cambia el valor por defecto de
  `limit` que la URL omite.

## Impact

- `web/src/sections/product/view/product-list-view.tsx` — toolbar, altura de la tarjeta,
  `pageSizeOptions`, encabezado.
- `web/src/sections/product/product-list-params.ts` — `DEFAULT_LIMIT`.
- `web/src/sections/product/components/product-filters-toolbar.tsx` — hueco para los controles de columnas.
- `web/src/layouts/config-nav-dashboard.tsx` — nombre de la entrada del dropdown.
- `web/src/sections/product/product-list-params.test.ts` — el default aparece en las aserciones.
- Sin impacto en `api/`.
