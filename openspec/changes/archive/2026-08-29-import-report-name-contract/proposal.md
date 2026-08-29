## Why

Ticket **TK-047** del backlog. En el reporte de un import, las filas rechazadas por SKU duplicado
llegan sin `name` aunque el archivo sí lo traía: `rejectDuplicateSkus` construye la fila con
`{ line, sku, errors }` y no propaga `dto.name`, a diferencia de las otras dos rutas de rechazo.

El problema de fondo no es la línea que falta sino el contrato. Hoy un `name` ausente significa dos
cosas opuestas —que la fila no tenía nombre, que es un dato legítimo, o que el backend olvidó
mandarlo, que es un fallo— y el FE pinta `—` en ambos casos. Desde la pantalla, el bug es
indistinguible del comportamiento correcto.

## What Changes

- **`name` y `sku` viajan siempre** en las filas rechazadas y en las advertencias. Cuando la celda
  del archivo venía vacía se manda **cadena vacía**, no `null` ni ausencia: la celda no era
  desconocida, estaba vacía, y `""` es más fiel. A partir de aquí, un campo ausente pasa a ser una
  violación del contrato y no un estado legítimo.
- **BREAKING (interno)**: `name` y `sku` dejan de ser opcionales en `ImportRejectedRow` e
  `ImportWarning` del BE. Ese `?` es justo lo que permitió que la ruta de duplicados compilara sin el
  campo; con el tipo obligatorio el compilador cuenta las rutas por nosotros y esta clase de fallo
  deja de compilar.
- **El tipo del FE mantiene `name?` y `sku?` opcionales.** Asimetría deliberada —estricto al
  escribir, tolerante al leer—: los batches ya guardados en base no llevan el campo y su detalle
  debe seguir abriéndose.

## Capabilities

### New Capabilities

- `import-report-contract`: qué garantiza el reporte que devuelve el import sobre la identidad de
  cada fila conflictiva, y cómo distingue «la fila no tenía este dato» de «el dato no se envió».

### Modified Capabilities

Ninguna.

## Impact

- `api/src/modules/import/import-result.interface.ts` — `name` y `sku` obligatorios en
  `ImportRejectedRow` e `ImportWarning`.
- `api/src/modules/import/import.service.ts` — `rejectDuplicateSkus` propaga el nombre; las otras
  rutas normalizan la ausencia a `""`.
- Tests del módulo de import: cobertura del caso de SKU duplicado y del de fila sin nombre.
- `web/src/types/product.ts` — sin cambios; los opcionales se conservan a propósito.
