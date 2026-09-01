# TC-06 · Concurrency, locking and race conditions

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-010, TK-022 |
| **Processes** | [P-04](../processes/P-04-order-placement.md), [P-05](../processes/P-05-payment-processing.md) |

## Goal

[TC-05](TC-05-purchase-flow.md) walks the purchase as a customer lives it. This case attacks the
same purchase **from several sides at once**, which is where an e-commerce actually breaks: two
people fighting over the last unit, a double click arriving twice, two orders blocking each other,
a charge declining halfway through the transaction.

Nothing checked here is visible with a single sequential request. That is why it has its own case.

## The design under test

```
   POST /orders  (PUBLIC, no session)
        |
        v
   findByIdempotencyKey(key) ---- exists ----> replay
        |                                       |
        | absent                       PAID   -> 200  (the same order, not charged again)
        v                              FAILED -> 402  (declines again, not charged again)
   +==========================================================+
   |  ONE SINGLE TRANSACTION                                  |
   |                                                          |
   |  1. SELECT id, sku, name, price, stock                   |
   |       FROM products WHERE id = ANY($1) ORDER BY id       |
   |       FOR UPDATE                     <-- the lock        |
   |                                                          |
   |  2. assertStockAvailable()           --> 409 and ROLLBACK|
   |  3. INSERT orders (PENDING) + order_items                |
   |  4. paymentProvider.charge()                             |
   |       declined (~10%)                --> 402 and ROLLBACK|
   |  5. UPDATE products SET stock = stock - qty              |
   |  6. UPDATE orders SET status = PAID                      |
   +==========================================================+
        |                                    |
     COMMIT                               ROLLBACK
        |                                    |
   invalidateCache()               recordDeclinedAttempt()
   (if Redis fails: warn only)     (separate transaction, stock intact)
        |                                    |
       201                                  402
```

Four concrete decisions in the code are validated below:

| Decision | Why it exists | Case |
|---|---|---|
| `FOR UPDATE` on the product rows | Serialises buyers of the same product | R1, R2, R3 |
| `ORDER BY "id"` inside that `SELECT` | Prevents deadlock between multi-line orders | R5 |
| Unique index on `idempotency_key` | Decides the winner when the prior `SELECT` is not enough | R4 |
| `mergeQuantitiesByProduct()` | A product repeated in the payload is **one** validation, not two | R6 |

---

## Preconditions

Bring the stack up and leave the database clean:

```bash
docker compose up -d --build
```

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` and `orders` come first on purpose: an order line references its product with
> `RESTRICT`, so truncating `products` on its own is refused. That refusal is itself the correct
> behaviour — see **R8**.

Then import `docs/csv/LoanPro Code Challenge E-Commerce.csv` from **Product → Import CSV** to get
85 products.

### The helper every case uses

**The `POST /orders` payload changed: older examples no longer work.** The DTO now requires
`idempotencyKey` to be a **UUID** and a complete `shippingAddress`. A key like `race-buyer-a`
returns `400`, not `409` — that would be validation doing its job, not the race failing.

Paste this once into your terminal:

```bash
API=http://localhost:4000/api/v1
DB="docker exec ecommerce-db psql -U postgres -d ecommerce"

pid() { $DB -t -A -c "SELECT id FROM products WHERE sku = '$1';"; }
setstock() { $DB -c "UPDATE products SET stock = $2 WHERE sku = '$1';"; }
uuid() { uuidgen | tr 'A-Z' 'a-z'; }

order() {
  printf '{"items":[{"productId":"%s","quantity":%s}],"idempotencyKey":"%s","paymentMethod":"card","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","email":"ada@example.com","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$1" "${2:-1}" "${3:-$(uuid)}"
}

buy() { curl -s -o "/tmp/$1.json" -w "$1: %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$2"; }
```

> If your shell has no `uuidgen`, replace that function with
> `uuid() { python -c "import uuid;print(uuid.uuid4())"; }`.

And this query, which you will repeat often:

```bash
state() { $DB -c "SELECT o.status, o.total_amount, o.decline_reason, i.sku, i.quantity FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.\"createdAt\" DESC LIMIT 10;"; }
```

---

## R1 · Two buyers, one single unit

**The case the whole locking design exists for.**

### Steps

```bash
setstock RS-050 1
ID=$(pid RS-050)
buy A "$(order "$ID" 1)" & buy B "$(order "$ID" 1)" & wait
```

### Expected result

```
  A: 201        (or the other way round — which one wins does not matter)
  B: 409
```

- [ ] Exactly **one `201` and one `409`**. Never two `201`s.
- [ ] The `409` body names the SKU and reports `available: 0` (`cat /tmp/B.json`):

```json
{ "statusCode": 409, "error": "INSUFFICIENT_STOCK",
  "message": "Not enough stock for RS-050: 1 requested, 0 left",
  "sku": "RS-050", "requested": 1, "available": 0 }
```

- [ ] Final stock is **0**, never `-1`:

```bash
$DB -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

- [ ] There is **exactly one** `PAID` order, with a single line.

> If both had returned `201`, the catalog would have sold a unit it did not have. Losing the draw
> with a `409` is correct; two `201`s is an accounting liability.

---

## R2 · Ten buyers, ten units

A lock that works must not over-reject. If there is stock for everyone, everyone gets through.

### Steps

```bash
setstock RS-050 10
ID=$(pid RS-050)
for i in $(seq 1 10); do buy "n$i" "$(order "$ID" 1)" & done; wait
```

### Expected result

- [ ] **Zero `409`s.** `FOR UPDATE` serialises, it does not discard.
- [ ] Seeing **one or two `402`s** is expected: the fake payer declines ~1 in 10. That is correct
      too. What must always add up is:

```
  final_stock + PAID_orders = 10        <-- always
  FAILED orders move no stock           <-- never
```

- [ ] **No order is left in `PENDING`.** This is the most valuable quiet check in the case:

```bash
$DB -c "SELECT count(*) AS pending FROM orders WHERE status = 'PENDING';"
```

```
  pending
 ---------
        0
```

> `PENDING` exists only *inside* the transaction: it is inserted and promoted to `PAID` before the
> commit, and if the charge declines the rollback takes it away. A surviving `PENDING` row would
> mean a half-dead transaction, which is exactly what this design prevents.

---

## R3 · Ten buyers, three units

Rationing under scarcity.

### Steps

```bash
setstock RS-050 3
ID=$(pid RS-050)
for i in $(seq 1 10); do buy "s$i" "$(order "$ID" 1)" & done; wait
```

### Expected result

- [ ] **At most three `201`s**; the rest `409` (minus any `402`s that fall by chance).
- [ ] Final stock ≥ 0, and always equal to `3 - (number of 201s)`.
- [ ] **No `500`.** A `500` here would be a deadlock or a timeout escaping untranslated.

Count the outcomes at a glance:

```bash
grep -ho '"statusCode":[0-9]*' /tmp/s*.json | sort | uniq -c
```

---

## R4 · The same idempotency key, in parallel

Sending it twice **in sequence** is easy: the prior `SELECT` finds the order. Sending it twice **at
once** is another matter: both `SELECT`s miss and both transactions try to insert. What decides
then is the unique index, not the code.

### Steps

```bash
setstock RS-050 20
ID=$(pid RS-050)
KEY=$(uuid)
buy K1 "$(order "$ID" 2 "$KEY")" & buy K2 "$(order "$ID" 2 "$KEY")" & wait
```

### Expected result

- [ ] One `201` and one `200`. **The `200` is not an error**: it is the order that already existed,
      returned as it is.
- [ ] Never two `201`s, and never a `500` from an untranslated unique violation.
- [ ] There is **exactly one** row for that key:

```bash
$DB -c "SELECT count(*) FROM orders WHERE idempotency_key = '$KEY';"
```

- [ ] Stock dropped by **2**, not 4.
- [ ] Both bodies carry **the same order `id`**:

```bash
grep -o '"id":"[^"]*"' /tmp/K1.json /tmp/K2.json | head -2
```

### The sequential version, for contrast

```bash
KEY2=$(uuid)
buy S1 "$(order "$ID" 2 "$KEY2")"
buy S2 "$(order "$ID" 2 "$KEY2")"
```

- [ ] `201` and then `200`, the same order. It arrives via the `SELECT` path rather than the unique
      index, but the observable result is identical — which is exactly the point.

---

## R5 · Two multi-line orders in opposite order

The classic deadlock: A takes the lock on P1 and asks for P2; B takes P2 and asks for P1. Without a
common ordering, both wait forever and Postgres kills one with a deadlock error.

### Steps

```bash
setstock RS-050 50
setstock WM-042 50
P1=$(pid RS-050); P2=$(pid WM-042)

two() {
  printf '{"items":[{"productId":"%s","quantity":1},{"productId":"%s","quantity":1}],"idempotencyKey":"%s","paymentMethod":"card","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","email":"ada@example.com","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$1" "$2" "$(uuid)"
}

for i in $(seq 1 8); do
  buy "ab$i" "$(two "$P1" "$P2")" &
  buy "ba$i" "$(two "$P2" "$P1")" &
done; wait
```

> If `WM-042` is not in your catalog, use any other SKU with stock.

### Expected result

- [ ] **No `500`.** A Postgres deadlock (`40P01`) would arrive as an internal error.
- [ ] All resolve, with `201` or with `402` if the payer declined.
- [ ] Zero deadlocks recorded by the engine:

```bash
$DB -c "SELECT deadlocks FROM pg_stat_database WHERE datname = 'ecommerce';"
```

```
  deadlocks
 -----------
          0
```

- [ ] Not a single trace in the API log:

```bash
docker logs ecommerce-api 2>&1 | grep -i deadlock | tail
```

> The `ORDER BY "id"` in the `SELECT ... FOR UPDATE` is the entire defence. Both transactions ask
> for the same rows in the same sequence, so one waits for the other instead of crossing it.

---

## R6 · The same product twice in one payload

If each line were validated separately, two lines of 3 units would pass the check against a stock
of 5, and the discount would leave stock at `-1`.

### Steps

```bash
setstock RS-050 5
ID=$(pid RS-050)

curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' \
 -d "$(printf '{"items":[{"productId":"%s","quantity":3},{"productId":"%s","quantity":3}],"idempotencyKey":"%s","paymentMethod":"card","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","email":"ada@example.com","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$ID" "$ID" "$(uuid)")"
```

### Expected result

- [ ] **`409`**, with `requested: 6` and `available: 5`. Quantities are summed **before**
      validating.
- [ ] Stock untouched at **5**.
- [ ] Repeating with `2` and `2` (total 4 ≤ 5) returns `201`, and the order has **one single line**
      of quantity **4**, not two lines of 2:

```bash
$DB -c "SELECT o.id, count(i.*) AS lines, sum(i.quantity) AS units FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY o.id ORDER BY 1 DESC LIMIT 1;"
```

---

## R7 · Retrying a key that already declined

A key has **one single outcome**. If its charge declined, replaying it declines again; it is not
charged a second time. Retrying for real means **a new key**.

### Steps

The fake payer declines ~1 in 10, so fire in a loop keeping the keys:

```bash
setstock RS-050 60
ID=$(pid RS-050)

for i in $(seq 1 25); do
  K=$(uuid)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/orders" \
    -H 'Content-Type: application/json' -d "$(order "$ID" 1 "$K")")
  echo "$CODE $K"
done | tee /tmp/batch.txt
```

Take the key from the first `402` line and replay it:

```bash
KFAIL=$(grep '^402' /tmp/batch.txt | head -1 | cut -d' ' -f2)
buy REPLAY "$(order "$ID" 1 "$KFAIL")"
```

### Expected result

- [ ] The replay returns **`402` again**, never `201` or `200`:

```json
{ "statusCode": 402, "error": "PAYMENT_DECLINED",
  "message": "Payment was declined: card declined by the issuer" }
```

- [ ] There is still **exactly one** order for that key, in `FAILED`, with its `decline_reason` and
      **no stock movement**.
- [ ] Across the whole batch this holds:

```
  initial_stock - final_stock  ==  number of 201s       <-- 402s subtract nothing
```

```bash
$DB -c "SELECT status, count(*) FROM orders GROUP BY status;"
$DB -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

- [ ] The proportion is around **1 in 10**. With 25 attempts, between 1 and 5 declines is normal;
      zero across three consecutive batches does deserve a look.

> The `FAILED` order is written in a **separate transaction**, because the one holding the order
> was rolled back and would have taken the evidence with it. That the trail exists while the stock
> movement does not is the property checked here.

---

## R8 · Deleting a product while it is being sold

### Steps

```bash
TOKEN=$(curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s -o /dev/null -w "DELETE: %{http_code}\n" -X DELETE "$API/products/$(pid RS-050)" \
  -H "Authorization: Bearer $TOKEN"
```

### Expected result

- [ ] **`409 RESOURCE_IN_USE`** — not `500`, not `204`.
- [ ] The product is still in the catalog and the order line intact.
- [ ] From the UI (**Product → Product catalog → delete**) the message is the same conflict, not an
      error screen.

> The foreign key is `RESTRICT` on purpose: an order is a historical record. Cascading the delete
> would rewrite the past to tidy the present.

---

## R9 · Redis being down does not cancel a sale

The catalog cache is invalidated **after** the commit, and if that invalidation fails a warning is
logged and nothing more. A sale already charged cannot be undone because Redis does not answer.

### Steps

```bash
setstock RS-050 5
docker stop ecommerce-redis
buy NOREDIS "$(order "$(pid RS-050)" 1)"
docker start ecommerce-redis
```

### Expected result

- [ ] The purchase returns **`201`** all the same.
- [ ] Stock dropped to 4.
- [ ] The log shows the warning, not an error:

```bash
docker logs ecommerce-api 2>&1 | grep -i "catalog cache" | tail -3
```

```
  stock changed but the catalog cache was not cleared: ...
```

- [ ] With Redis back, the catalog listing shows the correct stock. The cache TTL is **300 s**, so
      in the worst case a list served from cache can be up to five minutes stale. That is
      deliberate: the stock that decides is the one the transaction reads with `FOR UPDATE`, never
      the one the list shows.

---

## R10 · Double click in the interface

The version of **R4** that lives where a user meets it.

### Steps

1. Open the shop at `/`, add a product and go to **Cart → Billing → Payment**.
2. Press **Complete order** and, without waiting, press it again.

### Expected result

- [ ] The button is **disabled** while the request is in flight.
- [ ] **One single** order is created: the key is minted when the checkout opens, not when the
      button is pressed, so both clicks carry the same one.
- [ ] Stock drops only once.
- [ ] Reloading the confirmation screen does not produce another order.

---

## Result

| # | Case | Result |
|---|---|---|
| R1 | Two buyers, one unit | |
| R2 | Ten buyers, ten units · no residual `PENDING` | |
| R3 | Ten buyers, three units | |
| R4 | Same key in parallel | |
| R5 | Multi-line in opposite order · no deadlocks | |
| R6 | Repeated product in one payload | |
| R7 | Retrying a declined key | |
| R8 | Deleting a sold product | |
| R9 | Redis down does not cancel the sale | |
| R10 | Double click in the interface | |

**Notes:**
