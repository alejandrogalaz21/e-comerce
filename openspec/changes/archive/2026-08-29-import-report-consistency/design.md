## Context

La pantalla de resultado de un import se construyó en tres tandas (TK-040, TK-041, TK-042) y cada
una añadió lo que hacía falta en el momento. El resultado es que el mismo concepto —el estado de una
fila del archivo— vive hoy en dos lugares que no se conocen entre sí:

```
  import-summary.tsx                      import-utils.ts
  (tarjetas, iconos y colores inline)     (IMPORT_ISSUE_META, badges)
  ------------------------------------    -----------------------------
  Created    add-circle     success.main    --            (sin badge)
  Updated    refresh-circle warning.main    updated       refresh-circle / warning
  Rejected   close-circle   error.main      rejected      close-circle   / error
  Skipped    eraser         text.disabled   skipped       minus-circle   / info   <-- discrepan
  Total rows documents      text.primary    --            (solo tarjeta)
  Unchanged  check-circle   text.secondary  --            (solo tarjeta)
```

Que `rejected` y `updated` coincidan es casualidad, no diseño: nada obliga a que sigan coincidiendo.
La leyenda del pie de `Rows to review` es una tercera representación, esta vez solo texto.

En paralelo, el filtro de `Rows to review` (texto + selector de estado + contador) es el único de la
pantalla, y `Created rows`, que suele ser la tabla más larga, no tiene ninguno.

## Goals / Non-Goals

**Goals:**

- Que exista un único lugar donde se decide cómo se ve un estado, y que tarjetas, badges y leyenda lo
  lean de ahí.
- Que las tres tablas de la aplicación se lean con el mismo orden de columnas.
- Que `Created rows` sea filtrable, reutilizando el bloque de filtro en vez de duplicarlo.

**Non-Goals:**

- Cambiar el reporte que devuelve el API. Este change es de presentación; el contrato lo toca
  `import-report-name-contract` (TK-047).
- Filtrar en servidor. El reporte ya llega completo al cliente; el filtro es sobre memoria.
- Rediseñar las tarjetas indicadoras más allá de que tomen su icono y color del mapa común.
- Tocar el layout de la lista de productos, que es de `dashboard-grid-layout` (TK-046).

## Decisions

### Un mapa de estados, seis entradas, no dos mapas de tres

Se amplía `IMPORT_ISSUE_META` a un mapa que cubra **todos** los estados del reporte, incluidos los
que hoy solo tienen tarjeta (`total`, `created`, `unchanged`), y `import-summary.tsx` deja de
declarar iconos y colores. La alternativa —dejar los dos mapas y añadir un test que compruebe que
coinciden— fue descartada: detecta la divergencia pero no la impide, y el coste de mantener dos
estructuras sincronizadas no lo paga ningún beneficio.

Consecuencia de forma: las tarjetas usan tokens de color de texto (`success.main`, `text.disabled`)
y los badges usan `LabelColor` (`'success'`, `'info'`). El mapa guarda el `LabelColor` como dato
primario y la tarjeta deriva su token, porque el sentido inverso no es unívoco (`text.disabled` no
tiene `LabelColor` equivalente).

### `skipped` se resuelve a favor del badge

De los dos valores en conflicto se conserva `minus-circle` + `info`. Motivo: `eraser` sugiere una
acción destructiva que no ocurrió —la fila estaba en blanco, no se borró nada— y `text.disabled` la
pinta como si no importara, cuando el propósito de TK-042(b) fue justamente hacerla visible. La
tarjeta cede.

### El filtro compartido es «buscador + contador», con hueco para lo específico

`Created rows` no tiene dimensión de estado; `Rows to review` sí. En vez de un componente
parametrizado con un selector opcional, el componente compartido cubre lo que ambas tablas tienen en
común —campo de texto con limpiar, y el `Showing N of M`— y acepta hijos que se insertan entre ambos.
`Rows to review` pasa ahí su `Select` de estado. Así el componente no crece cada vez que una tabla
necesite un filtro propio.

Qué campos busca cada tabla se decide en la tabla, no en el componente: `Rows to review` sobre
línea/SKU/nombre/motivo, `Created rows` sobre línea/SKU/nombre/categoría/descripción.

### La leyenda se genera desde el mapa

Deja de ser tres `<span>` escritos a mano y pasa a recorrer las entradas de estado que la tabla
puede mostrar, pintando icono, color y su glosa. Así una entrada nueva aparece sola en la leyenda en
vez de olvidarse.

### El orden `SKU → Name` se toma de la tabla de productos

TK-042(c) puso `Name` primero por petición explícita; TK-044 lo revierte. Se documenta como reversión
consciente para que no se lea como un descuido, y la referencia queda fijada: la tabla de productos
manda, porque es la pantalla que más se usa.

## Risks / Trade-offs

- **La reversión de TK-042(c) puede volver a pedirse al revés** → El requisito de la spec nombra la
  tabla de productos como referencia única, de modo que un cambio futuro tenga que mover las tres a
  la vez y no una sola.
- **Filtrar en cliente no escala a un reporte enorme** → Aceptado: el reporte ya se descarga entero
  para pintarse, así que el filtro no añade un límite que no existiera. Si algún día se pagina el
  reporte, el filtro se mueve con él.
- **El mapa común acopla tarjetas y badges** → Es el objetivo. El riesgo real es el inverso: que
  alguien vuelva a escribir un icono a mano en el componente. Los tests de las stories cubren que la
  tarjeta y el badge del mismo estado muestren el mismo icono.
