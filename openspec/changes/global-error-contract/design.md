## Context

Cuatro formas de error conviven hoy en el API porque nadie las unificó: Nest da la suya por
defecto, `orders` construye la suya para poder llevar `sku`/`requested`/`available`, y los
servicios traducen errores de Postgres cada uno por su cuenta.

```
  Hoy                                        initial.md §7 promete
  ---------------------------------------    -------------------------------
  { message, error, statusCode }              { statusCode, error, message,
  { message: [...], error, statusCode }         path, timestamp }
  { message, statusCode }         <- sin error
  { statusCode, error, message, sku, ... }
```

Restricción heredada que condiciona el diseño: **el frontend ya depende de la forma actual**.
`web/src/actions/purchase.ts` decide si un fallo es de stock o de pago mirando el estado HTTP, y
lee `sku`, `requested` y `available` del cuerpo del `409`. Cualquier normalización que aplane esos
campos rompe la UX de compra que TK-010 acaba de construir.

## Goals / Non-Goals

**Goals:**

- Que toda respuesta de error tenga la misma envoltura, con `path` y `timestamp`.
- Que `error` sea un código estable sobre el que un cliente pueda ramificar.
- Que un mismo fallo de base de datos produzca siempre el mismo estado HTTP.
- Que un `500` no filtre detalle interno.

**Non-Goals:**

- Cambiar los estados de negocio ya decididos (`409` stock, `402` pago).
- Traducir mensajes.
- `requestId` y correlación de trazas.

## Decisions

### Un filter global que envuelve, no que aplana

El filter captura toda excepción y compone:

```
  { statusCode, error, message, path, timestamp, ...detalles específicos }
```

Los campos extra que una excepción ya traía —`sku`, `requested`, `available`— se **conservan al
mismo nivel**. La alternativa, anidarlos bajo `details`, es más pura pero rompería el frontend sin
aportar nada: el consumidor real ya los lee donde están.

`message` conserva su tipo: string cuando es uno, array cuando la validación produce varios.
Forzarlo siempre a array habría obligado a tocar cada consumidor; forzarlo siempre a string habría
perdido información.

### `error` es un código, no el nombre del estado HTTP

Nest rellena `error` con `"Not Found"`, `"Bad Request"`. Eso es el estado en prosa: redundante con
`statusCode` e inútil para ramificar. Pasa a ser un código en mayúsculas y estable
(`NOT_FOUND`, `VALIDATION_ERROR`, `INSUFFICIENT_STOCK`, …).

Cuando la excepción ya trae un código propio —`orders` lanza `INSUFFICIENT_STOCK` y
`PAYMENT_DECLINED`— se respeta. Si no, se deriva del estado HTTP mediante un mapa.

### Un solo traductor de errores de Postgres

`handleDBExceptions` existía dos veces, con criterios distintos para el mismo código:

| Código | `products` hoy | `users` hoy | Decisión |
| --- | --- | --- | --- |
| `23505` unique | `409` | **`400`** | **`409 DUPLICATE_RESOURCE`** |
| `23503` foreign key | *(no contemplado → 500)* | *(no contemplado → 500)* | **`409 RESOURCE_IN_USE`** |
| otros | `500` | `500` | `500`, detalle solo al log |

`409` es el correcto para `23505`: la petición está bien formada y el conflicto es con el estado
actual del recurso. `400` decía "te has equivocado escribiendo la petición", que no era cierto.

`23503` aparece de verdad en este sistema: la foreign key `RESTRICT` de `order_items` impide borrar
un producto vendido, y hoy esa negativa correcta se presenta como error interno.

### El detalle de Postgres no sale al cliente

`users.service.ts` devolvía `error.detail`, que expone nombres de columna y valores. Pasa a
registrarse en el log y a responderse con un mensaje genérico. Es el mismo criterio que §8 aplica a
no devolver stack traces.

### El filter se registra en `main.ts`, no como provider

Registrar `APP_FILTER` como provider también funciona, pero el filter no inyecta nada y `main.ts`
ya es donde se declara el `ValidationPipe` global. Mantener las dos decisiones globales en el mismo
sitio hace más fácil ver qué atraviesa toda petición.

## Risks / Trade-offs

- **El frontend depende del cuerpo del `409`** → Los campos extra se conservan al mismo nivel, y
  hay un test que fija ese contrato para que un refactor futuro no lo rompa en silencio.
- **Cambiar `23505` de `400` a `409` en usuarios es un cambio de contrato** → Aceptado y declarado
  como breaking interno; ningún consumidor del frontend usa esa ruta hoy.
- **Un filter global puede tragarse errores inesperados y disfrazarlos de respuesta ordenada** →
  Todo lo que no sea `HttpException` se registra completo en el log antes de responder `500`.
- **`timestamp` en cada respuesta** hace que dos respuestas idénticas difieran → Es lo que pide §7 y
  es útil para cruzar una respuesta con su línea de log; ningún test debe comparar cuerpos enteros.

## Open Questions

- Un `requestId` propagado desde el middleware haría trivial cruzar respuesta y log. No lo pide el
  spec y no se construye aquí; el filter deja el hueco natural para añadirlo.
