# TC-08 · Status, health and dependency degradation

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-006, TK-011 |
| **Screen** | `/dashboard/status` |

## Goal

The `status` module exists to prove that Postgres and Redis are **really connected** — not mocked —
and to make visible what happens when one of the two goes down.

The property tested here is a single one, and it is the interesting one: **a downed dependency does
not produce a `500`**. It produces a `200` with `ok: false` and a reason. A `500` would force the
client to guess whether the problem is the API or the database; an `ok: false` says which.

## The three endpoints

```
   /dashboard/status  --- every 5 s --->  GET /health          (PUBLIC)
        (React Query)                     GET /status/db       (protected)
                                          GET /status/redis    (protected)

   GET /status/redis                      GET /status/db
   -------------------                    ------------------
   INCR status:visits                     SELECT NOW(), current_database(), version()
   SET  status:last_check                 SELECT COUNT(*) FROM products
   PING
   INFO server                            ok:true  --> { now, database, version, productCount }
                                          ok:false --> { error }
   ok:true  --> { visits, pong, version, lastCheck }
   ok:false --> { error }

                   Both: always HTTP 200. Never 500.
```

`INCR` is what makes this endpoint honest: it does not answer "Redis is fine", it **writes and
reads a real value** and hands you the counter. If the number does not rise between two calls, you
are not talking to Redis.

## Preconditions

```bash
docker compose up -d --build
API=http://localhost:4000/api/v1
TOKEN=$(curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
```

---

## 1 · Redis answers and the counter advances

### Steps

```bash
curl -s "$API/status/redis" -H "Authorization: Bearer $TOKEN"
curl -s "$API/status/redis" -H "Authorization: Bearer $TOKEN"
```

### Expected result

```json
{ "source": "redis", "ok": true, "latencyMs": 2,
  "data": { "visits": 41, "pong": "PONG", "version": "7.x.x",
            "lastCheck": "2026-08-31T10:00:00.000Z" } }
```

- [ ] `ok: true` and `pong: "PONG"`.
- [ ] **`visits` is higher on the second call than on the first.** That is the proof of a real
      write; without it the endpoint would only be saying it exists.
- [ ] `lastCheck` changes between calls.
- [ ] `latencyMs` is a small number (typically 0–5 locally).
- [ ] Confirm the value from Redis itself:

```bash
docker exec ecommerce-redis redis-cli GET status:visits
docker exec ecommerce-redis redis-cli GET status:last_check
```

The value must match what the API returned.

---

## 2 · Postgres answers and counts real products

### Steps

```bash
curl -s "$API/status/db" -H "Authorization: Bearer $TOKEN"
```

### Expected result

```json
{ "source": "postgres", "ok": true, "latencyMs": 4,
  "data": { "now": "...", "database": "ecommerce",
            "version": "PostgreSQL 16.x", "productCount": 85 } }
```

- [ ] `database` is `ecommerce`.
- [ ] **`productCount` matches the real catalog:**

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -t -A -c "SELECT count(*) FROM products;"
```

- [ ] Import a CSV and call again: the number **changes**. It is not cached and not fixed.
- [ ] `version` is trimmed before the `on` — it shows the engine, not the whole build string.

---

## 3 · Redis down returns `ok:false`, not `500`

**The central case of this document.**

### Steps

```bash
docker stop ecommerce-redis
curl -s -w "\nHTTP %{http_code}\n" "$API/status/redis" -H "Authorization: Bearer $TOKEN"
```

### Expected result

```json
{ "source": "redis", "ok": false, "latencyMs": 120, "error": "connect ECONNREFUSED ..." }
```

```
  HTTP 200
```

- [ ] **`HTTP 200`, not `500`.** This is the entire point of the case.
- [ ] `ok: false` and an `error` saying what happened.
- [ ] `latencyMs` reflects how long it took to fail.
- [ ] **`GET /status/db` still returns `ok: true`.** One downed dependency does not drag the other
      with it.
- [ ] And what matters most: **the application keeps selling**. With Redis down, `GET /products`
      answers `200` (uncached) and `POST /orders` completes a purchase — see
      [TC-06 · R9](TC-06-concurrency-and-races.md#r9--redis-being-down-does-not-cancel-a-sale).

```bash
curl -s -o /dev/null -w "GET /products without Redis: %{http_code}\n" "$API/products"
```

Bring it back up:

```bash
docker start ecommerce-redis
```

- [ ] After a few seconds, `/status/redis` returns to `ok: true`.
- [ ] **`visits` keeps its previous value.** A `stop` followed by a `start` is the same container,
      so its data survives. A `docker compose down` destroys it and the counter restarts at 1 —
      this compose mounts no volume for Redis, deliberately: nothing in it is worth persisting.

---

## 4 · Postgres down returns `ok:false`, not `500`

### Steps

```bash
docker stop ecommerce-db
curl -s -w "\nHTTP %{http_code}\n" "$API/status/db" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "GET /health: %{http_code}\n" "$API/health"
docker start ecommerce-db
```

### Expected result

- [ ] `/status/db` answers **`200`** with `ok: false` and its `error`.
- [ ] `/health` answers **`200`** with `postgres.pgHealth` reporting the failure — the `app` block
      and the `resources` block are still there.
- [ ] `/status/redis` stays at `ok: true`.
- [ ] `GET /products` **does** fail: the catalog cannot be served without a database. That is
      correct — graceful degradation covers *diagnosis*, it does not invent data.
- [ ] After `docker start`, everything returns to normal without restarting the API.

> A practical warning: after bringing Postgres back, give the connection pool a few seconds. The
> first request can fail while it reconnects.

---

## 5 · `/health` is public and requires no token

It is the endpoint an orchestrator would consume, and an orchestrator never has credentials.

### Steps

```bash
curl -s -o /dev/null -w "health without token: %{http_code}\n" "$API/health"
curl -s "$API/health" | head -c 400; echo
```

### Expected result

- [ ] **`200` without a token.**
- [ ] The body carries three blocks: `app`, `resources` and `postgres`.
- [ ] `app` includes `name`, `version`, `env`, `uptimeMs` and `node`.
- [ ] `resources` includes memory (`rss`, `heapUsed`, `heapTotal`), CPU and `eventLoopDelayMs`.
- [ ] `uptimeMs` **grows** between two calls a few seconds apart.
- [ ] `loadAvg` may be `[0,0,0]` when the host is Windows. That is not a failure.
- [ ] And by contrast, `/status/db` and `/status/redis` **without a token return `401`** — see
      [TC-07](TC-07-login-and-permissions.md) check 3.

---

## 6 · The status screen reflects all of the above

### Steps

1. Open `/dashboard/status` while signed in.
2. Leave it open and watch for about 15 seconds.
3. In another terminal: `docker stop ecommerce-redis`.
4. Wait a few seconds without touching the screen.
5. `docker start ecommerce-redis`.

### Expected result

- [ ] All three cards (API / Postgres / Redis) render green.
- [ ] **The data refreshes on its own every 5 seconds** — the Redis visit counter rises without you
      reloading.
- [ ] Stopping Redis moves that card into an error state **without reloading the page**, and the
      other two **stay green**.
- [ ] The screen does not show a global error page and does not go blank: only that card changes
      state.
- [ ] Bringing Redis back turns the card green again on its own, on the next 5 s cycle.

### The rate-limit detail

Three endpoints every 5 seconds is 36 requests per minute per open tab. The global ceiling is
**300/min**, so:

- [ ] Leave the screen open for 3 minutes: **no `429` appears**.
- [ ] With ~8 tabs open at once you would start brushing the ceiling. That is why the global limit
      is high and the sensitive endpoints (`sign-in`, `import`) declare their own.

---

## 7 · Response times are reasonable

This is not a performance test, it is a sanity check.

### Steps

```bash
for i in $(seq 1 5); do
  curl -s -o /dev/null -w "db: %{time_total}s  " "$API/status/db" -H "Authorization: Bearer $TOKEN"
  curl -s -o /dev/null -w "redis: %{time_total}s\n" "$API/status/redis" -H "Authorization: Bearer $TOKEN"
done
```

### Expected result

- [ ] Locally, both under **100 ms**.
- [ ] `latencyMs` in the body is always **lower** than curl's `time_total` — it measures only the
      query, not the HTTP round trip. The other way round would mean something is mismeasured.
- [ ] `eventLoopDelayMs` in `/health` stays low (typically < 5 ms). A sustained high value would
      indicate synchronous work blocking the process.

---

## Result

| # | Case | Result |
|---|---|---|
| 1 | Redis answers and `visits` advances | |
| 2 | Postgres answers and `productCount` is real | |
| 3 | Redis down → `200` with `ok:false`, the app keeps selling | |
| 4 | Postgres down → `200` with `ok:false` | |
| 5 | `/health` public, no token | |
| 6 | The screen refreshes itself and degrades per card | |
| 7 | Reasonable times and coherent `latencyMs` | |

**Notes:**
