## Why

Ticket **TK-038**, que implementa la decisión de TK-021: darle a Redis un uso real en lugar de los
endpoints demostrativos de TK-020.

Hoy Redis está levantado, conectado y con una página de estado que lo comprueba, pero **no cachea
nada**. Es infraestructura que existe para enseñar que existe, lo que en una entrega se lee peor que
no tenerla.

TK-035 le da sentido inmediato: la tienda pública consulta el API a cada tecleo del buscador y a
cada chip de categoría, y esas consultas se repiten mucho entre visitantes.

## What Changes

- **`GET /products` se cachea por combinación de parámetros.** Dos peticiones con los mismos
  filtros, orden y página comparten respuesta.
- **La caché se invalida cuando el catálogo cambia**: al crear, actualizar o borrar un producto, y
  al cerrar un batch de import —que puede tocar cientos de filas de una vez.
- **`GET /products/categories` se cachea con la misma invalidación**, ya que se deriva del mismo
  catálogo y la tienda la pide en cada carga.
- **Un fallo de Redis no rompe el catálogo.** Si la caché no responde, la petición se resuelve
  contra Postgres. Una caché caída degrada el rendimiento, nunca la disponibilidad.
- **La caché no se aplica a lo que muta**, ni a lo que depende de la sesión.

## Capabilities

### New Capabilities

- `product-listing-cache`: qué se cachea, qué distingue una entrada de otra, cuándo deja de ser
  válida, y qué ocurre cuando la caché no está disponible.

### Modified Capabilities

Ninguna. El contrato de `GET /products` no cambia: cachear no debe ser observable salvo por la
latencia.

## Impact

- **Nuevo** servicio de caché en `api/src/database/redis/`, junto al cliente que ya vive ahí.
- `api/src/modules/products/products.service.ts` — lectura por caché e invalidación en las escrituras.
- `api/src/modules/import/import.service.ts` — invalidación al cerrar un batch.
- Sin cambios en el frontend.

## Non-Goals

- Cachear el detalle de un producto: se consulta poco y se invalidaría por cada escritura.
- Cachear pedidos: son datos de una transacción y su lectura va autenticada.
- Precalentar la caché o expulsar por LRU propio: el TTL basta a esta escala.
