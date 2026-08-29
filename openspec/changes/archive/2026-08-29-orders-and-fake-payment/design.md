## Context

El challenge pide comprar productos con un pago simulado. Hoy el flujo existe en pantalla pero no
en el sistema: `web/src/sections/checkout/` corre sobre `useCheckoutContext`, estado en memoria del
template Minimals, y el backend no tiene módulo `orders` ni `payment`.

Lo que sí existe es la decisión. `docs/initial.md` cerró el modelo de datos (§3), el mecanismo de
concurrencia (§5), los patrones (§6) y la frontera de auth (§10.2). Este design no re-decide nada
de eso: lo aterriza y resuelve lo que quedó abierto.

Estado actual relevante:

```
  api/src/modules/     auth  health  import  products  status  users      <-- no hay orders
  migrations/          initial-schema  demo-user  imported-by  2 indices  <-- no hay orders

  web/  checkout ---> useCheckoutContext (memoria) ---> [nada]
                                                         ^
                                              aqui deberia estar POST /orders
```

Restricción heredada que condiciona el diseño: **el import escribe sobre `products`** con su propia
transacción y su `FOR UPDATE`. La compra va a competir por las mismas filas.

## Goals / Non-Goals

**Goals:**

- Que comprar sea atómico: orden, stock y cobro ocurren todos o ninguno.
- Que dos compras simultáneas del último artículo no puedan vender ambas.
- Que el precio comprado quede congelado y el total no dependa de lo que mande el cliente.
- Que un doble clic no genere dos órdenes ni dos cobros.
- Que el cobro sea sustituible sin tocar el módulo de órdenes.

**Non-Goals:**

- Mini-cart y recibo PDF (TK-037).
- Cuentas de cliente, historial propio, envíos, impuestos, devoluciones (§9).
- Cola asíncrona de cobro. Se nombra como camino de escalado, no se construye.

## Decisions

### La transacción es el límite, y el cobro ocurre dentro

Toda la compra vive en una transacción de Postgres:

```
  BEGIN
    SELECT ... FROM products WHERE id = ANY($ids) ORDER BY id FOR UPDATE
    validar stock de cada linea            --> si falta: ROLLBACK, 409
    calcular total desde el precio leido
    INSERT order (PENDING) + order_items (unit_price_snapshot)
    payment.charge(total, key)             --> si rechaza: ROLLBACK, 402
    UPDATE products SET stock = stock - qty
    UPDATE order SET status = PAID
  COMMIT
```

El cobro va **dentro** y no después. Si fuera después, un rechazo dejaría stock descontado y una
orden pagada que no se cobró, y habría que compensar. Con el proveedor falso —que es local y
síncrono— la transacción basta. Queda anotado que con una pasarela real esto se convierte en
compensación o saga, porque un `ROLLBACK` no deshace un cargo remoto.

### `FOR UPDATE` con orden estable por `id`

§5 ya eligió lock pesimista sobre optimista, con su trade-off escrito. Lo que §5 no cubre es el
caso de **varias líneas en una orden**: dos compras con los mismos dos productos en orden inverso
se bloquean mutuamente. Por eso las filas se bloquean **ordenadas por `id`**, siempre en la misma
secuencia, que es la forma estándar de evitar el deadlock. Sin esto, el lock correcto por línea
produce un interbloqueo por orden.

### El total lo calcula el servidor, siempre

El cliente manda `{ productId, quantity }`. Nunca un precio ni un total. El servidor lee el precio
de la fila que ya tiene bloqueada y suma. Cualquier importe que llegue en el request se ignora.

Es la diferencia entre un carrito y un sistema que maneja dinero: si el cliente puede influir en el
importe, el importe no es confiable.

### Dinero en `numeric(12,2)`, y en TypeScript como string

§3 fijó `DECIMAL` en la base. El complemento necesario es que TypeORM devuelve `numeric` como
**string**, y ahí es donde el bug reaparece si se convierte a `number` para sumar. Los importes se
suman en **centavos como enteros** y se formatean al final. Un `0.1 + 0.2` en el total de una orden
es exactamente el fallo que este proyecto no puede permitirse.

### Idempotencia por UNIQUE, resuelta por la base

`idempotency_key` lleva constraint `UNIQUE`. El flujo no consulta primero y luego inserta —eso es
una race condition con otro nombre—: **inserta y captura la violación de unicidad**, y ante ella
devuelve la orden existente con `200` en lugar de `201`.

La key la genera el frontend **al entrar al checkout**, no al pulsar Confirmar. Generarla en el
clic haría que dos clics produjeran dos keys, que es justo lo que se quiere evitar.

### El pago falso rechaza ~10%, con el azar inyectado

El proveedor rechaza aproximadamente uno de cada diez cobros, para que el rollback sea observable
en uso real y no solo en los tests.

El riesgo obvio es que eso vuelva los tests no deterministas. Se resuelve **inyectando la fuente de
azar** en vez de llamar a `Math.random()` dentro del método: en ejecución se inyecta la real, en los
tests una que devuelve un valor fijo. El comportamiento en producción es el pedido; los tests
deciden si el cobro aprueba o rechaza sin depender de la suerte.

| Alternativa | Por qué no |
| --- | --- |
| `Math.random()` dentro del método | Tests flaky; no se puede forzar el rechazo |
| Fallo determinista por monto | Reproducible, pero el evaluador tiene que conocer el truco |
| Siempre aprueba | El rollback no se puede provocar desde la UI |

### `PaymentProvider` es una interfaz con token de inyección

Nest inyecta por token, así que la interfaz se acompaña de un símbolo `PAYMENT_PROVIDER`. `orders`
depende del token, nunca de `FakePaymentProvider`. Conectar una pasarela real es registrar otra
clase contra el mismo token.

El método devuelve un **resultado**, no lanza, cuando el rechazo es una respuesta legítima del
proveedor: un cobro rechazado no es una excepción del sistema. Las excepciones quedan para fallos
de infraestructura.

### `402` para el pago rechazado, `409` para el stock

Dos fallos distintos que el frontend debe distinguir, porque uno se reintenta y el otro no:

| Situación | Código | Qué hace el cliente |
| --- | --- | --- |
| Stock insuficiente | `409` | Ajustar cantidades; reintentar igual no sirve |
| Pago rechazado | `402` | Reintentar tiene sentido |
| Producto inexistente | `404` | Revisar el carrito |
| Cantidad inválida | `400` | Corregir la entrada |

El `409` nombra el producto y el stock restante. «No hay stock» sin decir de qué obliga a adivinar.

### La lectura va protegida; la confirmación viaja en el POST

§10.2 deja la compra pública y la gestión autenticada. `GET /orders` y `GET /orders/:id` son
gestión, así que llevan JWT. El comprador anónimo recibe la orden completa en la respuesta del
`POST`, que es lo que necesita para ver su confirmación.

Consecuencia aceptada: si cierra la pestaña, no puede recuperarla. Darle una ruta pública por id
abriría enumeración y exigiría un token de consulta; no lo pide el challenge.

### Convivencia con el import

El import hace upsert masivo sobre `products` y la compra bloquea filas de esa misma tabla. Ambos
usan transacciones cortas y bloqueo por fila, así que el peor caso es espera, no corrupción. Se
verifica explícitamente en tests: un import corriendo no debe permitir vender stock que está a punto
de cambiar.

## Risks / Trade-offs

- **Deadlock con varias líneas por orden** → Bloqueo ordenado por `id`, cubierto por un test con
  dos órdenes de los mismos productos en orden inverso.
- **`numeric` llega como string y alguien lo pasa a `number`** → Suma en centavos enteros y test
  con importes que rompen en coma flotante.
- **El 10% de rechazo molesta al evaluador** → El README dice que es intencional y cómo se
  reintenta; los tests no dependen del azar.
- **El lock pesimista serializa las compras del mismo producto** → Aceptado: §5 lo eligió por
  contención baja. La transacción es corta y toca pocas filas.
- **Con pasarela real la transacción deja de bastar** → Documentado como límite conocido: pasaría a
  compensación/saga con outbox. Fuera de alcance, pero nombrado para que no se lea como descuido.
- **El template de checkout trae pasos que no persisten** (dirección, envío) → Este change conecta
  la confirmación; lo que no forma parte del modelo de §3 sigue siendo presentación.

## Migration Plan

Tablas nuevas, sin datos previos que migrar. La migración crea `orders` y `order_items` con la
constraint `UNIQUE` sobre `idempotency_key` y la foreign key a `products` con `RESTRICT`: una orden
es un registro histórico y borrar un producto vendido no debe borrarla en cascada.

Rollback: `down()` elimina ambas tablas. Nada más depende de ellas.

## Open Questions

- Si en el futuro se pide historial por comprador, hará falta identidad en la orden (email o
  cuenta). El modelo de §3 no lo tiene y este change no lo añade; la decisión queda para cuando el
  requisito exista.
