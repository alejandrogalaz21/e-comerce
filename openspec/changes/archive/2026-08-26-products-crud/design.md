# Design: products-crud (TK-007)

## Contrato de API (fuente de verdad para BE y FE)

Base: `/api/v1/products`

| Método | Ruta | Respuesta | Errores |
|---|---|---|---|
| POST | `/products` | 201 → Product | 400 validación, 409 SKU duplicado |
| GET | `/products?page&limit` | 200 → `{ data: Product[], pagination }` | — |
| GET | `/products/:id` | 200 → Product | 404, 400 uuid inválido |
| PATCH | `/products/:id` | 200 → Product | 400, 404, 409 SKU duplicado |
| DELETE | `/products/:id` | 204 (sin body) | 404 |

`pagination` = shape existente del builder: `{ total, per_page, current_page, last_page, from, to }`.

### Product (JSON wire format)

```json
{
  "id": "uuid",
  "sku": "RS-001",
  "name": "Running Shoes",
  "description": "Lightweight running shoes for daily training",
  "category": "Footwear",
  "price": "89.99",
  "stock": 150,
  "weightKg": "0.35",
  "createdAt": "2026-08-26T10:00:00.000Z",
  "updatedAt": "2026-08-26T10:00:00.000Z"
}
```

Nota fintech: `price` y `weightKg` viajan como **string** (TypeORM devuelve DECIMAL como string
para no perder precisión). El FE los convierte a number **solo en el mapper** (`product.mapper.ts`).

## Entidad (Postgres via TypeORM)

| Columna | Tipo | Constraints |
|---|---|---|
| id | uuid PK | default gen |
| sku | varchar(50) | UNIQUE, NOT NULL |
| name | varchar(255) | NOT NULL |
| description | text | NULL |
| category | varchar(100) | NOT NULL default 'Uncategorized' |
| price | numeric(10,2) | NOT NULL, CHECK >= 0 |
| stock | int | NOT NULL default 0, CHECK >= 0 |
| weight_kg | numeric(10,3) | NULL (propiedad `weightKg`) |
| created_at / updated_at | timestamptz | auto |

## Validaciones (derivadas del CSV de ejemplo — initial.md §1)

| Campo | Regla en DTO | Caso del CSV que cubre |
|---|---|---|
| name | `@Transform(trim)` + `@IsNotEmpty` + `@MaxLength(255)` + sanitización de tags HTML | línea 25 (vacío), 41 (solo espacios), 20 (`<script>`) |
| sku | trim + `@IsNotEmpty` + `@MaxLength(50)` + `@Matches(/^[A-Za-z0-9-]+$/)` | clave de negocio; SQLi línea 29 no matchea el patrón |
| description | opcional, trim, sanitización de tags HTML, `@MaxLength(2000)` | línea 29 |
| category | opcional, trim; si vacío → 'Uncategorized' (en servicio) | línea 52 |
| price | `@IsNumber({maxDecimalPlaces:2})` + `@Min(0)` | `0.00` válido (47); "free"/"$29.99" son asunto del import (TK-023) — aquí el JSON debe traer number |
| stock | `@IsInt` + `@Min(0)` | línea 16 (−5) |
| weightKg | opcional (`@IsOptional`) + `@IsNumber` + `@Min(0)`; ausente → NULL, nunca 0 | línea 50 |

Sanitización: strip de tags HTML (regex de `<[^>]*>`) + trim — defensa en profundidad; React
escapa al renderizar, la DB tiene constraints, el ORM parametriza (capas 1/4/6 del spec §4.5).

## FE — aplicación de la skill `fe-architecture`

- `types/product.ts`: `IProductItem` recortado al contrato + `ApiProduct` (wire) + envelope
  `IPaginatedResponse<T>` en `types/common.ts`.
- `actions/product.ts` + `actions/product.mapper.ts`: funciones puras + ACL.
- `sections/product/hooks/use-product.ts`: `productKeys` con params de lista; queries +
  `useCreateProduct/useUpdateProduct/useDeleteProduct` con `invalidateQueries` + toasts.
- Form: `NewProductSchema` (zod) espeja las validaciones del BE.
- UI simplificada al contrato: la tabla admin muestra sku/name/category/price/stock/weight;
  fuera ratings/colors/sizes/labels del template.

## Testing

- **BE (Jest)**: `products.service.spec.ts` con repositorio mockeado — create con category
  default, conflicto de SKU → 409, findOne 404, update parcial, remove 404, normalización.
- **FE Storybook**: stories de `InfoRow`, `StatusChip`, `ServiceStatusCard` y componentes clave
  de product.
- **FE Playwright** (`web/e2e/`): flujo completo contra docker: crear → ver en lista → editar →
  borrar, + validación de formulario.
