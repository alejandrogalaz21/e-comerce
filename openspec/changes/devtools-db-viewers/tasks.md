# Tasks: devtools-db-viewers (TK-056)

- [x] `docker-compose.yml`: servicio `adminer` (`adminer:4-standalone`) con `profiles: [devtools]`,
      `ADMINER_DEFAULT_SERVER: db`, puerto `8081:8080` y `depends_on: db`
- [x] `docker-compose.yml`: servicio `redisinsight` (`redis/redisinsight`) con `profiles: [devtools]`,
      puerto `5540:5540`, volumen `redisinsight_data:/data` y `depends_on: redis`
- [x] Verificar que `docker compose up -d` sigue levantando **solo** `db`, `redis`, `api`, `web`
      (`docker compose ps` no debe listar las consolas)
- [ ] Verificar Adminer en `http://localhost:8081`: login con `DB_USER`/`DB_PASSWORD`/`DB_NAME`
      del `.env`, y que se ven `products`, `import_batches` y `users` con datos del seed
- [x] Verificar RedisInsight en `http://localhost:5540` contra `redis:6379`: deben aparecer las
      keys `status:visits` y `status:last_check`. Si la conexión no se puede pre-cargar por env
      (`RI_REDIS_HOST0`/`RI_REDIS_PORT0`), documentar el alta manual en el README **o** sustituir
      la imagen por `redis-commander` (`REDIS_HOSTS=local:redis:6379`), que autoconecta
- [x] `README.md`: bloque en desarrollo local con `docker compose --profile devtools up -d`, la
      tabla de puertos (8081 Adminer / 5540 RedisInsight) y la nota de "solo desarrollo"
- [ ] Confirmar que los e2e de Playwright (`cd web && npm run test:e2e`) siguen verdes con el
      stack levantado sin el profile
- [ ] Backlog: TK-056 a `closed` con enlace al change archivado (al archivar)
