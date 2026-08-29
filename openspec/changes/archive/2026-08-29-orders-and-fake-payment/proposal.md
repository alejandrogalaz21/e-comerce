## Why

Tickets **TK-010** y **TK-022** del backlog. La compra es un requisito explícito del challenge
—«Purchase products (payment provider not necessary, fake the payment)» con UI— y hoy **no
existe**: no hay módulo `orders` ni `payment` en `api/src/modules/`, no hay migración de
`orders`/`order_items`, y el checkout del frontend es el del template Minimals corriendo sobre
`useCheckoutContext`, es decir estado en memoria que no persiste nada ni descuenta stock.

Hay un agravante que pesa más que la ausencia en sí: `docs/initial.md` **ya promete** el mecanismo.
La §5 documenta `SELECT ... FOR UPDATE` como estrategia anti-sobreventa, con su diagrama de
secuencia y su alternativa descartada, y la §6 declara `PaymentProvider` como Strategy. Un revisor
que lea el README, siga al spec y luego al código encuentra la promesa sin cumplir, que se lee peor
que no haberla hecho.

Los dos tickets van en un solo change porque la orden y el cobro comparten la misma transacción:
si el pago falla, la orden y el descuento de stock se revierten. Separarlos obligaría a implementar
el segundo dentro del primero.

## What Changes

### Backend

- **Nuevo módulo `orders`**, hermano de `products`, con las entidades `Order` y `OrderItem` del
  modelo ya definido en `initial.md` §3, y su migración: `total_amount` y `unit_price_snapshot` en
  `numeric(12,2)`, nunca coma flotante.
- **`POST /orders` es público** —§10.2 decidió que se compra sin cuenta, como en cualquier
  e-commerce real— y ejecuta todo dentro de **una sola transacción**: leer el stock con
  `SELECT ... FOR UPDATE`, validar, descontar, crear la orden y cobrar.
- **El total lo calcula el servidor** a partir del precio almacenado de cada producto. El cliente
  manda producto y cantidad; nunca un importe.
- **`unit_price_snapshot`** congela el precio en el momento de la compra: si el producto cambia de
  precio después, la orden histórica no muta.
- **`idempotency_key` con UNIQUE**: la misma key repetida devuelve la orden ya creada en lugar de
  crear una segunda. Un doble clic o un reintento de red no cobra dos veces.
- **409 cuando no hay stock suficiente**, con un cuerpo que dice qué producto y cuánto quedaba.
- **Estados `PENDING → PAID | FAILED`**, con las transiciones acotadas.
- **`PaymentProvider` como interfaz** con `FakePaymentProvider` inyectado (Strategy, §6),
  consumido dentro de la misma transacción. El fake rechaza aproximadamente el 10% de los cobros,
  y su fuente de azar es inyectable para que los tests sean deterministas sin que el
  comportamiento en ejecución cambie.
- **Lectura protegida por JWT**: `GET /orders` y `GET /orders/:id` para el dashboard, siguiendo la
  frontera de §10.2 donde la gestión va autenticada. El comprador anónimo recibe su confirmación
  en la respuesta del `POST`.

### Frontend

- El checkout deja de vivir en memoria y **hace `POST /orders` real** al confirmar.
- El **idempotency key se genera al iniciar el checkout**, no al pulsar el botón, que es lo que lo
  hace resistente al doble clic.
- **El 409 se maneja con UX explícita**: se dice qué línea se quedó sin stock, en vez de un error
  genérico.
- **El pago rechazado se distingue del error de red**: el primero es un resultado legítimo del
  flujo y debe poder reintentarse.

## Capabilities

### New Capabilities

- `order-placement`: qué garantiza el sistema al comprar — atomicidad entre orden, stock y cobro;
  imposibilidad de sobreventa bajo compras simultáneas; inmutabilidad del precio comprado;
  idempotencia frente a envíos repetidos; y qué se responde cuando falta stock o el cobro se
  rechaza.
- `payment-processing`: que el cobro sea una pieza sustituible, que su resultado forme parte de la
  transacción de la compra, y que un rechazo no deje rastro en el catálogo.

### Modified Capabilities

Ninguna. Las capabilities existentes cubren el listado de productos, sus filtros, sus categorías,
la búsqueda de imports y el contrato del reporte de import; ninguna describe la compra.

## Impact

- **Nuevo** `api/src/modules/orders/` — entidades, DTOs, servicio, controlador, módulo.
- **Nuevo** `api/src/modules/payment/` — interfaz `PaymentProvider` y `FakePaymentProvider`.
- **Nueva migración** en `api/src/database/migrations/` para `orders` y `order_items`.
- `api/src/modules/products/` — el descuento de stock lo hace `orders` dentro de su transacción;
  hay que verificar que no colisione con las escrituras del import.
- **Nuevo** `web/src/actions/order.ts`, `web/src/types/order.ts` y
  `web/src/sections/order/hooks/` siguiendo la arquitectura por capas del frontend.
- `web/src/sections/checkout/` — `checkout-view` y el paso de pago pasan a consumir el API.
- README: sección «Purchase flow» con las decisiones de concurrencia e idempotencia.

## Non-Goals

- **Mini-cart en el navbar y recibo en PDF**: son TK-037, ticket aparte.
- **Cuentas de cliente e historial propio**: la compra es anónima por decisión de §10.2.
- **Pasarela de pago real, envíos, impuestos y devoluciones**: §9 los documenta como fuera de
  alcance.
- **Cola asíncrona para el cobro**: la contención esperada no lo justifica; se menciona en el
  design como camino de escalado, no se construye.
