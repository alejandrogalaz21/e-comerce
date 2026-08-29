# Manual test log — CSV import

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
| Sample file | [`docs/csv/`](../csv/) — a copy of the challenge CSV, downloaded 2026-08-26 |

Reset the catalog between cases with:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE products, import_batches RESTART IDENTITY CASCADE;"
```

`user` and `migrations` must never be truncated: the first holds the demo account, the second
is TypeORM's schema history.

## Cases

| # | Case | Covers | Status |
|---|---|---|---|
| [TC-01](TC-01-initial-import.md) | Initial import into an empty catalog | create · reject · skip · duplicate SKU rule | ✅ Passed |
| [TC-02](TC-02-upsert-existing-product.md) | Re-import with one modified product | update · unchanged · `updatedAt` ordering | ✅ Passed |

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
