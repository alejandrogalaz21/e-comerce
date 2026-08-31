# LoanPro Code Challenge — E-Commerce

Enterprise-grade e-commerce: a public storefront, product CRUD, CSV import, search, and a purchase
flow with a faked payment.

- **Sample CSV download date: 2026-08-26**
- Stack: NestJS 10 + TypeORM + PostgreSQL 16 + Redis · React 18 + Vite + MUI · Docker Compose
- **521 automated tests** across four levels, plus five manual cases with their evidence

**Start here:** `docker compose up --build`, then http://localhost:3000. The shop is the front
door and needs no account; sign in with `demo@demo.com` / `demo` to manage the catalog.

### Verifying it in five minutes

The fastest way to exercise every requirement, in order:

| # | Do this | What it proves |
|---|---|---|
| 1 | Sign in, then *Dashboard → Product → Import CSV* with the sample file | CSV import, per-row validation, partial import with a report |
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

## How to run

### With Docker (full stack)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Front (web) | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/v1/docs |
| PostgreSQL | localhost:5432 (user `postgres`, password `changeme`, db `ecommerce`) |

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
| | Creating an account: an account only grants catalog administration |
| `GET /health` (monitoring) | CSV import and its batch history |
| | Infrastructure status and user administration |

The API enforces this with a global JWT guard and an explicit `@Public()` opt-out, so it fails
closed: a new endpoint is protected unless someone deliberately opens it.

### Local development (manual)

```bash
# 1. Database (Postgres container only)
docker compose up -d db

# 2. API — http://localhost:8080/api/v1
cd api && cp .env.example .env && npm install && npm run dev

# 3. Front — http://localhost:3000 (Vite dev server)
cd web && cp .env.example .env && npm install && npm run dev
```

## How to run the tests

**521 automated tests.** Every level runs green; the browser suite needs the stack up.

| Suite | What it covers | Count | Command |
|---|---|---|---|
| API unit + fixture + real database | Domain logic, the real 97-row CSV, and locking and filtering against Postgres | 299 | `cd api && npm test` |
| API end to end | The real HTTP stack: global pipe and exception filter on a live request | 5 | `cd api && npm run test:e2e` |
| Web unit | URL state, mappers, schemas, token handling | 152 | `cd web && npm test` |
| Browser end to end | The whole app driven by Playwright | 65 | `cd web && npm run test:e2e` |

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
| [docs/testing/MATRIX.md](docs/testing/MATRIX.md) | **76 use cases**, each with its purpose, steps, expected result and the test that guards it |
| [docs/testing/STRATEGY.md](docs/testing/STRATEGY.md) | What is tested at which level, and — more usefully — what is deliberately **not**, with the reasoning |

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
├── common/                   # CROSS-CUTTING — pagination system, sanitizers, logger middleware
└── modules/<name>/           # TOP-LEVEL feature modules (no nested submodules):
    │                         #   products, import (CSV), users, auth, health, status
    ├── controller            #   HTTP only (routes, pipes, Swagger) — zero business logic
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
that was never paid. With a real gateway this stops being enough — a `ROLLBACK` cannot undo a
remote charge — and the answer becomes compensation or a saga. That is a known limit, not an
oversight.

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

## Decision documentation

| Document | Content |
|---|---|
| [docs/processes/](docs/processes/) | One document per system process — flow diagram, every file involved, every validation and where it lives, failure modes, and commands to verify each claim |
| [docs/testing/MATRIX.md](docs/testing/MATRIX.md) | Every use case with purpose, steps and expected result |
| [docs/testing/](docs/testing/) | Manual test cases run against the stack, with their evidence |
| [docs/initial.md](docs/initial.md) | Full design spec: row-by-row CSV analysis, architecture, data model, import flow, stock concurrency, security, scope |
| [docs/02-analisis-base.md](docs/02-analisis-base.md) | Analysis of the base templates (api/web): what was reused, adapted and removed |
| `openspec/` | Spec-driven workflow ([OpenSpec](https://openspec.dev/)): every feature is proposed, specified and archived as a decision record |

## Key decisions (summary)

- **PostgreSQL** for referential integrity and ACID transactions (stock + order must be atomic).
- **Price as `DECIMAL`**, never float, and totals summed as **integer cents** — `numeric` crosses
  the wire as a string, and converting it to a number to add it up is where money breaks.
- **Partial CSV import** (not all-or-nothing) with a per-row report; **upsert by SKU**.
- **Pessimistic locking** (`SELECT ... FOR UPDATE`, ordered by `id`) for stock, plus an
  `idempotency_key` resolved by catching the unique violation rather than checking first.
- **Auth scoped to what justifies it**: catalog, search and **checkout are public** (you buy without
  an account); product management, CSV import and diagnostics require a JWT.
- **One error contract** for every response, with a machine-readable code the client branches on.
- **AI**: used as a spec-guided tool (OpenSpec) — decisions and their rationale are documented in
  `docs/` and `openspec/`.

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
| Rate limiting on sign-in | Would matter in production; the project has one seeded user |

## A note on comments

The challenge asks for AI-generated comments to be removed. The comments that remain were written
deliberately and state **why**, not what: why the row lock is ordered by `id`, why idempotency
inserts and catches instead of checking first, why a declined charge is a return value rather than
an exception. Deleting them would satisfy the letter of the request and throw away the context that
makes the code reviewable. They are few, and every one of them earns its place.
