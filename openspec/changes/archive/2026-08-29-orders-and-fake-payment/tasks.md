## 1. Esquema de datos

- [x] 1.1 Crear las entidades `Order` y `OrderItem` en `api/src/modules/orders/entities/`, siguiendo el modelo de `initial.md` §3
- [x] 1.2 Declarar `total_amount` y `unit_price_snapshot` como `numeric(12,2)`, nunca coma flotante
- [x] 1.3 Declarar `idempotency_key` con constraint `UNIQUE` a nivel de base de datos
- [x] 1.4 Declarar la foreign key de `order_items` a `products` con `RESTRICT`: borrar un producto vendido no debe borrar la orden
- [x] 1.5 Generar la migración de `orders` y `order_items`, con su `down()` que elimina ambas tablas
- [x] 1.6 Verificar que la migración corre en limpio y que revertirla deja el esquema como estaba

## 2. Proveedor de pago (TK-022)

- [x] 2.1 Definir la interfaz `PaymentProvider` y su token de inyección en `api/src/modules/payment/`
- [x] 2.2 Definir el resultado del cobro como un valor de retorno —aprobado o rechazado con motivo— y no como una excepción
- [x] 2.3 Implementar `FakePaymentProvider` con una tasa de rechazo cercana al 10%
- [x] 2.4 Inyectar la fuente de azar en lugar de llamar directamente al generador, para que las pruebas puedan fijar el resultado
- [x] 2.5 Devolver una referencia de cobro en las aprobaciones, para que la orden pagada la guarde
- [x] 2.6 Registrar el proveedor contra el token en el módulo de pago y exportarlo

## 3. Registro de órdenes (TK-010)

- [x] 3.1 Crear el módulo `orders` como hermano de `products`, según el skill `be-architecture`
- [x] 3.2 Definir el DTO de creación: líneas con producto y cantidad entera positiva, más la clave de idempotencia; sin importes
- [x] 3.3 Implementar la creación dentro de una única transacción
- [x] 3.4 Bloquear las filas de producto con `SELECT ... FOR UPDATE` ordenadas por `id`, para que dos órdenes con los mismos productos en orden inverso no se interbloqueen
- [x] 3.5 Validar el stock de cada línea y abortar la transacción completa si alguna no alcanza
- [x] 3.6 Calcular el total en el servidor desde el precio leído, sumando en centavos enteros, e ignorar cualquier importe recibido
- [x] 3.7 Guardar `unit_price_snapshot` por línea con el precio vigente en la compra
- [x] 3.8 Cobrar a través del proveedor dentro de la misma transacción y revertir todo si rechaza
- [x] 3.9 Descontar el stock y marcar la orden como pagada solo tras la aprobación
- [x] 3.10 Resolver la idempotencia insertando y capturando la violación de unicidad, devolviendo la orden existente en lugar de crear otra

## 4. Contrato HTTP

- [x] 4.1 Exponer `POST /orders` como público con `@Public()`, según la frontera de `initial.md` §10.2
- [x] 4.2 Responder `409` cuando falte stock, nombrando el producto y las unidades restantes
- [x] 4.3 Responder `402` cuando el cobro sea rechazado, distinguible del conflicto de stock
- [x] 4.4 Responder `404` para un producto inexistente y `400` para una cantidad inválida
- [x] 4.5 Responder `200` en lugar de `201` cuando la clave de idempotencia ya existía
- [x] 4.6 Exponer `GET /orders` y `GET /orders/:id` protegidos por JWT, con paginación coherente con la del listado de productos
- [x] 4.7 Documentar los endpoints en Swagger con ejemplos, incluidos los casos de error

## 5. Tests del backend

- [x] 5.1 Compra exitosa: la orden queda pagada, el stock baja y el total lo calcula el servidor
- [x] 5.2 Stock insuficiente: responde `409`, no crea orden y no toca el stock
- [x] 5.3 Cobro rechazado: revierte la orden y el descuento de stock, con el proveedor forzado a rechazar
- [x] 5.4 Idempotencia: dos envíos con la misma clave producen una sola orden y un solo descuento
- [x] 5.5 Concurrencia: dos compras simultáneas de la última unidad dejan una confirmada, una en conflicto y el stock en cero
- [x] 5.6 Interbloqueo: dos órdenes con los mismos dos productos en orden inverso se resuelven sin quedar bloqueadas
- [x] 5.7 Precisión: un total con importes propensos a error de redondeo binario resulta exacto al céntimo
- [x] 5.8 Precio congelado: cambiar el precio del producto no altera una orden ya registrada
- [x] 5.9 Cantidad inválida y producto inexistente se rechazan antes de tocar el catálogo
- [x] 5.10 La lectura de órdenes sin sesión se deniega y con sesión funciona

## 6. Frontend

- [x] 6.1 Definir el contrato en `web/src/types/order.ts`
- [x] 6.2 Crear `web/src/actions/order.ts` con las funciones de axios y sus mappers
- [x] 6.3 Crear los hooks de React Query en `web/src/sections/order/hooks/` con sus query keys
- [x] 6.4 Generar la clave de idempotencia al **entrar** al checkout, no al pulsar confirmar
- [x] 6.5 Conectar la confirmación del checkout al `POST /orders`, sustituyendo el estado en memoria
- [x] 6.6 Mostrar el conflicto de stock indicando qué línea lo provocó y cuántas unidades quedan
- [x] 6.7 Mostrar el pago rechazado como resultado reintentable, distinto de un fallo de red
- [x] 6.8 Impedir el doble envío mientras la confirmación está en vuelo
- [x] 6.9 Mostrar la orden confirmada con sus líneas, precios y total tras la compra
- [x] 6.10 Invalidar las queries de producto tras una compra, para que el stock mostrado quede al día

## 7. Tests del frontend

- [x] 7.1 Los mappers del pedido traducen el contrato del API al del cliente
- [x] 7.2 La clave de idempotencia se mantiene estable durante todo el checkout
- [x] 7.3 El conflicto de stock y el pago rechazado producen mensajes distintos

## 8. Documentación y verificación

- [x] 8.1 Añadir la sección «Purchase flow» al README con las decisiones de concurrencia, idempotencia y precio congelado
- [x] 8.2 Dejar escrito que el rechazo del ~10% es intencional y cómo se reintenta
- [x] 8.3 Ejecutar lint, typecheck y tests de `api/` y de `web/`
- [x] 8.4 Levantar el stack con Docker y completar una compra de punta a punta desde la UI
- [x] 8.5 Añadir un caso de prueba manual en `docs/testing/` para el flujo de compra
