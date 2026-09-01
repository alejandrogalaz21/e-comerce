# Analysis of the existing base (api/ and web/) — reuse decisions

> Date: 2026-08-26. Companion to [initial.md](./initial.md) (the design spec).
> This document answers the open item in section 10.8 of the spec: analyse the candidate's two
> templates and decide what is reused, what is adapted and what is removed.
>
> **This is a dated snapshot, not living documentation.** It records the state of both templates on
> the day the project started and the decisions taken from it. Several of those decisions were
> later superseded — where that happened, the note says so.

---

## 1. What each template is

| Repo | What it really is | State |
|---|---|---|
| `api/` | NestJS 10 + TypeORM + PostgreSQL starter with modules from a real project accumulated on top (Mexican SAT invoicing, DynamoDB, Twilio, OpenAI). 110 `.ts` files. | ~30% directly reusable; 3 things broken today |
| `web/` | Commercial **Minimals UI Kit v6** template (Vite + TS + MUI v5), FULL version with every demo (~1,334 files in `src/`). | The e-commerce module (products + checkout + orders) already exists in the UI; the whole data layer is fake |

## 2. Confirmed real stack

- **BE**: NestJS 10, TypeORM 0.3 + `pg` (PostgreSQL 13), `class-validator`/`class-transformer`,
  `@nestjs/config`, Swagger at `/api/v1/docs`, working JWT+Passport, in-house pagination
  (`PaginationHelper` + `PaginationResponseBuilder`).
- **FE**: React 18, Vite 5, TypeScript strict, MUI v5 + `@mui/x-data-grid`, **SWR + axios** (not
  TanStack Query), react-hook-form + zod, sonner (toasts), react-router-dom v6.

### Decision: TanStack Query (React Query) as the server-state layer — updated 2026-08-26

First decision (superseded): keep SWR because the template shipped with it integrated. **The
decision was made to standardise on React Query** (aligned with the original spec §10.4). The rule
in force:

- All new code uses `@tanstack/react-query` with the project's layered pattern:
  `view → hooks facade (sections/<domain>/hooks) → actions (pure axios functions) → API`,
  query keys centralised per domain, mutations next to the queries with `invalidateQueries`.
- The `status` module is the **reference implementation** of this pattern.
- The legacy SWR actions (`actions/product.ts`) are migrated in TK-011 and SWR is uninstalled at
  the end.

## 3. What is reused as it is

### api/

- `src/main.ts` — bootstrap with a global `ValidationPipe` (whitelist + transform), the `api/v1`
  prefix, Swagger, CORS.
- `src/common/pagination/*` (helper + builder + interfaces),
  `src/common/middleware/logger.middleware.ts`, `src/common/common.module.ts`.
- `src/config/pg.configuration.ts` + `src/database/postgres/*` (TypeORM connection + health check).
- `src/modules/auth/**` and `src/modules/users/**` — working; kept as a quality reference (filters
  + pagination + allow-list of sortable fields). **The challenge does not ask for auth** (spec
  §10.2): the products/orders endpoints stay public and auth remains an extension point that is
  already built.
  > Superseded: auth was later put to active use — it attributes CSV imports (TK-030) and protects
  > catalog administration (TK-031). The user CRUD was removed for having no authorization of its
  > own; `UsersService` survives to serve sign-in and `/auth/me`.
- `src/modules/health/**` (without DynamoDB), `src/database/seed/products.json` (a real fixture).
- Tooling: eslint, prettier, tsconfig, nest-cli.

### web/

- Full infrastructure: `src/theme/`, `src/layouts/` (admin dashboard + shop main), `src/routes/`,
  `src/hooks/`, `src/utils/` (`fCurrency`, `fDate`).
- `src/components/hook-form/*` (14 RHF+zod wrappers), `src/components/table/*`, `custom-dialog`
  (ConfirmDialog), `iconify`, `label`, `snackbar`, `empty-content`, `upload`, `scrollbar`.
- `src/sections/product/*` — admin CRUD with DataGrid, full form, autocomplete search, filters,
  shop views.
- `src/sections/checkout/*` — three-step purchase flow with the cart in localStorage
  (`checkout-provider`).
- `src/sections/order/*` — order listing and detail.
  > Superseded: the template's order model wants a customer, an address, a card and a four-step
  > delivery history. Buying is anonymous here, so the screens were rebuilt on the real order shape
  > as `sections/purchase/*`.

## 4. What is adapted (implementation phase, through OpenSpec changes)

| Area | Change |
|---|---|
| `api` products | `update()`/`remove()` are **stubs** — implement them. The current entity (`title`, `slug`, `sizes`, `gender`) → align to the CSV contract (`sku` UNIQUE, `category`, `weight_kg`, `price DECIMAL(10,2)` — today it is a `float`, unacceptable for money). Add search (`?q=` ILIKE / tsvector) and filters. |
| `api` orders | Today it sits on **DynamoDB with no transactions** — rewrite on TypeORM/Postgres: `Order`/`OrderItem` entities, a transaction with `SELECT ... FOR UPDATE` for stock (spec §5), the `total` recalculated on the server, an `idempotency_key`. |
| `api` CSV import | **Nothing exists** — build it: `FileInterceptor` + `csv-parse`, layered validation (spec §4.5), upsert by SKU, `import_batches` with a per-row report. |
| `api` infra | Real TypeORM migrations (today `synchronize: true` is hardcoded), a global exception filter, `.env.example`, a `moduleNameMapper` for `@/` in Jest. |
| `web` data layer | `src/actions/product.ts` only reads; the form submit and the delete are **fake** (`setTimeout` + toast). Add real mutations against NestJS + SWR's `mutate`. Server-side pagination (today it paginates on the client). |
| `web` config | The `endpoints` in `src/utils/axios.ts` → real `api/v1/*` routes; `vite.config.ts` with an `/api` proxy in dev; trim `IProductItem` (~30 fields) to the real contract. |
| `web` checkout | On confirm, a real POST to `/orders` (today it persists nothing); remove the dependencies on `src/_mock`. |

## 5. What is removed (cleanup carried out in this iteration)

### api/ — fiscal domain and noise

- Modules: `clients`, `credentials`, `tax-profiles`, `tax-addresses`, `tax-regimes`,
  `tax-activities`, `tax-obligations`, `sat`, `shared/` (whatsapp/openai/google/sat),
  `database/dynamodb` (Orders will be rewritten on Postgres), `database/seed` (an empty, broken
  module; `products.json` is kept), the `sql/` folder (someone else's SAT schema).
- Dead or duplicated: `config/mongodb.configuration.ts`, `common/dto/pagination-response.dto.ts`
  (duplicate), `common/pagination/pagination.module.ts` (never imported),
  `common/pipes/parse-mongo-id.pipe.ts` (100% commented out),
  `common/pipes/trim-lowercase-strings.pipe.ts`, `common/adapters/axios.adapter.ts` (uses `axios`,
  **not declared** in package.json), `Procfile`, broken boilerplate specs.
- Dependencies: `@aws-sdk/*`, `@nodecfdi/*`, `googleapis`, `google-auth-library`, `openai`,
  `twilio`, `luxon`, `jsonwebtoken` — cutting `node_modules` to about a third.

### web/ — the kit's demos

- `sections/_examples` (254 files), `sections/overview`, and the chat, mail, kanban, calendar,
  file-manager, blog, job, tour, invoice, account, home (marketing), about, faqs, contact, pricing,
  payment and auth-demo domains — with their `pages/`, `actions/`, `types/` and `_mock/`.
- 4 of the 5 auth providers (`auth0`, `amplify`, `firebase`, `supabase`) — `jwt` stays.
- `.github/workflows/deploy.yml` (someone else's CI: S3 + Twilio), `yarn.lock` (`package-lock.json`
  stays).
- Orphaned dependencies: fullcalendar, mapbox, dnd-kit, react-pdf, apexcharts, joyride, embla,
  lightbox, markdown/rehype/remark, and others.

## 6. Broken things found (fixed in this iteration)

1. `api/Dockerfile` copied `yarn.lock`, which **does not exist** (the repo uses
   `package-lock.json`) → the build failed on the first COPY. Corrected to `npm ci` +
   `.dockerignore`.
2. `api/docker-compose.yml` had no service for the API itself (only db + admin tools) → replaced by
   a single `docker-compose.yml` at the root (spec rule §10.1).
3. Jest had no `moduleNameMapper` for the `@/` alias → any test importing through the alias fails.
4. Bug in `health.controller.ts`: it read the keys `app.version`/`app.environment`, which do not
   exist in the config (`name`/`env`) → always `undefined`.
5. `web` had no Dockerfile — created (Vite build + nginx).

## 7. Risks and notes for the interview

- `synchronize: true` is tolerated only while the project is starting up; it is replaced by
  migrations before delivery.
  > Done: the schema has been owned by versioned migrations since TK-013, and `DB_SYNC` is
  > explicitly `false` in the compose file.
- Tests: effective coverage today is **0%** in both repos — the testing plan is defined per feature
  in each OpenSpec change.
  > Superseded: the project now carries 596 automated tests across four levels. See
  > [testing/STRATEGY.md](testing/STRATEGY.md).

## 8. Way of working from here

Every feature is worked as an **OpenSpec change** (`/opsx:propose` → review → `/opsx:apply` →
`/opsx:archive`), validated against [initial.md](./initial.md). Proposed order:

1. `products-crud` — align the entity to the CSV contract + full CRUD + search.
2. `csv-import` — the import pipeline with layered validation and a per-row report.
3. `orders-checkout` — transactional orders with stock control + fake payment.
4. `web-integration` — connect the FE to the real API (mutations, server-side pagination, checkout
   POST).
5. `seed-e2e` — automatic seed through the import pipeline when Docker comes up.
   > Superseded: the application starts with an empty catalog on purpose. Loading it is the
   > reviewer's first step, and it is what exercises the import.
