# Manual test log

Evidence of the CSV import pipeline exercised end to end against the Docker stack.
Each case records what was expected **before** running it, what actually happened, and a
screenshot of the result.

> Written in English, unlike the rest of `docs/`, because it doubles as delivery evidence
> alongside the root `README.md`.

## Environment

| | |
|---|---|
| App | `http://localhost:3000` |
| API | `http://localhost:4000/api/v1` |
| Stack | `docker compose up -d --build` from the repository root |
| Account | `demo@demo.com` / `demo` |
| Sample files | [`docs/csv/`](../csv/) — the challenge CSV and three variants |

Reset the catalog between cases with:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE products, import_batches RESTART IDENTITY CASCADE;"
```

`user` and `migrations` must never be truncated: the first holds the demo account, the second
is TypeORM's schema history.

## The sample files

Every variant differs from the original in **line 55 only**, the `RS-050` row. Keeping the
change to a single line is what makes the counters readable: any row that moves buckets moved
because of that edit and nothing else.

| File | Line 55 | Used by |
|---|---|---|
| `LoanPro Code Challenge E-Commerce.csv` | `Budget running shoes...`, `49.99`, `200` | TC-01 |
| `...-T1.csv` | `UPDATED DESCRIPTION`, `59.99`, `150` | TC-02, and TC-03 step 1 |
| `...-T3.csv` | same as T1 but `64.99` | TC-03 step 2 |

## Cases

See [STRATEGY.md](STRATEGY.md) for what is covered automatically, at which level, and what is deliberately left to these manual cases.

| # | Case | Covers | Status |
|---|---|---|---|
| [TC-01](TC-01-initial-import.md) | Initial import into an empty catalog | create · reject · skip · duplicate SKU rule | ✅ Passed |
| [TC-02](TC-02-upsert-existing-product.md) | Re-import with one modified product | update · unchanged · `updatedAt` ordering | ✅ Passed |
| [TC-03](TC-03-unchanged-does-not-write.md) | `Unchanged` does not write, `Updated` does | absence of writes · timestamp integrity | ✅ Passed |
| [TC-04](TC-04-report-consistency-and-layout.md) | Report consistency, column order, filters and dashboard layout | status icons · SKU before Name · table filters · grid layout · `name` contract | ⬜ To run |
| [TC-05](TC-05-purchase-flow.md) | Purchase flow: stock, idempotency and the fake payment | atomic order · no overselling · frozen price · idempotency · declined payment | ⬜ To run |

## The five outcomes

Every data row lands in exactly one bucket, and the buckets always add up:

```
  Total rows = Created + Updated + Unchanged + Rejected + Skipped empty
```

| Outcome | Meaning |
|---|---|
| **Created** | The SKU did not exist. Inserted. |
| **Updated** | The SKU existed and at least one of the six comparable fields differed. Overwritten. |
| **Unchanged** | The SKU existed and `name`, `description`, `category`, `price`, `stock` and `weight_kg` were all identical. The database was not touched. |
| **Rejected** | The row failed format validation, a business rule, or its SKU appeared more than once in the file. Nothing was saved. |
| **Skipped empty** | Every cell was blank. Ignored as export noise, not counted as an error. |
