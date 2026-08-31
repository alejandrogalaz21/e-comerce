## Context

El API ya sirve todo lo que esta pantalla necesita y nadie lo consume:

```
  YA EXISTE (no se toca)                        FALTA (este change)
  ======================                        ===================
  GET /api/v1/orders?page&limit   -- JWT            usePurchases()
  GET /api/v1/orders/:id          -- JWT            usePurchase(id)
        |                                                |
        v                                                v
  actions/purchase.ts                            sections/purchase/view/
    getPurchases()   <-- codigo muerto             purchase-list-view
    getPurchase(id)  <-- codigo muerto             purchase-details-view
    toPurchase()     <-- ya mapea y testea               |
                                                         v
                                          pages/dashboard/order/{list,details}.tsx
                                          hoy: _orders.find(...) sobre _mock/_order.ts
```

`findAll` ordena por `createdAt DESC` con `relations: { items: true }`, así que la lista ya trae las
líneas de cada orden y el conteo de ítems no requiere una segunda llamada. El interceptor de axios
inyecta el token y `/dashboard/*` está tras `AuthGuard`, de modo que el JWT que ambos endpoints
exigen ya viaja.

La restricción que define el diseño es **qué NO existe**: no hay usuario asociado a una orden (las
compras son públicas por decisión de TK-031), no hay tabla de eventos, `OrderFiltersDto` solo acepta
`page` y `limit`, y no hay `DELETE /orders` —ni debe haberlo, porque `order_items` referencia
`products` con `RESTRICT` justo para que una venta no se pueda borrar—.

La plantilla, en cambio, asume lo contrario: `sections/order/` trae cliente con avatar y correo,
cuatro tabs de estado, filtro por rango de fechas, buscador y borrado múltiple. Casi nada de eso
tiene con qué llenarse.

## Goals / Non-Goals

**Goals:**

- Que una compra confirmada sea visible y verificable desde la aplicación, sin abrir la base.
- Que el detalle sirva de **evidencia** de las garantías que `order-placement` y
  `payment-processing` ya cumplen pero que hoy solo se pueden comprobar con un cliente SQL.
- Que no quede ningún dato de demostración en un flujo que el challenge evalúa.
- Cero cambios de backend.

**Non-Goals:**

- Filtro por estado, búsqueda o rango de fechas en el listado (exige tocar `OrderFiltersDto`).
- Tabla `order_events` para una línea de tiempo rica.
- Estados de orden más allá de `PENDING`/`PAID`/`FAILED`; no hay transiciones que representar.
- Reescribir el checkout. Solo se le quitan los datos falsos y se corrige el total.

## Decisions

### D1: Vistas nuevas sobre `IPurchase`, no adaptar `IOrderItem`

**Elegido**: crear `sections/purchase/view/` desde cero contra `IPurchase` y borrar
`sections/order/` completo.

La alternativa tentadora era mapear `IPurchase` a la forma `IOrderItem` de la plantilla para
conservar sus diez componentes. Se descarta porque ese tipo exige `customer` con nombre, correo y
avatar, `shippingAddress`, `payment.cardNumber` y un historial con cuatro hitos. Rellenarlos
significa inventarlos: es reintroducir el mismo problema que este change corrige, con otro nombre.

El coste real de la alternativa era además engañoso: los componentes que se “conservarían” son en su
mayoría los que hay que amputar (toolbar de filtros, tabs, selección múltiple).

`IPurchase` ya existe, ya está mapeado por `toPurchase()` y ese mapper ya tiene tests
(`purchase.mapper.test.ts`). Se construye sobre algo probado.

### D2: `sections/purchase/`, no `sections/order/`

El módulo se llama `purchase` porque ahí ya viven `hooks/use-purchase.ts`, `actions/purchase.ts`,
`types/purchase.ts` y sus mappers, siguiendo la capa que exige `fe-architecture`. Reusar el nombre
`order` obligaría a convivir con los restos de la plantilla durante el borrado y dejaría dos
significados para la misma palabra.

Las **rutas HTTP y de navegación no cambian**: `/dashboard/order` y `/dashboard/order/:id` se
conservan. Organización de código no es contrato de navegación — el mismo criterio que TK-025 aplicó
al mover `products/import/` a `modules/import/` sin tocar `/products/import`.

### D3: La tabla se reduce a lo que el API puede llenar

| Columna | Origen | Decisión |
|---|---|---|
| Order | `id` (UUID) | Se muestran los primeros 8 caracteres, monoespaciados, con copiar al portapapeles |
| Date | `createdAt` | Fecha y hora; el evaluador la contrasta contra `orders.created_at` |
| Items | `sum(items.quantity)` | Se calcula en el FE; la lista ya trae `items` |
| Total | `totalAmount` | Ya convertido a número por `toPurchase()` |
| Status | `status` | Badge: `PAID` success · `FAILED` error · `PENDING` warning |

Se eliminan Customer, tabs de estado, filtro por fechas, buscador y borrado múltiple. El criterio es
el mismo que TK-036 aplicó al `sortingMode="server"`: **un control que parece funcionar y miente es
peor que su ausencia**. Un filtro de estado resuelto en cliente solo filtraría la página visible.

**DataGrid con `paginationMode="server"`**, igual que `product-list-view`, con `pageSizeOptions
[10, 20, 50]` y 20 por defecto (TK-046). No se activa `sortingMode="server"`: el API no acepta
`sortBy`, así que las columnas van con `sortable: false` en vez de ofrecer un orden que mentiría.

### D4: El detalle es la superficie de evidencia

Esta es la decisión que responde al objetivo del ticket. El detalle se organiza en tres bloques:

```
  +--------------------------------------+  +---------------------------+
  |  LINEAS COMPRADAS                    |  |  RESUMEN                  |
  |  SKU | Name | Qty | Unit | Subtotal  |  |  Subtotal                 |
  |                                      |  |  Total  (= totalAmount)   |
  |  PRJ-001  Mini Projector  1  199.99  |  +---------------------------+
  |     ^ precio congelado               |
  |     [!] ahora cuesta 149.99          |  +---------------------------+
  |                                      |  |  EVIDENCIA                |
  |  cada linea enlaza al producto ----> |  |  Status      PAID         |
  +--------------------------------------+  |  Created at  ...          |
                                            |  Payment ref fake_ch_...  |
                                            |  Idempotency 9081ac9d...  |
                                            |  (o Decline reason)       |
                                            +---------------------------+
```

Cada elemento existe por una pregunta que el evaluador puede hacer:

| Pregunta del evaluador | Qué la responde |
|---|---|
| "¿El precio comprado sobrevive a un cambio de catálogo?" | `unitPriceSnapshot` contrastado contra el precio actual |
| "¿Y si envío la compra dos veces?" | La clave de idempotencia visible, con su explicación |
| "El pago es falso, ¿cómo lo sé?" | `paymentReference` con prefijo `fake_ch_` |
| "¿Qué pasa si el cobro se rechaza?" | `declineReason` en las órdenes `FAILED` |
| "¿De verdad bajó el stock?" | Cada línea enlaza al producto comprado |

El contraste de precio requiere el producto actual. Se resuelve con `useGetProduct(productId)` por
línea, que ya existe: son pocas líneas por orden y React Query deduplica y cachea. Si esa consulta
falla o el producto fue borrado, **no se muestra el aviso** — se degrada a mostrar solo el precio
congelado, que es el dato de la orden y nunca falta.

**Alternativa descartada**: pedir al API que devuelva el precio actual junto a la línea. Es más
eficiente y es cambio de backend, que este change se propuso evitar. Queda anotado como mejora.

### D5: Sin línea de tiempo inventada

La plantilla trae `order-details-history` con cuatro hitos (pedido, pago, envío, entrega). El
sistema conoce dos instantes y **comparten timestamp**: `createdAt` y la resolución del cobro,
porque el cobro ocurre dentro de la misma transacción que crea la orden (garantía de
`payment-processing`).

Pintar una timeline de dos puntos idénticos sugiere un proceso que no existe. Se sustituye por el
bloque de evidencia de D4, que dice lo mismo sin fingir duración.

El "historial" que sí existe es **la lista**: `findAll` ordena por `createdAt DESC` y pagina. Esa es
la vista histórica de compras, y sale con el cableado.

### D6: El total mostrado debe ser el registrado

Hoy el checkout suma `subtotal - discount + shipping` con opciones de envío de $0/$10/$20, pero
`placePurchase` solo manda `{ items, idempotencyKey }`. El API calcula el total desde las líneas.
Resultado observado: la UI puede mostrar $249.97 y la base guarda 229,97.

Esto no es cosmético en este change: el detalle de orden que D4 construye va a mostrar el total del
API, y el recibo PDF también. Un evaluador que compre con "Express" y abra la orden ve dos números
distintos para la misma compra, y lo razonable es que concluya que el total no es de fiar.

**Elegido**: retirar del checkout las opciones de envío y el descuento. El total pasa a ser el
subtotal, que es exactamente lo que el API registra.

**Alternativa descartada**: enviar `shipping` y `discount` al API. Exige campos nuevos en
`CreateOrderDto`, columnas nuevas en `orders`, migración y recálculo del total en el servicio. Es
una funcionalidad que el challenge no pide, y este change se propuso sin tocar backend.

**Segunda alternativa descartada**: dejar las opciones visibles pero todas a $0. Conserva un control
que no hace nada, que es lo que D3 rechaza en la tabla.

> Decisión reversible y acotada al FE. Si se prefiere conservar el envío, la corrección es el
> camino de la primera alternativa y merece su propio ticket.

### D7: Qué se borra y por qué viaja junto

`src/_mock/` alimenta cuatro pantallas, no una:

```
  src/_mock/_order.ts   --> order-list-view, order/details.tsx     [D1: se borran]
  src/_mock/_others.ts  --> _addressBooks --> checkout-billing-address
                        --> _socials      --> layouts/main/footer
                        --> ORDER_STATUS_OPTIONS --> order views    [D1: se borran]
```

Borrar `_mock/` **obliga** a resolver billing y footer en el mismo change; por eso la purga no es
trabajo aparte. Resoluciones:

- **Billing**: se retira la libreta de cuatro direcciones falsas. El paso conserva el formulario de
  dirección (`AddressNewForm`, que ya existe y escribe en el `CheckoutContext`), de modo que el
  flujo de tres pasos se mantiene y lo que se muestra es lo que el visitante escribió.
- **Tarjetas guardadas** (`CARDS_OPTIONS`, con nombres inventados) se retiran de
  `checkout-payment.tsx`. Las opciones de método de pago se conservan: alimentan el proveedor
  simulado, que sí es un requerimiento del challenge.
- **Footer**: se reduce a una línea con el nombre del proyecto. Se van las columnas de enlaces
  falsos, las redes sociales y la atribución a minimals.cc.

### D8: Estados vacíos que dicen qué hacer

`product-shop-view` usa hoy un solo booleano `nothingFound` para dos situaciones opuestas. Se separa
por causa:

```
  total == 0 && !q && !category  ->  "No products yet"
                                     + boton -> /dashboard/product/import   [primer arranque]
  total == 0 && q                ->  "No results for <q>"      + limpiar busqueda
  total == 0 && category         ->  "No products in <cat>"    + quitar categoria
```

El caso de catálogo vacío es la **primera pantalla que ve quien clona el repo**. Mandarlo al
importador de CSV convierte un callejón sin salida en el inicio del recorrido que el challenge
describe. El mismo criterio para el listado de órdenes vacío: enlace a la tienda.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Borrar `sections/order/` y `types/order.ts` rompe imports no detectados | Verificar con `tsc --noEmit` y build; ningún archivo fuera de esas carpetas los importa según la revisión previa |
| `useGetProduct` por línea multiplica peticiones en el detalle | Órdenes de pocas líneas; React Query deduplica y cachea. Si crece, D4 anota la alternativa de servirlo desde el API |
| Un producto borrado deja la línea sin precio actual | `RESTRICT` en `order_items` impide borrar un producto vendido; aun así el aviso se omite si la consulta falla, y el precio congelado siempre se muestra |
| Quitar el envío altera el look del checkout | El paso de pago conserva método de pago y resumen; solo desaparece un bloque que no tenía efecto |
| D6 es una decisión de producto tomada dentro de un change técnico | Marcada como reversible y acotada al FE; la alternativa de conservarla queda descrita |
| Los e2e existentes tocan el checkout | Revisar `web/e2e/` y actualizar los selectores del paso de envío si los usan |

## Migration Plan

Sin migración de datos ni de esquema. Las rutas se conservan, así que ningún enlace guardado se
rompe. La reversión es revertir el commit.

Orden de trabajo: hooks de lectura → vistas nuevas → repuntar las páginas → borrar la plantilla →
checkout y footer → estados vacíos. Borrar al final mantiene el árbol compilando en cada paso.

## Open Questions

1. ¿La entrada de navegación sigue llamándose "Order"? El dominio interno es `purchase` y la ruta
   es `/dashboard/order`. Propuesta: etiqueta **"Orders"** en el nav, ruta intacta.
2. ¿El detalle debe permitir reintentar una orden `FAILED`? Sería crear una compra nueva con las
   mismas líneas y clave nueva. Fuera de alcance salvo indicación.
