# Project rules

- **All code must be in English**: identifiers, UI strings, API/Swagger descriptions, log messages, and code comments (if any). This applies to `api/` and `web/`.
- **All git commit messages must be in English** (conventional commits style).
- The root `README.md` (challenge deliverable) is written in English. Documentation under `docs/` and OpenSpec artifacts (`openspec/`) are written in Spanish (pending a possible translation pass before delivery).
- Work is tracked in `docs/backlog.md` (tickets TK-###). Every feature goes through the OpenSpec workflow (`/opsx:propose` → apply → archive) and must respect the design spec in `docs/initial.md` — do not re-decide what is already decided there without the user asking.
- The challenge requires removing AI-generated comments from code before delivery — prefer writing no comments unless they state a non-obvious constraint.

## Frontend architecture (web/)

Any FE change MUST follow the layered architecture defined in the `fe-architecture` skill
(`.claude/skills/fe-architecture/SKILL.md`). Summary: `types/<domain>.ts` (contracts) →
`actions/<domain>.ts` (pure axios functions + mappers) → `sections/<domain>/hooks/` (React Query
facade + query keys) → `sections/<domain>/components/` (domain presentation) →
`sections/<domain>/view/` (pure composition). Generic components in `components/`, configured
library clients (axios, query-client) in `lib/`, pure helpers in `utils/`. React Query for all
new data fetching (SWR is legacy, removed in TK-011). The `status` module is the reference
implementation.
