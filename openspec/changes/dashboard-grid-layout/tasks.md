## 1. Toolbar y filtros en una sola línea

- [x] 1.1 Mover el contenido de `CustomToolbar` (botones `Columns` y `Reset layout`) al render de `ProductFiltersToolbar`, alineado a la derecha de la línea de filtros
- [x] 1.2 Pasar `ProductFiltersToolbar` a ser el contenido del slot `toolbar` del DataGrid en `product-list-view.tsx`, de modo que `GridToolbarColumnsButton` conserve el contexto del grid
- [x] 1.3 Reubicar la acción de borrado masivo que hoy aparece en esa banda cuando hay filas seleccionadas, sin perder su comportamiento
- [x] 1.4 Eliminar el `GridToolbarContainer` que quedaba como banda propia y comprobar que no queda espacio muerto entre filtros y tabla
- [x] 1.5 Verificar que el panel de columnas abre, que ocultar y mostrar columnas surte efecto y que `Reset layout` sigue apareciendo solo con ajustes guardados

## 2. Densidad por defecto

- [x] 2.1 Subir `DEFAULT_LIMIT` a 20 en `product-list-params.ts`
- [x] 2.2 Ajustar `pageSizeOptions` en `product-list-view.tsx` para que incluya el nuevo valor por defecto
- [x] 2.3 Actualizar `product-list-params.test.ts` leyendo el valor de la constante en vez de repetirlo literal
- [x] 2.4 Comprobar que una URL sin `limit` muestra 20 filas y que una URL con `limit` explícito lo respeta

## 3. Altura de la tabla

- [x] 3.1 Sustituir la altura fija de la `Card` en `product-list-view.tsx` por una altura que siga al contenido
- [x] 3.2 Conservar un tope de alto con scroll interno para que el pie de paginación siga alcanzable con la página llena
- [x] 3.3 Verificar con pocos resultados que no queda bloque en blanco bajo la última fila
- [x] 3.4 Verificar los estados vacíos (`No products yet`, sin coincidencias, sin resultados de búsqueda) con la nueva altura

## 4. Nombre de la pantalla

- [x] 4.1 Cambiar el `heading` y la última miga de pan de `product-list-view.tsx` por un nombre que describa la lista de productos
- [x] 4.2 Homologar la entrada correspondiente del dropdown en `config-nav-dashboard.tsx` con ese nombre
- [x] 4.3 Revisar que ninguna otra referencia a la pantalla quede con el nombre anterior

## 5. Verificación

- [x] 5.1 Ejecutar lint, typecheck y tests del paquete `web/`
- [x] 5.2 Revisar la pantalla en ancho de escritorio y en móvil, con y sin filtros aplicados
