# Design: csv-import (TK-009 + TK-023)

## Contrato de API

### `POST /api/v1/products/import`

multipart/form-data, campo `file`. Límites: 5MB, extensión `.csv`, MIME `text/csv` (tolerando
`application/vnd.ms-excel` que envían algunos navegadores/Excel). Headers esperados (exactos):
`name,sku,description,category,price,stock,weight_kg` — si faltan columnas → 400 inmediato.

Respuesta 201:

```json
{
  "batchId": "uuid",
  "summary": {
    "totalRows": 96,
    "inserted": 80,
    "updated": 4,
    "unchanged": 1,
    "rejected": 9,
    "skippedEmpty": 2
  },
  "rejected": [
    { "line": 7, "sku": "YM-015", "errors": ["price is not a valid number: 'free'"] },
    { "line": 16, "sku": "DL-007", "errors": ["stock must not be less than 0"] }
  ],
  "warnings": [
    { "line": 36, "sku": "RS-001", "message": "sku already exists with different data — updated" }
  ]
}
```

- `line` = número de línea real del archivo (header = línea 1; primera fila de datos = 2), para
  que el usuario encuentre la fila en su Excel.
- 400 solo por problemas del ARCHIVO (no es CSV, muy grande, headers inválidos). Las filas malas
  **nunca** abortan el import (parcial por diseño, initial.md §4).

### `GET /api/v1/products/import/batches?page&limit` → envelope paginado de batches
### `GET /api/v1/products/import/batches/:id` → batch con su reporte completo

## Entidad `ImportBatch` (tabla `import_batches`)

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| filename | varchar(255) | nombre original del archivo |
| status | varchar(20) | processing → completed / failed |
| total_rows / inserted / updated / unchanged / rejected / skipped_empty | int | contadores |
| report | jsonb | `{ rejected: [...], warnings: [...] }` |
| created_at | timestamptz | |

## Pipeline por fila (capas 3–6 de initial.md §4.5)

1. **Parser** (`csv-parse`, `columns: true`, `relax_quotes` off, `bom: true`, `trim` off — el trim
   es del DTO): valida estructura; comas/comillas dentro de campos (líneas 3/53/59) las maneja la
   librería.
2. **Fila 100% vacía** (líneas 62-63) → `skippedEmpty`, no cuenta como error.
3. **Normalización previa** (`ImportRowNormalizer`): trim de todos los campos; `price`: si
   matchea `^[^0-9.-]*[0-9]` se limpian símbolos de moneda y separadores de miles (`$29.99` →
   `29.99`) — si tras limpiar no es número (`"free"`) el DTO lo rechaza con mensaje claro;
   `weight_kg` vacío → `undefined` (NULL, jamás 0); `category` vacía → se omite y el servicio
   aplica el default `'Uncategorized'` de TK-007.
4. **DTO por fila**: reutiliza las MISMAS reglas de `CreateProductDto` (sanitización XSS de
   name/description incluida) vía una instancia de `ValidationPipe` con las opciones de
   producción. Errores → fila rechazada con los mensajes.
5. **Regla de negocio — upsert por SKU** (initial.md §1.4):
   - SKU no existe → INSERT (`inserted`).
   - SKU existe y todos los campos importados idénticos → no-op (`unchanged`, sin warning — evita
     ruido, línea 89 BS-021).
   - SKU existe con datos distintos → UPDATE + **warning** (líneas 36 RS-001, 56 BS-021 — el CSV
     representa el último estado conocido, "corrección de catálogo").
   - SKU duplicado DENTRO del archivo: procesamiento secuencial — la fila posterior actualiza a
     la anterior con warning (misma regla).
6. **DB**: constraints de TK-007 como última defensa. Todo el batch corre dentro de una
   transacción de escritura por fila (no transacción global: el import es parcial por diseño).
   El payload SQLi (línea 29) es inofensivo por queries parametrizadas — y además su sku
   inválido lo rechaza en la capa 4.

## Resultados con el CSV real (fixture `loanpro-sample.csv`, 98 líneas: 1 header + 97 datos)

**Números verificados por la implementación** (asserted en el spec de integración):
`totalRows 97 · inserted 88 · updated 3 · unchanged 0 · rejected 4 · skippedEmpty 2`.

- Rechazadas: línea 7 (`price 'free'`), 16 (`stock -5`), 25 y 41 (name vacío/solo espacios).
- Vacías (skipped): 62–63.
- Updates con warning: 36 (RS-001), 56 y 89 (BS-021).

Dos correcciones al análisis inicial, descubiertas contra el archivo real:
1. **Línea 29 se ACEPTA**: el payload SQLi está en la columna `name` (dato inofensivo con ORM
   parametrizado); su sku es `SQL-001`, perfectamente válido. Rechazarla habría sido incorrecto.
2. **Línea 89 es update+warning, no no-op**: es idéntica a la línea 11, pero la regla secuencial
   de duplicados dentro del archivo la compara contra el estado que dejó la línea 56 (que difiere).
   El camino `unchanged` queda cubierto por test unitario dedicado.

## FE — página de import (aplica skill fe-architecture)

- `paths.dashboard.product.import` = `/dashboard/product/import`; ruta en `dashboard.tsx`.
- Botón **Import CSV** (icono upload) en el header de `product-list-view.tsx`, junto a "New product".
- `types/product.ts`: `IImportSummary`, `IImportRejectedRow`, `IImportWarning`, `IImportResult`.
- `actions/product.ts`: `importProductsCsv(file: File)` con FormData.
- `hooks/use-product.ts`: `useImportProducts()` (mutación; onSuccess invalida `productKeys.lists()`
  + toast con el resumen).
- `sections/product/view/product-import-view.tsx` + componentes:
  - Reutiliza `Upload` (`src/components/upload`) en modo single-file, accept `.csv`, validación
    de tamaño en cliente (5MB — capa 1, solo UX).
  - `CustomBreadcrumbs` como el resto del dashboard.
  - Resultado: cards de resumen (patrón de tarjetas existente), tabla MUI de filas rechazadas
    (línea, sku, motivo — reutilizando `components/table` o Table simple), lista de warnings con
    `Label`/`Alert`. Botón para volver a la lista.
- Misma UX que el resto: LoadingButton mientras sube, toasts sonner, errores de archivo (400) en
  `Alert` inline.

## Testing

- **BE (Jest)**: spec del servicio de import con repos mockeados + spec de integración del parser
  con el fixture real (assert de los números exactos de la sección anterior, y casos unitarios:
  limpieza de precio, fila vacía, duplicado en archivo, sanitización XSS).
- **Playwright**: sube `web/e2e/fixtures/loanpro-sample.csv` desde la página nueva, verifica el
  resumen renderizado, la tabla de rechazadas (línea 7 "free" visible), y que la lista de
  productos ahora contiene los importados (búsqueda de "Running Shoes"). Cleanup vía API.
