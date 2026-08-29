# Screenshots

Evidence images referenced by the test cases. Captured from the stored import batches against
the Docker stack at a 1920x1080 viewport, so every one of them can be regenerated from the
database rather than re-run by hand.

| File | What it should show | Case |
|---|---|---|
| `tc-01-import-report.png` | The six summary cards (97 / 85 / 0 / 0 / 10 / 2) and the full `Rows to review (12)` table | [TC-01](../TC-01-initial-import.md) |
| `tc-01-created-rows.png` | The `Created rows (85)` card with the full per-product columns | [TC-01](../TC-01-initial-import.md) |
| `tc-02-updated-row.png` | The summary cards (97 / 0 / 1 / 84 / 10 / 2) and `Rows to review (13)` with the amber row on line 55 | [TC-02](../TC-02-upsert-existing-product.md) |
| `tc-03-updated-again.png` | Step 2 of TC-03: the same 97 / 0 / 1 / 84 / 10 / 2 after the price edit | [TC-03](../TC-03-unchanged-does-not-write.md) |
| `tc-03-product-row.png` | RS-050 in the product list showing `$64.99` with `Created at` and `Updated at` side by side | [TC-03](../TC-03-unchanged-does-not-write.md) |

Full page, no cropping of the summary cards: the numbers are the evidence.
