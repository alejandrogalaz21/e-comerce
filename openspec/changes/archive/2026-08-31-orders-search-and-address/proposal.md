## Why

> Ticket: **TK-049** (`docs/backlog.md`). Continúa TK-048.

Tres hallazgos al probar la pantalla de órdenes recién conectada.

**El inventario parece no descontarse.** No es cierto —el descuento ocurre dentro de la transacción
con bloqueo de fila— pero la aplicación lo aparenta. `GET /products` se sirve desde Redis con cinco
minutos de vigencia, y comprar es la única operación que cambia el stock sin avisarle a esa caché:
crear, editar, borrar producto e importar sí lo hacen. Durante esos cinco minutos la tienda muestra
el stock anterior. Es la peor clase de fallo para un entregable, porque pone en duda la garantía que
el resto del sistema sí cumple.

**La dirección de entrega se pide y se tira.** El checkout la recoge, pero el contrato de creación
de órdenes solo acepta líneas y clave de idempotencia. Nunca llega al servidor, así que el detalle
de una orden no puede mostrarla. Pedir un dato que no se guarda es teatro.

**La tabla de órdenes no tiene forma de buscar.** Con una orden es cómodo; con cincuenta, encontrar
la que se acaba de hacer, o saber qué órdenes incluyen cierto producto, deja de ser posible.
Resolverlo en el navegador filtraría solo la página visible y mentiría con paginación de servidor,
que es exactamente el defecto que TK-036 corrigió en el listado de productos.

## What Changes

- Comprar invalida la caché del catálogo, igual que cualquier otra operación que cambie el stock.
- **BREAKING (contrato)**: la creación de una orden acepta —y exige— una dirección de entrega. Una
  petición sin ella se rechaza. Corrige deliberadamente la exclusión de envío de
  [docs/initial.md](../../../docs/initial.md) §9, a petición explícita del usuario.
- La orden persiste esa dirección y el detalle la muestra junto a las líneas y a la evidencia.
- La consulta de órdenes acepta búsqueda por texto, filtro por estado y rango de fechas, todos
  resueltos en el servidor.
- La búsqueda por texto encuentra tanto por identificador de orden como por SKU o nombre de un
  producto comprado, de modo que "qué órdenes llevan este producto" sea una pregunta contestable.
- El motivo del rechazo se ve en la tabla sin abrir el detalle.

### Fuera de alcance

- Costo de envío, impuestos o transportistas. Se guarda **dónde** se entrega, no cuánto cuesta
  llevarlo: el total sigue derivándose de las líneas, que es lo que TK-048 dejó coherente.
- Libreta de direcciones reutilizable. Comprar sigue siendo anónimo, así que no hay a quién
  asociarle direcciones guardadas.
- Editar la dirección de una orden ya creada. Una orden es registro histórico.

## Capabilities

### New Capabilities

- `order-search`: qué garantiza la consulta de órdenes cuando hay muchas — que buscar, filtrar por
  estado y acotar por fechas se resuelva sobre el total de órdenes y no sobre la página visible, y
  qué se puede usar como criterio de búsqueda dado que una orden no tiene cliente.

### Modified Capabilities

- `order-placement`: comprar pasa a exigir una dirección de entrega, a guardarla como parte
  inmutable del pedido, y a invalidar la vista cacheada del catálogo cuyo stock acaba de cambiar.
- `order-history`: el detalle de una orden muestra su dirección de entrega, y la consulta expone el
  motivo del rechazo sin necesidad de abrir cada orden.
- `product-listing-cache`: la lista de invalidadores deja de ser solo la administración del
  catálogo e incluye la compra.

## Impact

**Backend (`api/`)** — a diferencia de TK-048, este change sí toca el servidor.

| Acción | Ruta |
|---|---|
| Se modifica | `src/modules/orders/orders.service.ts` (invalidación, dirección, filtros) |
| Se modifica | `src/modules/orders/orders.module.ts` (importa `ProductsModule`) |
| Se modifica | `src/modules/orders/entities/order.entity.ts` (columnas de dirección) |
| Se modifica | `src/modules/orders/dto/create-order.dto.ts`, `order-filters.dto.ts` |
| Se crea | Migración para las columnas de dirección y su índice de búsqueda |

**Frontend (`web/`)**

| Acción | Ruta |
|---|---|
| Se modifica | `src/sections/checkout/checkout-payment.tsx` (envía la dirección) |
| Se crea | `src/sections/purchase/components/purchase-details-address.tsx` |
| Se crea | `src/sections/purchase/components/purchase-table-toolbar.tsx` |
| Se modifica | `src/sections/purchase/view/purchase-list-view.tsx`, `purchase-details-view.tsx` |
| Se modifica | `src/types/purchase.ts`, `src/actions/purchase.ts`, mappers y hooks |

**Riesgo principal**: `OrdersModule` pasa a depender de `ProductsModule`. Hoy la dependencia no
existe en ningún sentido, así que no debería haber ciclo, pero es lo primero que hay que verificar.

**Riesgo de datos**: las órdenes ya existentes no tienen dirección. La migración las deja en nulo y
la lectura tolera su ausencia, aunque la escritura la exija de aquí en adelante.
