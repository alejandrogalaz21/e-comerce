---
name: be-architecture
description: Layered backend architecture for api/ (NestJS + TypeORM + Postgres + Redis). MUST be followed for any new or modified BE code — where config, infrastructure, cross-cutting code, and domain modules live, and how to build a new module. Reference implementation - the products module.
---

# Backend architecture (api/)

Every BE change MUST respect these layers. The `products` module (with its `import/` submodule)
is the reference implementation — when in doubt, imitate it.

## Layer map

```
api/src/
├── main.ts                    # bootstrap: global prefix api/v1, ValidationPipe (whitelist+transform), Swagger, CORS
├── app.module.ts              # composition root — the only place that wires layers together
├── config/                    # typed env namespaces via registerAs: app.*, pg.*, redis.*
├── database/                  # INFRASTRUCTURE layer (no business logic)
│   ├── postgres/              #   TypeORM connection module + pg health service
│   ├── redis/                 #   ioredis client provider (inject via REDIS_CLIENT token)
│   ├── migrations/            #   versioned schema — run automatically at boot (migrationsRun)
│   ├── data-source.ts         #   standalone DataSource for the typeorm CLI (migration:* scripts)
│   └── seed/                  #   boot-time bootstrap: seeds the catalog through the domain import pipeline
├── common/                    # CROSS-CUTTING, domain-agnostic, reusable
│   ├── pagination/            #   PaginationHelper + PaginationResponseBuilder ({ data, pagination })
│   ├── transformers/          #   sanitize/trim transforms shared by DTOs (CRUD + CSV import)
│   ├── middleware/  dto/  interfaces/  common.enum.ts
└── modules/<domain>/          # DOMAIN modules (feature-based): products, users, auth, health, status
    ├── <domain>.controller.ts #   HTTP only: routes, pipes, status codes, Swagger — zero business logic
    ├── <domain>.service.ts    #   business logic + persistence via injected repositories
    ├── entities/              #   TypeORM entities = DB contract (constraints live here AND in migrations)
    ├── dto/                   #   wire contract: class-validator rules + @ApiProperty examples
    └── <capability>/          #   submodule when a capability grows (e.g. products/import: controller,
                               #   service, entity, normalizer — same domain, own folder)
```

## Request lifecycle (every endpoint goes through this)

```
LoggerMiddleware → (Guard) → ValidationPipe (DTO: transform + whitelist + forbidNonWhitelisted)
  → Controller (thin) → Service (logic, throws Nest HttpExceptions) → Repository/DataSource
  → Postgres constraints (last line of defense)
```

## Where things go — decision table

| What | Where | Rule |
|---|---|---|
| Env access | `config/*.configuration.ts` | ONLY place allowed to read `process.env`. Everything else injects `ConfigService` and reads namespaced keys (`pg.host`). |
| Third-party clients (DB, cache, future queues) | `database/<client>/` | Provided as injectable modules/tokens. Domain modules never instantiate clients. |
| Schema changes | `database/migrations/` | Always a migration (`npm run migration:generate`). `synchronize` stays off; `DB_SYNC=true` is a local-dev-only override. |
| App bootstrap tasks (seed) | `database/seed/` | Infrastructure that ORCHESTRATES domain services (calls `ImportService`), never reimplements domain logic. Runtime assets it consumes (the challenge CSV) are colocated and copied to dist via nest-cli assets. |
| Reusable domain-agnostic logic | `common/` | If two domains need it (pagination, sanitizers), it lives here. If it knows about a domain, it does not. |
| Business rules | `modules/<domain>/*.service.ts` | Controllers never contain logic; services never touch HTTP concepts beyond throwing HttpExceptions. |
| Wire contracts | `modules/<domain>/dto/` | class-validator + `@Transform` sanitizers + `@ApiProperty` with realistic examples on every field. |
| DB contracts | `modules/<domain>/entities/` | Constraints (`UNIQUE`, `@Check`) declared on the entity and mirrored in the migration. DECIMAL columns are typed `string` (wire format preserves precision; the FE mapper converts). |
| Growing capability | `modules/<domain>/<capability>/` | Submodule folder inside the domain (see `products/import/`), registered in the domain's module. Do NOT create a sibling top-level module for something that belongs to an existing domain. |

## Hard rules

- All code and strings in English. No comments unless they state a non-obvious constraint.
- Money and weights: `numeric` columns, never float. They travel as strings in JSON.
- Every mutation endpoint documents its error codes in Swagger (400/404/409...) and returns proper
  status codes (201 create, 204 delete, 409 unique conflicts via Postgres error 23505).
- Uploaded files use multer **memory storage** (buffer only): the request payload is processed and
  discarded — nothing is written to disk. What persists is domain data + audit records
  (`import_batches` with counters and a JSONB per-row report). Storing raw uploads in blob
  storage is a documented future item, not an accident.
- File-level failures reject the request (400/413); row-level failures NEVER abort a batch
  (partial import by design) — they go to the per-row report.
- Tests colocated: `*.spec.ts` next to the code. Validation specs run the REAL `ValidationPipe`
  with production options. Integration specs may use real fixtures from `api/test/fixtures/`.
- Verify before finishing: `npm run build`, `npm test`, `npm run lint` — all green.

## Recipe: adding a new domain module

1. `nest g module/controller/service modules/<domain>` (or by hand following products).
2. Entity in `entities/` with constraints → generate the migration (`npm run migration:generate`).
3. DTOs in `dto/` with validation + Swagger examples (reuse `common/transformers`).
4. Service with business logic; list endpoints use `PaginationHelper` + `PaginationResponseBuilder`.
5. Controller: routes + pipes (`ParseUUIDPipe` on ids) + `@ApiTags`/`@ApiResponse`.
6. Register in `app.module.ts`. Specs for service + DTO. Update `api/API_ENDPOINTS.md`.
