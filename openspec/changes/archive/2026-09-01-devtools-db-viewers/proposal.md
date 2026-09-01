# Proposal: devtools-db-viewers (TK-056)

## Why

Hoy la única forma de mirar qué hay realmente dentro de Postgres y Redis es instalar un cliente
local (psql/DBeaver, `redis-cli`) o leer la página `/dashboard/status`, que solo dice si cada
store está vivo. Durante el desarrollo —y sobre todo cuando TK-021 defina el uso real de Redis—
hace falta poder abrir el keyspace, ver las tablas y verificar un import sin salir del entorno
que ya levanta `docker compose`.

## What Changes

- **Infra (único archivo tocado: `docker-compose.yml`)**: dos servicios nuevos de solo-desarrollo,
  ambos bajo `profiles: [devtools]`:
  - `adminer` (`adminer:4-standalone`, ~4 MB) en `localhost:8081`, con
    `ADMINER_DEFAULT_SERVER: db` para que el formulario de login llegue pre-apuntado a Postgres.
  - `redisinsight` (`redis/redisinsight`) en `localhost:5540`, con volumen propio para que
    recuerde la conexión entre reinicios.
- **Comportamiento por defecto intacto**: al declararlos con `profiles`, `docker compose up -d`
  sigue levantando exactamente `db`, `redis`, `api` y `web`. Las consolas se piden explícitamente:
  `docker compose --profile devtools up -d`. Esto protege el README de entrega, los e2e de
  Playwright y el tiempo de arranque.
- **Docs**: bloque corto en el README (sección de desarrollo local) con el comando del profile,
  los puertos y la advertencia de que son herramientas de desarrollo, nunca de producción.

## Non-goals

- Explorador de datos dentro del dashboard (endpoint que liste tablas o keys arbitrarias): es
  superficie de ataque nueva y contradice TK-015; para eso están estas consolas ya conocidas.
- Ampliar `/dashboard/status` con métricas de caché (hit rate, keyspace): depende de que TK-021
  decida el uso real de Redis.
- Autenticación propia para las consolas: no se publican por defecto y son de uso local.
- Tocar `api/` o `web/`.

## Capabilities

### New Capabilities

Ninguna. El change no introduce comportamiento de producto ni requisitos verificables sobre la
aplicación: es tooling de entorno de desarrollo, alineado con el precedente de los changes ya
archivados (`redis-status-page`, `migrations-and-seed`), que tampoco generaron specs.

### Modified Capabilities

Ninguna.

## Impact

- `docker-compose.yml` (dos servicios + un volumen `redisinsight_data`).
- `README.md` (desarrollo local).
- `docs/backlog.md` (TK-056).
- Puertos nuevos en el host: `8081` y `5540` (libres; hoy se usan 3000, 4000, 5432, 6379 y 8080
  para el API en dev local).
- Sin dependencias npm nuevas, sin migraciones, sin cambios de contrato de API.
