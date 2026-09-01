# TC-05 · Flujo de compra: stock, idempotencia y el pago falso

| | |
|---|---|
| **Estado** | ⬜ **Por ejecutar** |
| **Fecha** | — |
| **Tickets** | TK-010, TK-022 |
| **Archivo** | `LoanPro Code Challenge E-Commerce.csv` (sin modificar, 97 filas de datos) |

## Objetivo

Verificar la única parte del challenge donde coinciden dinero, estado y concurrencia. TC-01 a TC-04
cubren el catálogo y su importación; este cubre qué pasa cuando alguien compra de verdad.

Los checks están ordenados para que cada uno se apoye en el estado del anterior.

> **Concurrencia en serio:** este caso comprueba la carrera básica (check 4) y la idempotencia
> (check 5). Los escenarios duros — diez compradores a la vez, interbloqueos entre pedidos
> multilínea, reintento de una clave declinada, caída de Redis — viven en
> [TC-06](TC-06-concurrency-and-races.md).

## Precondiciones

Catálogo vacío y luego importa el archivo de muestra en **Product → Import CSV**, para tener 85
productos:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` y `orders` van primero: una línea de pedido referencia al producto con `RESTRICT`,
> así que truncar `products` a solas es rechazado. Esa negativa es en sí misma el comportamiento
> correcto.

### El contrato de `POST /orders`

Los tres campos son **obligatorios**, y dos de ellos suelen sorprender:

| Campo | Regla | Si te la saltas |
|---|---|---|
| `items[].productId` | UUID de un producto existente | `400` o `404` |
| `items[].quantity` | entero ≥ 1 | `400` |
| `idempotencyKey` | **UUID**, acuñado al abrir el checkout | `400` — una clave como `pedido-42` es adivinable, y reproducirla devuelve la dirección de envío ajena |
| `paymentMethod` | `card` o `paypal`. El efectivo no es un método: la orden se cobraría por el proveedor simulado y quedaría como pagada, afirmando un dinero que nadie entregó | `400` |
| `shippingAddress` | objeto con los **ocho** campos (los siete de la dirección más `email`), sin HTML | `400` |
| `shippingAddress.email` | correo válido: es el único contacto escrito que queda de la compra | `400` — un correo mal formado se rechaza igual que uno ausente |

Un `price` o un `total` en el cuerpo **no son parte del contrato** y la validación los rechaza — ver
check 3.

Helpers para toda la sesión:

```bash
API=http://localhost:4000/api/v1
DB="docker exec ecommerce-db psql -U postgres -d ecommerce"

uuid() { uuidgen | tr 'A-Z' 'a-z'; }
pid() { $DB -t -A -c "SELECT id FROM products WHERE sku = '$1';"; }

order() {
  printf '{"items":[{"productId":"%s","quantity":%s}],"idempotencyKey":"%s","paymentMethod":"card","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","email":"ada@example.com","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$1" "${2:-1}" "${3:-$(uuid)}"
}
```

---

## 1 · Una compra se completa

### Pasos

1. Abre la tienda en `/` y agrega un producto al carrito.
2. Recorre **Cart → Billing → Payment** y pulsa **Complete order**.
3. Anota el stock del producto antes y después.

### Resultado esperado

- [ ] La pantalla de confirmación muestra el **id del pedido**, sus **líneas con SKU y cantidad**, y
      el **total**.
- [ ] El stock del producto comprado bajó exactamente la cantidad comprada.
- [ ] El total equivale a la suma de los precios del catálogo — no a algo que el navegador pudiera
      haber fijado.

Compruébalo contra la base:

```bash
$DB -c "SELECT o.id, o.status, o.total_amount, i.sku, i.quantity, i.unit_price_snapshot FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.\"createdAt\" DESC LIMIT 5;"
```

- [ ] El pedido está en `PAID` y cada línea lleva su `unit_price_snapshot`.
- [ ] El pedido guarda la dirección de envío en sus columnas `ship_*`.

---

## 2 · El precio queda congelado en el momento de la compra

### Pasos

1. Tras comprar un producto, edítalo en **Product → Product catalog** y cámbiale el precio.
2. Vuelve a ejecutar la consulta anterior.

### Resultado esperado

- [ ] El `unit_price_snapshot` de la línea existente **no cambió**.
- [ ] El `total_amount` de ese pedido tampoco.

> Una transacción pasada que muta cuando cambia el precio de hoy es toda una familia de errores
> contables.

---

## 3 · El servidor decide el importe

El navegador nunca fija un precio, y esto lo demuestra.

```bash
ID=$(pid RS-050)

curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' \
 -d "$(printf '{"items":[{"productId":"%s","quantity":1,"price":"0.01"}],"total":"0.01","idempotencyKey":"%s","paymentMethod":"card","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","email":"ada@example.com","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$ID" "$(uuid)")"
```

### Resultado esperado

- [ ] **`400`**: `price` y `total` no forman parte del contrato y el pipe de validación prohíbe los
      campos desconocidos.
- [ ] Quitando esos dos campos, la petición funciona y cobra el **precio del catálogo**, no `0.01`:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$(order "$ID" 1)"
```

---

## 4 · Dos compradores, una unidad

Este es el check por el que existe todo el diseño de bloqueo.

### Pasos

```bash
$DB -c "UPDATE products SET stock = 1 WHERE sku = 'RS-050';"
ID=$(pid RS-050)

curl -s -o /tmp/a.json -w "A: %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$(order "$ID" 1)" &
curl -s -o /tmp/b.json -w "B: %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$(order "$ID" 1)" &
wait
```

> Las claves son **UUID**: el DTO rechaza cualquier otra cosa con un `400`, lo que sería la
> validación haciendo su trabajo, no la carrera fallando.

### Resultado esperado

- [ ] Una petición devuelve **`201`** y la otra **`409`** — nunca dos `201`.
- [ ] El cuerpo del `409` nombra el SKU y reporta `available: 0`.
- [ ] El stock final es **0**, jamás `-1`:

```bash
$DB -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

> Si ambas hubieran tenido éxito, el catálogo habría vendido una unidad que no tenía. Eso es lo que
> este diseño impide.

Para el reparto con diez compradores, tres unidades y pedidos multilínea, ver
[TC-06](TC-06-concurrency-and-races.md).

---

## 5 · La misma clave compra una sola vez

### Pasos

```bash
ID=$($DB -t -A -c "SELECT id FROM products WHERE stock > 5 LIMIT 1;")
KEY=$(uuid)

for i in 1 2; do
  curl -s -o /dev/null -w "intento $i: %{http_code}\n" -X POST "$API/orders" \
    -H 'Content-Type: application/json' -d "$(order "$ID" 2 "$KEY")"
done
```

### Resultado esperado

- [ ] El primero devuelve **`201`**, el segundo **`200`** — la orden existente, no una nueva.
- [ ] Existe **una sola** orden para esa clave.
- [ ] El stock bajó **2**, no 4.

### En la interfaz

- [ ] Hacer doble clic en **Complete order** produce un único pedido: el botón se deshabilita
      mientras la petición está en vuelo, y la clave se acuñó al abrir el checkout, no al pulsar.

---

## 6 · Un pago rechazado no deja rastro en el catálogo

El proveedor falso rechaza a propósito **1 de cada 10** cobros, así que se alcanza comprando
repetidamente.

### Pasos

1. Anota el stock de un producto.
2. Cómpralo repetidamente hasta que un pago sea rechazado (normalmente en menos de diez intentos).
3. Vuelve a mirar el stock.

### Resultado esperado

- [ ] La UI muestra **"Payment declined"** — visiblemente distinto del aviso de stock — y dice que
      el carrito está intacto y que reintentar es válido.
- [ ] El stock está **exactamente igual** que antes del intento rechazado.
- [ ] No existe ningún pedido `PAID` para ese intento.
- [ ] **Sí** queda registrado un pedido `FAILED`, con su motivo y sin movimiento de stock:

```bash
$DB -c "SELECT status, total_amount, decline_reason FROM orders WHERE status = 'FAILED' ORDER BY \"createdAt\" DESC LIMIT 3;"
```

- [ ] Reintentar desde la UI funciona — el reintento es un **intento nuevo con una clave nueva**.
      Reproducir la clave rechazada vuelve a dar `402`, ver [TC-06 · R7](TC-06-concurrency-and-races.md).

> El rechazo es intencional. Si nunca ocurriera, el rollback solo sería observable en los tests.

---

## 7 · Stock insuficiente, dicho de forma útil

### Pasos

1. Fija el stock de un producto en 2 y agrega 5 unidades al carrito.
2. Intenta completar el pedido.

### Resultado esperado

- [ ] El mensaje nombra el **SKU**, cuántas se **pidieron** y cuántas **quedan**.
- [ ] Ofrece una vuelta al carrito, porque reintentar sin cambios no puede funcionar.
- [ ] Es visiblemente **distinto** del mensaje de pago rechazado.
- [ ] El stock no cambió y no se creó ningún pedido.

---

## 8 · Leer pedidos exige sesión

### Pasos

```bash
curl -s -o /dev/null -w "anonimo: %{http_code}\n" "$API/orders"
```

### Resultado esperado

- [ ] El listado anónimo devuelve **`401`**.
- [ ] Hacer un pedido de forma anónima sigue funcionando (el check 1 lo demostró) — comprar es
      público, administrar no.
- [ ] Con un token de `demo@demo.com` / `demo`, el listado devuelve los pedidos del más reciente al
      más antiguo.

### Los filtros del listado

```bash
TOKEN=$(curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s -o /dev/null -w "por SKU:        %{http_code}\n" "$API/orders?q=RS-050" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "por estado:     %{http_code}\n" "$API/orders?status=PAID" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "estado invalido:%{http_code}\n" "$API/orders?status=NOPE" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "rango al reves: %{http_code}\n" "$API/orders?dateFrom=2026-08-31&dateTo=2026-08-01" -H "Authorization: Bearer $TOKEN"
```

- [ ] `q=RS-050` encuentra pedidos por el SKU **de sus líneas**, no solo por el id.
- [ ] `status=NOPE` devuelve **`400`** nombrando los valores válidos.
- [ ] Un rango de fechas invertido devuelve **`400`**, no una lista vacía. Una lista vacía sería
      indistinguible de "no hay pedidos en ese rango".
- [ ] `dateTo` incluye el día completo: un pedido de esa tarde aparece.

---

## 9 · Un producto vendido no se puede borrar

### Pasos

Intenta borrar, desde **Product → Product catalog**, un producto que aparece en un pedido.

### Resultado esperado

- [ ] El borrado **falla** con `409 RESOURCE_IN_USE` en vez de borrar la línea del pedido.

> La clave foránea es `RESTRICT` a propósito: un pedido es un registro histórico, y cascar el
> borrado reescribiría el pasado para ordenar el catálogo.

---

## 10 · El carrito se contrasta con el catálogo antes de cobrar

El carrito vive en el navegador y guarda el precio y el stock del momento en que se agregó cada
producto. Como el importe lo decide el servidor desde el catálogo, un carrito sin revalidar muestra
un total distinto del que se cobra.

### Pasos

1. Desde la tienda, agrega **tres** productos al carrito.
2. En **Product → Product catalog**, sobre esos productos: cambia el **precio** del primero, baja el
   **stock** del segundo por debajo de la cantidad que llevas, y **renombra** el tercero.
3. Vuelve a la tienda y abre el carrito de la cabecera.
4. Avanza al checkout y llega al paso de pago.
5. Borra del catálogo un cuarto producto que también esté en el carrito, y vuelve al carrito.

### Resultado esperado

- [ ] El carrito avisa cuántos productos cambiaron desde que se agregaron.
- [ ] El primero muestra el precio anterior **tachado** junto al vigente, y el subtotal usa el vigente.
- [ ] El segundo baja su cantidad a lo que queda en stock, diciendo que se ajustó.
- [ ] El tercero muestra el nombre nuevo y una nota de con qué nombre se agregó, **sin** alarma:
      no cambia lo que se paga.
- [ ] El cuarto se marca **no disponible** y "Check out" queda deshabilitado hasta quitarlo.
- [ ] El total del paso de pago coincide con el `totalAmount` del pedido registrado.

> Renombrar y reprecio a la vez es exactamente lo que hace un import CSV: hace upsert por SKU, así
> que un archivo nuevo puede mover el catálogo entero bajo carritos ya abiertos.

---

## Resultado

| Check | Resultado |
|---|---|
| 1 · Una compra se completa | |
| 2 · Precio congelado en la compra | |
| 3 · El servidor decide el importe | |
| 4 · Dos compradores, una unidad | |
| 5 · La misma clave compra una vez | |
| 6 · Pago rechazado sin rastro en el catálogo | |
| 7 · Stock insuficiente, dicho de forma útil | |
| 8 · Leer pedidos exige sesión · filtros | |
| 9 · Un producto vendido no se borra | |
| 10 · El carrito se contrasta con el catálogo | |

**Notas:**
