## Why

Un producto que ya se vendió no se puede borrar: la clave foránea de `order_items` es `RESTRICT`
y responde `409 RESOURCE_IN_USE`. Esa negativa es correcta —una orden es un registro histórico y
cascar el borrado reescribiría el pasado— pero deja al administrador **sin salida**: quiere sacar
el producto de la tienda, no borrar la venta, y hoy no existe forma de hacerlo. `Mini Projector`
(`PRJ-001`) es el caso real que lo destapó.

Y hay una segunda pregunta que el propio spec ya declaró pendiente: `initial.md` §4.5 dice que
guardar el histórico de cambios en una fintech es *"casi obligatorio"*, implementa el mínimo
(`import_batches` con reporte por fila) y **documenta el resto como futuro**. Hoy nadie puede
responder *"¿por qué el precio de este producto cambió el martes?"* si el cambio vino del CRUD en
vez de un import.

## What Changes

**Ciclo de vida del producto**

- Nueva columna `discontinued_at timestamptz` en `products`. Nula = a la venta. Con valor = retirado,
  y además dice **cuándo** — un booleano `active` no lo diría.
- `PATCH /products/:id/discontinue` y `PATCH /products/:id/restore` (protegidos).
- Un producto retirado **desaparece de la tienda**: no sale en `GET /products`, ni en
  `GET /products/categories`, y `GET /products/:id` responde `404`.
- El administrador **sí** lo ve: `GET /products?status=discontinued|active|all`, con `active` por
  defecto para no cambiar lo que ve cualquier consumidor existente.
- `DELETE /products/:id` **no cambia**: sigue siendo borrado duro y sigue devolviendo `409` si el
  producto aparece en una orden. Son dos operaciones distintas y se mantienen distintas.
- Reimportar por CSV un SKU retirado lo **reactiva**: el archivo es una corrección de catálogo y
  el administrador lo está re-añadiendo a propósito. Se reporta como `updated`, nunca `unchanged`.

**Historial de cambios**

- Nueva tabla `product_history` alimentada por un **trigger de Postgres**, no por el servicio: así
  captura también lo que escribe el import o un `UPDATE` a mano por psql. Es el mismo argumento
  del `FOR UPDATE` — la garantía vive en la base.
- Guarda operación (`INSERT`/`UPDATE`/`DELETE`), instante, la fila antes y después en `jsonb`, y
  los campos que cambiaron.
- `GET /products/:id/history` (protegido, paginado).
- El detalle de producto del dashboard muestra la línea de tiempo, y el estado retirado con su
  acción de restaurar.

## Capabilities

### New Capabilities

- `product-lifecycle`: retirar y restaurar un producto sin tocar las órdenes que lo contienen, y
  qué ve cada consumidor según ese estado.
- `product-history`: el registro de cambios por producto, qué lo alimenta y qué garantiza.

### Modified Capabilities

- `product-admin-listing`: el listado del dashboard gana el filtro por estado y la columna que
  distingue un producto retirado.
- `public-storefront`: la tienda deja de mostrar productos retirados, y un producto retirado que
  siga en un carrito se comporta como uno borrado.
- `product-categories`: los conteos por categoría dejan de contar productos retirados.

## Impact

**Backend**

- `api/src/database/migrations/` — dos migraciones: la columna, y la tabla más el trigger.
- `api/src/modules/products/` — entidad, servicio (`findAll`, `findOne`, `findCategories`,
  `discontinue`, `restore`), controlador, DTO de filtros, docs de Swagger.
- `api/src/modules/import/import.service.ts` — la reactivación al reimportar un SKU retirado.
- Nuevo `api/src/modules/products/entities/product-history.entity.ts` y su consulta.

**Frontend**

- `web/src/types/product.ts`, `actions/product.ts` y sus mappers — el estado y el historial.
- `web/src/sections/product/` — filtro de estado en el listado, acciones retirar/restaurar,
  y la vista del historial en el detalle.

**Sin impacto**

- `orders` y `order_items` no se tocan. Una orden sigue apuntando a su producto con `RESTRICT`.
- La revalidación del carrito no cambia: sigue leyendo `GET /products/:id` y tratando el `404`
  como "ya no está disponible" — que es exactamente lo que un producto retirado debe parecerle a
  quien compra.
