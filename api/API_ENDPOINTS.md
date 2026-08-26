# API Endpoints

Base URL: `http://localhost:4000/api/v1` (docker) · `http://localhost:8080/api/v1` (local dev)

**Interactive docs (source of truth): Swagger at `/api/v1/docs`** — every endpoint is documented
there with request/response schemas and examples. This file is a quick reference only.

## Products (TK-007)

| Method | Route | Description | Errors |
|---|---|---|---|
| POST | `/products` | Create product | 400 validation, 409 duplicate sku |
| GET | `/products?page=1&limit=10` | Paginated list (newest first) | — |
| GET | `/products/:id` | Get by uuid | 400 invalid uuid, 404 |
| PATCH | `/products/:id` | Partial update | 400, 404, 409 duplicate sku |
| DELETE | `/products/:id` | Delete (204, no body) | 404 |

Product wire format — `price` and `weightKg` are DECIMAL strings to preserve precision:

```json
{
  "id": "407e0f45-ea5d-45d6-a510-49088549e90c",
  "sku": "RS-001",
  "name": "Running Shoes",
  "description": "Lightweight running shoes for daily training",
  "category": "Footwear",
  "price": "89.99",
  "stock": 150,
  "weightKg": "0.350",
  "createdAt": "2026-08-26T23:47:21.125Z",
  "updatedAt": "2026-08-26T23:47:21.125Z"
}
```

List envelope:

```json
{
  "data": [],
  "pagination": { "total": 0, "per_page": 10, "current_page": 1, "last_page": 1, "from": 0, "to": 0 }
}
```

Validation rules (mirrors the CSV contract — see `openspec/changes/products-crud/design.md`):
`name` required/trimmed/HTML-stripped (max 255) · `sku` required, `^[A-Za-z0-9-]+$` (max 50) ·
`description` optional (max 2000, HTML-stripped) · `category` optional → defaults to
`Uncategorized` · `price` number ≥ 0, 2 decimals · `stock` int ≥ 0 · `weightKg` optional ≥ 0
(absent → NULL, never 0).

## Health & status

| Method | Route | Description |
|---|---|---|
| GET | `/health` | App + resources + Postgres health |
| GET | `/status/db` | Live read from Postgres (never 500; `ok: false` when down) |
| GET | `/status/redis` | Live round-trip against Redis (INCR + PING) |

## Auth & users (extension point — not used by challenge flows)

JWT auth (`/auth/sign-up`, `/auth/sign-in`, `/auth/me`) and users CRUD exist as a working
extension point; challenge endpoints are intentionally public (see README decisions).
