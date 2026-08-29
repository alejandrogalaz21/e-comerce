# Test strategy

What is tested, at which level, and — more usefully — **what is deliberately not**.

The backlog entry for this (TK-016) was written when coverage was 0%. It is now **222 API unit
tests, 103 web unit tests, 40 Playwright browser tests and 5 API e2e tests**, plus five manual
cases. This document explains the shape they took.

Every case is enumerated in [MATRIX.md](MATRIX.md): purpose, steps and expected result, one row per
use case.

## The principle

**A test earns its place by being able to fail for a real reason.** A test that asserts a mock was
called proves the code calls a mock. Where the guarantee lives in Postgres — row locking, unique
constraints, foreign keys — the test runs against a real database, because a mocked repository can
only assert that the code *says* `FOR UPDATE`, never that it works.

That single decision explains most of the structure below.

## The levels

| Level | Runs against | Command | Count |
|---|---|---|---|
| **Unit** | Mocks | `npm test` in `api/` | ~208 |
| **Integration (real fixture)** | The actual 97-row challenge CSV, mocked repositories | `npm test` | 7 |
| **Integration (real database)** | Postgres on `:5432`, skipped when absent | `npm test` | 7 |
| **API e2e** | The real HTTP stack via supertest, skipped without a database | `npm run test:e2e` in `api/` | 5 |
| **Frontend unit** | Pure functions, no jsdom | `npm test` in `web/` | 103 |
| **Browser e2e** | The full Docker stack, driven by Playwright | `npm run test:e2e` in `web/` | 40 |
| **Manual** | The full Docker stack | [docs/testing/](.) | 5 cases |

`npm test` passes with or without Docker running. The database-backed specs detect the absence of a
database and skip with a message rather than failing, so a reviewer who only runs the unit suite
still gets a green run.

## What each suite covers

### API unit — 222 tests

| Suite | Tests | What it protects |
|---|---|---|
| `products.service.spec.ts` | 35 | Query building, filters, sorting, decimal handling |
| `import.service.spec.ts` | 25 | Row-by-row validation with the real cases from the sample file |
| `create-product.dto.spec.ts` | 19 | Every field rule, including HTML rejection |
| `product-filters.dto.spec.ts` | 18 | Parameter transforms, bounds, cross-field price validation |
| `orders.service.spec.ts` | 15 | Purchase logic: totals, snapshots, idempotency, decline handling |
| `http-exception.filter.spec.ts` | 13 | The error envelope, code resolution, no leakage |
| `import.hardening.spec.ts` | 13 | Malformed, empty, oversized and wrong-type files |
| `import.attribution.spec.ts` | 11 | Who ran an import |
| `database-error.translator.spec.ts` | 8 | Postgres codes → HTTP, one translation for all modules |
| `import.integration.spec.ts` | 7 | The real 97-row CSV end to end |
| `orders.concurrency.spec.ts` | 7 | **Real Postgres**: locking, deadlock ordering, rollback, FK refusal |
| `jwt-auth.guard.spec.ts` | 6 | Fail-closed behaviour and the `@Public()` opt-out |
| `security.spec.ts` | 6 | CORS never resolves to `*`; the import carries a strict rate limit |
| `fake-payment.provider.spec.ts` | 4 | Approve, decline, determinism under a fixed source, the ~10% rate |
| `products.controller.spec.ts` | 4 | Wiring and status codes |
| `route-protection.spec.ts` | 3 | Which endpoints are public and which are not |

### Web — 103 tests

Pure functions only: URL state round-trips, mappers, schemas, token handling, the idempotency-key
rule. There is no React Testing Library or jsdom in this project, so components are not rendered in
tests — see **Gaps** below.

| Suite | Tests | What it protects |
|---|---|---|
| `product-list-params.test.ts` | 28 | The whole view state surviving the URL |
| `product-schema.test.ts` | 18 | Client rules mirroring the server DTO |
| `import-utils.test.ts` | 13 | Status vocabulary, report shaping |
| `auth-token.test.ts` | 13 | Token storage, expiry |
| `purchase.mapper.test.ts` | 8 | The purchase contract and error classification |
| `product.mapper.test.ts` | 7 | Decimal strings → numbers at the render edge |
| `error.test.ts` | 7 | Auth error handling |
| `server-errors.test.ts` | 5 | Server validation mapped onto form fields |
| `idempotency-key.test.ts` | 4 | Mint on entry, keep thereafter |

### Browser end to end — 40 Playwright tests

Driven against the running stack, one worker (the specs share a database and the import spec resets
the products table).

| Suite | Tests | What it protects |
|---|---|---|
| `product-filters.spec.ts` | 8 | Sorting across the catalog, chips, reload and back, remembered column widths |
| `auth-session.spec.ts` | 7 | Redirects, returning to the requested route, reload, logout, the public shop |
| `products-crud.spec.ts` | 5 | Create, edit, delete through the confirm dialog, the shop grid |
| `product-csv-cases.spec.ts` | 6 | The nasty rows of the sample CSV, exercised through the real form |
| `import-batch-search.spec.ts` | 4 | Finding a batch by filename, case-insensitively |
| `product-import.spec.ts` | 4 | Uploading the real challenge CSV and seeing the report |
| `product-import-batches.spec.ts` | 3 | History list and batch detail |
| `product-search.spec.ts` | 2 | Server-side search and its empty state |

`product-csv-cases.spec.ts` is the interesting one: it takes the genuinely hostile rows from the
challenge file — the `<script>` payload, the SQL-injection sku, the whitespace-only name — and
drives them through the actual form, proving the defence holds where a user would meet it.

### API end to end — 5 tests

`test/app.e2e-spec.ts`, via supertest. What it adds over the unit suites is the **real HTTP stack**:
the global pipe and the exception filter actually running on a request, which no mock can show.

## The tests that matter most

If you read four, read these — they are the ones covering behaviour that is expensive to get wrong.

**`orders.concurrency.spec.ts` — two buyers, one unit.** Real database. Fires two simultaneous
purchases of the last item and asserts exactly one succeeds and stock lands on zero, never `-1`.
Also covers the deadlock case that `initial.md` §5 does not: two orders listing the same products
in opposite sequence.

**`orders.service.spec.ts` — the total is summed in integer cents.** Uses prices that break in
binary floating point and asserts the total is exact to the cent.

**`import.integration.spec.ts` — the real 97-row file.** Asserts the exact bucket every row lands
in. This is the test that caught the TK-047 bug: it had *encoded* the defect, expecting rejected
rows to arrive without a name.

**`fake-payment.provider.spec.ts` — determinism under a fixed source.** The provider declines ~10%
of charges on purpose, and this proves the randomness is injectable so no other test depends on
luck.

## What is deliberately not tested

Stating this is the point of a strategy document; a list of what exists is just a report.

| Not tested | Why |
|---|---|
| **React components in isolation** | No jsdom or Testing Library in the project. Component behaviour is covered where it actually matters — in a real browser, by the 40 Playwright specs — rather than in a simulated DOM. |
| **The checkout in a browser** | The one real gap. Purchase logic has 15 unit tests and 7 against a real database, but no Playwright spec drives the checkout. Covered manually by [TC-05](TC-05-purchase-flow.md). First thing to add if this continues. |
| **Rate limiting under real load** | The configuration is asserted; firing 300 requests in a test would be slow and prove little. |
| **Helmet's individual headers** | Asserting a library sets its own headers tests the library. |
| **The Redis cache** | Not built (TK-038). |
| **Migration rollback** | Verified manually when written; automating it needs a disposable database per run. |

## Known weaknesses

- **A unit suite of mocks can drift from reality.** Mitigated by the real-database and real-fixture
  suites, which is where every guarantee that depends on Postgres lives.
- **The database-backed specs share the development database.** They seed rows with a
  `CONCURRENCY-TEST-` prefix and delete them afterwards. A dedicated test database would be
  cleaner; the prefix is the pragmatic version.
- **No coverage threshold is enforced in CI.** Coverage is available via `npm run test:cov`, but a
  percentage gate tends to reward tests written to raise a number.

## Running them

```bash
# API unit + fixture + database-backed (the last skip if no Postgres)
cd api && npm test

# API end to end through the real HTTP stack (skips without a database)
cd api && npm run test:e2e

# Web unit
cd web && npm test

# Browser end to end — needs the whole stack up
docker compose up -d --build
cd web && npm run test:e2e

# Coverage
cd api && npm run test:cov
```

Last full run, 2026-08-29: **222 + 5 + 103 + 40 = 370 automated tests, all passing.**

## Manual cases

Automated tests cannot check that a screen reads well. The five cases in [docs/testing/](.) cover
what the suites cannot: [TC-01](TC-01-initial-import.md) to [TC-03](TC-03-unchanged-does-not-write.md)
for the import pipeline, [TC-04](TC-04-report-consistency-and-layout.md) for report legibility, and
[TC-05](TC-05-purchase-flow.md) for the purchase flow including the race and the declined payment.
