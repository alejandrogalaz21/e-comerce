# Testing strategy

What is tested, at which level, and — more usefully — **what is deliberately not tested**.

The backlog ticket that started this (TK-016) was written when coverage was 0%. Today it is
**323 API tests, 192 web unit tests, 76 Playwright browser tests and 5 API end-to-end tests**,
plus eight manual cases. This document explains the shape they took.

Every case is enumerated in [MATRIX.md](MATRIX.md): purpose, steps and expected result, one row
per use case.

## The principle

**A test earns its place if it can fail for a real reason.** A test asserting that a mock was
called proves that the code calls a mock. Where the guarantee lives in Postgres — row locking,
unique constraints, foreign keys — the test runs against a real database, because a mocked
repository can only assert that the code *says* `FOR UPDATE`, never that it works.

That single decision explains almost all of the structure below.

## The levels

| Level | Runs against | Command | Count |
|---|---|---|---|
| **Unit** | Mocks | `npm test` in `api/` | ~308 |
| **Integration (real fixture)** | The 97-row challenge CSV, with mocked repositories | `npm test` | 7 |
| **Integration (real database)** | Postgres on `:5432`, skipped when absent | `npm test` | 8 |
| **API end to end** | The real HTTP stack via supertest, skipped without a database | `npm run test:e2e` in `api/` | 5 |
| **Frontend unit** | Pure functions, no jsdom | `npm test` in `web/` | 192 |
| **Browser end to end** | The full Docker stack, driven by Playwright | `npm run test:e2e` in `web/` | 76 |
| **Manual** | The full Docker stack | [docs/testing/](.) | 8 cases |

`npm test` passes with or without Docker running. The database-backed specs detect its absence and
skip with a message rather than failing, so a reviewer running only the unit suite still gets a
green run.

## What each suite covers

### API tests — 323

| Suite | Tests | What it protects |
|---|---|---|
| `products.service.spec.ts` | 35 | Query building, filters, ordering, decimal handling |
| `import.service.spec.ts` | 25 | Row-by-row validation with the real cases from the sample file |
| `create-order.dto.spec.ts` | 25 | The order contract: UUID key, shipping address, payment method, and every field name a client might use to send a price |
| `route-protection.spec.ts` | 23 | Which endpoints are public and which are not, with no handler left unclassified |
| `product-filters.dto.spec.ts` | 23 | Parameter transformation, bounds, cross-validation of prices |
| `orders.service.spec.ts` | 23 | Purchase logic: totals, snapshots, idempotency, decline handling |
| `create-product.dto.spec.ts` | 19 | Every field rule, including HTML rejection |
| `http-exception.filter.spec.ts` | 17 | The error envelope, code resolution, no leaks |
| `cache.service.spec.ts` | 14 | Key building, prefix invalidation, behaviour without Redis |
| `import.hardening.spec.ts` | 13 | Malformed, empty, oversized and wrong-type files |
| `products.cache.spec.ts` | 11 | The catalog cache and what invalidates it |
| `orders.filters.spec.ts` | 11 | Order search by id, delivery details and sold lines |
| `import.attribution.spec.ts` | 11 | Who ran an import |
| `security.spec.ts` | 9 | CORS never resolves to `*`; the import carries a strict rate limit |
| `app.configuration.spec.ts` | 9 | Weak and absent JWT secrets, proxy hops, CORS parsing |
| `orders.concurrency.spec.ts` | 8 | **Real Postgres**: locking, deadlock-safe ordering, rollback, the FK refusal |
| `database-error.translator.spec.ts` | 8 | Postgres codes → HTTP, one translation for every module |
| `pagination.dto.spec.ts` | 7 | Page ceiling, integer validation, negative offsets |
| `import.integration.spec.ts` | 7 | The real 97-row CSV end to end |
| `jwt-auth.guard.spec.ts` | 6 | Fail-closed behaviour and the `@Public()` opt-out |
| `users.service.spec.ts` | 4 | The password hash never leaves, on read or on write |
| `products.controller.spec.ts` | 4 | Wiring and status codes |
| `fake-payment.provider.spec.ts` | 4 | Approve, decline, determinism with a fixed source, the ~10% rate |
| `auth.service.spec.ts` | 4 | Credential validation, token payload, no password in the response |
| `rate-limit.spec.ts` | 3 | That a route ceiling actually reaches a request |

### Web unit tests — 192

Pure functions only: URL state round-trips, mappers, schemas, token handling, the idempotency key
rule. There is no React Testing Library and no jsdom in the project, so components are not rendered
in tests — see **Gaps** below.

| Suite | Tests | What it protects |
|---|---|---|
| `product-list-params.test.ts` | 28 | The whole view state surviving in the URL |
| `product-schema.test.ts` | 18 | Client rules mirroring the server DTO |
| `purchase-params.test.ts` | 17 | Order filters in the address bar |
| `searchbar/utils.test.ts` | 17 | Page search over the live navigation tree |
| `import-utils.test.ts` | 13 | Status vocabulary, report shape |
| `cart-reconcile.test.ts` | 13 | Contrasting the cart against the catalog before charging |
| `auth-token.test.ts` | 13 | Token storage, expiry |
| `purchase.mapper.test.ts` | 13 | The purchase contract and error classification |
| `shop-params.test.ts` | 10 | Storefront search and filters in the URL |
| `purchase-utils.test.ts` | 8 | Order presentation helpers |
| `idempotency-key.test.ts` | 8 | Mint on entry, keep thereafter |
| `error.test.ts` | 7 | Authentication error handling |
| `product.mapper.test.ts` | 7 | Decimal strings → numbers at the render edge |
| `category-icon.test.ts` | 6 | Category → icon, with a mandatory fallback |
| `normalize-phone.test.ts` | 5 | Phone input normalisation |
| `server-errors.test.ts` | 5 | Server validation mapped onto form fields |
| `uuidv4.test.ts` | 4 | The local UUID generator |

### Browser end to end — 76 Playwright tests

Driven against the running stack with a single worker (the specs share a database and the import
spec resets the products table).

| Suite | Tests | What it protects |
|---|---|---|
| `storefront.spec.ts` | 14 | The public shop: search, category chips, pagination, the mini cart, the routes a guest meets |
| `purchase.spec.ts` | 12 | The full checkout: purchase, forced decline, a line that sold out, in-flight double click, anonymous buyer, the order read back by an administrator |
| `dashboard-page-search.spec.ts` | 11 | The dashboard page search: shortcut, highlighting, empty state |
| `product-filters.spec.ts` | 8 | Sorting across the catalog, chips, reload and back, remembered widths |
| `auth-session.spec.ts` | 7 | Redirects, returning to the requested route, reload, logout, the public shop |
| `product-csv-cases.spec.ts` | 6 | The hostile rows of the sample CSV, exercised through the real form |
| `products-crud.spec.ts` | 5 | Create, edit, delete through the confirm dialog, the shop grid |
| `product-import.spec.ts` | 4 | Uploading the real challenge CSV and reading the report |
| `import-batch-search.spec.ts` | 4 | Finding a batch by filename, case-insensitively |
| `product-import-batches.spec.ts` | 3 | History listing and batch detail |
| `product-search.spec.ts` | 2 | Server-side search and its empty state |

`product-csv-cases.spec.ts` is the interesting one: it takes the genuinely hostile rows from the
challenge file — the `<script>` payload, the SQL-injection sku, the whitespace-only name — and
drives them through the real form, proving the defence holds where a user would meet it.

### API end to end — 5 tests

`test/app.e2e-spec.ts`, via supertest. What it adds over the unit suites is the **real HTTP
stack**: the global pipe and the exception filter actually running over a request, which no mock
can show.

## The tests that matter most

If you are going to read four, read these — they cover behaviour that is expensive to get wrong.

**`orders.concurrency.spec.ts` — two buyers, one unit.** Real database. Fires two simultaneous
purchases of the last item and asserts that exactly one succeeds and that stock lands on zero,
never `-1`. It also covers the deadlock case `initial.md` §5 does not consider: two orders listing
the same products in opposite sequence.

**`orders.service.spec.ts` — the total summed in integer cents.** Uses prices that break in binary
floating point and asserts the total is exact to the cent.

**`import.integration.spec.ts` — the real 97-row file.** Asserts the exact bucket every row lands
in. It is the test that caught bug TK-047: it had *encoded* the defect, expecting rejected rows to
arrive without a name.

**`fake-payment.provider.spec.ts` — determinism with a fixed source.** The provider declines ~10%
of charges on purpose, and this proves the randomness is injectable so no other test depends on
luck.

## What is deliberately not tested

Stating this is the point of a strategy document; a list of what exists is just a report.

| Not tested | Why |
|---|---|
| **React components in isolation** | There is no jsdom and no Testing Library in the project. Component behaviour is covered where it actually matters — in a real browser, with the Playwright specs — rather than in a simulated DOM. |
| **The real ~10% decline rate in a browser** | `purchase.spec.ts` forces a decline by intercepting the response, which keeps it deterministic. The rate is asserted over a uniform sweep in `fake-payment.provider.spec.ts`, and observing it in the running app is left manual ([TC-05](TC-05-purchase-flow.md), [TC-06](TC-06-concurrency-and-races.md)). |
| **Rate limiting under real load** | The configuration is asserted; firing 300 requests in a test would be slow and prove little. |
| **Helmet's individual headers** | Asserting that a library sets its own headers is testing the library. |
| **A dependency failing mid-operation** | Stopping a container during a transaction does not automate cheaply. It is the axis of [TC-06 · R9](TC-06-concurrency-and-races.md) and [TC-08](TC-08-status-and-degradation.md). |
| **Migration rollback** | Verified by hand when writing them; automating it needs a throwaway database per run. |

## Known weaknesses

- **A mock-based unit suite can drift from reality.** Mitigated by the real-database and
  real-fixture suites, which is where every guarantee that depends on Postgres lives.
- **The database-backed specs share the development database.** They seed rows with a
  `CONCURRENCY-TEST-` prefix and delete them afterwards. A dedicated test database would be
  cleaner; the prefix is the pragmatic version.
- **There is no enforced coverage threshold in CI.** Coverage is available with
  `npm run test:cov`, but a percentage gate tends to reward tests written to raise a number.
- **The manual cases have no staleness guard.** [TC-05](TC-05-purchase-flow.md) once documented a
  `POST /orders` payload the API already rejected, because the DTO hardened the idempotency key and
  added the shipping address without anyone returning to the document. When a contract changes,
  `MATRIX.md` and the TCs are reviewed with it.

## Running them

```bash
# API: unit + fixture + against a real database (the last are skipped without Postgres)
cd api && npm test

# API end to end through the real HTTP stack (skipped without a database)
cd api && npm run test:e2e

# Web unit
cd web && npm test

# Browser end to end — needs the whole stack up
docker compose up -d --build
cd web && npm run test:e2e

# Coverage
cd api && npm run test:cov
```

Last full run, 2026-09-01: **323 + 5 + 192 + 76 = 596 automated tests, all passing.**

## Manual cases

Automated tests cannot check that a screen reads well, nor that a downed container degrades
gracefully. The eight cases in [docs/testing/](.) cover what the suites cannot reach:

| Case | What it covers that automation does not |
|---|---|
| [TC-01](TC-01-initial-import.md) – [TC-03](TC-03-unchanged-does-not-write.md) | The import pipeline against the real file, with the report in view |
| [TC-04](TC-04-report-consistency-and-layout.md) | Report readability: icons, column order, layout |
| [TC-05](TC-05-purchase-flow.md) | The full purchase flow, including the declined payment as a customer meets it |
| [TC-06](TC-06-concurrency-and-races.md) | **Observable concurrency**: the race, the deadlocks and the rollback against the real stack, not against a spec |
| [TC-07](TC-07-login-and-permissions.md) | The public/protected matrix checked endpoint by endpoint, and token tampering |
| [TC-08](TC-08-status-and-degradation.md) | Stopping Postgres or Redis and seeing the API answer `ok:false` instead of `500` |
