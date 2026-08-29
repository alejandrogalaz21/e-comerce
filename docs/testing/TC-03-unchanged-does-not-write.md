# TC-03 · `Unchanged` does not write, `Updated` does

| | |
|---|---|
| **Status** | ✅ **Passed** |
| **Date** | 2026-08-28 |
| **Tickets** | TK-009, TK-036, TK-039 |
| **Files** | `...-T1.csv` (unchanged re-import) and `...-T3.csv` (one price edited) |

## Objective

Prove that `Unchanged` means **the row is not written at all**, not "written with the same
values", and that a single differing field is enough to flip it to `Updated`.

This is a test of an **absence**: it verifies that something does *not* happen. The catalog
size does not change in either direction, and the counters alone cannot tell the two apart —
only the timestamp can.

## Why the guarantee is structural

The service's unchanged branch increments the counter and does nothing else. It never calls
`save()`, so TypeORM's `@UpdateDateColumn` has no opportunity to fire. The timestamp is not
rewritten with an identical value: it is not written.

## Preconditions

TC-02 completed. The catalog holds 85 products and RS-050 was updated once.

```
  RS-050
    createdAt   2026-08-29 00:15:53.974713+00
    updatedAt   2026-08-29 00:39:46.895597+00   =  X
    price       59.99

  catalog   85 products, 1 with updatedAt moved
```

## Step 1 — Re-import the exact same file

Upload `...-T1.csv` untouched.

### Expected

| Metric | Expected |
|---|---|
| Created | 0 |
| **Updated** | **0** |
| Unchanged | 85 |
| Rejected | 10 |
| Skipped empty | 2 |

Acceptance criteria:

- [x] `RS-050.updatedAt == X` **to the microsecond**
- [x] Products with a moved `updatedAt` stays at 1 — no collateral writes
- [x] `max(updatedAt)` across the catalog is **earlier** than the import that just ran

### Actual

```
  batch 00:52:43   0 created · 0 updated · 85 unchanged · 10 rejected · 2 skipped

  RS-050.updatedAt      2026-08-29 00:39:46.895597+00   identical to X
  rows with updatedAt moved   1 of 85
  max(updatedAt)        2026-08-29 00:39:46.895597+00   <- earlier than the 00:52 batch
```

That last line is the strongest evidence: the most recently modified product in the whole
catalog is still older than the import that had just processed all 85 rows. Nothing was
written — not only for RS-050.

## Step 2 — Change a single field

`...-T3.csv` differs from `...-T1.csv` in exactly one cell:

```diff
- Running Shoes,RS-050,UPDATED DESCRIPTION,Footwear,59.99,150,0.30
+ Running Shoes,RS-050,UPDATED DESCRIPTION,Footwear,64.99,150,0.30
```

One of the six comparable fields. The strictest possible test of the comparator.

### Expected

| Metric | Expected |
|---|---|
| Created | 0 |
| **Updated** | **1** |
| Unchanged | 84 |
| Rejected | 10 |
| Skipped empty | 2 |

Acceptance criteria:

- [x] `RS-050.price == 64.99`
- [x] `RS-050.updatedAt == Y` with `Y > X`
- [x] `RS-050.createdAt` unchanged at `00:15:53.974713`
- [x] Products with a moved `updatedAt` still 1 — the update touched one row, not many

### Actual

```
  batch 01:01:03   0 created · 1 updated · 84 unchanged · 10 rejected · 2 skipped

  price                 59.99  ->  64.99
  createdAt             2026-08-29 00:15:53.974713+00   untouched
  updatedAt             2026-08-29 01:01:03.507044+00   Y > X
  rows with updatedAt moved   1 of 85
  max(updatedAt)        2026-08-29 01:01:03.507044+00   <- later than the import
```

## The full sequence

The four imports read as one continuous argument:

```
  00:15:53   85 created                 RS-050.updatedAt = 00:15:53   born
  00:39:46    1 updated,  84 unchanged  RS-050.updatedAt = 00:39:46   X   moved
  00:52:43    0 updated,  85 unchanged  RS-050.updatedAt = 00:39:46   X   NOT moved
  01:01:03    1 updated,  84 unchanged  RS-050.updatedAt = 01:01:03   Y   moved
```

The third batch is the heart of the case: 85 rows evaluated, zero writes. The fourth
provides the contrast — the same file except for one field, and the timestamp advances.

`max(updatedAt)` tells the same story without ambiguity:

| After batch | `max(updatedAt)` | Reading |
|---|---|---|
| 00:52 (all unchanged) | 00:39:46 | **earlier** than the import — nothing was written |
| 01:01 (one updated) | 01:01:03 | **later** than the import — exactly one row was written |

## Why this matters

Without this case, `Unchanged` could be silently rewriting every row with identical values
and the counters would look the same. That would be invisible in the UI, would burn write
throughput on every re-import, and would destroy the meaning of `updatedAt` — the column
TK-036 added specifically so an administrator can find what an import touched.

The test also protects a second property: nothing is written *collaterally*. Throughout all
four imports, exactly one product ever had `createdAt <> updatedAt`.

## Evidence

![Step 2 summary and the amber updated row](assets/tc-03-updated-again.png)

![RS-050 in the product list with both dates](assets/tc-03-product-row.png)
