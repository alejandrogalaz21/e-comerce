# Test matrix

Every use case in the system, one row each: what it proves, how to exercise it, what should happen,
and where it is already covered.

Written for someone reviewing this project who wants to check a behaviour without reading the code
first. Pick a process, pick a case, follow the steps.

## How to read it

| Column | Meaning |
|---|---|
| **ID** | Stable reference, e.g. `P-04.3` |
| **Purpose** | What the case proves. Not what it does — *why it matters* |
| **Steps** | Enough to reproduce it, UI or `curl` |
| **Expected** | The single observable outcome that decides pass or fail |
| **Covered by** | The automated test that guards it, or `manual` |

`✅` a case with automated coverage · `🔶` verified manually, no automated guard.

**Before you start:**

```bash
docker compose up -d --build          # app on :3000, API on :4000
```

Sign in with `demo@demo.com` / `demo`. Reset the catalog between runs with:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce \
  -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` and `orders` come first on purpose: an order line references a product with
> `RESTRICT`, so truncating products alone is refused. That refusal is itself correct behaviour —
> see `P-02.8`.

---

## P-01 · CSV import

Full process: [P-01](../processes/P-01-csv-import.md) · Manual runs: [TC-01](TC-01-initial-import.md), [TC-02](TC-02-upsert-existing-product.md), [TC-03](TC-03-unchanged-does-not-write.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-01.1 | A valid file loads the catalog and every row is accounted for | **Product → Import CSV**, upload `docs/csv/LoanPro Code Challenge E-Commerce.csv` | 97 total = 85 created + 0 updated + 0 unchanged + 10 rejected + 2 skipped. The buckets always add up | ✅ `import.integration.spec.ts` · e2e `product-import.spec.ts` |
| P-01.2 | A bad row never aborts the batch — the core rule of this process | Same import; look at the report | 85 products exist **despite** 10 rejected rows. A partial import is the intended behaviour, not a failure | ✅ `import.service.spec.ts` |
| P-01.3 | A malformed file is refused whole, before anything is saved | Upload a CSV missing columns: `printf 'name,sku\nx,y\n' > /tmp/bad.csv` | `400` listing the missing columns. Catalog unchanged | ✅ `import.hardening.spec.ts` · e2e `product-import.spec.ts` |
| P-01.4 | Extra columns are refused rather than ignored | Add a column the schema does not define | `400` naming the unexpected column. Silently dropping data would be worse than refusing it | ✅ `import.hardening.spec.ts` |
| P-01.5 | A second import of the same file changes nothing | Import the same file twice, check `updatedAt` | 85 unchanged, 0 updated. `Unchanged` performs **no write** | ✅ `import.service.spec.ts` · [TC-03](TC-03-unchanged-does-not-write.md) |
| P-01.6 | An edited row updates and is findable afterwards | Import `...-T1.csv` (line 55 differs), sort by **Updated at** | 1 updated, 84 unchanged. `RS-050` sorts to the top | ✅ [TC-02](TC-02-upsert-existing-product.md) · e2e `product-filters.spec.ts` |
| P-01.7 | A SKU repeated in one file is ambiguous, so every occurrence is rejected | Import the sample; filter the report by `Rejected` | Lines 2, 11, 36, 56, 89 all rejected, message naming the lines involved | ✅ `import.integration.spec.ts` |
| P-01.8 | A blank row is noise, not an error | Same import; look at `Skipped empty` | 2 skipped, with their line numbers recorded — not just counted | ✅ `import.service.spec.ts` |
| P-01.9 | Currency symbols and whitespace are formatting, not data | Rows with `$29.99` and `"  19.99  "` | Accepted as `29.99` and `19.99` | ✅ `import.service.spec.ts` |
| P-01.10 | Every rejected row can be identified | Filter the report by `Rejected` | Lines 2/11/36/56/89 show their real name; lines 25/41 show an em dash because the file had none. **The dash means one thing only** | ✅ `import.integration.spec.ts` |
| P-01.11 | An oversized upload is refused | Upload a file over 5 MB | `413` | 🔶 manual |

---

## P-02 · Product CRUD

Full process: [P-02](../processes/P-02-product-crud.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-02.1 | A product can be created through the UI | **Product → New product**, fill and save | Row appears in the list | ✅ e2e `products-crud.spec.ts` |
| P-02.2 | Required fields are enforced before any request leaves | Submit the empty form | Inline errors, no navigation, **no request sent** | ✅ e2e `products-crud.spec.ts` |
| P-02.3 | A product can be renamed and the change persists | Edit from the row actions menu | New name in the list after saving | ✅ e2e `products-crud.spec.ts` |
| P-02.4 | Deletion is confirmed, not accidental | Delete via the confirm dialog | Row gone after confirming | ✅ e2e `products-crud.spec.ts` |
| P-02.5 | HTML is **rejected**, not stripped — stripping hides intent | Create with name `<script>alert(1)</script>` | `400 VALIDATION_ERROR`, "HTML markup is not allowed". Same rule the CSV import applies per row | ✅ `create-product.dto.spec.ts` · e2e `product-csv-cases.spec.ts` |
| P-02.6 | A SQL-injection payload is data, never code | Create with the sku from CSV line 29 | Rejected inline; the table survives | ✅ e2e `product-csv-cases.spec.ts` |
| P-02.7 | SKU uniqueness is guaranteed by the database, not by a check | `POST /products` twice with the same sku | `201` then `409 DUPLICATE_RESOURCE` | ✅ `products.service.spec.ts` · e2e `product-csv-cases.spec.ts` |
| P-02.8 | An order is a historical record: a sold product cannot be deleted away | Buy a product, then try to delete it | `409 RESOURCE_IN_USE`. The `RESTRICT` foreign key refuses | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-02.9 | Unknown fields are refused, which is what stops a client dictating a price | `POST /products` with `{"nope": true}` | `400` | ✅ `create-product.dto.spec.ts` |
| P-02.10 | Writes need a session; reads do not | `POST /products` with no token | `401`. `GET /products` still `200` | ✅ `route-protection.spec.ts` · e2e `auth-session.spec.ts` |
| P-02.11 | A free product is valid — price 0 is data, not an error | Create with price `0` (CSV line 47) | Created and listed | ✅ e2e `product-csv-cases.spec.ts` |

---

## P-03 · Search and filters

Full process: [P-03](../processes/P-03-product-search.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-03.1 | Search reaches the whole catalog, not the visible page | Search a product that is not on page 1 | It is found. The query runs server-side | ✅ e2e `product-search.spec.ts` |
| P-03.2 | Several terms are a **union** — the use case is "show me these", not "rows matching all" | `?q=camping&q=speaker` | Products matching *either* term | ✅ `products.service.spec.ts` · e2e `product-filters.spec.ts` |
| P-03.3 | Sorting spans the catalog, not the page | Sort by price ascending with 85 products, page size 20 | The cheapest product **in the catalog** is first | ✅ e2e `product-filters.spec.ts` |
| P-03.4 | An impossible price range is caught before querying | `?minPrice=50&maxPrice=10` | `400`, no query issued | ✅ `product-filters.dto.spec.ts` · e2e `product-filters.spec.ts` |
| P-03.5 | Only known sort fields reach the SQL | `?sortBy=password` | `400`. No user string ever becomes a column name | ✅ `product-filters.dto.spec.ts` |
| P-03.6 | `LIKE` wildcards are literal characters | Search `50%` | Searches for the text `50%`, not "anything after 50" | ✅ `products.service.spec.ts` |
| P-03.7 | Filters combine and are reversible | Apply category + price range | Both applied, each shown as a removable chip | ✅ e2e `product-filters.spec.ts` |
| P-03.8 | The view survives navigation — the URL *is* the state | Filter, reload, press back | Same view both times | ✅ `product-list-params.test.ts` · e2e `product-filters.spec.ts` |
| P-03.9 | Availability is a filter, and "sold out" is a real value | Filter by sold out | Only products with stock 0 | ✅ e2e `product-filters.spec.ts` |
| P-03.10 | No results is an outcome, not an error | Search something absent | `200` with an explicit empty state; clearing restores the list | ✅ e2e `product-search.spec.ts` |
| P-03.11 | Column layout is a per-user preference and is remembered | Resize a column, navigate away and back | Width preserved | ✅ e2e `product-filters.spec.ts` |

---

## P-04 · Order placement

Full process: [P-04](../processes/P-04-order-placement.md) · Manual runs: [TC-05](TC-05-purchase-flow.md)

**This is the process where money, shared state and concurrency meet.** Cases 3 to 6 are the ones
worth running slowly.

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-04.1 | A purchase completes and moves real stock | Add to cart → checkout → **Complete order** | Confirmation with order id, lines and total. Stock drops by the amount bought | ✅ `orders.concurrency.spec.ts` *(real database)* · [TC-05](TC-05-purchase-flow.md) |
| P-04.2 | The **server** owns the amount — a cart where the client sets the price is not a payment system | `POST /orders` with `"total":"0.01"` in the body | `400`. Any amount sent is refused outright | ✅ `orders.service.spec.ts` · [TC-05](TC-05-purchase-flow.md) |
| P-04.3 | **Two buyers cannot get the same last unit** | Set stock to 1, fire two purchases simultaneously | One `201`, one `409`. Final stock `0`, never `-1` | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-04.4 | Multi-line orders cannot deadlock each other | Two orders of the same two products, listed in opposite order | Both resolve. Rows are locked ordered by `id` | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-04.5 | A double click buys once | Send the same request twice with the same idempotency key | `201` then `200`. One order, one stock movement | ✅ `orders.service.spec.ts` · `orders.concurrency.spec.ts` |
| P-04.6 | Money is exact — `0.1 + 0.2` must not decide a total | Buy lines whose prices break in binary floating point | Total exact to the cent. Summed as integer cents | ✅ `orders.service.spec.ts` |
| P-04.7 | A past transaction never mutates | Buy a product, then change its catalog price | `unit_price_snapshot` and the order total unchanged | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-04.8 | Insufficient stock is told usefully, because retrying unchanged cannot work | Add 5 of a product with stock 2, complete the order | `409` naming the SKU, requested and available, with a link back to the cart | ✅ `orders.service.spec.ts` |
| P-04.9 | Buying is public; managing is not | `POST /orders` with no token, then `GET /orders` with no token | `201` and `401`. A customer buys without an account | ✅ `orders.service.spec.ts` · `route-protection.spec.ts` |
| P-04.10 | The whole purchase is atomic | Force a decline (see `P-05.2`) | No paid order, no stock movement, nothing half-applied | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-04.11 | The purchase flow works end to end in a browser | Full checkout through the UI | Order confirmed on screen with its lines and total | ✅ e2e `purchase.spec.ts` |
| P-04.12 | A double click cannot buy twice | Press **Complete order**, then press it again while in flight | The button is disabled until the request settles | ✅ e2e `purchase.spec.ts` |
| P-04.13 | An anonymous visitor can complete a purchase in a browser | Full checkout with no session | Order confirmed | ✅ e2e `purchase.spec.ts` |

---

## P-05 · Payment processing

Full process: [P-05](../processes/P-05-payment-processing.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-05.1 | The provider is swappable — faking a payment must not leave technical debt | Read `orders.service.ts` constructor | It depends on the `PAYMENT_PROVIDER` token, never on `FakePaymentProvider` | ✅ `fake-payment.provider.spec.ts` |
| P-05.2 | A decline reverts everything | Buy repeatedly until one is declined (~1 in 10) | `402 PAYMENT_DECLINED`. Stock exactly as before | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-05.3 | The decline rate is real, so the rollback is observable by using the app | 40 purchases in a row | Roughly 4 declines. A run on 2026-08-29 gave exactly 36/4 | 🔶 manual — [TC-05](TC-05-purchase-flow.md) |
| P-05.4 | Tests never depend on luck | Inject a fixed random source | Charge approves or declines deterministically | ✅ `fake-payment.provider.spec.ts` |
| P-05.5 | A declined attempt still leaves an audit trail | Query `orders` after a decline | A `FAILED` order with its reason and **no stock movement** | ✅ `orders.service.spec.ts` |
| P-05.6 | One key, one outcome — replaying a declined key must not charge twice | Retry with the same idempotency key | Declines again. Retrying means a **new** attempt with a new key | ✅ `orders.service.spec.ts` |
| P-05.7 | A decline is a legitimate outcome, not a system failure | Read the UI message | "Payment declined", presented as retryable and visibly different from a stock conflict | ✅ `purchase.mapper.test.ts` · e2e `purchase.spec.ts` |

---

## P-06 · Authentication

Full process: [P-06](../processes/P-06-authentication.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-06.1 | A protected screen cannot be reached without a session | Open `/dashboard/product` signed out | Redirected to sign-in, screen never rendered | ✅ e2e `auth-session.spec.ts` |
| P-06.2 | Signing in returns you where you were going | Request a protected route, then sign in | Lands on the originally requested route | ✅ e2e `auth-session.spec.ts` |
| P-06.3 | Wrong credentials fail visibly and safely | Sign in with a wrong password | Inline error, stays on the sign-in screen | ✅ e2e `auth-session.spec.ts` |
| P-06.4 | A session survives a reload; logout really ends it | Sign in, reload, then log out | Session restored, then back to the unauthenticated state | ✅ `auth-token.test.ts` · e2e `auth-session.spec.ts` |
| P-06.5 | The shop stays public — closing the checkout would solve a problem that does not exist | Browse the catalog and a product detail signed out | Rendered, no redirect. `GET /products` answers `200` without a token | ✅ e2e `auth-session.spec.ts` |
| P-06.6 | The guard fails **closed**: a new endpoint is born protected | Call any protected route with no token | `401`. Forgetting to annotate produces a visible error, never a silent hole | ✅ `jwt-auth.guard.spec.ts` · `route-protection.spec.ts` |
| P-06.7 | Passwords never leave the service | Sign in and inspect the response | No `password` field anywhere | ✅ manual + `curl` (see P-06 doc) |
| P-06.8 | An import records who ran it | Import while signed in, open the history | The batch shows **Imported by** | ✅ `import.attribution.spec.ts` · e2e `product-import-batches.spec.ts` |
| P-06.9 | Import history is searchable by filename | Search a fragment of a filename in the history | Matching batches, case-insensitively; a distinct empty state when nothing matches | ✅ e2e `import-batch-search.spec.ts` |

---

## P-07 · Error contract

Full process: [P-07](../processes/P-07-error-contract.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-07.1 | Every error answers in the same shape, whatever layer failed | Trigger a `404`, `400`, `401`, `409` | All five fields present: `statusCode`, `error`, `message`, `path`, `timestamp` | ✅ `http-exception.filter.spec.ts` |
| P-07.2 | `error` is a code a client can branch on, not the status in prose | Look at any error body | `NOT_FOUND`, never `"Not Found"` | ✅ `http-exception.filter.spec.ts` |
| P-07.3 | Normalising the envelope must not destroy the detail | Trigger a stock conflict | `sku`, `requested`, `available` still present at the top level | ✅ `http-exception.filter.spec.ts` |
| P-07.4 | Several validation failures are reported together | Send two invalid parameters at once | `message` is the list of both | ✅ `http-exception.filter.spec.ts` |
| P-07.5 | The same database failure means the same thing everywhere | Duplicate a product sku, then a user email | Both `409 DUPLICATE_RESOURCE`. They used to be `409` and `400` | ✅ `database-error.translator.spec.ts` |
| P-07.6 | A refusal by a foreign key is a conflict, not a crash | Delete a sold product | `409 RESOURCE_IN_USE`. This used to be a `500` | ✅ `orders.concurrency.spec.ts` *(real database)* |
| P-07.7 | An internal failure never leaks internals | Force an unexpected error | Generic message to the client, full detail in the log only | ✅ `database-error.translator.spec.ts` |
| P-07.8 | A rate-limited request is not an internal error | Exceed the import limit | `429 TOO_MANY_REQUESTS` | ✅ `http-exception.filter.spec.ts` |

---

## P-08 · Security hardening

Full process: [P-08](../processes/P-08-security-hardening.md)

| ID | Purpose | Steps | Expected | Covered by |
|---|---|---|---|---|
| P-08.1 | CORS names its origin — `*` is not enterprise-grade | `curl -H "Origin: https://evil.test" .../products -D -` | No `Access-Control-Allow-Origin` header at all | ✅ `security.spec.ts` |
| P-08.2 | The allowed origin still works | Same with `Origin: http://localhost:3000` | Header echoes that origin | ✅ `security.spec.ts` |
| P-08.3 | Standard security headers are present | `curl -D - .../health` | HSTS, `nosniff`, `SAMEORIGIN`, `no-referrer`; no `X-Powered-By` | 🔶 manual |
| P-08.4 | The most expensive operation is metered | 7 imports in a row | `201` ×5, then `429` ×2 | ✅ `security.spec.ts` (config) · 🔶 manual (behaviour) |
| P-08.5 | The limit does not throttle normal use | 12 catalog requests in a row | All `200`. A limit that breaks the app gets removed by the next developer | ✅ `security.spec.ts` |
| P-08.6 | XSS is refused at the edge, not left to React | Import a row with markup in the name | Row rejected, payload reported verbatim as the reason | ✅ `import.service.spec.ts` · e2e `product-csv-cases.spec.ts` |

---

## Coverage summary

| Process | Cases | Automated | Manual only |
|---|---|---|---|
| P-01 CSV import | 11 | 10 | 1 |
| P-02 Product CRUD | 11 | 11 | 0 |
| P-03 Search and filters | 11 | 11 | 0 |
| P-04 Order placement | 13 | 13 | 0 |
| P-05 Payment processing | 7 | 6 | 1 |
| P-06 Authentication | 9 | 9 | 0 |
| P-07 Error contract | 8 | 8 | 0 |
| P-08 Security hardening | 6 | 4 | 2 |
| **Total** | **76** | **72** | **4** |

## What is still only manual

Four cases, and each for a stated reason rather than by omission.

| Case | Why it stays manual |
|---|---|
| P-01.11 oversized upload | Needs a file over 5 MB in the repo to automate |
| P-05.3 the ~10% decline rate | The browser spec forces a decline deterministically; the *rate* itself is asserted in `fake-payment.provider.spec.ts` over a uniform sweep, and observing it in the running app is the manual part |
| P-08.3 security headers | Asserting that helmet sets its own headers tests the library |
| P-08.4 rate-limit behaviour | The configuration is asserted; firing hundreds of requests in a suite is slow and proves little |

The checkout gap named in earlier versions of this document is closed: `purchase.spec.ts` drives the
full browser journey, including a forced decline, a stock conflict, the in-flight double click and
an anonymous purchase.

## Running everything

```bash
cd api && npm test              # 222 unit + fixture + real-database tests
cd api && npm run test:e2e      # 5 through the real HTTP stack
cd web && npm test              # 108 unit tests
cd web && npm run test:e2e      # 48 Playwright tests, needs the stack running
```

`purchase.spec.ts` is named to sort last on purpose: buying leaves permanent residue, since a
product that appears in an order cannot be deleted, so specs that count the catalog run first.

See [STRATEGY.md](STRATEGY.md) for what each level covers and what is deliberately left out.
