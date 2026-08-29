## Why

Tickets **TK-043**, **TK-044** y **TK-045** del backlog. Los tres salen de la misma sesión de uso:
tras correr un import, la pantalla de resultado se lee peor de lo que debería. Un mismo estado se
dibuja con icono y color distintos según se mire la tarjeta indicadora o el badge de la tabla, el
orden de las columnas contradice al de la lista de productos, y la tabla de filas creadas —la más
larga del reporte— es la única sin filtro.

Se agrupan en un solo change porque los tres editan los mismos dos componentes
(`import-issues-table.tsx`, `import-created-table.tsx`) y separarlos solo produciría conflictos de
aplicación.

## What Changes

- **Un único vocabulario de estados.** Hoy hay dos fuentes independientes: los iconos y colores
  escritos a mano dentro de `import-summary.tsx` y el mapa `IMPORT_ISSUE_META` de `import-utils.ts`.
  Coinciden por casualidad en `rejected` y `updated`, y discrepan en `skipped`
  (`eraser` + `text.disabled` en la tarjeta, `minus-circle` + `info` en el badge). Pasa a existir un
  solo mapa por estado —etiqueta, icono y color— que consumen las tarjetas, los badges de la tabla
  y la leyenda del pie. (TK-043)
- **La leyenda deja de ser texto plano.** Los tres `<span>` del pie de `Rows to review` pasan a
  mostrar el mismo icono y color que el badge que explican, derivados del mapa anterior. (TK-043)
- **Orden de columnas `SKU` antes que `Name`.** Solo `Rows to review` queda por corregir: la tabla
  de productos y `Created rows` ya lo tienen así. **Revierte la decisión de TK-042(c)**, que había
  puesto `Name` primero; la referencia de lectura pasa a ser la tabla de productos. (TK-044)
- **Filtro en `Created rows`.** Búsqueda de texto sobre línea, SKU, nombre, categoría y descripción,
  con contador `Showing N of M` y estado vacío propio, conservando el header actual. (TK-045)
- **El bloque de filtro se extrae a un componente compartido**, en vez de escribirse por tercera
  vez. `Rows to review` lo adopta sin perder su selector de estado, que es propio de esa tabla.
  (TK-045)

Sin cambios de API: todo ocurre sobre el reporte que el BE ya devuelve.

## Capabilities

### New Capabilities

- `import-report-review`: cómo se lee en pantalla el resultado de un import — qué estados existen,
  cómo se representan de forma consistente entre tarjetas, badges y leyenda, en qué orden se leen
  las columnas y cómo se acota una tabla larga con un filtro.

### Modified Capabilities

Ninguna. Las capabilities existentes describen la lista de productos y la búsqueda de imports, no la
pantalla de reporte.

## Impact

- `web/src/sections/product/import-utils.ts` — el mapa de estados pasa a ser la fuente única.
- `web/src/sections/product/components/import-summary.tsx` — deja de declarar iconos y colores propios.
- `web/src/sections/product/components/import-issues-table.tsx` — orden de columnas, leyenda con
  iconos, adopción del filtro compartido.
- `web/src/sections/product/components/import-created-table.tsx` — nuevo filtro.
- Nuevo componente de filtro compartido bajo `web/src/sections/product/components/`.
- Stories y tests asociados (`*.stories.tsx`, `import-utils.test.ts`).
- Sin impacto en `api/`.
