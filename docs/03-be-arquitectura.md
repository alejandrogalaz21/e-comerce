# Arquitectura del Backend — árbol comentado

> Actualizado: 2026-08-27. Estructura real de `api/src/`, con la responsabilidad de cada
> directorio y archivo. Se actualiza en el mismo commit que cualquier cambio estructural.

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
├── database/                            # DATA STORES: un subdirectorio por motor + el schema versionado
│   ├── data-source.ts                   #   DataSource standalone para el CLI (migration:*)
│   ├── migrations/                      #   las ÚNICAS dos migraciones — corren solas al boot
│   │   ├── 1787702400000-initial-schema.ts  # schema: products, import_batches, user, enums, uuid ext
│   │   └── 1787788800000-demo-user.ts       # datos mínimos: usuario demo@demo.com/demo (idempotente)
│   ├── postgres/                        #   motor relacional (fuente de verdad)
│   │   ├── pg.module.ts                 #     TypeOrmModule.forRootAsync desde config pg.*
│   │   └── pg-health.service.ts         #     ping + pg_stat_activity (lo consume health)
│   └── redis/                           #   motor clave-valor (cache/locks a futuro)
│       └── redis.module.ts              #     provider global REDIS_CLIENT (ioredis) + shutdown
│                                        #     redis.service/constants llegan con su uso real (TK-008)
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
