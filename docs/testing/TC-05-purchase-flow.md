# TC-05 · Purchase flow: stock, idempotency and the fake payment

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-010, TK-022 |
| **File** | `LoanPro Code Challenge E-Commerce.csv` (unmodified, 97 data rows) |

## Goal

Verify the one part of the challenge where money, state and concurrency meet. TC-01 to TC-04 cover
the catalog and its import; this one covers what happens when somebody actually buys.

The checks are ordered so each builds on the state left by the previous one.

> **Concurrency proper:** this case checks the basic race (check 4) and idempotency (check 5). The
> hard scenarios — ten buyers at once, deadlocks between multi-line orders, replaying a declined
> key, Redis going down — live in [TC-06](TC-06-concurrency-and-races.md).

## Preconditions

Empty the catalog, then import the sample file at **Product → Import CSV** to get 85 products:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` and `orders` come first: an order line references its product with `RESTRICT`, so
> truncating `products` on its own is refused. That refusal is itself the correct behaviour.

### The `POST /orders` contract

All three fields are **required**, and two of them tend to surprise:

| Field | Rule | If you skip it |
|---|---|---|
| `items[].productId` | UUID of an existing product | `400` or `404` |
| `items[].quantity` | integer ≥ 1 | `400` |
| `idempotencyKey` | **UUID**, minted when the checkout opens | `400` — a key like `order-42` is guessable, and replaying it returns somebody else's shipping address |
| `paymentMethod` | `card` or `paypal`. Cash is not a method: the order would be charged through the simulated provider and stored as paid, claiming money nobody handed over | `400` |
| `shippingAddress` | object with all **eight** fields (the seven address fields plus `email`), no HTML | `400` |
| `shippingAddress.email` | a valid address: it is the only written contact the purchase leaves behind | `400` — a malformed email is rejected just like a missing one |

A `price` or a `total` in the body **is not part of the contract** and validation rejects it — see
check 3.

Helpers for the whole session:

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

## 1 · A purchase completes

### Steps

1. Open the shop at `/` and add a product to the cart.
2. Walk through **Cart → Billing → Payment** and press **Complete order**.
3. Note the product's stock before and after.

### Expected result

- [ ] The confirmation screen shows the **order id**, its **lines with SKU and quantity**, and the
      **total**.
- [ ] The purchased product's stock dropped by exactly the quantity bought.
- [ ] The total equals the sum of the catalog prices — not something the browser could have set.

Check it against the database:

```bash
$DB -c "SELECT o.id, o.status, o.total_amount, i.sku, i.quantity, i.unit_price_snapshot FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.\"createdAt\" DESC LIMIT 5;"
```

- [ ] The order is `PAID` and every line carries its `unit_price_snapshot`.
- [ ] The order stores the shipping address in its `ship_*` columns.

---

## 2 · The price is frozen at purchase time

### Steps

1. After buying a product, edit it at **Product → Product catalog** and change its price.
2. Re-run the previous query.

### Expected result

- [ ] The existing line's `unit_price_snapshot` **did not change**.
- [ ] Neither did that order's `total_amount`.

> A past transaction that mutates when today's price changes is a whole family of accounting bugs.

---

## 3 · The server decides the amount

The browser never sets a price, and this proves it.

```bash
ID=$(pid RS-050)

curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' \
 -d "$(printf '{"items":[{"productId":"%s","quantity":1,"price":"0.01"}],"total":"0.01","idempotencyKey":"%s","paymentMethod":"card","shippingAddress":{"name":"Ada Lovelace","phone":"+14155552671","email":"ada@example.com","address":"1 Test Street","city":"Springfield","state":"IL","zipCode":"62701","country":"United States"}}' "$ID" "$(uuid)")"
```

### Expected result

- [ ] **`400`**: `price` and `total` are not part of the contract and the validation pipe forbids
      unknown fields.
- [ ] With those two fields removed, the request works and charges the **catalog price**, not
      `0.01`:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$(order "$ID" 1)"
```

---

## 4 · Two buyers, one unit

This is the check the whole locking design exists for.

### Steps

```bash
$DB -c "UPDATE products SET stock = 1 WHERE sku = 'RS-050';"
ID=$(pid RS-050)

curl -s -o /tmp/a.json -w "A: %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$(order "$ID" 1)" &
curl -s -o /tmp/b.json -w "B: %{http_code}\n" -X POST "$API/orders" -H 'Content-Type: application/json' -d "$(order "$ID" 1)" &
wait
```

> The keys are **UUIDs**: the DTO rejects anything else with a `400`, which would be validation
> doing its job, not the race failing.

### Expected result

- [ ] One request returns **`201`** and the other **`409`** — never two `201`s.
- [ ] The `409` body names the SKU and reports `available: 0`.
- [ ] Final stock is **0**, never `-1`:

```bash
$DB -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

> If both had succeeded, the catalog would have sold a unit it did not have. That is what this
> design prevents.

For the ten-buyer, three-unit and multi-line split, see
[TC-06](TC-06-concurrency-and-races.md).

---

## 5 · The same key buys only once

### Steps

```bash
ID=$($DB -t -A -c "SELECT id FROM products WHERE stock > 5 LIMIT 1;")
KEY=$(uuid)

for i in 1 2; do
  curl -s -o /dev/null -w "attempt $i: %{http_code}\n" -X POST "$API/orders" \
    -H 'Content-Type: application/json' -d "$(order "$ID" 2 "$KEY")"
done
```

### Expected result

- [ ] The first returns **`201`**, the second **`200`** — the existing order, not a new one.
- [ ] There is **exactly one** order for that key.
- [ ] Stock dropped by **2**, not 4.

### In the interface

- [ ] Double-clicking **Complete order** produces a single order: the button disables while the
      request is in flight, and the key was minted when the checkout opened, not when it was
      pressed.

---

## 6 · A declined payment leaves no trace in the catalog

The fake provider declines **1 in 10** charges on purpose, so it is reached by buying repeatedly.

### Steps

1. Note a product's stock.
2. Buy it repeatedly until a payment is declined (usually within ten attempts).
3. Look at the stock again.

### Expected result

- [ ] The UI shows **"Payment declined"** — visibly different from the stock notice — and says the
      cart is untouched and retrying is valid.
- [ ] Stock is **exactly as it was** before the declined attempt.
- [ ] No `PAID` order exists for that attempt.
- [ ] A `FAILED` order **is** recorded, with its reason and no stock movement:

```bash
$DB -c "SELECT status, total_amount, decline_reason FROM orders WHERE status = 'FAILED' ORDER BY \"createdAt\" DESC LIMIT 3;"
```

- [ ] Retrying from the UI works — the retry is a **new attempt with a new key**. Replaying the
      declined key returns `402` again, see [TC-06 · R7](TC-06-concurrency-and-races.md).

> The decline is deliberate. If it never happened, the rollback would only be observable in tests.

---

## 7 · Insufficient stock, said usefully

### Steps

1. Set a product's stock to 2 and add 5 units to the cart.
2. Try to complete the order.

### Expected result

- [ ] The message names the **SKU**, how many were **requested** and how many are **left**.
- [ ] It offers a way back to the cart, because retrying unchanged cannot work.
- [ ] It is visibly **different** from the declined payment message.
- [ ] Stock did not change and no order was created.

---

## 8 · Reading orders requires a session

### Steps

```bash
curl -s -o /dev/null -w "anonymous: %{http_code}\n" "$API/orders"
```

### Expected result

- [ ] The anonymous listing returns **`401`**.
- [ ] Placing an order anonymously still works (check 1 proved it) — buying is public, managing is
      not.
- [ ] With a token for `demo@demo.com` / `demo`, the listing returns orders newest first.

### The listing filters

```bash
TOKEN=$(curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s -o /dev/null -w "by SKU:          %{http_code}\n" "$API/orders?q=RS-050" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "by status:       %{http_code}\n" "$API/orders?status=PAID" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "invalid status:  %{http_code}\n" "$API/orders?status=NOPE" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "inverted range:  %{http_code}\n" "$API/orders?dateFrom=2026-08-31&dateTo=2026-08-01" -H "Authorization: Bearer $TOKEN"
```

- [ ] `q=RS-050` finds orders by the SKU **of their lines**, not only by id.
- [ ] `status=NOPE` returns **`400`** naming the valid values.
- [ ] An inverted date range returns **`400`**, not an empty list. An empty list would be
      indistinguishable from "no orders in that range".
- [ ] `dateTo` includes the whole day: an order placed that afternoon appears.

---

## 9 · A sold product cannot be deleted

### Steps

Try to delete, from **Product → Product catalog**, a product that appears in an order.

### Expected result

- [ ] The delete **fails** with `409 RESOURCE_IN_USE` instead of deleting the order line.

> The foreign key is `RESTRICT` on purpose: an order is a historical record, and cascading the
> delete would rewrite the past to tidy the catalog.

---

## 10 · The cart is contrasted with the catalog before charging

The cart lives in the browser and stores the price and stock from the moment each product was
added. Since the amount is decided by the server from the catalog, an unrevalidated cart shows a
total different from the one charged.

### Steps

1. From the shop, add **three** products to the cart.
2. At **Product → Product catalog**, on those products: change the **price** of the first, drop the
   **stock** of the second below the quantity you hold, and **rename** the third.
3. Go back to the shop and open the header cart.
4. Advance to the checkout and reach the payment step.
5. Delete from the catalog a fourth product that is also in the cart, and return to the cart.

### Expected result

- [ ] The cart says how many products changed since they were added.
- [ ] The first shows the previous price **struck through** next to the current one, and the
      subtotal uses the current one.
- [ ] The second drops its quantity to what is left in stock, saying it was adjusted.
- [ ] The third shows the new name and a note of what it was added as, **without** alarm: it does
      not change what is paid.
- [ ] The fourth is marked **unavailable** and "Check out" stays disabled until it is removed.
- [ ] The payment step total matches the recorded order's `totalAmount`.

> Renaming and repricing at once is exactly what a CSV import does: it upserts by SKU, so a new
> file can move the whole catalog underneath carts that are already open.

---

## Result

| Check | Result |
|---|---|
| 1 · A purchase completes | |
| 2 · Price frozen at purchase | |
| 3 · The server decides the amount | |
| 4 · Two buyers, one unit | |
| 5 · The same key buys once | |
| 6 · Declined payment leaves no trace | |
| 7 · Insufficient stock, said usefully | |
| 8 · Reading orders requires a session · filters | |
| 9 · A sold product cannot be deleted | |
| 10 · The cart is contrasted with the catalog | |

**Notes:**
