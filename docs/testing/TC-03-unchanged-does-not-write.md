# TC-03 · `Unchanged` writes nothing, `Updated` does

| | |
|---|---|
| **Status** | ✅ **Passed** |
| **Date** | 2026-08-28 |
| **Tickets** | TK-009, TK-036, TK-039 |
| **Files** | `...-T1.csv` (unchanged re-import) and `...-T3.csv` (one price edited) |

## Goal

Prove that `Unchanged` means **the row is not written at all**, not "written with the same values",
and that a single differing field is enough to move it into `Updated`.

This is a test of an **absence**: it verifies that something does *not* happen. The catalog size
does not change in either direction, and the counters alone cannot tell the two cases apart — only
the timestamp can.

## Why the guarantee is structural

The service's "unchanged" branch increments the counter and does nothing else. It never calls
`save()`, so TypeORM's `@UpdateDateColumn` never gets a chance to fire. The timestamp is not
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

## Step 1 — Re-import exactly the same file

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
- [x] Products with a moved `updatedAt` are still 1 — no collateral writes
- [x] `max(updatedAt)` across the whole catalog is **earlier** than the import just run

### Actual

```
  batch 00:52:43   0 created · 0 updated · 85 unchanged · 10 rejected · 2 skipped

  RS-050.updatedAt      2026-08-29 00:39:46.895597+00   identical to X
  rows with updatedAt moved   1 of 85
  max(updatedAt)        2026-08-29 00:39:46.895597+00   <- earlier than the 00:52 batch
```

That last line is the strongest evidence: the most recently modified product in the whole catalog
is still older than the import that had just processed all 85 rows. Nothing was written — and not
only in RS-050's case.

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
- [x] `RS-050.createdAt` untouched at `00:15:53.974713`
- [x] Products with a moved `updatedAt` are still 1 — the update touched one row, not many

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
  00:39:46    1 updated, 84 the same    RS-050.updatedAt = 00:39:46   X   moved
  00:52:43    0 updated, 85 the same    RS-050.updatedAt = 00:39:46   X   did NOT move
  01:01:03    1 updated, 84 the same    RS-050.updatedAt = 01:01:03   Y   moved
```

The third batch is the heart of the case: 85 rows evaluated, zero writes. The fourth supplies the
contrast — the same file but for one field, and the timestamp advances.

`max(updatedAt)` tells the same story unambiguously:

| After the batch | `max(updatedAt)` | Reading |
|---|---|---|
| 00:52 (all unchanged) | 00:39:46 | **earlier** than the import — nothing was written |
| 01:01 (one updated) | 01:01:03 | **later** than the import — exactly one row was written |

## Why it matters

Without this case, `Unchanged` could be silently rewriting every row with identical values and the
counters would look the same. That would be invisible in the UI, would burn write capacity on every
re-import, and would destroy the meaning of `updatedAt` — the column TK-036 added precisely so an
administrator can find what an import touched.

The case also protects a second property: that nothing is written *collaterally*. Across all four
imports, exactly one product ever had `createdAt <> updatedAt`.

## Evidence

![Step 2 summary and the amber updated row](assets/tc-03-updated-again.png)

![RS-050 in the product listing with both dates](assets/tc-03-product-row.png)
