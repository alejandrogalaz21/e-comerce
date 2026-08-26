# LoanPro Code Challenge — E-Commerce

E-commerce enterprise-grade: CRUD de productos, importación por CSV, búsqueda y compra (pago simulado).

- **Fecha de descarga del CSV de ejemplo: 2026-08-26**
- Stack: NestJS 10 + TypeORM + PostgreSQL 16 · React 18 + Vite + MUI · Docker Compose

## Cómo correr

### Con Docker (todo el stack)

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| Front (web) | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/v1/docs |
| PostgreSQL | localhost:5432 (user `postgres`, password `changeme`, db `ecommerce`) |

No requiere `.env` (todo tiene defaults); para sobreescribir valores, copiar `.env.example` a `.env`.

### Desarrollo local (manual)

```bash
# 1. Base de datos (solo el contenedor de Postgres)
docker compose up -d db

# 2. API — http://localhost:8080/api/v1
cd api && cp .env.example .env && npm install && npm run dev

# 3. Front — http://localhost:3000 (dev server de Vite)
cd web && cp .env.example .env && npm install && npm run dev
```

## Arquitectura del frontend (`web/`)

React 18 + Vite + TypeScript strict + MUI v5 + **TanStack Query (React Query)**, organizado en
capas con una sola dirección de dependencia. El módulo `status` (`/status`) es la implementación
de referencia del patrón.

```
web/src/
├── types/<dominio>.ts            # 1. CONTRATOS — solo tipos, cero lógica
├── actions/<dominio>.ts          # 2. ACTIONS — funciones de petición puras (axios) + mappers
├── sections/<dominio>/
│   ├── hooks/use-<dominio>.ts    # 3. FACADE — React Query envuelve las actions (query keys + mutaciones)
│   ├── components/               # 4. COMPONENTES del dominio — presentación, reciben props
│   └── view/<dominio>-view.tsx   # 5. VIEW — composición pura: llama hooks, pasa props
├── pages/                        # wrappers delgados por ruta (Helmet + view)
├── components/                   # componentes GENÉRICOS reutilizables (no saben de dominio)
├── hooks/                        # hooks genéricos de UI (use-boolean, use-debounce...)
├── lib/                          # clientes configurados: axios (instancia + endpoints), query-client
├── utils/                        # funciones puras sin estado (format-time, format-number...)
├── routes/                       # paths.ts (todas las URLs) + árbol de rutas lazy
├── layouts/  theme/  auth/       # layouts (tienda/admin), tema MUI, contexto JWT
```

```
Flujo de datos:   view → hooks (facade) → actions → axios → API
```

Reglas clave: los componentes nunca llaman axios ni React Query directo (solo hooks facade);
todo contrato vive en `types/`; las mutaciones viven junto a las queries e invalidan por query
keys centralizadas; `lib/` = instancias configuradas de librerías, `utils/` = funciones puras.
La guía completa para nuevos desarrollos está en `.claude/skills/fe-architecture/SKILL.md`.

## Documentación de decisiones

| Documento | Contenido |
|---|---|
| [docs/initial.md](docs/initial.md) | Spec de diseño completo: análisis del CSV fila por fila, arquitectura, modelo de datos, flujo de import, concurrencia de stock, seguridad, alcance |
| [docs/02-analisis-base.md](docs/02-analisis-base.md) | Análisis de los templates base (api/web): qué se reutilizó, adaptó y eliminó |
| `openspec/` | Workflow spec-driven ([OpenSpec](https://openspec.dev/)): cada feature se propone, especifica y archiva como registro de decisiones |

## Decisiones clave (resumen)

- **PostgreSQL** por integridad referencial y transacciones ACID (stock + orden atómicos).
- **Precio como `DECIMAL`**, nunca float — mentalidad fintech.
- **Import CSV parcial** (no todo-o-nada) con reporte por fila; **upsert por SKU**.
- **Lock pesimista** (`SELECT ... FOR UPDATE`) para stock + `idempotency_key` en órdenes.
- **Sin autenticación** en los flujos del challenge — decisión consciente documentada (el módulo JWT existe como punto de extensión).
- **AI**: se usó como herramienta guiada por specs (OpenSpec) — las decisiones y su porqué están documentadas en `docs/` y `openspec/`.
