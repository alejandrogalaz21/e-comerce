# Project rules

- **All code must be in English**: identifiers, UI strings, API/Swagger descriptions, log messages, and code comments (if any). This applies to `api/` and `web/`.
- **All git commit messages must be in English** (conventional commits style).
- The root `README.md` (challenge deliverable) and everything under `docs/` are written in English. OpenSpec artifacts (`openspec/`) are written in Spanish.
- Work is tracked in `docs/backlog.md` (tickets TK-###). Every feature goes through the OpenSpec workflow (`/opsx:propose` → apply → archive) and must respect the design spec in `docs/initial.md` — do not re-decide what is already decided there without the user asking.
- The challenge requires removing AI-generated comments from code before delivery — prefer writing no comments unless they state a non-obvious constraint.

## Backend architecture (api/)

Any BE change MUST follow the layered architecture defined in the `be-architecture` skill
(`.claude/skills/be-architecture/SKILL.md`). Summary: `config/` (only place reading
`process.env`, registerAs namespaces) → `database/` (DATABASE-ONLY: pg/redis clients,
migrations, CLI data-source — no services or feature modules) → `common/` (cross-cutting:
pagination, sanitizers, middleware) → `modules/<name>/` (TOP-LEVEL feature modules only — no
nested submodules; a growing capability becomes its own module importing from siblings, like
`import` and `seed`; controller thin / service owns logic / entities = DB contract / dto =
wire contract with class-validator + Swagger examples). Schema changes are always migrations —
never synchronize. The CSV import must survive ANY file (never 500). The `products` module is
the reference implementation.

## Frontend architecture (web/)

Any FE change MUST follow the layered architecture defined in the `fe-architecture` skill
(`.claude/skills/fe-architecture/SKILL.md`). Summary: `types/<domain>.ts` (contracts) →
`actions/<domain>.ts` (pure axios functions + mappers) → `sections/<domain>/hooks/` (React Query
facade + query keys) → `sections/<domain>/components/` (domain presentation) →
`sections/<domain>/view/` (pure composition). Generic components in `components/`, configured
library clients (axios, query-client) in `lib/`, pure helpers in `utils/`. React Query for all
new data fetching (SWR is legacy, removed in TK-011). The `status` module is the reference
implementation.
