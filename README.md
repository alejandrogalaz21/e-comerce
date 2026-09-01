# LoanPro Code Challenge — E-Commerce

Enterprise-grade e-commerce: a public storefront, product CRUD, CSV import, search, and a purchase
flow with a faked payment.

By **Alex Galaz** — [github.com/alejandrogalaz21](https://github.com/alejandrogalaz21) ·
[alejandrogalaz21@gmail.com](mailto:alejandrogalaz21@gmail.com) ·
repository at [alejandrogalaz21/e-commerce](https://github.com/alejandrogalaz21/e-commerce)

- **Sample CSV download date: 2026-08-26** — the provided file is committed at
  [`docs/csv/`](docs/csv/) so the import can be reproduced exactly
- Stack: NestJS 10 + TypeORM + PostgreSQL 16 + Redis · React 18 + Vite + MUI · Docker Compose
- **596 automated tests** across four levels, plus eight manual cases with their evidence

**Start here:** `docker compose up --build`, then http://localhost:3000. The shop is the front
door and needs no account; sign in with `demo@demo.com` / `demo` to manage the catalog.

### What was asked, and where it is

The challenge in one table, each requirement pointing at the code that satisfies it and the
document that explains how.

| # | Requirement | Where it lives | How it works |
|---|---|---|---|
| 1 | Local database (SQL/NoSQL) | PostgreSQL 16 in [`docker-compose.yml`](docker-compose.yml), schema in [`api/src/database/migrations/`](api/src/database/migrations/) | Versioned migrations run at boot; `synchronize` is off |
| 2 | CRUD for products | [`products.controller.ts`](api/src/modules/products/products.controller.ts) · UI at *Dashboard → Product* | [P-02](docs/processes/P-02-product-crud.md) |
| 3 | Import products from a CSV | [`import.service.ts`](api/src/modules/import/import.service.ts) · UI at *Dashboard → Product → Import CSV* | [P-01](docs/processes/P-01-csv-import.md) |
| 4 | CSV columns: name, sku, description, category, price, stock, weight_kg | [`import.service.ts`](api/src/modules/import/import.service.ts) `EXPECTED_HEADERS` | Missing **and** unexpected columns are both rejected — [P-01](docs/processes/P-01-csv-import.md) |
| 5 | Search for products | [`products.service.ts`](api/src/modules/products/products.service.ts) `findAll` | Multi-term search, category, price range, availability, sorting — [P-03](docs/processes/P-03-product-search.md) |
| 6 | Purchase products | [`orders.service.ts`](api/src/modules/orders/orders.service.ts) `create` | Locking, stock, total, idempotency — [P-04](docs/processes/P-04-order-placement.md) |
| 7 | Fake the payment | [`fake-payment.provider.ts`](api/src/modules/payment/fake-payment.provider.ts) | Behind an interface, declines ~10%, randomness injected — [P-05](docs/processes/P-05-payment-processing.md) |
| 8 | UI for CRUD, search and purchase | [`web/src/sections/product/`](web/src/sections/product/) · [`web/src/sections/checkout/`](web/src/sections/checkout/) · [`web/src/sections/purchase/`](web/src/sections/purchase/) | [Frontend architecture](#frontend-architecture-web) |
| 9 | Runnable as a Docker container | [`docker-compose.yml`](docker-compose.yml) · [`api/Dockerfile`](api/Dockerfile) · [`web/Dockerfile`](web/Dockerfile) | One command, no `.env` needed — [How to run](#how-to-run) |
| 10 | README: decisions, approach, alternatives | this file | [Key decisions](#key-decisions-summary) · [Alternatives considered](#alternatives-considered) · [What is not built](#what-is-not-built-and-why) |
| 11 | Date the sample CSV was downloaded | top of this file: **2026-08-26** | — |
| 12 | Instructions to run it locally | [How to run](#how-to-run) | Docker and manual paths, both verified |
| 13 | AI allowed, comments removed from the code | the source carries no comments; only lint and compiler directives remain | [How AI was used](#how-ai-was-used-and-where-the-reasoning-lives) |
| 14 | Public GitHub repository | [alejandrogalaz21/e-commerce](https://github.com/alejandrogalaz21/e-commerce) | — |

> The brief closes by saying the challenge is not about completing the requirements — AI can do
> that — but about asking the right questions and applying judgement. [How this was
> built](#how-this-was-built) is the answer to that: every feature was proposed and argued in
> writing before it was code, and those documents are in the repository.

### Verifying it in five minutes

Start the stack, open http://localhost:3000, and sign in with `demo@demo.com` / `demo`. **The
catalog is empty on purpose** — step 1 fills it.

The file to upload is the one the challenge provided, committed so the run is reproducible:

```
docs/csv/LoanPro Code Challenge E-Commerce.csv
```

97 rows, and deliberately hostile in places: a `<script>` payload, an injection SKU, a duplicate
SKU, `"free"` where a price should be, a negative stock, and two blank lines. All of that is the
point — watch where each row lands.

| # | Do this | What it proves |
|---|---|---|
| 1 | Sign in, then *Dashboard → Product → Import CSV* and upload the file above | CSV import, per-row validation, partial import with a report. **85 created, 10 rejected, 2 skipped** — and the report names every rejection with its line number and reason |
| 2 | Open the shop at `/` and search or filter by category | Server-side search and filtering over the imported catalog |
| 3 | Add products to the cart and complete the checkout | Purchase with a simulated payment, stock decremented in the same transaction |
| 4 | Go to *Dashboard → Orders* and open the order you just placed | The order is read back from the database, not from sample data |
| 5 | Edit that product's price, then reopen the order | The line keeps the price it was bought at and flags the difference |
| 6 | Note the product's stock before step 3, and recheck it after | Stock drops immediately: buying clears the cached catalog, not just the database |
| 7 | Search the orders table by that product's SKU | Filtering runs on the server, across every page, since an order has no customer to search by |

Step 5 is the interesting one. Each order line stores `unit_price_snapshot`, so a later price
change never rewrites history. The order detail also shows the **idempotency key** (replaying it
returns the same order instead of charging twice) and the **payment reference** returned by the
simulated provider, prefixed `fake_ch_` so it is obvious no real charge happened. A declined order
shows its decline reason instead.

### Where the work went beyond the checklist

The brief says the point is not completing the requirements but showing judgement. These are the
five places that judgement is visible, each with something you can run:

| | What | Evidence |
|---|---|---|
| **Concurrency** | Two buyers, one unit left. Rows are locked `FOR UPDATE` **ordered by `id`**, which is what stops two multi-line orders from deadlocking. Stock lands on zero, never `-1` | [`orders.concurrency.spec.ts`](api/src/modules/orders/orders.concurrency.spec.ts) — 8 cases against a real Postgres, not mocks |
| **Idempotency** | The key is minted when the cart fills, not when the button is pressed. Replays are decided by `UNIQUE(idempotency_key)` and a caught unique violation, never by a read-then-write | [P-04](docs/processes/P-04-order-placement.md) · [`create-order.dto.spec.ts`](api/src/modules/orders/dto/create-order.dto.spec.ts) |
| **Money** | `numeric` in the column, string on the wire, **integer cents** in the sum. Each line freezes `unit_price_snapshot`, so a price change never rewrites a past order | [`orders.service.spec.ts`](api/src/modules/orders/orders.service.spec.ts), with prices that break in binary floating point |
| **A hostile CSV** | The provided file contains `<script>` payloads, an injection SKU, a duplicate SKU, `"free"` as a price and negative stock. Every row lands in a named bucket and the import never returns a 500 | [`import.integration.spec.ts`](api/src/modules/import/import.integration.spec.ts) · [`product-csv-cases.spec.ts`](web/e2e/product-csv-cases.spec.ts) |
| **Saying no** | [What is not built, and why](#what-is-not-built-and-why) and [Alternatives considered](#alternatives-considered) — including the one real limit of this design: the charge runs inside the database transaction, which is right for a local provider and wrong for a remote one |

## How to run

### Before you start

| | |
|---|---|
| **Docker** | Docker Desktop, or Docker Engine 20.10+ with the Compose v2 plugin (`docker compose`, not `docker-compose`). Nothing else is required for the Docker path — no Node, no Postgres, no Redis on your machine |
| **Node 20+** | Only for the manual path below and for running the test suites from your host |
| **Free ports** | `3000`, `4000`, `5432`, `6379`. **5432 is the one that usually collides**, since a locally installed Postgres holds it — see [If something does not start](#if-something-does-not-start) |
| **Disk and time** | ~1.5 GB of images. The first `--build` takes 2–4 minutes; later starts are seconds |

### With Docker (full stack)

```bash
docker compose up --build -d
```

`-d` returns the terminal to you once the stack is up, which is what you want next — the test
suites run from the same shell. Drop it if you would rather watch the logs stream, but then
`Ctrl+C` stops the whole stack.

Either way the last lines name the four services, and the one to wait for is:

```
Container ecommerce-api  Healthy
```

The web container waits for that itself, so by the time the page loads the API is answering.

| Service | URL |
|---|---|
| Front (web) | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/v1/docs |
| PostgreSQL | localhost:5432 (user `postgres`, password `changeme`, db `ecommerce`) |

```bash
docker compose ps          # what is up, and whether it is healthy
docker compose logs -f api # follow the API log
docker compose down        # stop everything, keep the data
docker compose down -v     # stop everything and wipe the database, for a clean run
```

**Four services start by default: `db`, `redis`, `api`, `web`.** Two database consoles ship with
the project but sit behind a Compose profile so they stay out of a normal run — see
[Inspecting the data stores](#inspecting-the-data-stores-optional).

No `.env` required (everything has defaults); to override values, copy `.env.example` to `.env`.

One default is deliberately absent: **`JWT_SECRET` ships empty**, so the API generates a random
signing key at boot and says so in its log. Sessions therefore end when the container restarts —
which is loud and harmless. A placeholder committed here would be the opposite: a published signing
key anyone could use to mint an administrator token. Set `JWT_SECRET` (16+ characters) to keep
sessions across restarts; a known placeholder like `changeme` stops the boot on purpose.

The application starts with an **empty catalog** on purpose — you create everything through the
UI (product CRUD, or CSV import at *Dashboard → Product → Import CSV* using the challenge sample
file). Migrations run automatically at boot and seed a single **demo login**:

| | |
|---|---|
| Email | `demo@demo.com` |
| Password | `demo` |

### What needs a session

Shopping is open to everyone; managing the catalog is not.

| Open to anyone | Requires signing in |
|---|---|
| Browsing the catalog, product detail, and completing a purchase | Creating, editing and deleting products |
| | Taking a product off the catalog and putting it back on sale |
| | Listing or opening a product that was taken off the catalog |
| | Reading a product's change history |
| | Creating an account: an account only grants catalog administration |
| `GET /health` (monitoring) | CSV import and its batch history |
| | Infrastructure status and diagnostics |

The API enforces this with a global JWT guard and an explicit `@Public()` opt-out, so it fails
closed: a new endpoint is protected unless someone deliberately opens it.

### Local development (manual)

```bash
# 1. Database and cache (containers only)
docker compose up -d db redis

# 2. API — http://localhost:8080/api/v1
cd api && cp .env.example .env && npm install && npm run dev

# 3. Front — http://localhost:3000 (Vite dev server)
cd web && cp .env.example .env && npm install && npm run dev
```

Note the port: under Docker the API is published on **4000**, running it directly it listens on
**8080**. `web/.env.example` already points at 8080, so the two files match their own path.

### Configuration

**Every variable has a default and the stack starts without a `.env`.** These are the knobs, not a
setup checklist — reach for them only if a port collides or you want sessions to survive a restart.

Three files, three scopes:

| File | Read by | Purpose |
|---|---|---|
| [`.env.example`](.env.example) | `docker-compose.yml` | The handful of values Compose interpolates into the containers |
| [`api/.env.example`](api/.env.example) | the API when run directly (`npm run dev`) | Every API variable, each documented inline |
| [`web/.env.example`](web/.env.example) | Vite at build time | Where the browser should call the API |

The ones worth knowing:

| Variable | Default | What it does |
|---|---|---|
| `JWT_SECRET` | *(empty)* | **Deliberately unset.** Empty generates a random key per boot; a value of 16+ characters keeps sessions across restarts. A known placeholder like `changeme` stops the boot on purpose |
| `DB_USER` · `DB_PASSWORD` · `DB_NAME` | `postgres` · `changeme` · `ecommerce` | Applied to both the database container and the API, so they cannot drift apart |
| `VITE_SERVER_URL` | `http://localhost:4000` | Where the browser calls the API. Baked in at **build** time, so changing it needs `docker compose up --build` |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allow-list. Never `*` |
| `THROTTLE_LIMIT` | `300` / min | Global ceiling. Loose because the status page polls |
| `ORDER_RATE_LIMIT` | `20` / min | `POST /orders` — the only public route that writes and charges |
| `IMPORT_RATE_LIMIT` | `20` / min | CSV import, the most expensive operation exposed |
| `AUTH_RATE_LIMIT` | `30` / min | Sign-in attempts per address |
| `TRUST_PROXY_HOPS` | `0` | How many reverse proxies sit in front. Rate limits count by client IP, and behind a proxy every request carries the proxy's address unless this says how far down `X-Forwarded-For` to trust |
| `DB_SYNC` | `false` | Never turn this on. The schema belongs to the migrations |
| `DB_PORT_HOST` · `API_PORT_HOST` · `WEB_PORT_HOST` · `REDIS_PORT_HOST` | `5432` · `4000` · `3000` · `6379` | Only the **host** side of each mapping, for when a port is taken. The containers always reach each other on their internal ports, so moving these changes nothing inside the stack |

### If something does not start

| Symptom | Cause | Fix |
|---|---|---|
| `port is already allocated` on **5432** | A Postgres already installed on your machine holds it | `DB_PORT_HOST=5433 docker compose up --build`. Nothing inside the stack changes — the containers still talk to each other on 5432 |
| Same on **3000**, **4000** or **6379** | Another dev server or a local Redis | `WEB_PORT_HOST=3001 API_PORT_HOST=4001 REDIS_PORT_HOST=6380 docker compose up --build`. If you move the API port, also set `VITE_SERVER_URL=http://localhost:4001` so the browser follows it |
| The shop loads but shows no products | Expected: **the catalog starts empty on purpose** | Sign in and import the CSV — see step 1 of [Verifying it in five minutes](#verifying-it-in-five-minutes) |
| Sign-in fails right after a rebuild | `JWT_SECRET` is unset, so the key is regenerated each boot and old tokens stop working | Sign in again, or set `JWT_SECRET` to keep sessions |
| `database "ecommerce" does not exist` | A half-initialised volume from an interrupted first run | `docker compose down -v && docker compose up --build` |
| The browser suite fails | The stack is not up, or Chromium is missing | `docker compose up -d --build`, then `npx playwright install chromium` |

### Inspecting the data stores (optional)

Two web consoles ship with the project, behind the `devtools` Compose profile. **A profiled
service is skipped unless its profile is named**, which is why `docker compose up -d` starts four
containers and not six — that is deliberate, not a failure. Diagnostics with full read/write
access to the data should not be part of running the app.

Ask for them explicitly:

```bash
docker compose --profile devtools up -d
```

That brings up the four application services **and** the two consoles. To stop everything
afterwards, name the profile again, or the consoles are left running:

```bash
docker compose --profile devtools down
```

| Console | URL | Connects to | Credentials |
| --- | --- | --- | --- |
| Adminer | http://localhost:8081/?pgsql=db&username=postgres&db=ecommerce | server `db`, PostgreSQL | password from `DB_PASSWORD` in `.env` (`changeme` by default) |
| RedisInsight | http://localhost:5540 | `redis:6379` (pre-registered) | none |

The Adminer link carries the driver, server, user and database in the query string: the plain
`http://localhost:8081` opens on MySQL, because the image's default-server variable does not set the
driver. Only the password is left to type.

These are development tools with full read/write access to real data and no authentication of
their own — never expose them outside your machine. The RedisInsight service sets
`RI_ACCEPT_TERMS_AND_CONDITIONS`, which accepts Redis' terms on your behalf so the connection is
registered without any manual step; drop that variable if you prefer to accept them yourself on
first launch.

## How to run the tests

**596 automated tests.** Every level runs green; the browser suite needs the stack up.

| Suite | What it covers | Count | Command |
|---|---|---|---|
| API unit + fixture + real database | Domain logic, the real 97-row CSV, and locking and filtering against Postgres | 323 | `cd api && npm test` |
| API end to end | The real HTTP stack: global pipe and exception filter on a live request | 5 | `cd api && npm run test:e2e` |
| Web unit | URL state, mappers, schemas, token handling | 192 | `cd web && npm test` |
| Browser end to end | The whole app driven by Playwright | 76 | `cd web && npm run test:e2e` |

Playwright reports 77: the extra one is the sign-in fixture that runs as its own project, not a test.

```bash
docker compose up -d --build     # the browser suite needs the stack
cd api && npm test && npm run test:e2e
cd web && npm test && npm run test:e2e
```

First Playwright run only: `npx playwright install chromium`.

`npm test` passes with or without Docker. The database-backed specs detect the absence of a
database and skip with a message rather than failing.

**What is worth reading**, if you read five:

- `orders.concurrency.spec.ts` — two simultaneous buyers, one unit left, against a real Postgres.
  Exactly one wins and stock lands on zero, never `-1`.
- `import.integration.spec.ts` — the real challenge CSV, asserting the bucket every one of the 97
  rows lands in.
- `orders.service.spec.ts` — the total summed in integer cents, with prices that break in binary
  floating point.
- `product-csv-cases.spec.ts` — the hostile rows of the sample file (`<script>`, SQL-injection SKU)
  driven through the actual form, where a user would meet them.
- `orders.filters.spec.ts` — searching orders by a SKU still finds them after the product is
  renamed, because the filter reads the sold line and not the catalog.

Two documents make this navigable rather than a wall of names:

| Document | What it gives you |
|---|---|
| [docs/testing/MATRIX.md](docs/testing/MATRIX.md) | **115 use cases**, each with its purpose, steps, expected result and the test that guards it |
| [docs/testing/STRATEGY.md](docs/testing/STRATEGY.md) | What is tested at which level, and — more usefully — what is deliberately **not**, with the reasoning |

[TC-06](docs/testing/TC-06-concurrency-and-races.md) is the one to read if you only read one: ten reproducible race conditions against the running stack —
two buyers and one unit, multi-line deadlocks, the same idempotency key fired in parallel, a declined
charge rolling back, Redis down mid-sale.

**Storybook** — interactive catalog of the reusable components (not a test suite, but useful for
visual review):

```bash
cd web && npm run storybook
```

## Backend architecture (`api/`)

NestJS 10 + TypeORM + PostgreSQL 16 + Redis, organized in three layers plus feature-based
domain modules. The `products` module (with its `import/` submodule) is the reference
implementation.

```
api/src/
├── main.ts                   # bootstrap: prefix api/v1, global ValidationPipe, Swagger, CORS
├── app.module.ts             # composition root
├── config/                   # typed env namespaces (registerAs): app.*, pg.*, redis.*
├── database/                 # DATA STORES — one folder per engine + versioned schema
│   ├── postgres/             #   injectable TypeORM connection + pg health
│   ├── redis/                #   ioredis client provider (cache-ready)
│   ├── migrations/           #   versioned schema + demo-user data, run automatically at boot
│   └── data-source.ts        #   typeorm CLI entry (migration:generate|run|revert)
├── common/                   # CROSS-CUTTING — pagination, sanitizers, logger middleware, shared OpenAPI responses
└── modules/<name>/           # TOP-LEVEL feature modules (no nested submodules):
    │                         #   products, import (CSV), users, auth, health, status
    ├── controller            #   HTTP only (routes, pipes, status codes) — zero business logic
    ├── docs/                 #   OpenAPI, one composed decorator per endpoint
    ├── service               #   business rules + repositories
    ├── entities/  dto/       #   DB contract (constraints) / wire contract (validation + examples)
```

```
Request flow:  middleware → guard → ValidationPipe (DTO) → controller → service → repository → DB constraints
```

Key rules: `process.env` is read only inside `config/`; schema changes are always migrations
(`synchronize` off); money/weights are `numeric` (never float) and travel as strings; uploaded
CSVs are processed **in memory** and never written to disk — what persists is the audit record
(`import_batches` counters + per-row JSONB report). Full guide in
`.claude/skills/be-architecture/SKILL.md`.

## Frontend architecture (`web/`)

React 18 + Vite + strict TypeScript + MUI v5 + **TanStack Query (React Query)**, organized in
layers with a single dependency direction. The `status` module (`/status`) is the reference
implementation of the pattern.

```
web/src/
├── types/<domain>.ts             # 1. CONTRACTS — types only, zero logic
├── actions/<domain>.ts           # 2. ACTIONS — pure request functions (axios) + mappers
├── sections/<domain>/
│   ├── hooks/use-<domain>.ts     # 3. FACADE — React Query wrapping the actions (query keys + mutations)
│   ├── components/               # 4. DOMAIN components — presentational, receive props
│   └── view/<domain>-view.tsx    # 5. VIEW — pure composition: calls hooks, passes props
├── pages/                        # thin per-route wrappers (Helmet + view)
├── components/                   # GENERIC reusable components (domain-agnostic)
├── hooks/                        # generic UI hooks (use-boolean, use-debounce...)
├── lib/                          # configured clients: axios (instance + endpoints), query-client
├── utils/                        # pure stateless helpers (format-time, format-number...)
├── routes/                       # paths.ts (every URL) + lazy route tree
├── layouts/  theme/  auth/       # layouts (shop/admin), MUI theme, JWT context
```

```
Data flow:   view → hooks (facade) → actions → axios → API
```

Key rules: components never call axios or React Query directly (facade hooks only); every
contract lives in `types/`; mutations live next to their queries and invalidate through
centralized query keys; `lib/` = configured library instances, `utils/` = pure functions.
The full guide for new development is in `.claude/skills/fe-architecture/SKILL.md`.

## Purchase flow

Buying is the one place in this project where money, state and concurrency meet, so it is the
part built most defensively.

```
  POST /orders  (public: you buy without an account)
    |
    +-- BEGIN TRANSACTION
    |     SELECT ... FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE
    |     check stock per line ......................... short? ROLLBACK -> 409
    |     total = SUM(price * qty)   <- server-side, in integer cents
    |     INSERT order (PENDING) + order_items (unit_price_snapshot)
    |     payment.charge(total) ......................... declined? ROLLBACK -> 402
    |     UPDATE products SET stock = stock - qty
    |     UPDATE order SET status = PAID
    +-- COMMIT
```

**Nothing half-happens.** Order, stock and charge share one transaction. The charge runs *inside*
it rather than after: if it ran after, a decline would leave stock discounted against an order
that was never paid.

**With a real gateway this stops being enough**, and the limit is worth stating plainly. Two
things break. A `ROLLBACK` cannot undo a remote charge, so a commit that fails after an approved
charge leaves money taken against no order. And the transaction holds `FOR UPDATE` locks on the
catalog rows for as long as the provider takes to answer, so a slow gateway serialises every
purchase of the same product and drains the connection pool. The production shape is to take the
external call out of the transaction — `authorize` → commit the order and the stock → `capture`,
with a reconciliation pass for authorisations that never got captured — or an outbox with
compensation. A synchronous in-process provider has neither failure mode, which is why the
simpler version is the right one to ship here and the wrong one to ship with Stripe behind it.

**No overselling.** Rows are locked with `SELECT ... FOR UPDATE` (pessimistic; the alternative and
its trade-off are in [docs/initial.md](docs/initial.md) §5). They are locked **ordered by `id`**,
which is what stops two multi-line orders listing the same products in opposite order from
deadlocking — correct per-line locking alone still deadlocks across lines.

**The server owns the amount.** The client sends `{ productId, quantity }` and never a price. If a
request carries an amount, it is ignored. Totals are summed as **integer cents**: Postgres returns
`numeric` as a string, and converting it to a `number` to add it up is exactly where binary
floating point corrupts a total.

**The price is frozen.** Each line stores `unit_price_snapshot`. Re-pricing a product later never
mutates an order already placed.

**A double click buys once.** Every checkout mints an `idempotency_key` **when it opens**, not when
Confirm is pressed — a key born on the click would be a new key per click. The key has a `UNIQUE`
constraint and the code **inserts and catches the violation** rather than checking first, because
check-then-insert is a race condition by another name.

**Failures say which one they are**, because only one of them is worth retrying:

| Outcome | Status | `error` code | What the UI offers |
|---|---|---|---|
| Insufficient stock | `409` | `INSUFFICIENT_STOCK` | The SKU, how many were asked for, how many are left, and a link back to the cart |
| Payment declined | `402` | `PAYMENT_DECLINED` | Retry — nothing was charged and the cart is intact |
| Product not found | `404` | `NOT_FOUND` | Review the cart |
| Invalid quantity | `400` | `VALIDATION_ERROR` | Fix the input |
| Key already used | `200` | — | The existing order, not a second one |

**The fake payment declines ~10% of charges on purpose**, so the rollback is observable by using
the app rather than only in tests. Retry and it will go through. The randomness is **injected**
rather than called inline, so tests fix the outcome and never depend on luck. `PaymentProvider` is
an interface behind an injection token: connecting a real gateway means implementing it, without
touching order placement.

**A declined attempt is still recorded**, as a `FAILED` order with its reason and no stock
movement, written in its own transaction — the one holding the order was rolled back. One key means
one outcome: replaying the key of a declined attempt declines again instead of charging twice, so
retrying is a *new* attempt with a new key.

That asymmetry is why the two retryable failures are handled differently in the browser: a stock
conflict writes **nothing**, so the same key is reused after fixing the cart; a decline burns its
key, so the checkout mints a fresh one.

> **Seeing a decline yourself.** It is a 1-in-10 dice roll, so buy a few times. `74797462` in
> *Dashboard → Orders* is one that already happened, kept as evidence: `FAILED`, its reason, and no
> payment reference. To force a fresh one, put a real product id in a body file and buy in a loop
> until a `402` comes back — each attempt needs its own idempotency key, since a repeated key
> replays the first outcome instead of rolling the dice again:
>
> ```bash
> cat > /tmp/buy.json <<'JSON'
> {
>   "items": [{ "productId": "PUT-A-REAL-PRODUCT-ID-HERE", "quantity": 1 }],
>   "idempotencyKey": "REPLACED-PER-ATTEMPT",   
>   "shippingAddress": {
>     "name": "Test Buyer", "phone": "+14155552671", "address": "1 Test Street",
>     "city": "Springfield", "state": "IL", "zipCode": "62701", "country": "United States"
>   }
> }
> JSON
> ```
>
> ```bash
> for i in $(seq 1 20); do
>   key=$(node -e 'console.log(crypto.randomUUID())')
>   sed "s/REPLACED-PER-ATTEMPT/$key/" /tmp/buy.json > /tmp/attempt.json
>   code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:4000/api/v1/orders \
>     -H 'Content-Type: application/json' -d @/tmp/attempt.json)
>   echo "attempt $i -> $code"
>   [ "$code" = "402" ] && break
> done
> ```
>
> Every approved attempt is a **real order** that discounts real stock — expect roughly nine of
> them before a decline shows up, and occasionally many more. That residue is the point: the
> rollback path is reachable from outside the test suite, not only from the mocked provider in the
> specs. If you would rather not touch the data, look at the decline already in the dashboard
> instead.

Reading orders (`GET /orders`) requires a session; placing one does not. The buyer's confirmation
travels in the `POST` response.

## How this was built

The brief says the interesting part is not completing the requirements but asking the right
questions. So the process is in the repository, not just its output.

Every feature went through the same loop, and each step left a file behind:

```
docs/backlog.md            a ticket (TK-###) with the problem, not the solution
        ↓
openspec/changes/<name>/   proposal.md  — what changes and why
                           design.md    — the decision, and what was rejected
                           specs/       — the behaviour, written before the code
                           tasks.md     — the work, checked off as it lands
        ↓
feature/TK-###             one branch, one pull request
        ↓
openspec/specs/            the spec is merged into the living specification
openspec/changes/archive/  the proposal is archived with its date
```

`openspec/changes/archive/` holds 23 of these. They are the record of what was decided and what
was turned down — [orders-and-fake-payment](openspec/changes/archive/2026-08-29-orders-and-fake-payment/)
is the one to open if you open one: it is where locking, idempotency and the declined-charge path
were argued out before any of it was written.

Three of the decisions in this readme's [alternatives](#alternatives-considered) table began as a
rejected option in one of those design documents. The concurrency test, the integer-cents total
and the shipping-address columns exist because the proposal asked what would break first.

## Decision documentation

### The eight processes

One document per flow the challenge asks for. Each traces it end to end: a diagram, every file
involved, every validation and where it lives, the failure modes, and shell commands to verify
each claim against the running stack.

| | Process | What it answers | Endpoint |
|---|---|---|---|
| [P-01](docs/processes/P-01-csv-import.md) | **CSV import** | Header check, per-row validation, upsert by SKU, the duplicate rule, the per-row report | `POST /products/import` |
| [P-02](docs/processes/P-02-product-crud.md) | **Product CRUD** | Create, read, update, delete; SKU uniqueness; XSS rejection; decimal handling | `/products` |
| [P-03](docs/processes/P-03-product-search.md) | **Search and filters** | Multi-term OR search, category, price range, availability, sorting, pagination | `GET /products` |
| [P-04](docs/processes/P-04-order-placement.md) | **Order placement** | Row locking, stock check, server-side total, price snapshot, idempotency | `POST /orders` |
| [P-05](docs/processes/P-05-payment-processing.md) | **Payment processing** | The provider contract, the fake implementation, decline handling, rollback | inside P-04 |
| [P-06](docs/processes/P-06-authentication.md) | **Authentication** | Login, JWT, the public/protected boundary, the fail-closed guard | `/auth` |
| [P-07](docs/processes/P-07-error-contract.md) | **Error contract** | The shape every failure shares, the code catalogue, database error translation | every endpoint |
| [P-08](docs/processes/P-08-security-hardening.md) | **Security hardening** | Headers, explicit CORS, rate limiting, input rejection — and the known gaps | every request |

**If you read one**, read [P-04](docs/processes/P-04-order-placement.md): it is where the
concurrency, the money and the idempotency all meet, and it draws the deadlock that ordering the
lock by `id` prevents.

### Everything else

| Document | Content |
|---|---|
| [docs/testing/MATRIX.md](docs/testing/MATRIX.md) | 115 use cases with purpose, steps, expected result, and the test that guards each |
| [docs/testing/STRATEGY.md](docs/testing/STRATEGY.md) | What is tested at which level, and — more usefully — what is deliberately **not**, with the reasoning |
| [docs/testing/](docs/testing/) | Eight manual test cases run against the stack, with screenshots — import, purchase, concurrency, auth and dependency degradation |
| [docs/initial.md](docs/initial.md) | The original design spec: row-by-row analysis of the provided CSV, architecture, data model, import flow, stock concurrency, security, scope |
| [docs/02-analisis-base.md](docs/02-analisis-base.md) | Analysis of the two base templates: what was reused, adapted and removed |
| [docs/backlog.md](docs/backlog.md) | Every ticket (TK-###), its reasoning and its outcome |
| [openspec/](openspec/) | The spec-driven workflow ([OpenSpec](https://openspec.dev/)): 23 archived changes, each proposed, designed and specified before it was built |

Everything under `docs/` is in English, along with the code, its strings and this readme. The
`openspec/` changes stay in Spanish: they are dated records of what was decided on the day it was
decided, and translating a record edits it.

## Key decisions (summary)

Each row links to the process document that traces it end to end — the flow, every file involved,
every validation and where it lives, the failure modes, and commands to verify the claim yourself.

| Decision | Why | Traced in |
|---|---|---|
| **PostgreSQL**, not a document store | Stock and order must move together or not at all. That is a transaction, and transactions are what a relational engine is for. Foreign keys also make "you cannot delete a product that was sold" a database rule rather than a hopeful one | [P-04](docs/processes/P-04-order-placement.md) |
| **Price as `DECIMAL`**, totals in **integer cents** | `numeric` crosses the wire as a string precisely because it does not fit a float. Converting it to a number to add it up is where money breaks | [P-04](docs/processes/P-04-order-placement.md) |
| **Partial CSV import**, never all-or-nothing | One bad row out of 97 should not cost the other 96. Every row lands in a named bucket — created, updated, unchanged, rejected, skipped — and the batch keeps the report | [P-01](docs/processes/P-01-csv-import.md) |
| **Upsert by SKU**, and a duplicate SKU in one file rejects **every** occurrence | The SKU is the business key. Picking a winner by row position makes the result depend on the ordering rather than on the data | [P-01](docs/processes/P-01-csv-import.md) |
| **Pessimistic locking** — `SELECT ... FOR UPDATE`, **ordered by `id`** | The lock is what stops overselling; the ordering is what stops two multi-line orders from deadlocking on each other | [P-04](docs/processes/P-04-order-placement.md) |
| **Idempotency by insert-and-catch**, not check-then-insert | Check-then-insert is a race condition with a longer name: two concurrent replays both read "absent" and both insert. The `UNIQUE` constraint is what decides | [P-04](docs/processes/P-04-order-placement.md) |
| **The price is frozen on the line** (`unit_price_snapshot`) | An order is a historical record. Editing a product must never rewrite what somebody already paid | [P-04](docs/processes/P-04-order-placement.md) |
| **The payment provider sits behind an interface**, and its randomness is injected | Connecting a real gateway means implementing one interface. Injecting the randomness is what lets the decline path be tested deterministically instead of hoping for it | [P-05](docs/processes/P-05-payment-processing.md) |
| **A declined charge is a return value, not an exception** | A decline is a legitimate business outcome. Exceptions stay reserved for infrastructure faults, so the two never get handled by the same code | [P-05](docs/processes/P-05-payment-processing.md) |
| **Auth scoped to what justifies it** — buying is public | Catalog, search and checkout need no account. Product management, CSV import and diagnostics need a JWT. The guard is global and fails closed: a new endpoint is protected unless someone opens it deliberately | [P-06](docs/processes/P-06-authentication.md) |
| **One error contract** for every response | `{ statusCode, error, message, path, timestamp }` with a machine-readable code, so the client branches on `INSUFFICIENT_STOCK` rather than parsing prose | [P-07](docs/processes/P-07-error-contract.md) |
| **Reject HTML in product text** rather than stripping it | Stripping guesses at intent and leaves the caller believing their input was accepted. The sample file's `<script>` payload is reported back verbatim as the reason for rejection | [P-08](docs/processes/P-08-security-hardening.md) |
| **`JWT_SECRET` ships empty** | A placeholder committed to a compose file is a published signing key. Unset generates one per boot — sessions die on restart, which is loud and harmless. A weak value stops the boot on purpose | [P-08](docs/processes/P-08-security-hardening.md) |
| **Products are retired, not deleted** | Deleting a sold product would destroy the line that proves the sale, so `DELETE` still refuses it with `409`. Retiring sets `discontinued_at` — a timestamp, not a boolean, because it answers *since when* at the same cost — and the product leaves the shop while every order that contains it stays intact. It is reversible; deleting is not | [P-02](docs/processes/P-02-product-crud.md) |
| **A retired product answers `404`**, not `200` with a flag | The cart revalidation already reads `404` as "no longer available", so a retired product behaves like a deleted one without the client learning a third state | [P-02](docs/processes/P-02-product-crud.md) |
| **Seeing what was retired takes a session, and asking for it** | `?status=discontinued\|all` answers `401` without a token. The gate is the explicit parameter rather than merely holding one: the browser attaches the token to every request, so inferring "administrator" from it would show retired products in the shop to signed-in staff | [P-02](docs/processes/P-02-product-crud.md) |
| **The change history is written by a database trigger**, not by the service | The service is not the only thing that writes to `products`: the CSV import upserts, and somebody with `psql` can fix a price by hand. A history recorded in the service documents exactly the writes that were never in doubt | [P-11](docs/processes/P-11-product-history.md) |
| **AI as a spec-guided tool** | Every feature was proposed, argued and specified in writing before it was code. The proposals are in `openspec/` | [How this was built](#how-this-was-built) |

## Alternatives considered

The challenge asks for the alternatives, not just the choices. These are the ones where the
rejected option was genuinely defensible.

| Decision | Alternative rejected | Why |
|---|---|---|
| Pessimistic locking for stock | **Optimistic locking** (`version` column, retry on conflict) | Contention here is low, and a pessimistic lock is simpler to reason about correctly. Documented as a conscious trade in [docs/initial.md](docs/initial.md) §5, not as ignorance of the alternative |
| Charge **inside** the order transaction | Charge after committing, compensate on failure | With a local synchronous provider the transaction is enough. With a real gateway it stops being enough — a `ROLLBACK` cannot undo a remote charge — and the answer becomes a saga. Named as a known limit rather than left to be discovered |
| Idempotency by **insert-and-catch** | Check whether the key exists, then insert | Check-then-insert is a race condition with a longer name: two concurrent replays both read "absent" and both insert |
| Invalidate the **whole** cache prefix | Invalidate only the affected entries | Working out which cached queries a new product belongs to joins every search matching its text and every price range containing it. Getting it wrong serves stale data silently, which is the worst failure a cache has |
| **Reject** HTML in product text | Strip the tags | Stripping guesses at intent and leaves the caller believing their input was accepted. The sample file's `<script>` payload is reported back verbatim as the reason for rejection |
| Reject **every** occurrence of a duplicate SKU | Keep the first, or the last | Picking a winner by row position makes the result depend on ordering rather than on data |
| Category **icons** on cards | Product images | The catalog has no images. One placeholder repeated on every card says nothing; an icon per category says something, with a mandatory fallback because the field is free text |
| Repeated `q` parameter for search | Comma-separated, like `category` | A free-text search term may legitimately contain a comma |
| Fake payment declining **~10%** | Always approve | If it never declined, the rollback path would exist only in tests and no reviewer could see it. The randomness is injected so tests stay deterministic |
| **Invalidate** the catalog cache when someone buys | Shorten the cache TTL | Buying is the fourth thing that changes stock and was the only one not telling the cache, so the shop served the old number for up to five minutes and the app looked like it never discounted inventory. A shorter TTL narrows the window without closing it, and strips Redis of most of what it was added for |
| Delivery address in **flat columns** | A single JSONB column | The form already handles the object, so JSONB is tempting — but it gives up the `NOT NULL` and length constraints that are the last layer of this project's defence in depth, and would accept `{}` without complaint |
| Search orders by **id and by their lines** | Search by customer | There is no customer: buying is anonymous. What identifies an order is its id, and what distinguishes it is what it contains, read from the sold lines so renaming a product never loses its orders |
| **Drop** the checkout's shipping and discount controls | Send shipping and discount to the API | The API derives the order total from the lines it receives, so a shipping charge added in the browser produced a total the order never recorded — the checkout could show $249.97 while the database stored $229.97. Making them real means new columns, a migration and a recalculated total for a feature the challenge does not ask for. Removing them makes the number on screen the number in the database |
| **Retire** a product, keeping hard delete alongside it | Hard delete only, or an `archived` flag replacing delete entirely | Hard delete alone left a real dead end: a product that has sold cannot be deleted, so an administrator who wanted it off the shop had no move at all. Replacing delete entirely would take away the one correct action for a product created by mistake that never sold. Both operations exist, and the dashboard turns the refused delete into a message naming the alternative instead of a raw conflict |
| `discontinued_at` **timestamp** | An `active` boolean | Same storage, strictly more information. The boolean answers whether a product is retired; the timestamp answers whether *and since when*, which is the question anybody actually asks |
| History **rows with two JSONB snapshots** | An event table with one row per changed field, or a diff computed on read | Storing the whole row before and after means a future question the schema did not anticipate is still answerable from what was kept. `changed_fields` is derived at write time so the common query does not have to diff anything. The cost is size, which is acceptable for a catalog |
| History table with **no foreign key** to `products` | `ON DELETE CASCADE`, or `RESTRICT` | An audit constrained by what it audits dies with it: `CASCADE` erases the record of the deletion, `RESTRICT` makes products undeletable. The `sku` is denormalised into every entry for the same reason |
| Orders screen built on the **real** order shape | Adapt orders into the UI template's richer model | The template's order type wants a customer, an address, a card and a four-step delivery history. Buying is anonymous here, so filling those fields means inventing them. The screen shows the five things the system actually knows, and no columns it cannot fill |

## What is not built, and why

Stating this is more useful than letting a reviewer wonder whether it was forgotten.

| Not built | Reason |
|---|---|
| Real payment gateway | The challenge says to fake it. The provider sits behind an interface, so connecting one is implementing that interface |
| Customer accounts | Buying is deliberately anonymous ([docs/initial.md](docs/initial.md) §10.2), so an order has no owner to show it to. Registration exists in the code, hidden in the UI and closed on the API: creating an account requires an existing session, because an account only grants catalog administration. Placed orders are readable by an administrator at *Dashboard → Orders* |
| Roles and permissions | Not asked for; any authenticated user manages the catalog. The guard is the extension point |
| Shipping cost, taxes, refunds | Out of scope, documented in [docs/initial.md](docs/initial.md) §9. The order records **where** it is delivered, never what delivering it costs, so the total on screen stays the total that gets recorded |
| Reusable address book | Buying is anonymous, so there is no account to attach saved addresses to. Each order carries the address it was given |
| Product images | No image data in the source CSV |
| Content Security Policy | Traded for a working Swagger page; see [P-08](docs/processes/P-08-security-hardening.md) |
| User administration | Product CRUD, import, search and purchase are what the challenge asks for. A `/users` CRUD existed and was removed: it sat behind the JWT guard with no ownership or role check, so any signed-in account could change or delete any other. Sign-up stays, closed behind a session |

## How AI was used, and where the reasoning lives

AI was used throughout, as a spec-guided tool rather than a code generator: every feature went
through a written proposal before any code existed, and the proposals are in the repository.

The challenge asks for two things that fit together. Comments come out of the code; decisions,
approach and alternatives go in the readme. So the source carries no comments — the only
survivors are lint and compiler directives — and the reasoning lives where a reader is told to
look for it:

| Question | Where it is answered |
|---|---|
| Why is the row lock ordered by `id`? | [P-04](docs/processes/P-04-order-placement.md), with the deadlock drawn out |
| Why does idempotency insert and catch instead of checking first? | [P-04](docs/processes/P-04-order-placement.md) · [Alternatives considered](#alternatives-considered) |
| Why is a declined charge a return value and not an exception? | [P-05](docs/processes/P-05-payment-processing.md) |
| Why is a duplicate SKU rejected on every row? | [P-01](docs/processes/P-01-csv-import.md) |
| Why does the whole cache prefix get invalidated? | [Alternatives considered](#alternatives-considered) |

Two constraints were too important to leave at arm's length, so they moved into code that runs
rather than code that is read: `resolveJwtSecret` throws with the reason a placeholder secret
stops the boot, and the tests are named for the property they defend rather than the method they
call.

`openspec/` is the trail. Each folder is one feature: what was proposed, what was decided, what
was built, and what was archived once it shipped.
