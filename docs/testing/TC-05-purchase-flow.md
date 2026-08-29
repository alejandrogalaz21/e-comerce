# TC-05 · Purchase flow: stock, idempotency and the fake payment

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-010, TK-022 |
| **File** | `LoanPro Code Challenge E-Commerce.csv` (unmodified, 97 data rows) |

## Objective

Verify the one part of the challenge where money, state and concurrency meet. TC-01 to TC-04 cover
the catalog and its import; this one covers what happens when someone actually buys.

The checks are ordered so each builds on the previous state. Checks 4 and 5 are the ones worth
running slowly — they are the reason the flow is built the way it is.

## Preconditions

Empty catalog, then import the sample file at **Product → Import CSV** so there are 85 products:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` and `orders` come first: an order line references a product with `RESTRICT`, so
> truncating products alone is refused. That refusal is itself correct behaviour.

---

## 1 · A purchase goes through

### Steps

1. Open the shop at `/` and add a product to the cart.
2. Go through **Cart → Billing → Payment** and press **Complete order**.
3. Note the product's stock before and after.

### Expected results

- [ ] The confirmation screen shows the **order id**, its **lines with SKU and quantity**, and the
      **total**.
- [ ] The stock of the purchased product dropped by exactly the quantity bought.
- [ ] The total equals the sum of the catalog prices — not something the browser could have set.

Check it against the database:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "SELECT o.id, o.status, o.total_amount, i.sku, i.quantity, i.unit_price_snapshot FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.\"createdAt\" DESC LIMIT 5;"
```

- [ ] The order is `PAID` and each line carries a `unit_price_snapshot`.

---

## 2 · The price is frozen at purchase time

### Steps

1. After buying a product, edit it in **Product → Product catalog** and change its price.
2. Re-run the query above.

### Expected results

- [ ] The `unit_price_snapshot` of the existing line is **unchanged**.
- [ ] `total_amount` of that order is unchanged.

> A past transaction that mutates when today's price changes is a whole class of accounting bug.

---

## 3 · The server decides the amount

The browser never gets to set a price, and this proves it.

```bash
curl -s -X POST http://localhost:4000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":"PUT-A-REAL-ID-HERE","quantity":1,"price":"0.01"}],"idempotencyKey":"manual-test-0001","total":"0.01"}'
```

Get a real id with:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -t -c "SELECT id FROM products LIMIT 1;"
```

### Expected results

- [ ] The request is **rejected with 400**: `price` and `total` are not part of the contract and
      the validation pipe forbids unknown fields.
- [ ] Removing those two fields makes it succeed, charging the **catalog price**, not `0.01`.

---

## 4 · Two buyers, one unit left

This is the check the whole locking design exists for.

### Steps

1. Pick a product and set its stock to exactly 1:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "UPDATE products SET stock = 1 WHERE sku = 'RS-050';"
```

2. Get its id, then fire two purchases **at the same time**:

```bash
ID=$(docker exec ecommerce-db psql -U postgres -d ecommerce -t -A -c "SELECT id FROM products WHERE sku = 'RS-050';")
curl -s -o /tmp/a.json -w "A: %{http_code}\n" -X POST http://localhost:4000/api/v1/orders -H 'Content-Type: application/json' -d "{\"items\":[{\"productId\":\"$ID\",\"quantity\":1}],\"idempotencyKey\":\"race-buyer-a\"}" &
curl -s -o /tmp/b.json -w "B: %{http_code}\n" -X POST http://localhost:4000/api/v1/orders -H 'Content-Type: application/json' -d "{\"items\":[{\"productId\":\"$ID\",\"quantity\":1}],\"idempotencyKey\":\"race-buyer-b\"}" &
wait
```

> Keys are at least 8 characters: the DTO rejects shorter ones with a 400, which is validation
> doing its job rather than the race failing.

### Expected results

- [ ] One request returns **201** and the other **409** — never two 201s.
- [ ] The 409 body names the SKU and reports `available: 0`.
- [ ] Final stock is **0**, never `-1`:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "SELECT sku, stock FROM products WHERE sku = 'RS-050';"
```

> If both had succeeded, the catalog would have sold a unit it did not have. That is the failure
> this design prevents.

---

## 5 · The same key buys once

### Steps

Send the identical request twice, with the same key:

```bash
ID=$(docker exec ecommerce-db psql -U postgres -d ecommerce -t -A -c "SELECT id FROM products WHERE stock > 5 LIMIT 1;")
for i in 1 2; do
  curl -s -o /dev/null -w "attempt $i: %{http_code}\n" -X POST http://localhost:4000/api/v1/orders \
    -H 'Content-Type: application/json' \
    -d "{\"items\":[{\"productId\":\"$ID\",\"quantity\":2}],\"idempotencyKey\":\"same-key-test\"}"
done
```

### Expected results

- [ ] The first returns **201**, the second **200** — the existing order, not a new one.
- [ ] Only **one** order exists for that key.
- [ ] Stock dropped by **2**, not 4.

### In the UI

- [ ] Double-clicking **Complete order** produces a single order: the button disables while the
      request is in flight, and the key was minted when the checkout opened rather than on the click.

---

## 6 · A declined payment leaves no trace on the catalog

The fake provider declines about **1 in 10** charges on purpose, so this is reachable by just
buying repeatedly.

### Steps

1. Note the stock of a product.
2. Buy it repeatedly until a purchase is declined (usually within ten attempts).
3. Check the stock again.

### Expected results

- [ ] The UI shows **"Payment declined"** — visibly different from the stock warning — and says the
      cart is untouched and retrying is fine.
- [ ] The stock is **exactly as before** the declined attempt.
- [ ] No `PAID` order exists for that attempt.
- [ ] A `FAILED` order **is** recorded, with its reason and no stock movement:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "SELECT status, total_amount, decline_reason FROM orders WHERE status = 'FAILED' ORDER BY \"createdAt\" DESC LIMIT 3;"
```

- [ ] Retrying from the UI succeeds — the retry is a **new attempt with a new key**.

> The decline is intentional. If it never happened, the rollback could only be seen in tests.

---

## 7 · Not enough stock, told usefully

### Steps

1. Set a product's stock to 2 and add 5 of it to the cart.
2. Try to complete the order.

### Expected results

- [ ] The message names the **SKU**, how many were **requested** and how many are **left**.
- [ ] It offers a way back to the cart, because retrying unchanged cannot work.
- [ ] It is visibly **not** the same message as a declined payment.
- [ ] Stock is unchanged and no order was created.

---

## 8 · Reading orders requires a session

### Steps

```bash
curl -s -o /dev/null -w "anonymous: %{http_code}\n" http://localhost:4000/api/v1/orders
```

### Expected results

- [ ] Anonymous listing returns **401**.
- [ ] Placing an order anonymously still works (check 1 proved it) — buying is public, managing is not.
- [ ] With a token from `demo@demo.com` / `demo`, the listing returns the orders newest first.

---

## 9 · A sold product cannot be deleted away

### Steps

1. Try to delete a product that appears in an order, from **Product → Product catalog**.

### Expected results

- [ ] The deletion **fails** rather than erasing the order line.

> The foreign key is `RESTRICT` on purpose: an order is a historical record, and cascading the
> delete would rewrite history to tidy up the catalog.

---

## Result

| Check | Outcome |
|---|---|
| 1 · A purchase goes through | |
| 2 · Price frozen at purchase time | |
| 3 · Server decides the amount | |
| 4 · Two buyers, one unit | |
| 5 · Same key buys once | |
| 6 · Declined payment leaves no trace | |
| 7 · Not enough stock, told usefully | |
| 8 · Reading orders requires a session | |
| 9 · A sold product cannot be deleted | |

**Notes:**
