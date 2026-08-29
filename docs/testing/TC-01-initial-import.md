# TC-01 · Initial import into an empty catalog

| | |
|---|---|
| **Status** | ✅ **Passed** |
| **Date** | 2026-08-28 |
| **Tickets** | TK-009, TK-023, TK-026, TK-033, TK-040, TK-042 |
| **File** | `LoanPro Code Challenge E-Commerce.csv` (unmodified, 97 data rows) |

## Objective

Verify that a single import of the challenge CSV into an empty catalog classifies every row
correctly, saves only the valid ones, and reports precisely what happened with each of the
rest — including the rows it deliberately refused.

This is the case that exercises the whole pipeline at once: file validation, parsing,
per-row normalization, DTO rules, the duplicate-SKU rule and persistence.

## Preconditions

```
  products         0
  import_batches   0
  user             1     (demo account, untouched)
```

## Steps

1. Sign in at `http://localhost:3000` as `demo@demo.com`.
2. Go to **Product → Import CSV**.
3. Upload the unmodified challenge CSV.

## Expected results

### Summary

| Metric | Expected |
|---|---|
| Total rows | 97 |
| Created | 85 |
| Updated | 0 |
| Unchanged | 0 |
| Rejected | 10 |
| Skipped empty | 2 |

### The ten rejected rows

Five fail validation, five are the occurrences of two SKUs repeated inside the file.

| Line | SKU | Reason | Group |
|---|---|---|---|
| 2 | RS-001 | duplicate sku (lines 2, 36) | duplicate |
| 7 | YM-015 | `price` is not a valid number: `free` | validation |
| 11 | BS-021 | duplicate sku (lines 11, 56, 89) | duplicate |
| 16 | DL-007 | `stock` must not be less than 0 | validation |
| 20 | XS-001 | `name` contains HTML markup | validation |
| 25 | HD-099 | `name` should not be empty | validation |
| 36 | RS-001 | duplicate sku (lines 2, 36) | duplicate |
| 41 | WS-001 | `name` should not be empty (whitespace only) | validation |
| 56 | BS-021 | duplicate sku (lines 11, 56, 89) | duplicate |
| 89 | BS-021 | duplicate sku (lines 11, 56, 89) | duplicate |

Lines 62 and 63 are blank and must appear as **skipped**, not as errors.

### Rows that look like problems but must be accepted

| Line | Content | Expected |
|---|---|---|
| 4 | `price` = `$29.99` | created, symbol stripped → `29.99` |
| 29 | `Robert'); DROP TABLE products;--` | created; the query is parameterized |
| 47 | `price` = `0.00` | created; zero is a valid price |
| 50 | empty `weight_kg` | created with `null`, never `0` |
| 51 | `stock` = 0 | created; the only sold-out product |
| 52 | empty `category` | created as `Uncategorized` |
| 53 | comma inside a quoted name | created |
| 59 | escaped quotes `""Inside""` | created |
| 31 | `—` and `™` | created |

## Acceptance criteria

- [x] `Total = Created + Updated + Unchanged + Rejected + Skipped`
- [x] Exactly 85 products in the catalog, across 18 categories
- [x] `RS-001` and `BS-021` are **absent**: a repeated SKU is rejected, not upserted
- [x] The report lists **which** lines were skipped, not just how many
- [x] Line 20 shows the offending markup as plain text in `Name`, never rendered
- [x] Lines 25 and 41 show `—` in `Name`, which is itself the reason they failed
- [x] The `Created rows` table starts at line 3, not line 2
- [x] The status filter narrows the table and the counter reports `Showing N of M`

## Actual results

Matched the expectation exactly.

```
  Total rows   97
  Created      85
  Updated       0
  Unchanged     0
  Rejected     10
  Skipped       2

  Rows to review (12)
  10 rejected and not saved · 0 overwrote an existing SKU · 2 blank and skipped
```

Verified in the database:

| Check | Result |
|---|---|
| `select count(*) from products` | 85 |
| `select count(distinct category)` | 18 |
| `where sku in ('RS-001','BS-021')` | 0 rows |
| `GC-025` category | `Uncategorized` |
| `GK-088` weight | `null` |
| `VC-001` stock | `0` |
| `MB-001` price | `0.00` |

Category breakdown of the 85 created products:

| Category | # | | Category | # |
|---|---|---|---|---|
| Electronics | 14 | | Stationery | 4 |
| Home & Office | 13 | | Books | 2 |
| Sports | 10 | | Footwear | 2 |
| Accessories | 9 | | Clothing | 1 |
| Beauty | 6 | | Gifts | 1 |
| Outdoors | 6 | | Health | 1 |
| Kitchen | 5 | | Pets | 1 |
| Food & Beverage | 4 | | Tools | 1 |
| Games | 4 | | Uncategorized | 1 |

`Footwear` holds 2 rather than 3 because `RS-001` was rejected, and `Misc` never appears at
all: its only row was line 41.

## Evidence

![Import summary and rows to review](assets/tc-01-import-report.png)

![Created rows and the product list](assets/tc-01-created-rows.png)

## Defects found

| Ticket | Summary |
|---|---|
| TK-047 | Rows rejected by the duplicate-SKU rule show `—` in `Name` although the file carries one. `rejectDuplicateSkus` does not propagate the name, unlike the other two rejection paths. |
