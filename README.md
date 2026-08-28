# LoanPro Code Challenge — E-Commerce

Enterprise-grade e-commerce: product CRUD, CSV import, search, and purchase flow (fake payment).

- **Sample CSV download date: 2026-08-26**
- Stack: NestJS 10 + TypeORM + PostgreSQL 16 · React 18 + Vite + MUI · Docker Compose

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

**Backend — unit (Jest)** · 28 tests: products service logic and DTO validations executed through
the real production `ValidationPipe`. Each case is labeled with the sample-CSV line it covers
(XSS, SQL injection, invalid price/stock, missing fields, Unicode). No database or docker needed.

```bash
cd api && npm test
```

**Frontend — unit (Vitest)** · 28 tests: form zod schema (mirror of the BE validations), API⇄UI
mapper (decimal conversion, NULL vs 0 semantics) and server-error-to-field mapping. Pure logic,
no browser or backend required.

```bash
cd web && npm run test
```

**End-to-end (Playwright)** · 11 tests against the real app running in docker: full CRUD flow
through the UI (create → list → edit → delete) plus the CSV cases (XSS sanitized without firing
an alert, SQL-injection SKU rejected —and the table survives—, free product, duplicate SKU with
inline error). **Requires the stack up** (`docker compose up -d`). First time only, install the
browser with `npx playwright install chromium`.

```bash
cd web && npm run test:e2e
```

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

## Decision documentation

| Document | Content |
|---|---|
| [docs/initial.md](docs/initial.md) | Full design spec: row-by-row CSV analysis, architecture, data model, import flow, stock concurrency, security, scope |
| [docs/02-analisis-base.md](docs/02-analisis-base.md) | Analysis of the base templates (api/web): what was reused, adapted and removed |
| `openspec/` | Spec-driven workflow ([OpenSpec](https://openspec.dev/)): every feature is proposed, specified and archived as a decision record |

## Key decisions (summary)

- **PostgreSQL** for referential integrity and ACID transactions (stock + order must be atomic).
- **Price as `DECIMAL`**, never float — fintech mindset.
- **Partial CSV import** (not all-or-nothing) with a per-row report; **upsert by SKU**.
- **Pessimistic locking** (`SELECT ... FOR UPDATE`) for stock + `idempotency_key` on orders.
- **No authentication** on the challenge flows — a conscious, documented decision (the JWT module
  exists as an extension point).
- **AI**: used as a spec-guided tool (OpenSpec) — decisions and their rationale are documented in
  `docs/` and `openspec/`.
