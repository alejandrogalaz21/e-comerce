## Why

> Ticket: **TK-048** (`docs/backlog.md`)

Se realiza una compra, el API la registra correctamente —`orders` + `order_items`, status `PAID`,
`payment_reference`, stock descontado— y la pantalla `/dashboard/order` muestra veinte órdenes
ficticias de `src/_mock/_order.ts`, con clientes inventados y estados (`Completed`, `Cancelled`,
`Refunded`) que no existen en el dominio. La compra real nunca aparece.

No es un bug de datos sino un cableado que faltó: `getPurchases()` y `getPurchase()` están escritas
en `src/actions/purchase.ts` y no las llama nadie, mientras `GET /api/v1/orders` y
`GET /api/v1/orders/:id` ya existen, paginan y están protegidos con JWT. Fue un aplazamiento
consciente de TK-010/TK-022 que `types/purchase.ts` documenta en su cabecera.

Importa ahora por dos razones. La primera es que rompe el único ciclo que el challenge describe de
principio a fin: importar productos → buscar → comprar → verificar la compra. La segunda es que un
evaluador que abra esa pantalla ve datos inventados en un entregable que presume de registrar
compras reales, lo que pone en duda todo lo demás que la app afirma.

## What Changes

- **BREAKING (interno)**: se elimina el dominio de órdenes de la plantilla —`src/sections/order/`,
  `src/types/order.ts` y `src/_mock/` completo—. Ninguna pantalla que sobreviva depende de ellos.
- `/dashboard/order` y `/dashboard/order/:id` pasan a leer del API real mediante dos hooks nuevos,
  `usePurchases()` y `usePurchase(id)`, que consumen las acciones ya existentes.
- La tabla se reduce a las columnas que el API puede llenar con verdad: orden, fecha, ítems, total
  y estado. Se retiran la columna de cliente, los tabs de estado, el filtro por rango de fechas, el
  buscador y la selección múltiple con borrado: ninguno tiene dato ni endpoint que lo sostenga, y
  el borrado además contradice que una orden sea registro histórico (`order_items` usa `RESTRICT`).
- El detalle se diseña como **superficie de evidencia**: además de las líneas compradas, expone la
  clave de idempotencia, la referencia del cobro simulado, el motivo del rechazo cuando lo hay, y
  el precio congelado de cada línea contrastado con el precio actual del producto.
- Estados vacíos honestos: la tienda distingue "aún no hay productos" (catálogo vacío) de "sin
  resultados" (búsqueda o filtro sin coincidencias). Hoy ambos casos comparten un mismo mensaje.
- Purga del resto de la plantilla: direcciones falsas del paso de billing, tarjetas guardadas
  falsas del paso de pago, y el footer con enlaces, redes sociales y atribución de minimals.cc.
- **No hay cambios de backend.** Ni endpoints, ni DTOs, ni entidades, ni migraciones.

### Fuera de alcance

- Añadir filtro por estado o búsqueda al listado de órdenes: exigiría ampliar `OrderFiltersDto` y
  el servicio. La paginación por fecha descendente que ya existe cubre el caso de uso.
- Una tabla `order_events` para una línea de tiempo rica. Los únicos instantes que el sistema
  conoce hoy son la creación y la resolución del cobro, y ambos comparten timestamp; inventar
  pasos intermedios sería volver a mockear.
- Enviar envío y descuento al API. Se documenta en `design.md` como deuda conocida con su
  corrección mínima, porque afecta a la coherencia del total que el evaluador va a contrastar.

## Capabilities

### New Capabilities

- `order-history`: qué garantiza la aplicación cuando alguien consulta las compras registradas —
  que lo listado proviene del sistema y no de datos de demostración, qué se muestra de cada orden,
  qué evidencia expone el detalle para verificar las garantías de `order-placement` y
  `payment-processing`, y qué se responde cuando todavía no hay ninguna compra.

### Modified Capabilities

- `public-storefront`: el estado vacío de la tienda pasa a distinguir un catálogo vacío de una
  búsqueda o filtro sin coincidencias, que hoy comparten mensaje.

## Impact

**Frontend (`web/`) — único afectado.**

| Acción | Ruta |
|---|---|
| Se amplía | `src/sections/purchase/hooks/use-purchase.ts` (hooks de lectura) |
| Se crea | `src/sections/purchase/components/`, `src/sections/purchase/view/` |
| Se reescribe | `src/pages/dashboard/order/list.tsx`, `src/pages/dashboard/order/details.tsx` |
| Se modifica | `src/sections/product/view/product-shop-view.tsx` (estados vacíos) |
| Se modifica | `src/sections/checkout/checkout-billing-address.tsx`, `checkout-payment.tsx` |
| Se modifica | `src/layouts/main/footer.tsx`, `src/layouts/config-nav-dashboard.tsx` |
| Se elimina | `src/sections/order/`, `src/types/order.ts`, `src/_mock/` |

**Sin impacto**: `api/`, base de datos, `docker-compose.yml`, dependencias. Las rutas
`/dashboard/order` y `/dashboard/order/:id` se conservan; cambia lo que renderizan, no su dirección.

**Riesgo principal**: `src/_mock/` también alimenta el footer (`_socials`) y el checkout
(`_addressBooks`). Borrarlo obliga a resolver esas tres pantallas en el mismo change; por eso la
purga de plantilla viaja junto al cableado de órdenes y no como trabajo aparte.
