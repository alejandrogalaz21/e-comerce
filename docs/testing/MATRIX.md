# Matriz de pruebas

Cada caso de uso del sistema, una fila por caso: qué demuestra, cómo ejercitarlo, qué debería
ocurrir, y dónde está ya cubierto.

Escrita para quien revisa este proyecto y quiere comprobar un comportamiento sin leer antes el
código. Elige un proceso, elige un caso, sigue los pasos.

## Cómo leerla

| Columna | Significado |
|---|---|
| **ID** | Referencia estable, p. ej. `P-04.3` |
| **Propósito** | Qué demuestra el caso. No qué hace — *por qué importa* |
| **Pasos** | Lo suficiente para reproducirlo, por UI o `curl` |
| **Esperado** | El único resultado observable que decide si pasa o falla |
| **Cubierto por** | El test automático que lo protege, o `manual` |

`✅` caso con cobertura automática · `🔶` verificado a mano, sin guarda automática.

**Antes de empezar:**

```bash
docker compose up -d --build          # app en :3000, API en :4000
```

Inicia sesión con `demo@demo.com` / `demo`. Reinicia el catálogo entre ejecuciones con:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce \
  -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` y `orders` van primero a propósito: una línea de pedido referencia al producto con
> `RESTRICT`, así que truncar `products` a solas es rechazado. Esa negativa es en sí misma el
> comportamiento correcto — ver `P-02.8`.

---

## P-01 · Importación CSV

Proceso completo: [P-01](../processes/P-01-csv-import.md) · Ejecuciones manuales: [TC-01](TC-01-initial-import.md), [TC-02](TC-02-upsert-existing-product.md), [TC-03](TC-03-unchanged-does-not-write.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-01.1 | Un archivo válido carga el catálogo y cada fila queda contabilizada | **Product → Import CSV**, sube `docs/csv/LoanPro Code Challenge E-Commerce.csv` | 97 totales = 85 creadas + 0 actualizadas + 0 sin cambios + 10 rechazadas + 2 omitidas. Las cubetas siempre suman | ✅ `import.integration.spec.ts` · e2e `product-import.spec.ts` |
| P-01.2 | Una fila mala nunca aborta el lote — la regla central de este proceso | La misma importación; mira el reporte | Existen 85 productos **a pesar** de las 10 filas rechazadas. Una importación parcial es el comportamiento buscado, no un fallo | ✅ `import.service.spec.ts` |
| P-01.3 | Un archivo malformado se rechaza entero, antes de guardar nada | Sube un CSV al que le faltan columnas: `printf 'name,sku\nx,y\n' > /tmp/bad.csv` | `400` listando las columnas ausentes. Catálogo intacto | ✅ `import.hardening.spec.ts` · e2e `product-import.spec.ts` |
| P-01.4 | Las columnas de más se rechazan en vez de ignorarse | Añade una columna que el esquema no define | `400` nombrando la columna inesperada. Descartar datos en silencio sería peor que rechazarlos | ✅ `import.hardening.spec.ts` |
| P-01.5 | Una segunda importación del mismo archivo no cambia nada | Importa el mismo archivo dos veces, revisa `updatedAt` | 85 sin cambios, 0 actualizadas. `Unchanged` **no escribe** | ✅ `import.service.spec.ts` · [TC-03](TC-03-unchanged-does-not-write.md) |
| P-01.6 | Una fila editada se actualiza y luego es localizable | Importa `...-T1.csv` (la línea 55 difiere), ordena por **Updated at** | 1 actualizada, 84 sin cambios. `RS-050` sube al principio | ✅ [TC-02](TC-02-upsert-existing-product.md) · e2e `product-filters.spec.ts` |
| P-01.7 | Un SKU repetido en un archivo es ambiguo, así que se rechazan todas sus apariciones | Importa la muestra; filtra el reporte por `Rejected` | Líneas 2, 11, 36, 56 y 89 rechazadas, con un mensaje que nombra las líneas implicadas | ✅ `import.integration.spec.ts` |
| P-01.8 | Una fila en blanco es ruido, no un error | La misma importación; mira `Skipped empty` | 2 omitidas, **con sus números de línea registrados** — no solo contadas | ✅ `import.service.spec.ts` |
| P-01.9 | Los símbolos de moneda y los espacios son formato, no datos | Filas con `$29.99` y `"  19.99  "` | Aceptadas como `29.99` y `19.99` | ✅ `import.service.spec.ts` |
| P-01.10 | Cada fila rechazada se puede identificar | Filtra el reporte por `Rejected` | Las líneas 2/11/36/56/89 muestran su nombre real; las 25/41 muestran una raya porque el archivo no traía ninguno. **La raya significa una sola cosa** | ✅ `import.integration.spec.ts` |
| P-01.11 | Una subida demasiado grande se rechaza | Sube un archivo de más de 5 MB | `413` | 🔶 manual |
| P-01.12 | La importación se acredita a quien la ejecutó | Importa con sesión, abre el historial | El lote muestra **Imported by** con el email del token | ✅ `import.attribution.spec.ts` · [TC-07](TC-07-login-and-permissions.md) check 10 |

---

## P-02 · CRUD de productos

Proceso completo: [P-02](../processes/P-02-product-crud.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-02.1 | Un producto se puede crear desde la UI | **Product → New product**, rellena y guarda | La fila aparece en el listado | ✅ e2e `products-crud.spec.ts` |
| P-02.2 | Los campos obligatorios se exigen antes de que salga ninguna petición | Envía el formulario vacío | Errores en línea, sin navegación, **sin petición enviada** | ✅ e2e `products-crud.spec.ts` |
| P-02.3 | Un producto se puede renombrar y el cambio persiste | Edita desde el menú de acciones de la fila | Nombre nuevo en el listado tras guardar | ✅ e2e `products-crud.spec.ts` |
| P-02.4 | El borrado se confirma, no es accidental | Borra vía el diálogo de confirmación | La fila desaparece tras confirmar | ✅ e2e `products-crud.spec.ts` |
| P-02.5 | El HTML se **rechaza**, no se limpia — limpiarlo esconde la intención | Crea con nombre `<script>alert(1)</script>` | `400 VALIDATION_ERROR`, "HTML markup is not allowed". La misma regla que aplica la importación por fila | ✅ `create-product.dto.spec.ts` · e2e `product-csv-cases.spec.ts` |
| P-02.6 | Una carga de inyección SQL es dato, nunca código | Crea con el sku de la línea 29 del CSV | Rechazado en línea; la tabla sobrevive | ✅ e2e `product-csv-cases.spec.ts` |
| P-02.7 | La unicidad del SKU la garantiza la base de datos, no una comprobación previa | `POST /products` dos veces con el mismo sku | `201` y luego `409 DUPLICATE_RESOURCE` | ✅ `products.service.spec.ts` · e2e `product-csv-cases.spec.ts` |
| P-02.8 | Un pedido es un registro histórico: un producto vendido no se puede borrar | Compra un producto y luego intenta borrarlo | `409 RESOURCE_IN_USE`. La clave foránea `RESTRICT` se niega | ✅ `orders.concurrency.spec.ts` *(base de datos real)* · [TC-06 · R8](TC-06-concurrency-and-races.md) |
| P-02.9 | Los campos desconocidos se rechazan, que es lo que impide que un cliente dicte un precio | `POST /products` con `{"nope": true}` | `400` | ✅ `create-product.dto.spec.ts` |
| P-02.10 | Escribir exige sesión; leer no | `POST /products` sin token | `401`. `GET /products` sigue dando `200` | ✅ `route-protection.spec.ts` · e2e `auth-session.spec.ts` |
| P-02.11 | Un producto gratis es válido — precio 0 es dato, no error | Crea con precio `0` (línea 47 del CSV) | Creado y listado | ✅ e2e `product-csv-cases.spec.ts` |

---

## P-03 · Búsqueda y filtros

Proceso completo: [P-03](../processes/P-03-product-search.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-03.1 | La búsqueda alcanza todo el catálogo, no la página visible | Busca un producto que no esté en la página 1 | Se encuentra. La consulta corre en el servidor | ✅ e2e `product-search.spec.ts` |
| P-03.2 | Varios términos son una **unión** — el caso de uso es "muéstrame estos", no "filas que cumplan todos" | `?q=camping&q=speaker` | Productos que coincidan con *cualquiera* de los términos | ✅ `products.service.spec.ts` · e2e `product-filters.spec.ts` |
| P-03.3 | El orden abarca el catálogo, no la página | Ordena por precio ascendente con 85 productos y página de 20 | El producto más barato **del catálogo** va primero | ✅ e2e `product-filters.spec.ts` |
| P-03.4 | Un rango de precios imposible se detecta antes de consultar | `?minPrice=50&maxPrice=10` | `400`, sin consulta emitida | ✅ `product-filters.dto.spec.ts` · e2e `product-filters.spec.ts` |
| P-03.5 | Solo los campos de orden conocidos llegan al SQL | `?sortBy=password` | `400`. Ninguna cadena del usuario se convierte en nombre de columna | ✅ `product-filters.dto.spec.ts` |
| P-03.6 | Los comodines de `LIKE` son caracteres literales | Busca `50%` | Busca el texto `50%`, no "cualquier cosa después de 50" | ✅ `products.service.spec.ts` |
| P-03.7 | Los filtros se combinan y son reversibles | Aplica categoría + rango de precio | Ambos aplicados, cada uno como un chip que se puede quitar | ✅ e2e `product-filters.spec.ts` |
| P-03.8 | La vista sobrevive a la navegación — la URL *es* el estado | Filtra, recarga, pulsa atrás | La misma vista en ambos casos | ✅ `product-list-params.test.ts` · e2e `product-filters.spec.ts` |
| P-03.9 | La disponibilidad es un filtro, y "agotado" es un valor real | Filtra por agotados | Solo productos con stock 0 | ✅ e2e `product-filters.spec.ts` |
| P-03.10 | Sin resultados es un desenlace, no un error | Busca algo que no exista | `200` con un estado vacío explícito; limpiar restaura el listado | ✅ e2e `product-search.spec.ts` |
| P-03.11 | El layout de columnas es una preferencia por usuario y se recuerda | Redimensiona una columna, sal y vuelve | Ancho conservado | ✅ e2e `product-filters.spec.ts` |

---

## P-04 · Creación de pedidos

Proceso completo: [P-04](../processes/P-04-order-placement.md) · Ejecuciones manuales: [TC-05](TC-05-purchase-flow.md), [TC-06](TC-06-concurrency-and-races.md)

**Este es el proceso donde coinciden dinero, estado compartido y concurrencia.** Los casos 3 a 6 y
14 a 17 son los que vale la pena ejecutar despacio.

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-04.1 | Una compra se completa y mueve stock real | Agregar al carrito → checkout → **Complete order** | Confirmación con id, líneas y total. El stock baja lo comprado | ✅ `orders.concurrency.spec.ts` *(base real)* · [TC-05](TC-05-purchase-flow.md) |
| P-04.2 | El **servidor** es dueño del importe — un carrito donde el cliente fija el precio no es un sistema de pagos | `POST /orders` con `"total":"0.01"` en el cuerpo | `400`. Cualquier importe enviado se rechaza de plano | ✅ `orders.service.spec.ts` · [TC-05](TC-05-purchase-flow.md) check 3 |
| P-04.3 | **Dos compradores no pueden llevarse la misma última unidad** | Fija el stock en 1, dispara dos compras simultáneas | Un `201`, un `409`. Stock final `0`, jamás `-1` | ✅ `orders.concurrency.spec.ts` *(base real)* · [TC-06 · R1](TC-06-concurrency-and-races.md) |
| P-04.4 | Los pedidos multilínea no pueden bloquearse entre sí | Dos pedidos de los mismos dos productos, listados en orden inverso | Ambos resuelven. Las filas se bloquean ordenadas por `id` | ✅ `orders.concurrency.spec.ts` *(base real)* · [TC-06 · R5](TC-06-concurrency-and-races.md) |
| P-04.5 | Un doble clic compra una sola vez | Envía la misma petición dos veces con la misma clave de idempotencia | `201` y luego `200`. Un pedido, un movimiento de stock | ✅ `orders.service.spec.ts` · `orders.concurrency.spec.ts` |
| P-04.6 | El dinero es exacto — `0.1 + 0.2` no puede decidir un total | Compra líneas cuyos precios se rompen en coma flotante binaria | Total exacto al céntimo. Se suma en céntimos enteros | ✅ `orders.service.spec.ts` |
| P-04.7 | Una transacción pasada nunca muta | Compra un producto y luego cambia su precio de catálogo | `unit_price_snapshot` y el total del pedido intactos | ✅ `orders.concurrency.spec.ts` *(base real)* · [TC-05](TC-05-purchase-flow.md) check 2 |
| P-04.8 | El stock insuficiente se comunica de forma útil, porque reintentar sin cambios no puede funcionar | Agrega 5 de un producto con stock 2 y completa | `409` nombrando SKU, pedido y disponible, con vuelta al carrito | ✅ `orders.service.spec.ts` |
| P-04.9 | Comprar es público; administrar no | `POST /orders` sin token, luego `GET /orders` sin token | `201` y `401`. Un cliente compra sin cuenta | ✅ `orders.service.spec.ts` · `route-protection.spec.ts` |
| P-04.10 | Toda la compra es atómica | Fuerza un rechazo (ver `P-05.2`) | Sin pedido pagado, sin movimiento de stock, nada a medias | ✅ `orders.concurrency.spec.ts` *(base real)* |
| P-04.11 | El flujo de compra funciona de punta a punta en un navegador | Checkout completo por la UI | Pedido confirmado en pantalla, con líneas y total | ✅ e2e `purchase.spec.ts` |
| P-04.12 | Un doble clic no puede comprar dos veces | Pulsa **Complete order** y vuelve a pulsarlo en vuelo | El botón queda deshabilitado hasta que la petición resuelve | ✅ e2e `purchase.spec.ts` · [TC-06 · R10](TC-06-concurrency-and-races.md) |
| P-04.13 | Un visitante anónimo puede completar una compra en un navegador | Checkout completo sin sesión | Pedido confirmado | ✅ e2e `purchase.spec.ts` |
| P-04.14 | Con stock para todos, **nadie** es rechazado por el candado | 10 compradores simultáneos, stock 10 | Cero `409`. `stock_final + pedidos PAID = 10` | 🔶 [TC-06 · R2](TC-06-concurrency-and-races.md) |
| P-04.15 | Una fila `PENDING` nunca sobrevive a la transacción | Tras cualquier tanda concurrente: `SELECT count(*) FROM orders WHERE status='PENDING'` | `0`. `PENDING` solo existe dentro de la transacción | 🔶 [TC-06 · R2](TC-06-concurrency-and-races.md) |
| P-04.16 | La misma clave **en paralelo** la decide el índice único, no una lectura previa | Dispara la misma clave dos veces a la vez | Un `201`, un `200`, una sola fila. Nunca un `500` por `23505` | 🔶 [TC-06 · R4](TC-06-concurrency-and-races.md) |
| P-04.17 | El mismo producto repetido en un payload es **una** validación | Dos líneas de 3 unidades contra un stock de 5 | `409` con `requested: 6`. Con 2 y 2: `201` y **una** línea de cantidad 4 | ✅ `orders.service.spec.ts` · 🔶 [TC-06 · R6](TC-06-concurrency-and-races.md) |
| P-04.18 | La clave de idempotencia debe ser imposible de adivinar | `POST /orders` con `"idempotencyKey":"pedido-42"` | `400`. Reproducir una clave devuelve la dirección de envío, así que una clave adivinable es una fuga de datos ajenos | ✅ `create-order.dto.spec.ts` |
| P-04.19 | La dirección de envío es obligatoria y no admite HTML | Pedido sin `shippingAddress`, y luego con `<script>` en `name` | `400` en ambos. Registrar un pedido que nadie puede entregar es peor que rechazarlo | ✅ `create-order.dto.spec.ts` |
| P-04.20 | Un rango de fechas invertido se rechaza en vez de devolver vacío | `GET /orders?dateFrom=2026-08-31&dateTo=2026-08-01` | `400`. Una lista vacía sería indistinguible de "no hay pedidos en ese rango" | ✅ `orders.service.spec.ts` · [TC-05](TC-05-purchase-flow.md) check 8 |
| P-04.21 | Un pedido se busca por lo que contiene, no solo por su id | `GET /orders?q=RS-050` con token | Devuelve los pedidos cuyas **líneas** llevan ese SKU. Un pedido no tiene cliente, así que eso es lo que lo identifica | ✅ `orders.service.spec.ts` |

---

## P-05 · Procesamiento de pagos

Proceso completo: [P-05](../processes/P-05-payment-processing.md) · Ejecuciones manuales: [TC-05](TC-05-purchase-flow.md) check 6, [TC-06](TC-06-concurrency-and-races.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-05.1 | El proveedor es intercambiable — fingir un pago no puede dejar deuda técnica | Lee el constructor de `orders.service.ts` | Depende del token `PAYMENT_PROVIDER`, nunca de `FakePaymentProvider` | ✅ `fake-payment.provider.spec.ts` |
| P-05.2 | Un rechazo revierte todo | Compra repetidamente hasta que uno sea rechazado (~1 de cada 10) | `402 PAYMENT_DECLINED`. Stock exactamente como antes | ✅ `orders.concurrency.spec.ts` *(base real)* |
| P-05.3 | La tasa de rechazo es real, así que el rollback es observable usando la app | 40 compras seguidas | Alrededor de 4 rechazos. Una tanda del 2026-08-29 dio exactamente 36/4 | 🔶 manual — [TC-05](TC-05-purchase-flow.md), [TC-06 · R7](TC-06-concurrency-and-races.md) |
| P-05.4 | Los tests nunca dependen de la suerte | Inyecta una fuente aleatoria fija | El cobro aprueba o rechaza de forma determinista | ✅ `fake-payment.provider.spec.ts` |
| P-05.5 | Un intento rechazado deja rastro de auditoría | Consulta `orders` tras un rechazo | Un pedido `FAILED` con su motivo y **sin movimiento de stock** | ✅ `orders.service.spec.ts` |
| P-05.6 | Una clave, un desenlace — reproducir una clave rechazada no puede cobrar dos veces | Reintenta con la misma clave de idempotencia | Vuelve a rechazar. Reintentar significa un intento **nuevo** con clave nueva | ✅ `orders.service.spec.ts` · 🔶 [TC-06 · R7](TC-06-concurrency-and-races.md) |
| P-05.7 | Un rechazo es un desenlace legítimo, no un fallo del sistema | Lee el mensaje en la UI | "Payment declined", presentado como reintentable y visiblemente distinto de un conflicto de stock | ✅ `purchase.mapper.test.ts` · e2e `purchase.spec.ts` |
| P-05.8 | El registro del intento rechazado sobrevive al rollback que lo generó | Rechazo, luego `SELECT * FROM orders WHERE status='FAILED'` | La fila existe. Se escribe en una **transacción aparte**, porque la original fue revertida | ✅ `orders.service.spec.ts` |
| P-05.9 | Redis caído no cancela una venta ya cobrada | `docker stop ecommerce-redis`, luego compra | `201`. En el log un warning, no un error. El caché se invalida **después** del commit | 🔶 [TC-06 · R9](TC-06-concurrency-and-races.md) |

---

## P-06 · Autenticación

Proceso completo: [P-06](../processes/P-06-authentication.md) · Ejecución manual: [TC-07](TC-07-login-and-permissions.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-06.1 | Una pantalla protegida no se alcanza sin sesión | Abre `/dashboard/product` sin sesión | Redirige a login; la pantalla nunca se renderiza | ✅ e2e `auth-session.spec.ts` |
| P-06.2 | Iniciar sesión te devuelve a donde ibas | Pide una ruta protegida y luego autentícate | Aterriza en la ruta pedida originalmente | ✅ e2e `auth-session.spec.ts` |
| P-06.3 | Las credenciales incorrectas fallan de forma visible y segura | Inicia sesión con contraseña errónea | Error en línea, se queda en la pantalla de login | ✅ e2e `auth-session.spec.ts` |
| P-06.4 | Una sesión sobrevive a una recarga; el logout la termina de verdad | Inicia sesión, recarga, cierra sesión | Sesión restaurada, luego vuelta al estado no autenticado | ✅ `auth-token.test.ts` · e2e `auth-session.spec.ts` |
| P-06.5 | La tienda sigue siendo pública — cerrar el checkout resolvería un problema que no existe | Navega el catálogo y un detalle sin sesión | Se renderiza, sin redirección. `GET /products` responde `200` sin token | ✅ e2e `auth-session.spec.ts` |
| P-06.6 | El guard falla **cerrado**: un endpoint nuevo nace protegido | Llama a cualquier ruta protegida sin token | `401`. Olvidar la anotación produce un error visible, nunca un agujero silencioso | ✅ `jwt-auth.guard.spec.ts` · `route-protection.spec.ts` |
| P-06.7 | Las contraseñas nunca salen del servicio | Inicia sesión e inspecciona la respuesta | Ningún campo `password` por ningún lado | 🔶 [TC-07](TC-07-login-and-permissions.md) check 1 |
| P-06.8 | Una importación registra quién la ejecutó | Importa con sesión, abre el historial | El lote muestra **Imported by** | ✅ `import.attribution.spec.ts` · e2e `product-import-batches.spec.ts` |
| P-06.9 | El historial de importación se busca por nombre de archivo | Busca un fragmento del nombre en el historial | Lotes coincidentes, sin distinguir mayúsculas; estado vacío propio cuando no hay nada | ✅ e2e `import-batch-search.spec.ts` |
| P-06.10 | El alta de usuarios **no** es pública | `POST /auth/sign-up` sin token | `401`. Una cuenta solo otorga administración del catálogo, así que un alta abierta la regalaría | ✅ `route-protection.spec.ts` · 🔶 [TC-07](TC-07-login-and-permissions.md) check 6 |
| P-06.11 | Un token alterado o caducado se rechaza sin romper nada | Llama con la firma modificada, con `a.b.c`, y sin el prefijo `Bearer` | `401` en los tres casos. Nunca `500` | 🔶 [TC-07](TC-07-login-and-permissions.md) check 8 |
| P-06.12 | El login está limitado por tasa | 35 intentos de login seguidos | ~30 `401` y luego `429`. El techo global de 300/min no sirve para un endpoint de credenciales | ✅ `security.spec.ts` (config) · 🔶 [TC-07](TC-07-login-and-permissions.md) check 9 |
| P-06.13 | No se emite refresh token | Inspecciona la respuesta de `sign-in` | Sin `refreshToken`. El que se emitía era, de hecho, un token de acceso de siete días sin rotación ni revocación | ✅ `auth.service.spec.ts` |

---

## P-07 · Contrato de errores

Proceso completo: [P-07](../processes/P-07-error-contract.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-07.1 | Todo error responde con la misma forma, falle la capa que falle | Provoca un `404`, `400`, `401`, `409` | Los cinco campos presentes: `statusCode`, `error`, `message`, `path`, `timestamp` | ✅ `http-exception.filter.spec.ts` |
| P-07.2 | `error` es un código sobre el que ramificar, no el estado en prosa | Mira cualquier cuerpo de error | `NOT_FOUND`, nunca `"Not Found"` | ✅ `http-exception.filter.spec.ts` |
| P-07.3 | Normalizar el sobre no puede destruir el detalle | Provoca un conflicto de stock | `sku`, `requested` y `available` siguen en el primer nivel | ✅ `http-exception.filter.spec.ts` |
| P-07.4 | Varios fallos de validación se reportan juntos | Envía dos parámetros inválidos a la vez | `message` es la lista de ambos | ✅ `http-exception.filter.spec.ts` |
| P-07.5 | El mismo fallo de base de datos significa lo mismo en todas partes | Duplica un sku de producto, luego un email de usuario | Ambos `409 DUPLICATE_RESOURCE`. Antes eran `409` y `400` | ✅ `database-error.translator.spec.ts` |
| P-07.6 | Una negativa de una clave foránea es un conflicto, no un crash | Borra un producto vendido | `409 RESOURCE_IN_USE`. Esto solía ser un `500` | ✅ `orders.concurrency.spec.ts` *(base real)* |
| P-07.7 | Un fallo interno nunca filtra internos | Fuerza un error inesperado | Mensaje genérico al cliente, detalle completo solo en el log | ✅ `database-error.translator.spec.ts` |
| P-07.8 | Una petición limitada por tasa no es un error interno | Supera el límite de importación | `429 TOO_MANY_REQUESTS` | ✅ `http-exception.filter.spec.ts` |

---

## P-08 · Endurecimiento de seguridad

Proceso completo: [P-08](../processes/P-08-security-hardening.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-08.1 | CORS nombra su origen — `*` no es de grado empresarial | `curl -H "Origin: https://evil.test" .../products -D -` | Ninguna cabecera `Access-Control-Allow-Origin` | ✅ `security.spec.ts` |
| P-08.2 | El origen permitido sigue funcionando | Lo mismo con `Origin: http://localhost:3000` | La cabecera devuelve ese origen | ✅ `security.spec.ts` |
| P-08.3 | Las cabeceras de seguridad estándar están presentes | `curl -D - .../health` | HSTS, `nosniff`, `SAMEORIGIN`, `no-referrer`; sin `X-Powered-By` | 🔶 manual |
| P-08.4 | La operación más cara está medida | 7 importaciones seguidas | `201` ×5, luego `429` ×2 | ✅ `security.spec.ts` (config) · 🔶 manual (comportamiento) |
| P-08.5 | El límite no estrangula el uso normal | 12 peticiones al catálogo seguidas | Todas `200`. Un límite que rompe la app lo borra el siguiente desarrollador | ✅ `security.spec.ts` |
| P-08.6 | El XSS se rechaza en el borde, no se deja a React | Importa una fila con marcado en el nombre | Fila rechazada, con la carga reportada literalmente como motivo | ✅ `import.service.spec.ts` · e2e `product-csv-cases.spec.ts` |

---

## P-09 · Status y observabilidad

Ejecución manual: [TC-08](TC-08-status-and-degradation.md)

| ID | Propósito | Pasos | Esperado | Cubierto por |
|---|---|---|---|---|
| P-09.1 | La conexión a Redis es real, no declarada | `GET /status/redis` dos veces | `visits` **aumenta** entre llamadas. El endpoint hace `INCR`, escribe y lee un dato real | 🔶 [TC-08](TC-08-status-and-degradation.md) check 1 |
| P-09.2 | La conexión a Postgres es real y el conteo es del catálogo vivo | `GET /status/db`, importa un CSV, repite | `productCount` cambia. No es un valor cacheado | 🔶 [TC-08](TC-08-status-and-degradation.md) check 2 |
| P-09.3 | **Una dependencia caída da `200` con `ok:false`, no un `500`** | `docker stop ecommerce-redis`, luego `GET /status/redis` | `HTTP 200`, `ok:false` y un `error` que dice qué pasó | 🔶 [TC-08](TC-08-status-and-degradation.md) check 3 |
| P-09.4 | Una dependencia caída no arrastra a la otra | Con Redis parado, `GET /status/db` | Sigue en `ok:true` | 🔶 [TC-08](TC-08-status-and-degradation.md) check 3 |
| P-09.5 | `/health` es público, porque un orquestador no tiene credenciales | `GET /health` sin token | `200` con `app`, `resources` y `postgres`. `uptimeMs` crece entre llamadas | 🔶 [TC-08](TC-08-status-and-degradation.md) check 5 |
| P-09.6 | Los endpoints de status **sí** exigen sesión | `GET /status/db` y `/status/redis` sin token | `401` en ambos | ✅ `route-protection.spec.ts` |
| P-09.7 | La pantalla se refresca sola y degrada por tarjeta | Abre `/dashboard/status`, para Redis, espera | Solo esa tarjeta cambia de estado, sin recargar. Las otras siguen en verde | 🔶 [TC-08](TC-08-status-and-degradation.md) check 6 |
| P-09.8 | El sondeo de la pantalla no dispara el límite de tasa | Deja `/dashboard/status` abierta 3 minutos | Ningún `429`. Son 36 req/min por pestaña contra un techo de 300 | 🔶 [TC-08](TC-08-status-and-degradation.md) check 6 |

---

## Resumen de cobertura

| Proceso | Casos | Automatizados | Solo manual |
|---|---|---|---|
| P-01 Importación CSV | 12 | 11 | 1 |
| P-02 CRUD de productos | 11 | 11 | 0 |
| P-03 Búsqueda y filtros | 11 | 11 | 0 |
| P-04 Creación de pedidos | 21 | 18 | 3 |
| P-05 Procesamiento de pagos | 9 | 7 | 2 |
| P-06 Autenticación | 13 | 11 | 2 |
| P-07 Contrato de errores | 8 | 8 | 0 |
| P-08 Endurecimiento de seguridad | 6 | 4 | 2 |
| P-09 Status y observabilidad | 8 | 1 | 7 |
| **Total** | **99** | **82** | **17** |

## Lo que sigue siendo solo manual

Cada uno por un motivo declarado, no por omisión.

| Caso | Por qué se queda manual |
|---|---|
| P-01.11 subida sobredimensionada | Requeriría un archivo de más de 5 MB en el repositorio |
| P-04.14–P-04.17 concurrencia observable | La versión automatizada existe en `orders.concurrency.spec.ts`; lo manual es **verlo** contra el stack completo, que es lo que convence a un revisor |
| P-05.3 la tasa de ~10% de rechazo | El spec de navegador fuerza un rechazo de forma determinista; la *tasa* se afirma en `fake-payment.provider.spec.ts` sobre un barrido uniforme, y observarla en la app en marcha es la parte manual |
| P-05.9 Redis caído durante una venta | Requiere parar un contenedor a mitad de operación |
| P-06.7, P-06.11, P-06.12 | Inspección de respuesta y manipulación de tokens: rápidas a mano, frágiles automatizadas |
| P-08.3 cabeceras de seguridad | Afirmar que helmet pone sus propias cabeceras es testear la librería |
| P-08.4 comportamiento del límite de tasa | La configuración se afirma; disparar cientos de peticiones en una suite es lento y demuestra poco |
| P-09 casi entero | El módulo existe **para** ser mirado. Automatizar "la tarjeta se pone roja sola" cuesta más de lo que aporta frente a abrir la pantalla y parar un contenedor |

## Ejecutar todo

```bash
cd api && npm test              # unitarios + fixture + tests contra base real
cd api && npm run test:e2e      # a traves del stack HTTP real
cd web && npm test              # unitarios de frontend
cd web && npm run test:e2e      # Playwright, requiere el stack levantado
```

`purchase.spec.ts` está nombrado para ordenarse al final a propósito: comprar deja residuo
permanente, ya que un producto que aparece en un pedido no se puede borrar, así que los specs que
cuentan el catálogo corren primero.

Ver [STRATEGY.md](STRATEGY.md) para qué cubre cada nivel y qué se deja fuera deliberadamente.
