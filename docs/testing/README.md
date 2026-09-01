# Manual test log

Evidence of the system exercised end to end against the Docker stack. Each case records what was
expected **before** running it, what actually happened, and — where it applies — a screenshot of
the result.

## Environment

| | |
|---|---|
| App | `http://localhost:3000` |
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/api/v1/docs` |
| Stack | `docker compose up -d --build` from the repository root |
| Account | `demo@demo.com` / `demo` |
| Sample files | [`docs/csv/`](../csv/) — the challenge CSV and two variants |

Reset the catalog between cases with:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE order_items, orders, products, import_batches RESTART IDENTITY CASCADE;"
```

> `order_items` and `orders` come first on purpose: an order line references its product with
> `RESTRICT`, so truncating `products` on its own is refused. That refusal is itself the correct
> behaviour.
>
> `user` and `migrations` are never truncated: the first holds the demo account, the second is
> TypeORM's schema history.

## The sample files

Every variant differs from the original **only on line 55**, the `RS-050` row. Keeping the change
to a single line is what makes the counters readable: any row that moves bucket did so because of
that edit and nothing else.

| File | Line 55 | Used by |
|---|---|---|
| `LoanPro Code Challenge E-Commerce.csv` | `Budget running shoes...`, `49.99`, `200` | TC-01 |
| `...-T1.csv` | `UPDATED DESCRIPTION`, `59.99`, `150` | TC-02, and step 1 of TC-03 |
| `...-T3.csv` | same as T1 but `64.99` | step 2 of TC-03 |

## The cases

See [STRATEGY.md](STRATEGY.md) for what is covered automatically, at which level, and what is
deliberately left to these manual cases. See [MATRIX.md](MATRIX.md) for the full list of use cases
by process.

| # | Case | Covers | Status |
|---|---|---|---|
| [TC-01](TC-01-initial-import.md) | Initial import into an empty catalog | create · reject · skip · duplicate SKU rule | ✅ Passed |
| [TC-02](TC-02-upsert-existing-product.md) | Re-import with one product modified | update · unchanged · ordering by `updatedAt` | ✅ Passed |
| [TC-03](TC-03-unchanged-does-not-write.md) | `Unchanged` writes nothing, `Updated` does | absence of writes · timestamp integrity | ✅ Passed |
| [TC-04](TC-04-report-consistency-and-layout.md) | Report consistency, columns, filters and layout | status icons · SKU before Name · filters · the `name` contract | ⬜ To run |
| [TC-05](TC-05-purchase-flow.md) | Purchase flow: stock, idempotency and the fake payment | atomic order · frozen price · idempotency · declined charge | ⬜ To run |
| [TC-06](TC-06-concurrency-and-races.md) | **Concurrency, locking and race conditions** | `FOR UPDATE` · deadlocks · parallel keys · rollback · Redis down | ⬜ To run |
| [TC-07](TC-07-login-and-permissions.md) | Login, session and the permission matrix | public vs protected · tampered token · rate limit · attribution | ⬜ To run |
| [TC-08](TC-08-status-and-degradation.md) | Status, health and dependency degradation | real Redis write · `ok:false` instead of `500` · auto refresh | ⬜ To run |

## Where to start, by what you want to see

| If you want to see... | Start with |
|---|---|
| That the challenge CSV imports whole and correctly | [TC-01](TC-01-initial-import.md) |
| That re-importing does not rewrite what did not change | [TC-03](TC-03-unchanged-does-not-write.md) |
| That a purchase moves real stock and freezes the price | [TC-05](TC-05-purchase-flow.md) |
| **That two buyers cannot both take the last unit** | [TC-06 · R1](TC-06-concurrency-and-races.md) |
| That a declined charge leaves nothing half-done | [TC-05](TC-05-purchase-flow.md) check 6 · [TC-06 · R7](TC-06-concurrency-and-races.md) |
| What someone without an account can do | [TC-07](TC-07-login-and-permissions.md) |
| What happens when Postgres or Redis goes down | [TC-08](TC-08-status-and-degradation.md) |

## The five import outcomes

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

## The order outcomes

```
  POST /orders  -->  201  new order, charged, stock discounted
                     200  idempotency key replayed: the same order, not charged again
                     400  invalid contract (non-UUID key, incomplete address, unknown field)
                     402  PAYMENT_DECLINED  — nothing saved, stock intact, a FAILED order remains
                     404  a referenced product does not exist
                     409  INSUFFICIENT_STOCK — with sku, requested and available
```

| `orders` status | Means |
|---|---|
| `PAID` | The charge was approved and stock was discounted, all in the same transaction. |
| `FAILED` | The charge was declined. Stored with its reason, and **no** stock movement. |
| `PENDING` | Exists only *inside* the transaction. A persisted `PENDING` row is a defect. |
