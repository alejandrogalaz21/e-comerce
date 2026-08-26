# Proposal: redis-status-page (TK-020)

## Why

El stack necesita Redis para futuros usos (caché de búsqueda o carrito server-side — decisión en
TK-021), y el usuario quiere evidencia visual en el FE de que cada pieza de infraestructura
(API, Postgres, Redis) está viva y de qué fuente proviene cada dato — útil también como página de
diagnóstico durante la entrevista/demo.

## What Changes

- **Infra**: servicio `redis` (redis:7-alpine, healthcheck) en el `docker-compose.yml` raíz; el
  `api` depende de él y recibe `REDIS_HOST`/`REDIS_PORT`.
- **API**: cliente Redis (`ioredis`) como provider inyectable + config `registerAs('redis')`.
  Nuevo módulo `status` con dos endpoints demostrativos:
  - `GET /api/v1/status/redis` — escribe/lee en Redis (INCR de contador de visitas, PING,
    latencia, versión del server). Prueba round-trip real, no solo conectividad.
  - `GET /api/v1/status/db` — lee de Postgres vía TypeORM (`NOW()`, versión, count de products,
    latencia).
  Ambos devuelven `{ source, ok, latencyMs, data | error }` y **no tiran 500** si el backend de
  datos está caído — reportan `ok: false` (es una página de diagnóstico).
- **FE**: página pública `/status` con tarjetas en vivo (SWR con refresco cada 5s): configuración
  del web (serverUrl, basePath, versión), API (`/health`), Postgres y Redis. Entrada "Status" en
  el nav principal.

## Non-goals

- Uso productivo de Redis (caché/carrito) — se decide en TK-021.
- Autenticación de la página de estado.
- Modificar los endpoints de products (TK-011).

## Impact

- `docker-compose.yml`, `api/` (nueva dep `ioredis`, config, provider, módulo status, .env.example),
  `web/` (endpoints, action SWR, página + sección status, ruta y nav).
