# TC-08 · Status, salud y degradación de dependencias

| | |
|---|---|
| **Estado** | ⬜ **Por ejecutar** |
| **Fecha** | — |
| **Tickets** | TK-006, TK-011 |
| **Pantalla** | `/dashboard/status` |

## Objetivo

El módulo `status` existe para demostrar que Postgres y Redis están **realmente conectados** — no
mockeados — y para hacer visible qué pasa cuando uno de los dos se cae.

La propiedad que se prueba aquí es una sola y es la interesante: **una dependencia caída no produce
un `500`**. Produce un `200` con `ok: false` y un motivo. Un `500` obligaría al cliente a adivinar
si el problema es la API o la base; un `ok: false` lo dice.

## Los tres endpoints

```
   /dashboard/status  --- cada 5 s --->  GET /health          (PUBLICO)
        (React Query)                    GET /status/db       (protegido)
                                         GET /status/redis    (protegido)

   GET /status/redis                     GET /status/db
   -------------------                   ------------------
   INCR status:visits                    SELECT NOW(), current_database(), version()
   SET  status:last_check                SELECT COUNT(*) FROM products
   PING
   INFO server                           ok:true  --> { now, database, version, productCount }
                                         ok:false --> { error }
   ok:true  --> { visits, pong, version, lastCheck }
   ok:false --> { error }

                   En ambos: siempre HTTP 200. Nunca 500.
```

`INCR` es lo que hace este endpoint honesto: no responde "Redis está bien", **escribe y lee un dato
real** y te devuelve el contador. Si el número no sube entre dos llamadas, no estás hablando con
Redis.

## Precondiciones

```bash
docker compose up -d --build
API=http://localhost:4000/api/v1
TOKEN=$(curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
```

---

## 1 · Redis responde y el contador avanza

### Pasos

```bash
curl -s "$API/status/redis" -H "Authorization: Bearer $TOKEN"
curl -s "$API/status/redis" -H "Authorization: Bearer $TOKEN"
```

### Resultado esperado

```json
{ "source": "redis", "ok": true, "latencyMs": 2,
  "data": { "visits": 41, "pong": "PONG", "version": "7.x.x",
            "lastCheck": "2026-08-31T10:00:00.000Z" } }
```

- [ ] `ok: true` y `pong: "PONG"`.
- [ ] **`visits` es mayor en la segunda llamada que en la primera.** Esa es la prueba de escritura
      real; sin ella el endpoint solo diría que existe.
- [ ] `lastCheck` cambia entre llamadas.
- [ ] `latencyMs` es un número pequeño (típicamente 0–5 en local).
- [ ] Confirma el dato desde el propio Redis:

```bash
docker exec ecommerce-redis redis-cli GET status:visits
docker exec ecommerce-redis redis-cli GET status:last_check
```

El valor debe coincidir con lo que devolvió la API.

---

## 2 · Postgres responde y cuenta productos de verdad

### Pasos

```bash
curl -s "$API/status/db" -H "Authorization: Bearer $TOKEN"
```

### Resultado esperado

```json
{ "source": "postgres", "ok": true, "latencyMs": 4,
  "data": { "now": "...", "database": "ecommerce",
            "version": "PostgreSQL 16.x", "productCount": 85 } }
```

- [ ] `database` es `ecommerce`.
- [ ] **`productCount` coincide con el catálogo real:**

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -t -A -c "SELECT count(*) FROM products;"
```

- [ ] Importa un CSV y vuelve a llamar: el número **cambia**. No es un valor cacheado ni fijo.
- [ ] `version` viene recortada antes del `on` — muestra el motor, no la cadena completa de compilación.

---

## 3 · Redis caído devuelve `ok:false`, no `500`

**El caso central de este documento.**

### Pasos

```bash
docker stop ecommerce-redis
curl -s -w "\nHTTP %{http_code}\n" "$API/status/redis" -H "Authorization: Bearer $TOKEN"
```

### Resultado esperado

```json
{ "source": "redis", "ok": false, "latencyMs": 120, "error": "connect ECONNREFUSED ..." }
```

```
  HTTP 200
```

- [ ] **`HTTP 200`, no `500`.** Este es el punto entero del caso.
- [ ] `ok: false` y un `error` que dice qué pasó.
- [ ] `latencyMs` refleja el tiempo que tardó en fallar.
- [ ] **`GET /status/db` sigue devolviendo `ok: true`.** Una dependencia caída no arrastra a la otra.
- [ ] Y lo que más importa: **la aplicación sigue vendiendo**. Con Redis caído, `GET /products`
      responde `200` (sin caché) y `POST /orders` completa una compra — ver
      [TC-06 · R9](TC-06-concurrency-and-races.md#r9--redis-caído-no-cancela-una-venta).

```bash
curl -s -o /dev/null -w "GET /products sin Redis: %{http_code}\n" "$API/products"
```

Levántalo de nuevo:

```bash
docker start ecommerce-redis
```

- [ ] Tras unos segundos, `/status/redis` vuelve a `ok: true`.
- [ ] **`visits` conserva su valor anterior** — Redis persiste, no arranca de cero. (Si tu compose
      no monta volumen para Redis, sí arrancará en 1: compruébalo antes de reportarlo como fallo.)

---

## 4 · Postgres caído devuelve `ok:false`, no `500`

### Pasos

```bash
docker stop ecommerce-db
curl -s -w "\nHTTP %{http_code}\n" "$API/status/db" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "GET /health: %{http_code}\n" "$API/health"
docker start ecommerce-db
```

### Resultado esperado

- [ ] `/status/db` responde **`200`** con `ok: false` y su `error`.
- [ ] `/health` responde **`200`** con `postgres.pgHealth` reportando el fallo — el bloque `app` y
      el bloque `resources` siguen ahí.
- [ ] `/status/redis` sigue en `ok: true`.
- [ ] `GET /products` **sí** falla: el catálogo no puede servirse sin base de datos. Eso es
      correcto — la degradación elegante cubre el *diagnóstico*, no inventa datos.
- [ ] Tras `docker start`, todo vuelve a la normalidad sin reiniciar la API.

> Una advertencia práctica: tras devolver Postgres, dale unos segundos al pool de conexiones. La
> primera petición puede fallar mientras reconecta.

---

## 5 · `/health` es público y no exige token

Es el endpoint que consumiría un orquestador, que nunca tiene credenciales.

### Pasos

```bash
curl -s -o /dev/null -w "health sin token: %{http_code}\n" "$API/health"
curl -s "$API/health" | head -c 400; echo
```

### Resultado esperado

- [ ] **`200` sin token.**
- [ ] El cuerpo trae tres bloques: `app`, `resources` y `postgres`.
- [ ] `app` incluye `name`, `version`, `env`, `uptimeMs` y `node`.
- [ ] `resources` incluye memoria (`rss`, `heapUsed`, `heapTotal`), CPU y `eventLoopDelayMs`.
- [ ] `uptimeMs` **crece** entre dos llamadas separadas por unos segundos.
- [ ] `loadAvg` puede ser `[0,0,0]` si el host es Windows. No es un fallo.
- [ ] Y por contraste, `/status/db` y `/status/redis` **sin token dan `401`** — ver
      [TC-07](TC-07-login-and-permissions.md) check 3.

---

## 6 · La pantalla de status refleja todo lo anterior

### Pasos

1. Abre `/dashboard/status` con sesión iniciada.
2. Déjala abierta y observa unos 15 segundos.
3. En otra terminal: `docker stop ecommerce-redis`.
4. Espera unos segundos sin tocar la pantalla.
5. `docker start ecommerce-redis`.

### Resultado esperado

- [ ] Las tres tarjetas (API / Postgres / Redis) se pintan en verde.
- [ ] **Los datos se refrescan solos cada 5 segundos** — el contador de visitas de Redis sube sin
      que recargues.
- [ ] Al parar Redis, esa tarjeta pasa a estado de error **sin recargar la página**, y las otras dos
      **siguen en verde**.
- [ ] La pantalla no muestra una pantalla de error global ni se queda en blanco: solo esa tarjeta
      cambia de estado.
- [ ] Al levantar Redis, la tarjeta vuelve a verde sola, en el siguiente ciclo de 5 s.

### El detalle del límite de tasa

Tres endpoints cada 5 segundos son 36 peticiones por minuto por pestaña abierta. El techo global es
de **300/min**, así que:

- [ ] Deja la pantalla abierta 3 minutos: **no aparece ningún `429`**.
- [ ] Con ~8 pestañas abiertas a la vez sí empezarías a rozar el techo. Es el motivo por el que el
      límite global es alto y los endpoints sensibles (`sign-in`, `import`) declaran el suyo propio.

---

## 7 · Los tiempos de respuesta son razonables

No es un test de rendimiento, es una comprobación de cordura.

### Pasos

```bash
for i in $(seq 1 5); do
  curl -s -o /dev/null -w "db: %{time_total}s  " "$API/status/db" -H "Authorization: Bearer $TOKEN"
  curl -s -o /dev/null -w "redis: %{time_total}s\n" "$API/status/redis" -H "Authorization: Bearer $TOKEN"
done
```

### Resultado esperado

- [ ] En local, ambos por debajo de **100 ms**.
- [ ] `latencyMs` en el cuerpo es siempre **menor** que el `time_total` de curl — mide solo la
      consulta, no el viaje HTTP. Si fuera al revés, algo está mal medido.
- [ ] `eventLoopDelayMs` en `/health` se mantiene bajo (típicamente < 5 ms). Un valor alto sostenido
      indicaría trabajo síncrono bloqueando el proceso.

---

## Resultado

| # | Caso | Resultado |
|---|---|---|
| 1 | Redis responde y `visits` avanza | |
| 2 | Postgres responde y `productCount` es real | |
| 3 | Redis caído → `200` con `ok:false`, la app sigue vendiendo | |
| 4 | Postgres caído → `200` con `ok:false` | |
| 5 | `/health` público, sin token | |
| 6 | La pantalla refresca sola y degrada por tarjeta | |
| 7 | Tiempos razonables y `latencyMs` coherente | |

**Notas:**
