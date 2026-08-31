> Este change **sí toca `api/`**, a diferencia de TK-048. Incluye una migración.
> El grupo 1 va primero porque es el bug visible y no depende de nada más.

## 1. Comprar invalida la caché del catálogo

- [x] 1.1 Verificar que no hay dependencia circular: `ProductsModule` no importa `OrdersModule` (confirmado en el análisis, revalidar tras el cambio)
- [x] 1.2 `OrdersModule` importa `ProductsModule`; inyectar `ProductsService` en `OrdersService`
- [x] 1.3 Llamar a `invalidateCache()` **después** de que la transacción confirme, nunca dentro (D1)
- [x] 1.4 No invalidar cuando el cobro fue rechazado: la transacción hizo rollback y el stock no cambió
- [x] 1.5 Test: tras una compra aprobada se invoca la invalidación; tras una rechazada no
- [x] 1.6 Test: una caché caída no impide registrar la orden (el requirement "degrada, nunca rompe" sigue vigente)
- [x] 1.7 Verificar a mano: comprar y consultar `GET /products` acto seguido devuelve el stock nuevo, sin esperar los 300 s

## 2. Dirección de entrega en el API

- [x] 2.1 Añadir a `Order` las columnas `ship_name`, `ship_phone`, `ship_address`, `ship_city`, `ship_state`, `ship_zip_code`, `ship_country`, nullable, con longitudes y `@ApiProperty` (D2)
- [x] 2.2 Migración con esas columnas; verificar que no reescribe filas existentes
- [x] 2.3 Añadir `ShippingAddressDto` a `create-order.dto.ts` con `class-validator` y ejemplos de Swagger; **obligatorio** en `CreateOrderDto`
- [x] 2.4 Persistir la dirección en `create()`, dentro de la misma transacción que la orden
- [x] 2.5 No guardar `addressType` ni `primary`: pertenecen a una libreta de direcciones que no existe (D2)
- [x] 2.6 Test: una compra sin dirección se rechaza con 400 nombrando lo que falta, y no crea orden ni descuenta stock
- [x] 2.7 Test: la dirección se devuelve tal cual en la creación y en el detalle
- [x] 2.8 Test: dos compras iguales con direcciones distintas registran el mismo total

## 3. Búsqueda y filtros en el API

- [x] 3.1 Ampliar `OrderFiltersDto` con `q`, `status` y `dateFrom`/`dateTo`, siguiendo el patrón de `ProductFiltersDto` (TK-039)
- [x] 3.2 `status` con whitelist estricta del enum; un valor fuera de ella se rechaza con 400 indicando los válidos (D4)
- [x] 3.3 Validar que `dateFrom <= dateTo`; un rango invertido se rechaza con 400, no devuelve lista vacía (D4)
- [x] 3.4 `dateTo` inclusivo hasta el final del día: aplicar `< dateTo + 1 día`, no `<= dateTo` (D4)
- [x] 3.5 Implementar `q` con prefijo sobre `orders.id::text` **OR** `EXISTS` sobre `order_items(sku, name)`, sin `JOIN` para no romper `findAndCount` (D3)
- [x] 3.6 Buscar contra `order_items`, nunca contra `products`: renombrar un producto no debe perder sus órdenes históricas (D3)
- [x] 3.7 Índices en `order_items(sku)` y `order_items(order_id)` en la misma migración del grupo 2
- [x] 3.8 Swagger con ejemplos para cada parámetro nuevo
- [x] 3.9 Test del builder de query: los tres criterios combinan, y el total refleja el filtro y no el catálogo completo
- [x] 3.10 Test: buscar por SKU encuentra las órdenes que lo contienen; renombrar el producto no las pierde

## 4. Dirección en el frontend

- [x] 4.1 Añadir la dirección a `IPlacePurchasePayload` y a `ApiPurchase`/`IPurchase` en `types/purchase.ts`
- [x] 4.2 Mapear la dirección en `purchase.mapper.ts`, tolerando su ausencia en órdenes viejas (`?` opcional al leer)
- [x] 4.3 `checkout-payment.tsx` envía `checkout.billing` en el payload de `placePurchase`
- [x] 4.4 Impedir llegar al paso de pago sin dirección, para que el 400 del API no sea la primera señal
- [x] 4.5 Crear `purchase-details-address.tsx`: tarjeta con la dirección registrada
- [x] 4.6 Órdenes sin dirección: decir que no se registró ninguna, no dejar un bloque vacío que parezca un fallo de carga
- [x] 4.7 Componer la tarjeta en `purchase-details-view.tsx` y exportarla en el barrel

## 5. Buscador y filtros en la tabla

- [x] 5.1 Crear `purchase-table-toolbar.tsx`: buscador que aplica con Enter, selector de estado y rango de fechas (D6)
- [x] 5.2 Estado, búsqueda y fechas viven en la URL con `useSearchParams`, como el resto del dashboard
- [x] 5.3 Cualquier cambio de criterio vuelve a la página 1
- [x] 5.4 Chips de filtro activo con `components/filters-result/`, con opción de limpiar cada uno y todos
- [x] 5.5 Pasar los criterios a `useGetPurchases` y a `purchaseKeys.list(params)` para que la caché de React Query distinga cada combinación
- [x] 5.6 Estado vacío por causa: "no hay órdenes todavía" es distinto de "esta búsqueda no encontró nada", con acción para descartar el criterio
- [x] 5.7 Tooltip con el motivo del rechazo sobre el badge `FAILED` de la tabla; ningún motivo en las órdenes pagadas (D5)
- [x] 5.8 Mostrar "Showing N of M" cuando haya filtros activos, como en el listado de productos

## 6. Verificación

- [x] 6.1 Actualizar los e2e: `POST /orders` ahora exige dirección, así que las llamadas directas del spec empiezan a devolver 400
- [x] 6.2 Actualizar cualquier ejemplo `curl` del README que cree órdenes sin dirección
- [x] 6.3 e2e: comprar, y comprobar que el stock del producto en la tienda baja de inmediato (el bug que originó el ticket)
- [x] 6.4 e2e: buscar por SKU en la tabla de órdenes devuelve las que lo contienen, filtrando sobre todas las páginas
- [x] 6.5 Verificar a mano el detalle con dirección, y una orden vieja sin ella
- [x] 6.6 `cd api && npm test` y `cd web && npm test`, más lint y `tsc --noEmit` en ambos
- [x] 6.7 Levantar el stack con `docker compose up --build` y recorrer el flujo completo
- [x] 6.8 Confirmar que no quedan comentarios generados por AI en el código nuevo

## 7. Documentación

- [x] 7.1 Documentar en el README la invalidación de caché al comprar, dentro de la sección de decisiones
- [x] 7.2 Actualizar la fila "Shipping, taxes, refunds" de "What is not built": la dirección ahora sí se guarda, el costo de envío sigue fuera
- [x] 7.3 Añadir a *Alternatives considered* la decisión de columnas planas frente a JSONB, y la de invalidar frente a bajar el TTL
- [x] 7.4 Anotar en `docs/initial.md` que §9 se corrigió parcialmente: se guarda dónde se entrega, no cuánto cuesta
- [x] 7.5 Marcar TK-049 como `closed` en `docs/backlog.md` (lo hace `/opsx:archive`)
