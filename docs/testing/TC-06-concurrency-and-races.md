# TC-06 · Concurrencia, bloqueos y condiciones de carrera

| | |
|---|---|
| **Estado** | ⬜ **Por ejecutar** |
| **Fecha** | — |
| **Tickets** | TK-010, TK-022 |
| **Procesos** | [P-04](../processes/P-04-order-placement.md), [P-05](../processes/P-05-payment-processing.md) |

## Objetivo

[TC-05](TC-05-purchase-flow.md) recorre la compra como la vive un cliente. Este caso ataca la misma
compra **desde varios lados a la vez**, que es donde un e-commerce se rompe de verdad: dos personas
peleando por la última unidad, un doble clic que llega dos veces, dos pedidos que se bloquean
mutuamente, un cobro que declina a mitad de la transacción.

Nada de lo que se comprueba aquí es visible con una sola petición secuencial. Por eso vive en su
propio caso.

## El diseño que se está probando

```
   POST /orders  (PUBLICO, sin sesion)
        |
        v
   findByIdempotencyKey(key) ---- existe ----> replay
        |                                       |
        | no existe                    PAID   -> 200  (la misma orden, sin cobrar otra vez)
        v                              FAILED -> 402  (vuelve a declinar, sin cobrar otra vez)
   +==========================================================+
   |  UNA SOLA TRANSACCION                                    |
   |                                                          |
   |  1. SELECT id, sku, name, price, stock                   |
   |       FROM products WHERE id = ANY($1) ORDER BY id       |
   |       FOR UPDATE                     <-- el candado      |
   |                                                          |
   |  2. assertStockAvailable()           --> 409 y ROLLBACK  |
   |  3. INSERT orders (PENDING) + order_items                |
   |  4. paymentProvider.charge()                             |
   |       declined (~10%)                --> 402 y ROLLBACK  |
   |  5. UPDATE products SET stock = stock - qty              |
   |  6. UPDATE orders SET status = PAID                      |
   +==========================================================+
        |                                    |
     COMMIT                               ROLLBACK
        |                                    |
   invalidateCache()               recordDeclinedAttempt()
   (si Redis falla: solo warn)     (transaccion aparte, stock intacto)
        |                                    |
       201                                  402
```

Cuatro decisiones concretas del código se validan abajo:

| Decisión | Por qué existe | Caso |
|---|---|---|
| `FOR UPDATE` sobre las filas de producto | Serializa a los compradores del mismo producto | R1, R2, R3 |
| `ORDER BY "id"` dentro de ese `SELECT` | Evita el interbloqueo entre pedidos multilínea | R5 |
| Índice único en `idempotency_key` | Decide el ganador cuando el `SELECT` previo no alcanza | R4 |
| `mergeQuantitiesByProduct()` | Un producto repetido en el payload es **una** validación, no dos | R6 |

---

## Precondiciones

Levanta el stack y deja la base limpia:

```bash
docker compose up -d --build
```

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` y `orders` van primero a propósito: una línea de pedido referencia al producto con
> `RESTRICT`, así que truncar `products` a solas es rechazado. Esa negativa es en sí misma el
> comportamiento correcto — ver **R8**.

Luego importa `docs/csv/LoanPro Code Challenge E-Commerce.csv` desde **Product → Import CSV** para
tener 85 productos.

### El helper que usan todos los casos

**El payload de `POST /orders` cambió: los ejemplos antiguos ya no sirven.** Hoy el DTO exige que
`idempotencyKey` sea un **UUID** y que venga una `shippingAddress` completa. Una clave como
`race-buyer-a` devuelve `400`, no `409` — eso sería la validación haciendo su trabajo, no la
carrera fallando.

Pega esto una sola vez en tu terminal:

```bash
API=http://localhost:4000/api/v1
DB="docker exec ecommerce-db psql -U postgres -d ecommerce"

pid() { $DB -t -A -c "SELECT id FROM products WHERE sku = '$1';"; }
setstock() { $DB -c "UPDATE products SET stock = $2 WHERE sku = '$1';"; }
uuid() { uuidgen | tr 'A-Z' 'a-z'; }

order() {
  printf '{"items":[{"productId":"%s","quantity":%s}],"idempotencyKey":"%s","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$1" "${2:-1}" "${3:-$(uuid)}"
}

buy() { curl -s -o "/tmp/$1.json" -w "$1: %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$2"; }
```

> Si tu shell no trae `uuidgen`, sustituye esa función por
> `uuid() { python -c "import uuid;print(uuid.uuid4())"; }`.

Y esta consulta, que vas a repetir mucho:

```bash
estado() { $DB -c "SELECT o.status, o.total_amount, o.decline_reason, i.sku, i.quantity FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.\"createdAt\" DESC LIMIT 10;"; }
```

---

## R1 · Dos compradores, una sola unidad

**El caso por el que existe todo el diseño de bloqueo.**

### Pasos

```bash
setstock RS-050 1
ID=$(pid RS-050)
buy A "$(order "$ID" 1)" & buy B "$(order "$ID" 1)" & wait
```

### Resultado esperado

```
  A: 201        (o al reves — cual gana es indiferente)
  B: 409
```

- [ ] Exactamente **un `201` y un `409`**. Nunca dos `201`.
- [ ] El cuerpo del `409` nombra el SKU y reporta `available: 0` (`cat /tmp/B.json`):

```json
{ "statusCode": 409, "error": "INSUFFICIENT_STOCK",
  "message": "Not enough stock for RS-050: 1 requested, 0 left",
  "sku": "RS-050", "requested": 1, "available": 0 }
```

- [ ] El stock final es **0**, jamás `-1`:

```bash
$DB -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

- [ ] Existe **una sola** orden `PAID`, con una sola línea.

> Si ambas hubieran devuelto `201`, el catálogo habría vendido una unidad que no tenía. Perder el
> sorteo con un `409` es correcto; dos `201` es un pasivo contable.

---

## R2 · Diez compradores, diez unidades

Que el candado funcione no puede significar que sobre-rechace. Si hay stock para todos, todos pasan.

### Pasos

```bash
setstock RS-050 10
ID=$(pid RS-050)
for i in $(seq 1 10); do buy "n$i" "$(order "$ID" 1)" & done; wait
```

### Resultado esperado

- [ ] **Cero `409`**. El `FOR UPDATE` serializa, no descarta.
- [ ] Es esperable ver **uno o dos `402`**: el pagador falso declina ~1 de cada 10. Eso también es
      correcto. Lo que debe cuadrar siempre es la suma:

```
  stock_final + ordenes_PAID = 10        <-- siempre
  las ordenes FAILED no mueven stock     <-- nunca
```

- [ ] **Ninguna orden queda en `PENDING`.** Esta es la comprobación silenciosa más valiosa del caso:

```bash
$DB -c "SELECT count(*) AS pendientes FROM orders WHERE status = 'PENDING';"
```

```
  pendientes
 ------------
           0
```

> `PENDING` solo existe *dentro* de la transacción: se inserta y se promueve a `PAID` antes del
> commit, y si el cobro declina el rollback se la lleva. Una fila `PENDING` sobreviviente
> significaría una transacción muerta a medias, que es justo lo que este diseño impide.

---

## R3 · Diez compradores, tres unidades

El reparto bajo escasez.

### Pasos

```bash
setstock RS-050 3
ID=$(pid RS-050)
for i in $(seq 1 10); do buy "s$i" "$(order "$ID" 1)" & done; wait
```

### Resultado esperado

- [ ] **Como máximo tres `201`**; el resto `409` (menos los `402` que caigan por azar).
- [ ] Stock final ≥ 0, y siempre igual a `3 - (número de 201)`.
- [ ] **Ningún `500`.** Un `500` aquí sería un interbloqueo o un timeout escapándose sin traducir.

Cuenta los desenlaces de un vistazo:

```bash
grep -ho '"statusCode":[0-9]*' /tmp/s*.json | sort | uniq -c
```

---

## R4 · La misma clave de idempotencia, en paralelo

Enviarla dos veces **en serie** es fácil: el `SELECT` previo encuentra la orden. Enviarla dos veces
**a la vez** es otra cosa: los dos `SELECT` fallan y ambas transacciones intentan insertar. Quien
decide entonces es el índice único, no el código.

### Pasos

```bash
setstock RS-050 20
ID=$(pid RS-050)
KEY=$(uuid)
buy K1 "$(order "$ID" 2 "$KEY")" & buy K2 "$(order "$ID" 2 "$KEY")" & wait
```

### Resultado esperado

- [ ] Un `201` y un `200`. **El `200` no es un error**: es la orden que ya existía, devuelta tal cual.
- [ ] Nunca dos `201`, y nunca un `500` por violación de unicidad sin traducir.
- [ ] Existe **una sola** fila para esa clave:

```bash
$DB -c "SELECT count(*) FROM orders WHERE idempotency_key = '$KEY';"
```

- [ ] El stock bajó **2**, no 4.
- [ ] Los dos cuerpos traen **el mismo `id` de orden**:

```bash
grep -o '"id":"[^"]*"' /tmp/K1.json /tmp/K2.json | head -2
```

### La versión en serie, como contraste

```bash
KEY2=$(uuid)
buy S1 "$(order "$ID" 2 "$KEY2")"
buy S2 "$(order "$ID" 2 "$KEY2")"
```

- [ ] `201` y luego `200`, la misma orden. Llega por el camino del `SELECT` en vez de por el índice
      único, pero el resultado observable es idéntico — que es exactamente lo que se busca.

---

## R5 · Dos pedidos multilínea en orden inverso

El interbloqueo clásico: A toma el candado de P1 y pide P2; B toma el de P2 y pide P1. Sin un orden
común, ambos esperan para siempre y Postgres mata a uno con un error de deadlock.

### Pasos

```bash
setstock RS-050 50
setstock WM-042 50
P1=$(pid RS-050); P2=$(pid WM-042)

dos() {
  printf '{"items":[{"productId":"%s","quantity":1},{"productId":"%s","quantity":1}],"idempotencyKey":"%s","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$1" "$2" "$(uuid)"
}

for i in $(seq 1 8); do
  buy "ab$i" "$(dos "$P1" "$P2")" &
  buy "ba$i" "$(dos "$P2" "$P1")" &
done; wait
```

> Si `WM-042` no está en tu catálogo, usa cualquier otro SKU con stock.

### Resultado esperado

- [ ] **Ningún `500`.** Un deadlock de Postgres (`40P01`) llegaría como error interno.
- [ ] Todas resuelven, con `201` o con `402` si el pagador declinó.
- [ ] Cero deadlocks registrados por el motor:

```bash
$DB -c "SELECT deadlocks FROM pg_stat_database WHERE datname = 'ecommerce';"
```

```
  deadlocks
 -----------
          0
```

- [ ] Ni una traza en el log de la API:

```bash
docker logs ecommerce-api 2>&1 | grep -i deadlock | tail
```

> El `ORDER BY "id"` en el `SELECT ... FOR UPDATE` es toda la defensa. Las dos transacciones piden
> las mismas filas en la misma secuencia, así que una espera a la otra en vez de cruzarse con ella.

---

## R6 · El mismo producto dos veces en un payload

Si cada línea se validara por separado, dos líneas de 3 unidades pasarían el chequeo contra un stock
de 5, y el descuento dejaría el stock en `-1`.

### Pasos

```bash
setstock RS-050 5
ID=$(pid RS-050)

curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' \
 -d "$(printf '{"items":[{"productId":"%s","quantity":3},{"productId":"%s","quantity":3}],"idempotencyKey":"%s","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$ID" "$ID" "$(uuid)")"
```

### Resultado esperado

- [ ] **`409`**, con `requested: 6` y `available: 5`. Las cantidades se suman **antes** de validar.
- [ ] Stock intacto en **5**.
- [ ] Repitiendo con `2` y `2` (total 4 ≤ 5) devuelve `201`, y la orden tiene **una sola línea** de
      cantidad **4**, no dos líneas de 2:

```bash
$DB -c "SELECT o.id, count(i.*) AS lineas, sum(i.quantity) AS unidades FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY o.id ORDER BY 1 DESC LIMIT 1;"
```

---

## R7 · Reintentar una clave que ya declinó

Una clave tiene **un solo desenlace**. Si su cobro declinó, reproducirla vuelve a declinar; no se
cobra por segunda vez. Reintentar de verdad significa **una clave nueva**.

### Pasos

El pagador falso rechaza ~1 de cada 10, así que dispara en bucle guardando las claves:

```bash
setstock RS-050 60
ID=$(pid RS-050)

for i in $(seq 1 25); do
  K=$(uuid)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/orders" \
    -H 'Content-Type: application/json' -d "$(order "$ID" 1 "$K")")
  echo "$CODE $K"
done | tee /tmp/tanda.txt
```

Toma la clave de la primera línea `402` y reprodúcela:

```bash
KFAIL=$(grep '^402' /tmp/tanda.txt | head -1 | cut -d' ' -f2)
buy REPLAY "$(order "$ID" 1 "$KFAIL")"
```

### Resultado esperado

- [ ] La reproducción devuelve **`402` otra vez**, nunca `201` ni `200`:

```json
{ "statusCode": 402, "error": "PAYMENT_DECLINED",
  "message": "Payment was declined: card declined by the issuer" }
```

- [ ] Sigue existiendo **una sola** orden para esa clave, en `FAILED`, con su `decline_reason` y
      **sin movimiento de stock**.
- [ ] En toda la tanda se cumple:

```
  stock_inicial - stock_final  ==  numero de 201       <-- los 402 no restan
```

```bash
$DB -c "SELECT status, count(*) FROM orders GROUP BY status;"
$DB -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

- [ ] La proporción ronda **1 de cada 10**. Con 25 intentos, entre 1 y 5 declives es normal; cero en
      tres tandas seguidas sí merece una mirada.

> La orden `FAILED` se escribe en una **transacción aparte**, porque la que llevaba la orden fue
> revertida y se habría llevado la evidencia con ella. Que exista el rastro sin que exista el
> movimiento de stock es la propiedad que se comprueba aquí.

---

## R8 · Borrar un producto mientras se está vendiendo

### Pasos

```bash
TOKEN=$(curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s -o /dev/null -w "DELETE: %{http_code}\n" -X DELETE "$API/products/$(pid RS-050)" \
  -H "Authorization: Bearer $TOKEN"
```

### Resultado esperado

- [ ] **`409 RESOURCE_IN_USE`** — no `500`, no `204`.
- [ ] El producto sigue en el catálogo y la línea de pedido intacta.
- [ ] Desde la UI (**Product → Product catalog → borrar**) el mensaje es el mismo conflicto, no una
      pantalla de error.

> La clave foránea es `RESTRICT` a propósito: un pedido es un registro histórico. Cascar el borrado
> reescribiría el pasado para ordenar el presente.

---

## R9 · Redis caído no cancela una venta

El caché del catálogo se invalida **después** del commit, y si esa invalidación falla se registra un
warning y nada más. Una venta ya cobrada no puede deshacerse porque Redis no responda.

### Pasos

```bash
setstock RS-050 5
docker stop ecommerce-redis
buy SINREDIS "$(order "$(pid RS-050)" 1)"
docker start ecommerce-redis
```

### Resultado esperado

- [ ] La compra devuelve **`201`** igualmente.
- [ ] El stock bajó a 4.
- [ ] En el log aparece el warning, no un error:

```bash
docker logs ecommerce-api 2>&1 | grep -i "catalog cache" | tail -3
```

```
  stock changed but the catalog cache was not cleared: ...
```

- [ ] Con Redis de vuelta, el listado del catálogo muestra el stock correcto. El TTL del caché es de
      **300 s**, así que en el peor caso una lista servida desde caché puede quedar hasta cinco
      minutos desactualizada. Es deliberado: el stock que manda es el que lee la transacción con
      `FOR UPDATE`, nunca el que muestra la lista.

---

## R10 · Doble clic en la interfaz

La versión de **R4** que vive donde el usuario la encuentra.

### Pasos

1. Abre la tienda en `/`, agrega un producto y ve a **Cart → Billing → Payment**.
2. Pulsa **Complete order** y, sin esperar, vuelve a pulsarlo.

### Resultado esperado

- [ ] El botón queda **deshabilitado** mientras la petición está en vuelo.
- [ ] Se crea **una sola** orden: la clave se acuña al abrir el checkout, no al pulsar, así que
      ambos clics llevan la misma.
- [ ] El stock baja una sola vez.
- [ ] Recargar la pantalla de confirmación no genera otro pedido.

---

## Resultado

| # | Caso | Resultado |
|---|---|---|
| R1 | Dos compradores, una unidad | |
| R2 | Diez compradores, diez unidades · sin `PENDING` residual | |
| R3 | Diez compradores, tres unidades | |
| R4 | Misma clave en paralelo | |
| R5 | Multilínea en orden inverso · sin deadlocks | |
| R6 | Producto repetido en un payload | |
| R7 | Reintento de una clave declinada | |
| R8 | Borrar un producto vendido | |
| R9 | Redis caído no cancela la venta | |
| R10 | Doble clic en la interfaz | |

**Notas:**
