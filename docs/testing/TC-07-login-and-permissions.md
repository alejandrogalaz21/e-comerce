# TC-07 · Login, sesión y matriz de permisos

| | |
|---|---|
| **Estado** | ⬜ **Por ejecutar** |
| **Fecha** | — |
| **Tickets** | TK-014, TK-050 |
| **Proceso** | [P-06](../processes/P-06-authentication.md) |

## Objetivo

Verificar quién puede hacer qué. En este proyecto la autenticación no protege la compra —
**comprar es público a propósito** — sino la administración del catálogo. Ese matiz es el que
merece comprobarse a mano: es fácil suponer que un e-commerce exige cuenta para pagar, y aquí la
decisión es la contraria.

El otro punto es que el guard **falla cerrado**: un endpoint nuevo nace protegido y hay que
declararlo `@Public()` para abrirlo. Un olvido produce un `401` visible, nunca un agujero silencioso.

## La matriz que se está probando

```
   PUBLICO (sin token)               PROTEGIDO (Bearer JWT)
   -------------------------         ----------------------------------
   GET  /products                    POST   /products
   GET  /products/:id                PATCH  /products/:id
   GET  /products/categories         DELETE /products/:id
   POST /orders     <-- comprar      POST   /products/import
   POST /auth/sign-in                GET    /products/import/batches
   GET  /health                      GET    /orders    <-- administrar
                                     GET    /orders/:id
                                     GET    /status/redis
                                     GET    /status/db
                                     GET    /auth/me
                                     POST   /auth/sign-up   <-- ojo
```

`POST /auth/sign-up` **requiere sesión**. Una cuenta aquí solo otorga administración del catálogo,
así que un alta abierta dejaría que cualquiera se auto-concediera esos derechos.

## Precondiciones

```bash
docker compose up -d --build
API=http://localhost:4000/api/v1
```

Cuenta sembrada por migración: `demo@demo.com` / `demo`.

---

## 1 · Iniciar sesión devuelve un token y ninguna contraseña

### Pasos

```bash
curl -s -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | tee /tmp/signin.json
```

### Resultado esperado

- [ ] `200` con un cuerpo que trae `accessToken` y los datos públicos del usuario.
- [ ] **No aparece `password` por ningún lado**, ni hasheada:

```bash
grep -c password /tmp/signin.json
```

```
  0
```

- [ ] **No aparece `refreshToken`.** Se eliminó a propósito: el que se emitía iba firmado con el
      mismo secreto y el mismo payload que el de acceso, así que la estrategia JWT lo aceptaba como
      tal — era un token de acceso con siete días de vida y nada que lo rotara ni lo revocara.
- [ ] El email se normaliza: iniciar sesión con `  DEMO@DEMO.COM  ` funciona igual (el DTO hace
      `trim` y `lowercase`).

Guarda el token para el resto del caso:

```bash
TOKEN=$(grep -o '"accessToken":"[^"]*"' /tmp/signin.json | cut -d'"' -f4)
```

---

## 2 · Credenciales incorrectas fallan de forma indistinguible

### Pasos

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"incorrecta"}'

curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"noexiste@demo.com","password":"demo"}'
```

### Resultado esperado

- [ ] Ambos devuelven **`401`** con el **mismo** mensaje: `Invalid credentials`.
- [ ] La respuesta **no distingue** entre "el usuario no existe" y "la contraseña está mal". Esa
      diferencia sería un enumerador de cuentas gratis.
- [ ] Desde la UI (`/auth/jwt/sign-in`): error en línea, la pantalla no navega, el formulario
      conserva el email.

### Y el email malformado, que es otra cosa

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"esto-no-es-un-email","password":"demo"}'
```

- [ ] **`400`**, no `401`. Es un fallo de validación, no de credenciales, y el sobre de error trae
      `message` como lista.

---

## 3 · El token abre lo protegido y su ausencia lo cierra

### Pasos

```bash
for r in "GET $API/orders" "GET $API/status/db" "GET $API/status/redis" "GET $API/products/import/batches" "GET $API/auth/me"; do
  set -- $r
  echo -n "$2  sin token: "
  curl -s -o /dev/null -w "%{http_code}" -X "$1" "$2"
  echo -n "   con token: "
  curl -s -o /dev/null -w "%{http_code}\n" -X "$1" "$2" -H "Authorization: Bearer $TOKEN"
done
```

### Resultado esperado

| Ruta | Sin token | Con token |
|---|---|---|
| `GET /orders` | `401` | `200` |
| `GET /status/db` | `401` | `200` |
| `GET /status/redis` | `401` | `200` |
| `GET /products/import/batches` | `401` | `200` |
| `GET /auth/me` | `401` | `200` |

- [ ] Las cinco devuelven `401` sin token. **Ninguna** devuelve `200` con datos parciales.
- [ ] `GET /auth/me` con token devuelve el usuario del token, sin `password`.

---

## 4 · Lo público sigue siendo público

Cerrar la tienda resolvería un problema que no existe.

### Pasos

```bash
curl -s -o /dev/null -w "GET  /products            %{http_code}\n" "$API/products"
curl -s -o /dev/null -w "GET  /products/categories %{http_code}\n" "$API/products/categories"
curl -s -o /dev/null -w "GET  /health              %{http_code}\n" "$API/health"
```

### Resultado esperado

- [ ] Los tres devuelven **`200` sin token**.
- [ ] En el navegador, en ventana privada y sin sesión: `/` y el detalle de un producto **renderizan**,
      no redirigen.
- [ ] Y lo más importante: **una compra anónima se completa**. Ver [TC-05](TC-05-purchase-flow.md)
      check 1 y [TC-06](TC-06-concurrency-and-races.md) — todos los pedidos de esos casos se disparan
      sin token.

---

## 5 · Escribir en el catálogo exige sesión

### Pasos

```bash
curl -s -o /dev/null -w "POST   sin token: %{http_code}\n" -X POST "$API/products" \
  -H 'Content-Type: application/json' -d '{"sku":"TEST-001","name":"Prueba","price":1,"stock":1}'

curl -s -o /dev/null -w "DELETE sin token: %{http_code}\n" -X DELETE "$API/products/00000000-0000-0000-0000-000000000000"
```

### Resultado esperado

- [ ] Ambas **`401`**, y el `401` llega **antes** que cualquier validación: un payload inválido sin
      token sigue siendo `401`, no `400`. El guard corre primero.
- [ ] Con token, el mismo `POST` devuelve `201`.
- [ ] Desde la UI, abrir `/dashboard/product` sin sesión redirige a login, y tras autenticarse
      aterriza **en la ruta que se pidió**, no en la raíz del dashboard.

---

## 6 · El alta de usuarios no es pública

### Pasos

```bash
curl -s -o /dev/null -w "sign-up sin token: %{http_code}\n" -X POST "$API/auth/sign-up" \
  -H 'Content-Type: application/json' \
  -d '{"email":"intruso@test.com","password":"12345678","name":"Intruso","phone":"+15550000000"}'
```

### Resultado esperado

- [ ] **`401`.** Este es el caso que más sorprende y el que más conviene dejar registrado.
- [ ] Con un token válido, el mismo alta funciona (`201`), y repetirla con el mismo email devuelve
      **`400 Email already registered`**.

---

## 7 · La sesión sobrevive a una recarga y el logout la termina

### Pasos

1. Inicia sesión en la UI y navega a **Product → Product catalog**.
2. Recarga la página con F5.
3. Cierra sesión.
4. Pulsa el botón *atrás* del navegador.

### Resultado esperado

- [ ] Tras la recarga sigues dentro, en la misma ruta, sin parpadeo de login.
- [ ] Tras el logout, *atrás* **no** devuelve la pantalla protegida: redirige a login.
- [ ] El token desaparece del almacenamiento del navegador.

---

## 8 · Un token expirado o alterado se rechaza

El token vive **`1d`** por defecto (`JWT_EXPIRES_IN`), así que esperar a que caduque no es práctico.
Se comprueba manipulándolo, que prueba lo mismo: la firma es lo que manda.

### Pasos

```bash
# Un caracter cambiado en la firma
curl -s -o /dev/null -w "firma rota:   %{http_code}\n" "$API/orders" -H "Authorization: Bearer ${TOKEN}x"

# Un token con forma valida pero inventado
curl -s -o /dev/null -w "inventado:    %{http_code}\n" "$API/orders" -H "Authorization: Bearer a.b.c"

# Sin el prefijo Bearer
curl -s -o /dev/null -w "sin Bearer:   %{http_code}\n" "$API/orders" -H "Authorization: $TOKEN"
```

### Resultado esperado

- [ ] Los tres devuelven **`401`**.
- [ ] Ninguno devuelve `500`: un token basura es una credencial inválida, no un fallo del servidor.
- [ ] El cuerpo del error respeta el sobre común (`statusCode`, `error`, `message`, `path`,
      `timestamp`) — ver [P-07](../processes/P-07-error-contract.md).

Para probar la expiración de verdad, levanta la API con un token de un segundo:

```bash
docker compose stop api
JWT_EXPIRES_IN=1s docker compose up -d api
```

- [ ] Inicia sesión, espera dos segundos y llama a `GET /auth/me`: **`401`**.
- [ ] En la UI, la sesión caduca y devuelve a login sin quedarse en una pantalla rota.

> Acuérdate de volver a levantar la API sin esa variable.

---

## 9 · El login está limitado por tasa

`POST /auth/sign-in` declara su propio límite: **30 por minuto** (`AUTH_RATE_LIMIT`). El techo
global es 300/min, que para un endpoint de credenciales equivale a no tener ninguno.

### Pasos

```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$API/auth/sign-in" \
    -H 'Content-Type: application/json' -d '{"email":"demo@demo.com","password":"malapass"}'
done; echo
```

### Resultado esperado

```
  401 401 401 ... (x30) ... 429 429 429 429 429
```

- [ ] Los primeros ~30 son `401`; a partir de ahí **`429 TOO_MANY_REQUESTS`**.
- [ ] El `429` es un error traducido, no un `500`.
- [ ] Tras un minuto, la ventana se reinicia y vuelve a responder `401`.

> Es un límite pensado para frenar un script, no a una persona. Si te estorba ejecutando los otros
> casos, súbelo con `AUTH_RATE_LIMIT`.

---

## 10 · La importación registra quién la ejecutó

El único punto donde la sesión deja rastro en los datos.

### Pasos

1. Con sesión iniciada, importa un CSV en **Product → Import CSV**.
2. Ve a **Product → Import history** y abre el lote.

### Resultado esperado

- [ ] El lote muestra **Imported by** con `demo@demo.com`.
- [ ] Vía API:

```bash
curl -s "$API/products/import/batches" -H "Authorization: Bearer $TOKEN" | grep -o '"importedBy":"[^"]*"' | head
```

- [ ] Lotes anteriores a que existiera la atribución muestran `null`, y la pantalla los renderiza
      con una raya, no se rompe.

---

## Resultado

| # | Caso | Resultado |
|---|---|---|
| 1 | Login devuelve token, sin `password` ni `refreshToken` | |
| 2 | Credenciales malas son indistinguibles entre sí | |
| 3 | Rutas protegidas: `401` sin token, `200` con token | |
| 4 | La tienda y la compra siguen siendo públicas | |
| 5 | Escribir en el catálogo exige sesión | |
| 6 | `sign-up` no es público | |
| 7 | La sesión sobrevive a recarga; el logout la termina | |
| 8 | Token expirado o alterado → `401` | |
| 9 | Límite de tasa en el login → `429` | |
| 10 | La importación registra al usuario | |

**Notas:**
