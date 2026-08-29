## Why

Ticket **TK-014** del backlog. `docs/initial.md` §7 promete que **todos** los errores del API
siguen un mismo shape, servido por un exception filter global:

```json
{ "statusCode": 400, "error": "VALIDATION_ERROR", "message": "...", "path": "/products", "timestamp": "..." }
```

No existe. No hay carpeta `common/filters`, y hoy el API devuelve al menos cuatro formas distintas,
ninguna con `path` ni `timestamp`:

```
  404  { message, error: "Not Found", statusCode }
  400  { message: [ ... ], error: "Bad Request", statusCode }
  401  { message: "Unauthorized", statusCode }            <- sin "error"
  409  { statusCode, error: "INSUFFICIENT_STOCK", message, sku, requested, available }
```

Es el mismo patrón que este proyecto ya cerró dos veces —el spec promete algo que el código no
cumple— y ahora pesa más, porque el flujo de compra añadió `402`, `409` y `404` con sus propias
formas. Un revisor que lea §7 y luego una respuesta real encuentra la contradicción de inmediato.

Al mirarlo aparecieron dos defectos que el ticket no nombraba y que comparten causa:

- **El mismo error de base de datos produce estados HTTP distintos.** `handleDBExceptions` está
  duplicado en `products.service.ts` y `users.service.ts`, y el código `23505` (unique violation)
  se traduce a **409** en uno y a **400** en el otro.
- **Borrar un producto vendido devuelve 500.** La foreign key `RESTRICT` de `order_items` cumple su
  función e impide el borrado, pero el `23503` resultante no está contemplado y escapa como error
  interno, cuando es un conflicto perfectamente explicable.

## What Changes

- **Un exception filter global** en `common/filters` que da forma a **toda** respuesta de error con
  `statusCode`, `error`, `message`, `path` y `timestamp`.
- **`error` pasa a ser un código estable y legible por máquina** (`VALIDATION_ERROR`, `NOT_FOUND`,
  `UNAUTHORIZED`, `INSUFFICIENT_STOCK`, `PAYMENT_DECLINED`, `DUPLICATE_RESOURCE`, …) en lugar del
  texto del estado HTTP que Nest pone por defecto. El cliente ya distingue casos por él —
  `web/src/actions/purchase.ts` lo hace— y un código estable es lo que hace fiable esa lectura.
- **Los detalles específicos de un error se conservan.** El `409` de stock sigue llevando `sku`,
  `requested` y `available`; la lista de mensajes de validación sigue siendo una lista. El filtro
  normaliza el envoltorio, no aplana el contenido.
- **Un traductor único de errores de Postgres** en `common/`, que sustituye las dos copias de
  `handleDBExceptions`: `23505` → `409 DUPLICATE_RESOURCE` de forma consistente, `23503` →
  `409 RESOURCE_IN_USE`, y cualquier otro código → `500` con el detalle registrado en el log y
  **fuera** de la respuesta.
- **BREAKING (interno)**: la respuesta de `23505` en el módulo de usuarios pasa de `400` a `409`.
  Es el mismo hecho —el recurso ya existe— y devolver `400` sugería que la petición estaba mal
  formada cuando no lo estaba.
- **Los errores internos dejan de filtrar detalle.** Un `500` responde con un mensaje genérico y el
  error real va al log; hoy algunas rutas devuelven `error.detail` de Postgres directamente.

## Capabilities

### New Capabilities

- `error-contract`: qué forma tiene una respuesta de error, qué garantiza cada campo, qué
  información nunca sale al cliente, y cómo se traducen los fallos de base de datos a estados HTTP.

### Modified Capabilities

Ninguna. Las capabilities existentes describen comportamientos de dominio; ninguna fija el shape de
los errores.

## Impact

- **Nuevo** `api/src/common/filters/` — el filter y el traductor de errores de base de datos.
- `api/src/main.ts` — registro global del filter.
- `api/src/modules/products/products.service.ts` y `api/src/modules/users/users.service.ts` —
  eliminan su `handleDBExceptions` local.
- `api/src/modules/orders/orders.service.ts` — su `409` y su `402` ya llevan código; se alinean con
  el catálogo común.
- Swagger: los ejemplos de error de los controladores reflejan el shape real.
- `web/src/actions/purchase.ts` — sigue funcionando; lee `error` y los campos del conflicto, que se
  conservan.
- `README.md` y [docs/processes/](../../../docs/processes/) — la tabla de errores pasa a ser una
  sola, cierta para todo el API.

## Non-Goals

- **Cambiar qué estado devuelve cada caso de negocio**, más allá del `23505` de usuarios ya
  señalado. `409` para stock y `402` para pago rechazado se quedan como están.
- **Internacionalizar los mensajes.** Siguen en inglés, como el resto del código.
- **Reintentos, circuit breakers o correlación de peticiones.** Un `requestId` sería útil pero no
  lo pide el spec; se menciona en el design como extensión natural.
