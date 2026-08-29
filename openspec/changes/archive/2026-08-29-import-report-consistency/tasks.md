## 1. Fuente única de estados (TK-043)

- [x] 1.1 Ampliar el mapa de estados de `web/src/sections/product/import-utils.ts` para cubrir todos los estados del reporte, incluidos los que hoy solo tienen tarjeta (`total`, `created`, `unchanged`), con etiqueta, icono y `LabelColor` por entrada
- [x] 1.2 Resolver `skipped` a favor de `minus-circle` + `info` y eliminar la variante `eraser` / `text.disabled`
- [x] 1.3 Exponer desde el mapa el token de color de texto que necesitan las tarjetas, derivado del `LabelColor`
- [x] 1.4 Cubrir el mapa en `import-utils.test.ts`: toda entrada tiene etiqueta, icono y color, y no hay iconos duplicados entre estados distintos

## 2. Consumir el mapa en la pantalla (TK-043)

- [x] 2.1 Reescribir `import-summary.tsx` para que las tarjetas tomen icono y color del mapa en lugar de declararlos inline
- [x] 2.2 Sustituir la leyenda de texto plano del pie de `import-issues-table.tsx` por una leyenda generada desde el mapa, con icono y color por entrada
- [x] 2.3 Actualizar `import-summary.stories.tsx` e `import-issues-table.stories.tsx` para reflejar la representación unificada
- [x] 2.4 Verificar en pantalla que la tarjeta y el badge de un mismo estado muestran el mismo icono y color

## 3. Orden de columnas (TK-044)

- [x] 3.1 Invertir el orden de `Name` y `SKU` en `import-issues-table.tsx` para que quede `SKU` antes que `Name`
- [x] 3.2 Confirmar que `import-created-table.tsx` y la lista de productos ya siguen ese orden y no requieren cambio
- [x] 3.3 Ajustar `import-issues-table.stories.tsx` y cualquier aserción que dependa del orden de columnas

## 4. Bloque de filtro compartido (TK-045)

- [x] 4.1 Crear el componente de filtro compartido en `web/src/sections/product/components/` con campo de texto, acción de limpiar, contador `Showing N of M` y hueco para controles adicionales
- [x] 4.2 Migrar `import-issues-table.tsx` al componente compartido, pasando su selector de estado como control adicional y sin cambiar el comportamiento actual del filtro
- [x] 4.3 Añadir el filtro a `import-created-table.tsx` buscando sobre línea, SKU, nombre, categoría y descripción, conservando el título y subtítulo actuales
- [x] 4.4 Añadir el estado vacío «ningún resultado» a `import-created-table.tsx`, equivalente al que ya tiene la tabla de filas a revisar
- [x] 4.5 Crear o ampliar las stories del filtro compartido y de `import-created-table.tsx` con un caso filtrado y otro sin resultados

## 5. Verificación

- [x] 5.1 Ejecutar lint, typecheck y tests del paquete `web/`
- [x] 5.2 Correr un import de ejemplo y revisar la pantalla completa: tarjetas, badges, leyenda, orden de columnas y los dos filtros
- [x] 5.3 Abrir el detalle de un batch guardado antes de este change y confirmar que sigue renderizando
