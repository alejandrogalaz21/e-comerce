## Context

El reporte de un import identifica cada fila conflictiva con `{ line, sku?, name?, ... }`. Hay tres
rutas que producen una fila rechazada, y solo dos propagan el nombre:

```
  CSV --> parse --> validacion DTO ----> rechazo (line, sku, name, errors)   OK
                        |
                        +-------------> candidato
                                            |
                                            v
                                  rejectDuplicateSkus
                                            |
                                            +--> rechazo (line, sku, errors)  <-- falta name
                                            |
                                            v
                                       upsert --> warning (line, sku, name, message)  OK
```

Con el CSV de ejemplo, las líneas 2, 11, 36, 56 y 89 —rechazadas por SKU duplicado— llegan sin
`name`. En pantalla se pintan como `—`, exactamente igual que las líneas 25 y 41, que sí carecen de
nombre en el archivo. El fallo es invisible desde la UI porque el contrato no distingue «no había
dato» de «no se mandó el dato».

## Goals / Non-Goals

**Goals:**

- Que el reporte identifique siempre la fila con la información que el archivo traía.
- Que la ausencia de un campo deje de ser un estado representable, para que el compilador impida
  reintroducir este fallo por una ruta nueva.
- Que los reportes ya almacenados sigan abriéndose.

**Non-Goals:**

- Cambiar cómo se decide qué fila se rechaza. Las reglas de validación y de SKU duplicado no se tocan.
- Reescribir los reportes históricos en base de datos.
- Cambiar la presentación del reporte, que es de `import-report-consistency` (TK-043/044/045).

## Decisions

### Cadena vacía, no `null` ni ausencia

Cuando la celda del archivo venía vacía se envía `""`. `null` diría «desconocido» y la ausencia diría
«no aplica»; ninguno de los dos es cierto: la celda existía y estaba vacía. `""` es el único de los
tres que describe lo que pasó.

El efecto secundario buscado es que, a partir de aquí, un campo ausente en el reporte sea siempre un
fallo del backend y nunca un dato legítimo.

### Se quita el `?` en el BE, se conserva en el FE

`name` y `sku` pasan a obligatorios en `ImportRejectedRow` e `ImportWarning`. Ese opcional es la causa
próxima del bug: permitió que `rejectDuplicateSkus` compilara sin el campo. Con el tipo obligatorio,
cualquier ruta futura que olvide el nombre falla en compilación en vez de en pantalla.

En el FE los tipos siguen con `name?` y `sku?`. Es una asimetría deliberada —estricto al escribir,
tolerante al leer—: los batches guardados antes de este change no llevan los campos y su detalle debe
seguir abriéndose pintando `—`. La alternativa, migrar los reportes históricos, se descartó: son un
registro de lo que ocurrió en su momento y reescribirlos falsearía el histórico para ganar una
uniformidad que la UI ya absorbe.

### `sku` entra en el mismo movimiento

El ticket señala `name`, pero `sku?` sufre exactamente la misma ambigüedad y las mismas rutas lo
producen. Arreglar uno y dejar el otro dejaría medio contrato con el defecto que este change existe
para eliminar.

## Risks / Trade-offs

- **La asimetría BE estricto / FE tolerante puede leerse como descuido** → Queda escrita en la spec y
  en el tipo del FE como decisión, con su motivo: compatibilidad con reportes ya persistidos.
- **Reportes históricos siguen mostrando `—` donde el archivo sí traía nombre** → Aceptado y acotado:
  afecta solo a batches anteriores a este change; los nuevos son correctos.
- **Volver obligatorio un campo rompe cualquier consumidor que construya estos objetos** → El tipo es
  interno del módulo de import; el compilador enumera los puntos de construcción, que es justamente
  el mecanismo que se busca.
