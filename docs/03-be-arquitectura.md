# Arquitectura del Backend — estado actual vs propuesta objetivo

> Fecha: 2026-08-27 (TK-030). Compara el árbol real de `api/src/` contra la estructura objetivo
> definida por el usuario, con el gap y la recomendación por cada diferencia.

---

## 1. Árbol actual (comentado archivo por archivo)

```
api/src/
├── main.ts                              # bootstrap: prefijo /api/v1, ValidationPipe global
│                                        #   (whitelist+transform), Swagger en /docs, CORS
├── app.module.ts                        # composition root: config + infra + módulos de dominio
│
├── config/                              # ÚNICO lugar que lee process.env (registerAs namespaces)
│   ├── index.ts                         #   barrel de configs
│   ├── app.configuration.ts             #   app.*: name, version, env, port, jwtSecret
│   ├── pg.configuration.ts              #   pg.*: conexión, synchronize (DB_SYNC), migrationsRun, ssl
│   └── redis.configuration.ts           #   redis.*: host, port
│
├── database/                            # DATABASE-ONLY (PostgreSQL): conexión, migraciones, CLI
│   ├── data-source.ts                   #   DataSource standalone para el CLI (migration:*)
│   ├── migrations/                      #   las ÚNICAS dos migraciones — corren solas al boot
│   │   ├── 1787702400000-initial-schema.ts  # schema: products, import_batches, user, enums, uuid ext
│   │   └── 1787788800000-demo-user.ts       # datos mínimos: usuario demo@demo.com/demo (idempotente)
│   └── postgres/
│       ├── pg.module.ts                 #   TypeOrmModule.forRootAsync desde config pg.*
│       └── pg-health.service.ts         #   ping + pg_stat_activity (lo consume health)
│
├── redis/                               # REDIS-ONLY (top-level, fuera de database/)
│   └── redis.module.ts                  #   provider global REDIS_CLIENT (ioredis) + shutdown
│                                        #   redis.service/constants llegan con su primer uso real (TK-008)
│
├── common/                              # CROSS-CUTTING, agnóstico de dominio
│   ├── common.module.ts                 #   módulo @Global: provee PaginationResponseBuilder
│   ├── common.enum.ts                   #   OrderDirection ASC/DESC
│   ├── dto/pagination.dto.ts            #   page/limit del query string
│   ├── interfaces/db.interface.ts       #   shape del config de DB
│   ├── middleware/logger.middleware.ts  #   log HTTP con nivel por status code
│   ├── pagination/                      #   PaginationHelper (parse) + builder del envelope
│   │   ├── pagination.helper.ts         #     { data, pagination: { total, per_page, ... } }
│   │   ├── pagination-response.builder.ts
│   │   └── pagination-response.interface.ts
│   ├── transformers/sanitize.transformer.ts  # trimText para @Transform de DTOs
│   └── validators/no-html.validator.ts  #   @NoHtml() — rechaza markup HTML (política TK-028)
│
└── modules/                             # MÓDULOS DE PRIMER NIVEL (uno por feature)
    ├── auth/                            #   JWT: sign-up, sign-in, me (punto de extensión activo)
    │   ├── auth.module.ts / auth.controller.ts / auth.service.ts
    │   └── jwt.strategy.ts              #     estrategia passport-jwt (secret vía ConfigService)
    ├── users/                           #   CRUD de usuarios con filtros + paginación
    │   ├── users.module.ts / users.controller.ts / users.service.ts
    │   ├── entities/user.entity.ts      #     tabla `user`, enums role/status, password @Exclude
    │   └── dto/ (create, update, pagination, filters)
    ├── products/                        #   CRUD del catálogo (referencia de arquitectura)
    │   ├── products.module.ts / products.controller.ts / products.service.ts
    │   ├── entities/product.entity.ts   #     sku UNIQUE, price numeric CHECK>=0, stock CHECK>=0
    │   └── dto/ (create con @NoHtml + Swagger examples, update PartialType)
    ├── import/                          #   importación CSV (módulo hermano de products)
    │   ├── import.module.ts / import.controller.ts   # rutas /products/import/*
    │   ├── import.service.ts            #     parser + pipeline por fila + upsert por SKU
    │   ├── import-row.normalizer.ts     #     trim, limpieza de moneda, vacíos → undefined
    │   ├── import-batch.entity.ts       #     auditoría: contadores + reporte JSONB
    │   └── import-result.interface.ts   #     shapes de la respuesta
    ├── health/                          #   GET / y /health (app + recursos + postgres)
    │   └── health.module.ts / health.controller.ts
    └── status/                          #   GET /status/db y /status/redis (página de status FE)
        └── status.module.ts / status.controller.ts
```

Tests colocados (`*.spec.ts` junto al código, no listados): products.service, create-product.dto,
import.service, import.integration (fixture real), import.hardening (adversarial).

---

## 2. Comparación contra la estructura objetivo

| # | Propuesta objetivo | Estado actual | Gap / veredicto |
|---|---|---|---|
| 1 | `config/configuration.ts` centralizado | 3 archivos `registerAs` por namespace + barrel | ✅ **Cumplido (variante)** — mismo objetivo, un archivo por namespace escala mejor que uno monolítico. Sin cambio |
| 2 | `config/env.validation.ts` | **No existe** — la app arranca con env inválido y falla tarde | ❌ **Gap real** — agregar validación de env al boot (class-validator sobre las vars, fail-fast). → ticket |
| 3 | `database/` solo PostgreSQL + migrations + data-source | ✅ Cumple — `redis` ya se movió fuera (2026-08-27) | ✅ **Resuelto** — `database/` es PostgreSQL-only |
| 4 | `redis/` top-level con `redis.service.ts` (abstracción) + `redis.constants.ts` (keys/TTLs) | ✅ `src/redis/` top-level con el provider `REDIS_CLIENT`; sin service/constants aún | ⚠️ **Gap parcial** — hoy el único consumidor es `status` y usa el cliente directo. La abstracción (service + constants) se agrega cuando Redis tenga uso real (caché de búsqueda, TK-008/021) |
| 5 | `common/decorators/` | `validators/` (@NoHtml) + `transformers/` (trimText) | ✅ **Equivalente** — son decoradores/transforms reutilizables con nombres más específicos. Opcional renombrar; no aporta |
| 6 | `common/guards/` | El guard JWT vive en passport (`AuthGuard('jwt')`), sin carpeta propia | ⚠️ **Pendiente natural** — cuando TK-030 proteja el import, el guard reutilizable puede formalizarse aquí |
| 7 | `common/interceptors/` | No existe | ⚠️ **Pendiente** — candidato: interceptor de transformación de respuesta/logging. No urgente (el middleware logger cubre hoy) |
| 8 | `common/filters/` (exception handling global) | **No existe** — cada service repite `handleDBExceptions` | ❌ **Gap real** — es exactamente **TK-014** (shape de error consistente de initial.md §7) |
| 9 | `common/pipes/` | No hay pipes custom (el ValidationPipe global cubre) | ✅ Sin necesidad actual |
| 10 | `common/utils/` (pagination, sanitizers) | `pagination/` + `transformers/` como carpetas propias | ✅ **Equivalente** — misma idea con carpetas por tema en vez de un cajón `utils/` |
| 11 | `modules/<name>/repositories/` (capa de acceso a datos) | Los services usan el `Repository<T>` de TypeORM inyectado directo | ⚠️ **Trade-off consciente** — el Repository de TypeORM *ya es* la abstracción de datos (mockeable en tests, como demuestran los specs). Una clase repository propia se justifica cuando las queries crezcan (búsqueda TK-008: ILIKE + filtros + índices). Adoptar en `products` al implementar TK-008; no retrofitear los módulos simples |
| 12 | `health/` fuera de modules (opcional) | Dentro de `modules/health/` | ✅ La propia propuesta lo marca opcional — se queda como módulo (consistencia: todo feature es módulo) |
| 13 | Módulos: auth, users, products, import, seed, health, status | auth, users, products, import, health, status | ✅ — `seed` ya no existe como módulo: se eliminó junto con el seed de catálogo; los datos mínimos (usuario demo) viven en una migración de datos (§3) |
| 14 | (no está en la propuesta) `common/middleware/` | logger.middleware.ts | ✅ Se mantiene bajo common |

### Resumen ejecutivo

La estructura actual **ya cumple el espíritu de la propuesta** (capas: config → infra → common →
módulos top-level). Estado de las acciones que salieron de la comparación:

1. ✅ **Hecho (2026-08-27)**: `database/redis/` → `src/redis/` (database quedó PostgreSQL-only);
   módulo `seed` eliminado y datos mínimos como migración (§3).
2. **Tickets existentes**: `common/filters/` = TK-014; guards formales al proteger import (TK-030 fase 2).
3. **Tickets nuevos**: validación de env al boot (`env.validation`); repository + `redis.service`/
   `redis.constants` cuando llegue la búsqueda (TK-008).

---

## 3. Depuración de datos iniciales (decisión de esta iteración — actualiza initial.md §10.3)

**Antes**: al boot, el seed importaba el CSV del challenge → la app arrancaba con 87 productos.

**Ahora (decisión del usuario)**: la aplicación arranca **vacía de datos de negocio** — todo lo
crea el usuario interactuando con el sitio (CRUD, import CSV desde la UI). Lo único sembrado es
un **usuario demo para login**:

| Campo | Valor |
|---|---|
| email | `demo@demo.com` |
| password | `demo` (hash bcrypt en la migración) |
| resto | datos ficticios (nombre demo, rol/status activos) |

Implementación: **migración de datos** (`demo-user`) junto a la de schema — idempotente
(`ON CONFLICT DO NOTHING`), corre al boot como cualquier migración. El módulo `seed/` y el CSV
embebido fueron eliminados; el CSV del challenge sigue disponible como fixture de tests
(`api/test/fixtures/`) y para subirse manualmente desde la página de import.

Migraciones que quedan (las dos necesarias, nada más):

```
database/migrations/
├── 1787702400000-initial-schema.ts   # schema: products, import_batches, user, enums
└── <timestamp>-demo-user.ts          # datos mínimos: el usuario demo para login
```
