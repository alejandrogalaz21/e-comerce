# Tasks: redis-status-page (TK-020)

- [x] Servicio `redis` en docker-compose raíz con healthcheck; env `REDIS_HOST/REDIS_PORT` en `api`
- [x] API: dep `ioredis`, `redis.configuration.ts`, provider `REDIS_CLIENT` con shutdown limpio
- [x] API: módulo `status` — `GET /status/redis` (INCR + PING + latencia) y `GET /status/db` (NOW + count + latencia), tolerantes a fallo (`ok:false`, sin 500)
- [x] API: actualizar `.env.example`; build verde
- [x] FE: `endpoints.status.*` en `src/utils/axios.ts` (rutas reales `api/v1`)
- [x] FE: `src/actions/status.ts` (hooks SWR con refresco 5s)
- [x] FE: sección + página `/status`, ruta en `main.tsx`, path en `paths.ts`, item en nav principal; build verde
- [x] Verificación end-to-end en docker: 3 tarjetas OK en `http://localhost:3000/status`
- [x] Backlog actualizado (TK-020 closed, TK-021 abierto para el uso real de Redis)
