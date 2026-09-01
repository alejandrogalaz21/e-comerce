# Test matrix

Every use case in the system, one row each: what it demonstrates, how to exercise it, what should
happen, and where it is already covered.

Written for someone reviewing this project who wants to check a behaviour without reading the code
first. Pick a process, pick a case, follow the steps.

## How to read it

| Column | Meaning |
|---|---|
| **ID** | Stable reference, e.g. `P-04.3` |
| **Purpose** | What the case demonstrates. Not what it does — *why it matters* |
| **Steps** | Enough to reproduce it, through the UI or `curl` |
| **Expected** | The one observable result that decides pass or fail |
| **Covered by** | The automated test that protects it, or `manual` |

`✅` case with automated coverage · `🔶` verified by hand, with no automated guard.

**Before you start:**

```bash
docker compose up -d --build          # app on :3000, API on :4000
```

Sign in with `demo@demo.com` / `demo`. Reset the catalog between runs with:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce \
  -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` and `orders` come first on purpose: an order line references its product with
> `RESTRICT`, so truncating `products` on its own is refused. That refusal is itself the correct
> behaviour — see `P-02.8`.

---

## P-01 · CSV import

Full process: [P-01](../processes/P-01-csv-import.md) · Manual runs: [TC-01](TC-01-initial-import.md), [TC-02](TC-02-upsert-existing-product.md), [TC-03](TC-03-unchanged-does-not-write.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-01.1 | A valid file loads the catalog and every row is accounted for | **Product → Import CSV**, upload `docs/csv/LoanPro Code Challenge E-Commerce.csv` | 97 total = 85 created + 0 updated + 0 unchanged + 10 rejected + 2 skipped. The buckets always add up | ✅ `import.integration.spec.ts` · e2e `product-import.spec.ts` |
| P-01.2 | One bad row never aborts the batch — the central rule of this process | The same import; read the report | 85 products exist **despite** the 10 rejected rows. A partial import is the intended behaviour, not a failure | ✅ `import.service.spec.ts` |
| P-01.3 | A malformed file is rejected whole, before anything is saved | Upload a CSV missing columns: `printf 'name,sku\nx,y\n' > /tmp/bad.csv` | `400` listing the absent columns. Catalog untouched | ✅ `import.hardening.spec.ts` · e2e `product-import.spec.ts` |
| P-01.4 | Extra columns are rejected rather than ignored | Add a column the schema does not define | `400` naming the unexpected column. Silently discarding data would be worse than refusing it | ✅ `import.hardening.spec.ts` |
| P-01.5 | A second import of the same file changes nothing | Import the same file twice, check `updatedAt` | 85 unchanged, 0 updated. `Unchanged` **does not write** | ✅ `import.service.spec.ts` · [TC-03](TC-03-unchanged-does-not-write.md) |
| P-01.6 | An edited row is updated and then findable | Import `...-T1.csv` (line 55 differs), sort by **Updated at** | 1 updated, 84 unchanged. `RS-050` rises to the top | ✅ [TC-02](TC-02-upsert-existing-product.md) · e2e `product-filters.spec.ts` |
| P-01.7 | A SKU repeated in one file is ambiguous, so every occurrence is rejected | Import the sample; filter the report by `Rejected` | Lines 2, 11, 36, 56 and 89 rejected, with a message naming the lines involved | ✅ `import.integration.spec.ts` |
| P-01.8 | A blank row is noise, not an error | The same import; look at `Skipped empty` | 2 skipped, **with their line numbers recorded** — not merely counted | ✅ `import.service.spec.ts` |
| P-01.9 | Currency symbols and whitespace are formatting, not data | Rows with `$29.99` and `"  19.99  "` | Accepted as `29.99` and `19.99` | ✅ `import.service.spec.ts` |
| P-01.10 | Every rejected row can be identified | Filter the report by `Rejected` | Lines 2/11/36/56/89 show their real name; 25/41 show a dash because the file carried none. **The dash means exactly one thing** | ✅ `import.integration.spec.ts` |
| P-01.11 | An oversized upload is refused | Upload a file larger than 5 MB | `413` | 🔶 manual |
| P-01.12 | The import is credited to whoever ran it | Import while signed in, open the history | The batch shows **Imported by** with the token's email | ✅ `import.attribution.spec.ts` · [TC-07](TC-07-login-and-permissions.md) check 10 |

---

## P-02 · Product CRUD

Full process: [P-02](../processes/P-02-product-crud.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-02.1 | A product can be created from the UI | **Product → New product**, fill in and save | The row appears in the listing | ✅ e2e `products-crud.spec.ts` |
| P-02.2 | Required fields are enforced before any request leaves | Submit the empty form | Inline errors, no navigation, **no request sent** | ✅ e2e `products-crud.spec.ts` |
| P-02.3 | A product can be renamed and the change persists | Edit from the row actions menu | New name in the listing after saving | ✅ e2e `products-crud.spec.ts` |
| P-02.4 | Deleting is confirmed, not accidental | Delete through the confirm dialog | The row disappears after confirming | ✅ e2e `products-crud.spec.ts` |
| P-02.5 | HTML is **rejected**, not stripped — stripping hides the intent | Create with the name `<script>alert(1)</script>` | `400 VALIDATION_ERROR`, "HTML markup is not allowed". The same rule the import applies per row | ✅ `create-product.dto.spec.ts` · e2e `product-csv-cases.spec.ts` |
| P-02.6 | A SQL-injection payload is data, never code | Create with the sku from line 29 of the CSV | Rejected inline; the table survives | ✅ e2e `product-csv-cases.spec.ts` |
| P-02.7 | SKU uniqueness is guaranteed by the database, not by a prior check | `POST /products` twice with the same sku | `201` then `409 DUPLICATE_RESOURCE` | ✅ `products.service.spec.ts` · e2e `product-csv-cases.spec.ts` |
| P-02.8 | An order is a historical record: a sold product cannot be deleted | Buy a product and then try to delete it | `409 RESOURCE_IN_USE`. The `RESTRICT` foreign key refuses | ✅ `orders.concurrency.spec.ts` *(real database)* · [TC-06 · R8](TC-06-concurrency-and-races.md) |
| P-02.9 | Unknown fields are rejected, which is what stops a client dictating a price | `POST /products` with `{"nope": true}` | `400` | ✅ `create-product.dto.spec.ts` |
| P-02.10 | Writing requires a session; reading does not | `POST /products` without a token | `401`. `GET /products` still gives `200` | ✅ `route-protection.spec.ts` · e2e `auth-session.spec.ts` |
| P-02.11 | A free product is valid — price 0 is data, not an error | Create with price `0` (line 47 of the CSV) | Created and listed | ✅ e2e `product-csv-cases.spec.ts` |

---

## P-03 · Search and filters

Full process: [P-03](../processes/P-03-product-search.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-03.1 | Search reaches the whole catalog, not the visible page | Search for a product that is not on page 1 | It is found. The query runs on the server | ✅ e2e `product-search.spec.ts` |
| P-03.2 | Several terms are a **union** — the use case is "show me these", not "rows matching all" | `?q=camping&q=speaker` | Products matching *any* of the terms | ✅ `products.service.spec.ts` · e2e `product-filters.spec.ts` |
| P-03.3 | Sorting spans the catalog, not the page | Sort by price ascending with 85 products and a page of 20 | The cheapest product **in the catalog** comes first | ✅ e2e `product-filters.spec.ts` |
| P-03.4 | An impossible price range is caught before querying | `?minPrice=50&maxPrice=10` | `400`, no query issued | ✅ `product-filters.dto.spec.ts` · e2e `product-filters.spec.ts` |
| P-03.5 | Only known sort fields reach the SQL | `?sortBy=password` | `400`. No user string ever becomes a column name | ✅ `product-filters.dto.spec.ts` |
| P-03.6 | `LIKE` wildcards are literal characters | Search for `50%` | It searches for the text `50%`, not "anything after 50" | ✅ `products.service.spec.ts` |
| P-03.7 | Filters combine and are reversible | Apply category + price range | Both applied, each as a removable chip | ✅ e2e `product-filters.spec.ts` |
| P-03.8 | The view survives navigation — the URL *is* the state | Filter, reload, press back | The same view in both cases | ✅ `product-list-params.test.ts` · e2e `product-filters.spec.ts` |
| P-03.9 | Availability is a filter, and "sold out" is a real value | Filter by sold out | Only products with stock 0 | ✅ e2e `product-filters.spec.ts` |
| P-03.10 | No results is an outcome, not an error | Search for something that does not exist | `200` with an explicit empty state; clearing restores the listing | ✅ e2e `product-search.spec.ts` |
| P-03.11 | Column layout is a per-user preference and is remembered | Resize a column, leave and come back | Width preserved | ✅ e2e `product-filters.spec.ts` |

---

## P-04 · Order placement

Full process: [P-04](../processes/P-04-order-placement.md) · Manual runs: [TC-05](TC-05-purchase-flow.md), [TC-06](TC-06-concurrency-and-races.md)

**This is the process where money, shared state and concurrency meet.** Cases 3 to 6 and 14 to 17
are the ones worth running slowly.

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-04.1 | A purchase completes and moves real stock | Add to cart → checkout → **Complete order** | Confirmation with id, lines and total. Stock drops by what was bought | ✅ `orders.concurrency.spec.ts` *(real database)* · [TC-05](TC-05-purchase-flow.md) |
| P-04.2 | The **server** owns the amount — a cart where the client sets the price is not a payment system | `POST /orders` with `"total":"0.01"` in the body | `400`. Any amount sent is refused outright | ✅ `orders.service.spec.ts` · [TC-05](TC-05-purchase-flow.md) check 3 |
| P-04.3 | **Two buyers cannot both take the last unit** | Set stock to 1, fire two simultaneous purchases | One `201`, one `409`. Final stock `0`, never `-1` | ✅ `orders.concurrency.spec.ts` *(real database)* · [TC-06 · R1](TC-06-concurrency-and-races.md) |
| P-04.4 | Multi-line orders cannot block each other | Two orders for the same two products, listed in opposite order | Both resolve. Rows are locked ordered by `id` | ✅ `orders.concurrency.spec.ts` *(real database)* · [TC-06 · R5](TC-06-concurrency-and-races.md) |
| P-04.5 | A double click buys once | Send the same request twice with the same idempotency key | `201` then `200`. One order, one stock movement | ✅ `orders.service.spec.ts` · `orders.concurrency.spec.ts` |
| P-04.6 | Money is exact — `0.1 + 0.2` cannot decide a total | Buy lines whose prices break in binary floating point | Total exact to the cent. Summed in integer cents | ✅ `orders.service.spec.ts` |
| P-04.7 | A past transaction never mutates | Buy a product and then change its catalog price | `unit_price_snapshot` and the order total untouched | ✅ `orders.concurrency.spec.ts` *(real database)* · [TC-05](TC-05-purchase-flow.md) check 2 |
| P-04.8 | Insufficient stock is communicated usefully, because retrying unchanged cannot work | Add 5 of a product with stock 2 and complete | `409` naming SKU, requested and available, with a way back to the cart | ✅ `orders.service.spec.ts` |
| P-04.9 | Buying is public; administering is not | `POST /orders` without a token, then `GET /orders` without a token | `201` and `401`. A customer buys with no account | ✅ `orders.service.spec.ts` · `route-protection.spec.ts` |
| P-04.10 | The whole purchase is atomic | Force a decline (see `P-05.2`) | No paid order, no stock movement, nothing half-done | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-04.11 | The purchase flow works end to end in a browser | Full checkout through the UI | Order confirmed on screen, with lines and total | ✅ e2e `purchase.spec.ts` |
| P-04.12 | A double click cannot buy twice | Press **Complete order** and press it again in flight | The button stays disabled until the request resolves | ✅ e2e `purchase.spec.ts` · [TC-06 · R10](TC-06-concurrency-and-races.md) |
| P-04.13 | An anonymous visitor can complete a purchase in a browser | Full checkout with no session | Order confirmed | ✅ e2e `purchase.spec.ts` |
| P-04.14 | With stock for everyone, **nobody** is refused by the lock | 10 simultaneous buyers, stock 10 | Zero `409`s. `final_stock + PAID orders = 10` | 🔶 [TC-06 · R2](TC-06-concurrency-and-races.md) |
| P-04.15 | A `PENDING` row never survives the transaction | After any concurrent batch: `SELECT count(*) FROM orders WHERE status='PENDING'` | `0`. `PENDING` exists only inside the transaction | 🔶 [TC-06 · R2](TC-06-concurrency-and-races.md) |
| P-04.16 | The same key **in parallel** is decided by the unique index, not by a prior read | Fire the same key twice at once | One `201`, one `200`, one single row. Never a `500` from `23505` | 🔶 [TC-06 · R4](TC-06-concurrency-and-races.md) |
| P-04.17 | The same product repeated in a payload is **one** validation | Two lines of 3 units against a stock of 5 | `409` with `requested: 6`. With 2 and 2: `201` and **one** line of quantity 4 | ✅ `orders.service.spec.ts` · 🔶 [TC-06 · R6](TC-06-concurrency-and-races.md) |
| P-04.18 | The idempotency key must be impossible to guess | `POST /orders` with `"idempotencyKey":"order-42"` | `400`. Replaying a key returns the shipping address, so a guessable key is a leak of somebody else's data | ✅ `create-order.dto.spec.ts` |
| P-04.19 | The shipping address is required and admits no HTML | Order without `shippingAddress`, then with `<script>` in `name` | `400` for both. Recording an order nobody can deliver is worse than refusing it | ✅ `create-order.dto.spec.ts` |
| P-04.20 | An inverted date range is rejected rather than returning empty | `GET /orders?dateFrom=2026-08-31&dateTo=2026-08-01` | `400`. An empty list would be indistinguishable from "no orders in that range" | ✅ `orders.service.spec.ts` · [TC-05](TC-05-purchase-flow.md) check 8 |
| P-04.21 | An order is searched by what it contains, not only by its id | `GET /orders?q=RS-050` with a token | Returns the orders whose **lines** carry that SKU. An order has no customer, so that is what identifies it | ✅ `orders.service.spec.ts` |
| P-04.22 | The contact email is required and must be an email | Order without `shippingAddress.email`, then with `"email":"ada"` | `400` for both. An invalid contact is indistinguishable from no contact on the day it is needed | ✅ `create-order.dto.spec.ts` |
| P-04.23 | An order is searched by its delivery details | `GET /orders?q=hermosillo` and `?q=example.org` with a token | Returns orders delivered to that city and those on that email domain. A fragment is enough | ✅ `orders.filters.spec.ts` |
| P-04.24 | The cart never shows a total different from the one that will be charged | Add to cart, change the price in the catalog, return to the cart | The current price is adopted, the previous one flagged, and the checkout total is the one the order records | ✅ `cart-reconcile.test.ts` · 🔶 [TC-05](TC-05-purchase-flow.md) check 10 |
| P-04.25 | A line the purchase would reject is identified before confirming | Delete from the catalog a product that is in the cart, then return to the cart | The line is marked unavailable and checkout is blocked until it is removed, instead of failing on confirm without saying which one is at fault | ✅ `cart-reconcile.test.ts` · 🔶 [TC-05](TC-05-purchase-flow.md) check 10 |
| P-04.26 | A network failure is not mistaken for a withdrawn product | Open the cart with the API down | It says the cart could not be verified; it does not empty it or mark anything unavailable | ✅ `cart-reconcile.test.ts` |
| P-04.27 | The order records how it was paid | `POST /orders` with `"paymentMethod":"paypal"`, then with `"cash"` | The first `201`, and the detail and receipt say PayPal; the second `400` naming the valid methods | ✅ `create-order.dto.spec.ts` |

---

## P-05 · Payment processing

Full process: [P-05](../processes/P-05-payment-processing.md) · Manual runs: [TC-05](TC-05-purchase-flow.md) check 6, [TC-06](TC-06-concurrency-and-races.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-05.1 | The provider is swappable — faking a payment cannot leave technical debt | Read the constructor of `orders.service.ts` | It depends on the `PAYMENT_PROVIDER` token, never on `FakePaymentProvider` | ✅ `fake-payment.provider.spec.ts` |
| P-05.2 | A decline reverts everything | Buy repeatedly until one is declined (~1 in 10) | `402 PAYMENT_DECLINED`. Stock exactly as before | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-05.3 | The decline rate is real, so the rollback is observable by using the app | 40 purchases in a row | Around 4 declines. A run on 2026-08-29 gave exactly 36/4 | 🔶 manual — [TC-05](TC-05-purchase-flow.md), [TC-06 · R7](TC-06-concurrency-and-races.md) |
| P-05.4 | Tests never depend on luck | Inject a fixed random source | The charge approves or declines deterministically | ✅ `fake-payment.provider.spec.ts` |
| P-05.5 | A declined attempt leaves an audit trail | Query `orders` after a decline | A `FAILED` order with its reason and **no stock movement** | ✅ `orders.service.spec.ts` |
| P-05.6 | One key, one outcome — replaying a declined key cannot charge twice | Retry with the same idempotency key | It declines again. Retrying means a **new** attempt with a new key | ✅ `orders.service.spec.ts` · 🔶 [TC-06 · R7](TC-06-concurrency-and-races.md) |
| P-05.7 | A decline is a legitimate outcome, not a system failure | Read the message in the UI | "Payment declined", presented as retryable and visibly different from a stock conflict | ✅ `purchase.mapper.test.ts` · e2e `purchase.spec.ts` |
| P-05.8 | The record of the declined attempt survives the rollback that produced it | Decline, then `SELECT * FROM orders WHERE status='FAILED'` | The row exists. It is written in a **separate transaction**, because the original was rolled back | ✅ `orders.service.spec.ts` |
| P-05.9 | Redis being down does not cancel a sale already charged | `docker stop ecommerce-redis`, then buy | `201`. A warning in the log, not an error. The cache is invalidated **after** the commit | 🔶 [TC-06 · R9](TC-06-concurrency-and-races.md) |

---

## P-06 · Authentication

Full process: [P-06](../processes/P-06-authentication.md) · Manual run: [TC-07](TC-07-login-and-permissions.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-06.1 | A protected screen is not reachable without a session | Open `/dashboard/product` with no session | Redirects to login; the screen never renders | ✅ e2e `auth-session.spec.ts` |
| P-06.2 | Signing in returns you to where you were going | Request a protected route and then authenticate | Lands on the originally requested route | ✅ e2e `auth-session.spec.ts` |
| P-06.3 | Wrong credentials fail visibly and safely | Sign in with the wrong password | Inline error, stays on the login screen | ✅ e2e `auth-session.spec.ts` |
| P-06.4 | A session survives a reload; logout really ends it | Sign in, reload, sign out | Session restored, then back to the unauthenticated state | ✅ `auth-token.test.ts` · e2e `auth-session.spec.ts` |
| P-06.5 | The shop stays public — closing the checkout would solve a problem that does not exist | Browse the catalog and a detail with no session | It renders, with no redirect. `GET /products` answers `200` without a token | ✅ e2e `auth-session.spec.ts` |
| P-06.6 | The guard fails **closed**: a new endpoint is born protected | Call any protected route without a token | `401`. Forgetting the annotation produces a visible error, never a silent hole | ✅ `jwt-auth.guard.spec.ts` · `route-protection.spec.ts` |
| P-06.7 | Passwords never leave the service | Sign in and inspect the response | No `password` field anywhere | 🔶 [TC-07](TC-07-login-and-permissions.md) check 1 |
| P-06.8 | An import records who ran it | Import while signed in, open the history | The batch shows **Imported by** | ✅ `import.attribution.spec.ts` · e2e `product-import-batches.spec.ts` |
| P-06.9 | Import history is searchable by filename | Search a fragment of the name in the history | Matching batches, case-insensitively; a distinct empty state when nothing matches | ✅ e2e `import-batch-search.spec.ts` |
| P-06.10 | User registration is **not** public | `POST /auth/sign-up` without a token | `401`. An account only grants catalog administration, so open registration would give it away | ✅ `route-protection.spec.ts` · 🔶 [TC-07](TC-07-login-and-permissions.md) check 6 |
| P-06.11 | A tampered or expired token is refused without breaking anything | Call with a modified signature, with `a.b.c`, and without the `Bearer` prefix | `401` in all three cases. Never `500` | 🔶 [TC-07](TC-07-login-and-permissions.md) check 8 |
| P-06.12 | Login is rate limited | 35 login attempts in a row | ~30 `401`s and then `429`. The global 300/min ceiling is useless for a credential endpoint | ✅ `security.spec.ts` (config) · 🔶 [TC-07](TC-07-login-and-permissions.md) check 9 |
| P-06.13 | No refresh token is issued | Inspect the `sign-in` response | No `refreshToken`. The one that used to be issued was, in effect, a seven-day access token with no rotation and no revocation | ✅ `auth.service.spec.ts` |

---

## P-07 · Error contract

Full process: [P-07](../processes/P-07-error-contract.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-07.1 | Every error answers with the same shape, whichever layer fails | Provoke a `404`, `400`, `401`, `409` | All five fields present: `statusCode`, `error`, `message`, `path`, `timestamp` | ✅ `http-exception.filter.spec.ts` |
| P-07.2 | `error` is a code to branch on, not the status in prose | Look at any error body | `NOT_FOUND`, never `"Not Found"` | ✅ `http-exception.filter.spec.ts` |
| P-07.3 | Normalising the envelope cannot destroy the detail | Provoke a stock conflict | `sku`, `requested` and `available` are still at the top level | ✅ `http-exception.filter.spec.ts` |
| P-07.4 | Several validation failures are reported together | Send two invalid parameters at once | `message` is the list of both | ✅ `http-exception.filter.spec.ts` |
| P-07.5 | The same database failure means the same thing everywhere | Duplicate a product sku, then a user email | Both `409 DUPLICATE_RESOURCE`. They used to be `409` and `400` | ✅ `database-error.translator.spec.ts` |
| P-07.6 | A foreign key refusal is a conflict, not a crash | Delete a sold product | `409 RESOURCE_IN_USE`. This used to be a `500` | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-07.7 | An internal failure never leaks internals | Force an unexpected error | Generic message to the client, full detail only in the log | ✅ `database-error.translator.spec.ts` |
| P-07.8 | A rate-limited request is not an internal error | Exceed the import limit | `429 TOO_MANY_REQUESTS` | ✅ `http-exception.filter.spec.ts` |

---

## P-08 · Security hardening

Full process: [P-08](../processes/P-08-security-hardening.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-08.1 | CORS names its origin — `*` is not enterprise grade | `curl -H "Origin: https://evil.test" .../products -D -` | No `Access-Control-Allow-Origin` header | ✅ `security.spec.ts` |
| P-08.2 | The allowed origin still works | The same with `Origin: http://localhost:3000` | The header returns that origin | ✅ `security.spec.ts` |
| P-08.3 | The standard security headers are present | `curl -D - .../health` | HSTS, `nosniff`, `SAMEORIGIN`, `no-referrer`; no `X-Powered-By` | 🔶 manual |
| P-08.4 | The most expensive operation is metered | 7 imports in a row | `201` ×5, then `429` ×2 | ✅ `security.spec.ts` (config) · 🔶 manual (behaviour) |
| P-08.5 | The limit does not strangle normal use | 12 catalog requests in a row | All `200`. A limit that breaks the app is deleted by the next developer | ✅ `security.spec.ts` |
| P-08.6 | XSS is rejected at the edge, not left to React | Import a row with markup in the name | Row rejected, with the payload reported verbatim as the reason | ✅ `import.service.spec.ts` · e2e `product-csv-cases.spec.ts` |

---

## P-09 · Status and observability

Manual run: [TC-08](TC-08-status-and-degradation.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-09.1 | The Redis connection is real, not declared | `GET /status/redis` twice | `visits` **rises** between calls. The endpoint runs `INCR`, writing and reading a real value | 🔶 [TC-08](TC-08-status-and-degradation.md) check 1 |
| P-09.2 | The Postgres connection is real and the count is of the live catalog | `GET /status/db`, import a CSV, repeat | `productCount` changes. It is not a cached value | 🔶 [TC-08](TC-08-status-and-degradation.md) check 2 |
| P-09.3 | **A downed dependency gives `200` with `ok:false`, not a `500`** | `docker stop ecommerce-redis`, then `GET /status/redis` | `HTTP 200`, `ok:false` and an `error` saying what happened | 🔶 [TC-08](TC-08-status-and-degradation.md) check 3 |
| P-09.4 | One downed dependency does not drag the other with it | With Redis stopped, `GET /status/db` | Still `ok:true` | 🔶 [TC-08](TC-08-status-and-degradation.md) check 3 |
| P-09.5 | `/health` is public, because an orchestrator has no credentials | `GET /health` without a token | `200` with `app`, `resources` and `postgres`. `uptimeMs` grows between calls | 🔶 [TC-08](TC-08-status-and-degradation.md) check 5 |
| P-09.6 | The status endpoints **do** require a session | `GET /status/db` and `/status/redis` without a token | `401` for both | ✅ `route-protection.spec.ts` |
| P-09.7 | The screen refreshes itself and degrades per card | Open `/dashboard/status`, stop Redis, wait | Only that card changes state, without reloading. The others stay green | 🔶 [TC-08](TC-08-status-and-degradation.md) check 6 |
| P-09.8 | The screen's polling does not trip the rate limit | Leave `/dashboard/status` open for 3 minutes | No `429`. It is 36 req/min per tab against a ceiling of 300 | 🔶 [TC-08](TC-08-status-and-degradation.md) check 6 |

---

## P-10 · Dashboard page search

All automated: the search touches neither the API nor the database, so there is nothing to look at
by hand.

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-10.1 | The shortcut opens the search, off macOS too | On any dashboard page, `Ctrl+K` | The dialog opens with the field focused. The original component only looked at `metaKey`, so it did not open on Windows | ✅ e2e `dashboard-page-search.spec.ts` |
| P-10.2 | The header control is discoverable and announces the shortcut | Look at the header and press the control | It shows `Ctrl K` (or `⌘K` on macOS) and opens the same dialog | ✅ e2e `dashboard-page-search.spec.ts` |
| P-10.3 | The list comes from the real nav, not a fixed array | Open the search and type `import` | `Import CSV` and `Import history` appear, which are live nav entries | ✅ `searchbar/utils.test.ts` + e2e |
| P-10.4 | A page is found by its path, not only its title | Type `dashboard/status` | The Status page appears | ✅ `searchbar/utils.test.ts` + e2e |
| P-10.5 | The match is highlighted inside the result | Type `stat` | The `stat` fragment is highlighted, and the full text is preserved with no added characters | ✅ `searchbar/utils.test.ts` + e2e |
| P-10.6 | No matches says so, instead of an empty list | Type something that does not exist | A "not found" message quoting what was searched | ✅ e2e `dashboard-page-search.spec.ts` |
| P-10.7 | Choosing a result navigates and closes | Type `import csv` and choose the result | The URL becomes `/dashboard/product/import` and the dialog closes | ✅ e2e `dashboard-page-search.spec.ts` |
| P-10.8 | `Esc` closes without navigating and leaves no residue | Open, type, `Esc`, open again | The URL does not change and the field comes back empty | ✅ e2e `dashboard-page-search.spec.ts` |
| P-10.9 | **The shortcut does not hijack typing** | With focus in the table filter, type `k` | The letter is typed into the field and the dialog does not open | ✅ e2e `dashboard-page-search.spec.ts` |
| P-10.10 | The search belongs to the dashboard, not the shop | Open `/` | The control does not exist on the public storefront | ✅ e2e `dashboard-page-search.spec.ts` |

---

## Coverage summary

| Process | Cases | Automated | Manual only |
|---|---|---|---|
| P-01 CSV import | 12 | 11 | 1 |
| P-02 Product CRUD | 11 | 11 | 0 |
| P-03 Search and filters | 11 | 11 | 0 |
| P-04 Order placement | 27 | 24 | 3 |
| P-05 Payment processing | 9 | 7 | 2 |
| P-06 Authentication | 13 | 11 | 2 |
| P-07 Error contract | 8 | 8 | 0 |
| P-08 Security hardening | 6 | 5 | 1 |
| P-09 Status and observability | 8 | 1 | 7 |
| P-10 Page search | 10 | 10 | 0 |
| **Total** | **115** | **99** | **16** |

## What stays manual only

Each for a stated reason, not by omission.

| Case | Why it stays manual |
|---|---|
| P-01.11 oversized upload | Would require a file larger than 5 MB in the repository |
| P-04.14–P-04.17 observable concurrency | The automated version exists in `orders.concurrency.spec.ts`; the manual part is **seeing** it against the full stack, which is what convinces a reviewer |
| P-05.3 the ~10% decline rate | The browser spec forces a decline deterministically; the *rate* is asserted in `fake-payment.provider.spec.ts` over a uniform sweep, and observing it in the running app is the manual part |
| P-05.9 Redis down during a sale | Requires stopping a container mid-operation |
| P-06.7, P-06.11, P-06.12 | Response inspection and token tampering: quick by hand, brittle automated |
| P-08.3 security headers | Asserting that helmet sets its own headers is testing the library |
| P-08.4 rate limit behaviour | The configuration is asserted; firing hundreds of requests in a suite is slow and proves little |
| P-09 almost entirely | The module exists **to** be looked at. Automating "the card turns red on its own" costs more than it gives, against opening the screen and stopping a container |

## Running everything

```bash
cd api && npm test              # unit + fixture + real-database tests
cd api && npm run test:e2e      # through the real HTTP stack
cd web && npm test              # frontend unit
cd web && npm run test:e2e      # Playwright, needs the stack up
```

`purchase.spec.ts` is named to sort last on purpose: buying leaves permanent residue, since a
product that appears in an order cannot be deleted, so the specs that count the catalog run first.

See [STRATEGY.md](STRATEGY.md) for what each level covers and what is deliberately left out.
