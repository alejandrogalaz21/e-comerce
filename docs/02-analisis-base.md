# Análisis de la base existente (api/ y web/) — decisiones de reutilización

> Fecha: 2026-08-26. Complementa a [initial.md](./initial.md) (el spec de diseño).
> Este documento responde el pendiente de la sección 10.8 del spec: analizar los dos
> templates del candidato y decidir qué se reutiliza, qué se adapta y qué se elimina.

---

## 1. Qué es cada template

| Repo | Qué es realmente | Estado |
|---|---|---|
| `api/` | Starter NestJS 10 + TypeORM + PostgreSQL al que se le acumularon módulos de un proyecto real (facturación SAT México, DynamoDB, Twilio, OpenAI). 110 archivos `.ts`. | ~30% reutilizable directo; 3 cosas rotas hoy |
| `web/` | Template comercial **Minimals UI Kit v6** (Vite + TS + MUI v5), versión FULL con todas las demos (~1334 archivos en `src/`). | El módulo e-commerce (products + checkout + orders) ya existe en UI; todo el data-layer es fake |

## 2. Stack real confirmado

- **BE**: NestJS 10, TypeORM 0.3 + `pg` (PostgreSQL 13), `class-validator`/`class-transformer`, `@nestjs/config`, Swagger en `/api/v1/docs`, JWT+Passport funcional, paginación propia (`PaginationHelper` + `PaginationResponseBuilder`, documentada en `api/PAGINATION_GUIDE.md`).
- **FE**: React 18, Vite 5, TypeScript strict, MUI v5 + `@mui/x-data-grid`, **SWR + axios** (no TanStack Query), react-hook-form + zod, sonner (toasts), react-router-dom v6.

### Decisión: TanStack Query (React Query) como capa de server state — actualizada 2026-08-26

Primera decisión (superada): mantener SWR porque el template lo traía integrado. **El usuario
decidió estandarizar en React Query** (alineado con el spec §10.4 original). Regla vigente:
- Todo código nuevo usa `@tanstack/react-query` con el patrón por capas del proyecto:
  `view → hooks facade (sections/<dominio>/hooks) → actions (funciones axios puras) → API`,
  query keys centralizadas por dominio, mutaciones junto a las queries con `invalidateQueries`.
- El módulo `status` es la **implementación de referencia** de este patrón.
- Las actions legacy con SWR (`actions/product.ts`) se migran en TK-011 y SWR se desinstala al final.

## 3. Qué se reutiliza tal cual

### api/
- `src/main.ts` — bootstrap con `ValidationPipe` global (whitelist + transform), prefijo `api/v1`, Swagger, CORS.
- `src/common/pagination/*` (helper + builder + interfaces), `src/common/middleware/logger.middleware.ts`, `src/common/common.module.ts`.
- `src/config/pg.configuration.ts` + `src/database/postgres/*` (conexión TypeORM + health check).
- `src/modules/auth/**` y `src/modules/users/**` — funcionales; se conservan como referencia de calidad (filtros + paginación + whitelist de campos ordenables). **El challenge no pide auth** (spec §10.2): los endpoints de products/orders quedan públicos; auth queda como punto de extensión ya construido.
- `src/modules/health/**` (sin DynamoDB), `src/database/seed/products.json` (fixture real).
- Tooling: eslint, prettier, tsconfig, nest-cli.

### web/
- Infraestructura completa: `src/theme/`, `src/layouts/` (dashboard admin + main tienda), `src/routes/`, `src/hooks/`, `src/utils/` (`fCurrency`, `fDate`).
- `src/components/hook-form/*` (14 wrappers RHF+zod), `src/components/table/*`, `custom-dialog` (ConfirmDialog), `iconify`, `label`, `snackbar`, `empty-content`, `upload`, `scrollbar`.
- `src/sections/product/*` — CRUD admin con DataGrid, formulario completo, búsqueda con autocomplete, filtros, vistas shop.
- `src/sections/checkout/*` — flujo de compra de 3 pasos con carrito en localStorage (`checkout-provider`).
- `src/sections/order/*` — listado/detalle de órdenes.

## 4. Qué se adapta (fase de implementación, vía OpenSpec changes)

| Área | Cambio |
|---|---|
| `api` products | `update()`/`remove()` son **stubs** — implementarlos. Entidad actual (`title`, `slug`, `sizes`, `gender`) → alinear al contrato del CSV (`sku` UNIQUE, `category`, `weight_kg`, `price DECIMAL(10,2)` — hoy es `float`, inaceptable para dinero). Añadir búsqueda (`?q=` ILIKE / tsvector) y filtros. |
| `api` orders | Hoy está sobre **DynamoDB sin transacciones** — reescribir sobre TypeORM/Postgres: entidades `Order`/`OrderItem`, transacción con `SELECT ... FOR UPDATE` para stock (spec §5), `total` recalculado en servidor, `idempotency_key`. |
| `api` import CSV | **No existe nada** — construir: `FileInterceptor` + `csv-parse`, validación por capas (spec §4.5), upsert por SKU, `import_batches` con reporte por fila. |
| `api` infra | Migraciones TypeORM reales (hoy `synchronize: true` hardcodeado), exception filter global, `.env.example`, `moduleNameMapper` de `@/` en Jest. |
| `web` data layer | `src/actions/product.ts` solo tiene lecturas; el submit del form y el delete son **fake** (`setTimeout` + toast). Añadir mutaciones reales contra NestJS + `mutate` de SWR. Paginación server-side (hoy pagina en cliente). |
| `web` config | `endpoints` de `src/utils/axios.ts` → rutas reales `api/v1/*`; `vite.config.ts` con proxy `/api` en dev; recortar `IProductItem` (~30 campos) al contrato real. |
| `web` checkout | Al confirmar, POST real a `/orders` (hoy no persiste nada); quitar dependencias de `src/_mock`. |

## 5. Qué se elimina (limpieza ejecutada en esta iteración)

### api/ — dominio fiscal y ruido
- Módulos: `clients`, `credentials`, `tax-profiles`, `tax-addresses`, `tax-regimes`, `tax-activities`, `tax-obligations`, `sat`, `shared/` (whatsapp/openai/google/sat), `database/dynamodb` (Orders se reescribirá en Postgres), `database/seed` (módulo vacío y roto; se conserva `products.json`), carpeta `sql/` (schema SAT ajeno).
- Muertos/duplicados: `config/mongodb.configuration.ts`, `common/dto/pagination-response.dto.ts` (duplicado), `common/pagination/pagination.module.ts` (nunca importado), `common/pipes/parse-mongo-id.pipe.ts` (100% comentado), `common/pipes/trim-lowercase-strings.pipe.ts`, `common/adapters/axios.adapter.ts` (usa `axios` **no declarado** en package.json), `Procfile`, specs boilerplate rotos.
- Dependencias: `@aws-sdk/*`, `@nodecfdi/*`, `googleapis`, `google-auth-library`, `openai`, `twilio`, `luxon`, `jsonwebtoken` — reduce `node_modules` a ~1/3.

### web/ — demos del kit
- `sections/_examples` (254 archivos), `sections/overview`, y los dominios chat, mail, kanban, calendar, file-manager, blog, job, tour, invoice, account, home (marketing), about, faqs, contact, pricing, payment, auth-demo — con sus `pages/`, `actions/`, `types/` y `_mock/`.
- 4 de 5 providers de auth (`auth0`, `amplify`, `firebase`, `supabase`) — se queda `jwt`.
- `.github/workflows/deploy.yml` (CI ajena: S3 + Twilio), `yarn.lock` (se queda `package-lock.json`).
- Dependencias huérfanas: fullcalendar, mapbox, dnd-kit, react-pdf, apexcharts, joyride, embla, lightbox, markdown/rehype/remark, etc.

## 6. Cosas rotas encontradas (arregladas en esta iteración)

1. `api/Dockerfile` copiaba `yarn.lock` que **no existe** (el repo usa `package-lock.json`) → build fallaba en el primer COPY. Corregido a `npm ci` + `.dockerignore`.
2. `api/docker-compose.yml` no tenía servicio para la propia API (solo db + admin tools) → reemplazado por un único `docker-compose.yml` en la raíz (regla del spec §10.1).
3. Jest sin `moduleNameMapper` para el alias `@/` → cualquier test que importe con alias falla.
4. Bug en `health.controller.ts`: lee claves `app.version`/`app.environment` que no existen en la config (`name`/`env`) → siempre `undefined`.
5. `web` sin Dockerfile — creado (build Vite + nginx).

## 7. Riesgos / notas para la entrevista

- **Licencia Minimals**: el template FE es comercial de pago. Si el repo del challenge será público, revisar los términos de la licencia (o mencionarlo en el README).
- `synchronize: true` se tolera solo durante el arranque del proyecto; se sustituye por migraciones antes de la entrega.
- Tests: cobertura efectiva actual **0%** en ambos repos — el plan de testing se define por feature en cada OpenSpec change.

## 8. Flujo de trabajo a partir de aquí

Cada feature se trabaja como un **OpenSpec change** (`/opsx:propose` → revisar → `/opsx:apply` → `/opsx:archive`), validado contra [initial.md](./initial.md). Orden propuesto:

1. `products-crud` — alinear entidad al contrato CSV + CRUD completo + búsqueda.
2. `csv-import` — pipeline de import con validación por capas y reporte por fila.
3. `orders-checkout` — órdenes transaccionales con control de stock + fake payment.
4. `web-integration` — conectar FE al API real (mutaciones, paginación server-side, checkout POST).
5. `seed-e2e` — seed automático vía pipeline de import al levantar docker.
