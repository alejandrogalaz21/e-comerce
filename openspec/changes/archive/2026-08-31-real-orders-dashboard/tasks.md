> Todo el trabajo es de `web/`. No se toca `api/`, ni el esquema, ni `docker-compose.yml`.
> El orden importa: se borra la plantilla **al final** (grupo 6) para que el árbol compile en cada paso.

## 1. Hooks de lectura

- [x] 1.1 En `sections/purchase/hooks/use-purchase.ts`, añadir `purchaseKeys.list(params)` siguiendo la convención de `productKeys` en `sections/product/hooks/use-product.ts`
- [x] 1.2 Añadir `usePurchases({ page, limit })` con `useQuery` + `keepPreviousData`, consumiendo la `getPurchases()` ya existente
- [x] 1.3 Añadir `usePurchase(id)` con `useQuery` y `enabled: !!id`, consumiendo la `getPurchase(id)` ya existente
- [x] 1.4 Verificar que ambas exponen `isLoading` y `error` para que las vistas cubran los escenarios de carga y fallo del spec

## 2. Vista de lista

- [x] 2.1 Crear `sections/purchase/components/purchase-status-label.tsx`: badge por `IPurchaseStatus` (`PAID` success, `FAILED` error, `PENDING` warning), reutilizable en lista y detalle
- [x] 2.2 Crear `sections/purchase/components/purchase-id.tsx`: identificador abreviado a 8 caracteres, monoespaciado, con copiar al portapapeles y `toast` de confirmación
- [x] 2.3 Crear `sections/purchase/view/purchase-list-view.tsx` con `DataGrid`, columnas Order · Date · Items · Total · Status, todas `sortable: false` (D3)
- [x] 2.4 Configurar `paginationMode="server"`, `rowCount` desde `pagination.total`, `pageSizeOptions={[10, 20, 50]}` y 20 por defecto, espejo de `product-list-view`
- [x] 2.5 Estado vacío: `EmptyContent` con "No orders yet" y botón a la tienda (`/`), sin filas de relleno
- [x] 2.6 Estado de error: mensaje de fallo con acción de reintentar (`refetch`), sin mostrar órdenes en su lugar
- [x] 2.7 Calcular la columna Items como suma de `items[].quantity`; la lista ya trae las líneas, no hace falta una segunda petición
- [x] 2.8 Página y paginación en la URL con `useSearchParams`, igual que el resto del dashboard

## 3. Vista de detalle

- [x] 3.1 Crear `sections/purchase/components/purchase-details-items.tsx`: tabla SKU · Name · Qty · Unit price · Subtotal, con el orden de columnas de TK-044 (SKU antes que Name)
- [x] 3.2 En cada línea, enlazar el nombre al detalle del producto (`paths.product.details(productId)`) para poder contrastar el stock actual
- [x] 3.3 Contraste de precio: consultar el producto con `useGetProduct(productId)` y, si `price !== unitPrice`, señalar ambos con un aviso que explique que el precio de la compra quedó congelado
- [x] 3.4 Degradar el contraste sin romper: si la consulta del producto falla o no devuelve nada, mostrar solo el precio congelado y ningún aviso
- [x] 3.5 Crear `sections/purchase/components/purchase-details-evidence.tsx`: estado, fecha, referencia del cobro, clave de idempotencia y motivo de rechazo
- [x] 3.6 La clave de idempotencia lleva copiar al portapapeles y una nota corta explicando que repetirla devuelve esta misma compra en vez de cobrar otra vez
- [x] 3.7 Mostrar `paymentReference` solo cuando existe, y `declineReason` solo en órdenes `FAILED`; nunca ambos
- [x] 3.8 Crear `sections/purchase/components/purchase-details-summary.tsx` con subtotal y total desde `totalAmount`
- [x] 3.9 Crear `sections/purchase/view/purchase-details-view.tsx` componiendo los anteriores, más breadcrumbs de vuelta al listado
- [x] 3.10 Estado no encontrado: si el API responde 404, mostrar "Order not found" con enlace al listado, no una pantalla en blanco
- [x] 3.11 Crear `sections/purchase/view/index.ts` y `sections/purchase/components/index.ts` con los barrels que exige `fe-architecture`

## 4. Repuntar las páginas del dashboard

- [x] 4.1 Reescribir `pages/dashboard/order/list.tsx` para renderizar `PurchaseListView`, sin `_orders`
- [x] 4.2 Reescribir `pages/dashboard/order/details.tsx` para pasar el `id` de la URL a `PurchaseDetailsView`, eliminando el `_orders.find(...)`
- [x] 4.3 En `layouts/config-nav-dashboard.tsx`, renombrar la entrada a **Orders** y su hijo a un título descriptivo, coherente con TK-046; la ruta `/dashboard/order` no cambia
- [x] 4.4 Comprobar en el navegador que una compra recién hecha aparece en la lista y que su detalle abre correctamente

## 5. Checkout: total honesto y sin datos falsos

- [x] 5.1 En `checkout-payment.tsx`, retirar `DELIVERY_OPTIONS` y el bloque `CheckoutDelivery`, de modo que el total mostrado sea el subtotal que el API registra (D6)
- [x] 5.2 En `context/checkout-provider.tsx`, dejar `shipping` y `discount` fuera del cálculo del total; retirar `onApplyShipping`/`onApplyDiscount` si quedan sin uso
- [x] 5.3 Ajustar `checkout-summary.tsx` para no mostrar líneas de envío y descuento que ya no existen
- [x] 5.4 En `checkout-payment.tsx`, retirar `CARDS_OPTIONS` (tarjetas con nombres inventados) y adaptar `checkout-payment-methods.tsx` para funcionar sin ellas; las opciones de método de pago se conservan
- [x] 5.5 En `checkout-billing-address.tsx`, retirar `_addressBooks` y dejar el paso apoyado en `AddressNewForm`, que escribe en el `CheckoutContext`
- [x] 5.6 Verificar que `receipt.ts` sigue generando el PDF y que su total coincide con el de la orden registrada
- [x] 5.7 Eliminar `checkout-delivery.tsx` y `payment-new-card-dialog.tsx` si quedan sin referencias

## 6. Purga de la plantilla

- [x] 6.1 Reducir `layouts/main/footer.tsx` a una línea con el nombre del proyecto: sin columnas de enlaces falsos, sin `_socials`, sin la atribución a minimals.cc
- [x] 6.2 Borrar `src/sections/order/` completo (10 archivos)
- [x] 6.3 Borrar `src/types/order.ts`
- [x] 6.4 Borrar `src/_mock/` completo y comprobar con `grep -rn "_mock" src/` que no queda ninguna referencia
- [x] 6.5 Revisar si `sections/address/` sigue en uso tras 5.5; borrar los componentes que queden huérfanos
- [x] 6.6 Ejecutar `npx tsc --noEmit` y `npm run build` para confirmar que no quedó ningún import roto

## 7. Estados vacíos de la tienda

- [x] 7.1 En `sections/product/view/product-shop-view.tsx`, separar `nothingFound` por causa: catálogo vacío, búsqueda sin resultados, categoría sin productos (D8)
- [x] 7.2 Catálogo vacío: "No products yet" con enlace a `/dashboard/product/import` para cargar el CSV
- [x] 7.3 Búsqueda sin resultados: nombrar el término buscado y ofrecer limpiar la búsqueda
- [x] 7.4 Categoría sin productos: nombrar la categoría y ofrecer quitarla
- [x] 7.5 Distinguir el catálogo vacío de la carga inicial, para que el mensaje no aparezca mientras la primera consulta está en vuelo

## 8. Verificación

- [x] 8.1 Revisar `web/e2e/` y actualizar los tests que tocaban el paso de envío o las direcciones falsas del checkout
- [x] 8.2 Test del hook de lista: pagina, y una respuesta vacía no rinde filas
- [x] 8.3 Test del contraste de precio: cuando el precio actual difiere del congelado se avisa; cuando el producto no se puede consultar, no se avisa y el precio congelado se mantiene
- [x] 8.4 e2e del ciclo completo: comprar en la tienda → abrir `/dashboard/order` → la compra aparece → abrir su detalle → las líneas y el total coinciden
- [x] 8.5 Verificar a mano una orden `FAILED`: muestra su motivo de rechazo y ninguna referencia de cobro
- [x] 8.6 Verificar el contraste de precio a mano: comprar, editar el precio del producto en el dashboard, reabrir la orden y comprobar que la línea conserva el precio de compra y avisa de la diferencia
- [x] 8.7 Ejecutar la suite completa (`cd web && npm test`) y el lint
- [x] 8.8 Confirmar que no quedan comentarios generados por AI en el código nuevo, como exige el challenge

## 9. Documentación

- [x] 9.1 Añadir al README el recorrido de verificación del evaluador: importar CSV → buscar → comprar → ver la orden y su evidencia
- [x] 9.2 Anotar en el README que envío y descuento se retiraron del checkout, y por qué (el total mostrado debe ser el registrado)
- [x] 9.3 Confirmar que la fecha de descarga del CSV de ejemplo sigue presente en el README (2026-08-26, requerimiento del challenge)
- [x] 9.4 Marcar TK-048 como `closed` en `docs/backlog.md` con el enlace al change archivado (lo hace `/opsx:archive`)
