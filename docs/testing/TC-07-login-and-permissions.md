# TC-07 · Login, session and the permission matrix

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-014, TK-050 |
| **Process** | [P-06](../processes/P-06-authentication.md) |

## Goal

Verify who can do what. In this project authentication does not protect the purchase — **buying is
public on purpose** — it protects catalog administration. That nuance is the one worth checking by
hand: it is easy to assume an e-commerce requires an account to pay, and here the decision is the
opposite.

The other point is that the guard **fails closed**: a new endpoint is born protected and has to be
declared `@Public()` to open it. An oversight produces a visible `401`, never a silent hole.

## The matrix under test

```
   PUBLIC (no token)                 PROTECTED (Bearer JWT)
   -------------------------         ----------------------------------
   GET  /products                    POST   /products
   GET  /products/:id                PATCH  /products/:id
   GET  /products/categories         DELETE /products/:id
   POST /orders     <-- buying       POST   /products/import
   POST /auth/sign-in                GET    /products/import/batches
   GET  /health                      GET    /orders    <-- administering
                                     GET    /orders/:id
                                     GET    /status/redis
                                     GET    /status/db
                                     GET    /auth/me
                                     POST   /auth/sign-up   <-- note
```

`POST /auth/sign-up` **requires a session**. An account here only grants catalog administration, so
open registration would let anyone hand themselves those rights.

## Preconditions

```bash
docker compose up -d --build
API=http://localhost:4000/api/v1
```

Account seeded by migration: `demo@demo.com` / `demo`.

---

## 1 · Signing in returns a token and no password

### Steps

```bash
curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | tee /tmp/signin.json
```

### Expected result

- [ ] `200` with a body carrying `accessToken` and the user's public data.
- [ ] **`password` appears nowhere**, not even hashed:

```bash
grep -c password /tmp/signin.json
```

```
  0
```

- [ ] **`refreshToken` does not appear.** It was removed on purpose: the one that used to be issued
      was signed with the same secret and the same payload as the access token, so the JWT strategy
      accepted it as one — it was an access token with a seven-day life and nothing to rotate or
      revoke it.
- [ ] The email is normalised: signing in with `  DEMO@DEMO.COM  ` works the same (the DTO trims
      and lowercases).

Save the token for the rest of the case:

```bash
TOKEN=$(grep -o '"accessToken":"[^"]*"' /tmp/signin.json | cut -d'"' -f4)
```

---

## 2 · Wrong credentials fail indistinguishably

### Steps

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"wrong"}'

curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"nobody@demo.com","password":"demo"}'
```

### Expected result

- [ ] Both return **`401`** with the **same** message: `Invalid credentials`.
- [ ] The response **does not distinguish** between "the user does not exist" and "the password is
      wrong". That difference would be a free account enumerator.
- [ ] From the UI (`/auth/jwt/sign-in`): inline error, the screen does not navigate, the form keeps
      the email.

### And the malformed email, which is a different thing

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"this-is-not-an-email","password":"demo"}'
```

- [ ] **`400`**, not `401`. It is a validation failure, not a credential one, and the error envelope
      carries `message` as a list.

---

## 3 · The token opens what is protected, and its absence closes it

### Steps

```bash
for r in "GET $API/orders" "GET $API/status/db" "GET $API/status/redis" "GET $API/products/import/batches" "GET $API/auth/me"; do
  set -- $r
  echo -n "$2  no token: "
  curl -s -o /dev/null -w "%{http_code}" -X "$1" "$2"
  echo -n "   with token: "
  curl -s -o /dev/null -w "%{http_code}\n" -X "$1" "$2" -H "Authorization: Bearer $TOKEN"
done
```

### Expected result

| Route | No token | With token |
|---|---|---|
| `GET /orders` | `401` | `200` |
| `GET /status/db` | `401` | `200` |
| `GET /status/redis` | `401` | `200` |
| `GET /products/import/batches` | `401` | `200` |
| `GET /auth/me` | `401` | `200` |

- [ ] All five return `401` without a token. **None** returns `200` with partial data.
- [ ] `GET /auth/me` with a token returns the token's user, without `password`.

---

## 4 · What is public stays public

Closing the shop would solve a problem that does not exist.

### Steps

```bash
curl -s -o /dev/null -w "GET  /products            %{http_code}\n" "$API/products"
curl -s -o /dev/null -w "GET  /products/categories %{http_code}\n" "$API/products/categories"
curl -s -o /dev/null -w "GET  /health              %{http_code}\n" "$API/health"
```

### Expected result

- [ ] All three return **`200` without a token**.
- [ ] In the browser, in a private window with no session: `/` and a product detail **render**, they
      do not redirect.
- [ ] And most importantly: **an anonymous purchase completes**. See
      [TC-05](TC-05-purchase-flow.md) check 1 and [TC-06](TC-06-concurrency-and-races.md) — every
      order in those cases is fired without a token.

---

## 5 · Writing to the catalog requires a session

### Steps

```bash
curl -s -o /dev/null -w "POST   no token: %{http_code}\n" -X POST "$API/products" \
  -H 'Content-Type: application/json' -d '{"sku":"TEST-001","name":"Test","price":1,"stock":1}'

curl -s -o /dev/null -w "DELETE no token: %{http_code}\n" -X DELETE "$API/products/00000000-0000-0000-0000-000000000000"
```

### Expected result

- [ ] Both **`401`**, and the `401` arrives **before** any validation: an invalid payload without a
      token is still `401`, not `400`. The guard runs first.
- [ ] With a token, the same `POST` returns `201`.
- [ ] From the UI, opening `/dashboard/product` without a session redirects to login, and after
      authenticating lands **on the route that was requested**, not on the dashboard root.

---

## 6 · User registration is not public

### Steps

```bash
curl -s -o /dev/null -w "sign-up no token: %{http_code}\n" -X POST "$API/auth/sign-up" \
  -H 'Content-Type: application/json' \
  -d '{"email":"intruder@test.com","password":"12345678","name":"Intruder","phone":"+15550000000"}'
```

### Expected result

- [ ] **`401`.** This is the most surprising case and the one most worth recording.
- [ ] With a valid token the same registration works (`201`), and repeating it with the same email
      returns **`400 Email already registered`**.

---

## 7 · The session survives a reload and logout ends it

### Steps

1. Sign in through the UI and navigate to **Product → Product catalog**.
2. Reload the page with F5.
3. Sign out.
4. Press the browser's *back* button.

### Expected result

- [ ] After the reload you are still in, on the same route, with no login flicker.
- [ ] After signing out, *back* does **not** return the protected screen: it redirects to login.
- [ ] The token disappears from browser storage.

---

## 8 · An expired or tampered token is refused

The token lives **`1d`** by default (`JWT_EXPIRES_IN`), so waiting for it to expire is not
practical. It is checked by tampering, which proves the same thing: the signature is what decides.

### Steps

```bash
# One character changed in the signature
curl -s -o /dev/null -w "broken sig:  %{http_code}\n" "$API/orders" -H "Authorization: Bearer ${TOKEN}x"

# A token with a valid shape but made up
curl -s -o /dev/null -w "made up:     %{http_code}\n" "$API/orders" -H "Authorization: Bearer a.b.c"

# Without the Bearer prefix
curl -s -o /dev/null -w "no Bearer:   %{http_code}\n" "$API/orders" -H "Authorization: $TOKEN"
```

### Expected result

- [ ] All three return **`401`**.
- [ ] None returns `500`: a junk token is an invalid credential, not a server failure.
- [ ] The error body respects the shared envelope (`statusCode`, `error`, `message`, `path`,
      `timestamp`) — see [P-07](../processes/P-07-error-contract.md).

To test expiry for real, bring the API up with a one-second token:

```bash
docker compose stop api
JWT_EXPIRES_IN=1s docker compose up -d api
```

- [ ] Sign in, wait two seconds and call `GET /auth/me`: **`401`**.
- [ ] In the UI, the session expires and returns to login without getting stuck on a broken screen.

> Remember to bring the API back up without that variable.

---

## 9 · Login is rate limited

`POST /auth/sign-in` declares its own ceiling: **30 per minute** (`AUTH_RATE_LIMIT`). The global
ceiling is 300/min, which for a credential endpoint is the same as having none.

### Steps

```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$API/auth/sign-in" \
    -H 'Content-Type: application/json' -d '{"email":"demo@demo.com","password":"wrongpass"}'
done; echo
```

### Expected result

```
  401 401 401 ... (x30) ... 429 429 429 429 429
```

- [ ] The first ~30 are `401`; from there on **`429 TOO_MANY_REQUESTS`**.
- [ ] The `429` is a translated error, not a `500`.
- [ ] After a minute the window resets and it answers `401` again.

> It is a ceiling meant to stop a script, not a person. If it gets in the way while running the
> other cases, raise it with `AUTH_RATE_LIMIT`.

---

## 10 · The import records who ran it

The only place where the session leaves a trace in the data.

### Steps

1. Signed in, import a CSV at **Product → Import CSV**.
2. Go to **Product → Import history** and open the batch.

### Expected result

- [ ] The batch shows **Imported by** with `demo@demo.com`.
- [ ] Via the API:

```bash
curl -s "$API/products/import/batches" -H "Authorization: Bearer $TOKEN" | grep -o '"importedBy":"[^"]*"' | head
```

- [ ] Batches older than the attribution feature show `null`, and the screen renders them with a
      dash rather than breaking.

---

## Result

| # | Case | Result |
|---|---|---|
| 1 | Login returns a token, no `password` or `refreshToken` | |
| 2 | Bad credentials are indistinguishable from each other | |
| 3 | Protected routes: `401` without a token, `200` with one | |
| 4 | The shop and the purchase stay public | |
| 5 | Writing to the catalog requires a session | |
| 6 | `sign-up` is not public | |
| 7 | The session survives a reload; logout ends it | |
| 8 | Expired or tampered token → `401` | |
| 9 | Rate limit on login → `429` | |
| 10 | The import records the user | |

**Notes:**
