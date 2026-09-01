# TC-04 · Report consistency, column order, filters and dashboard layout

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-043, TK-044, TK-045, TK-046, TK-047 |
| **File** | `LoanPro Code Challenge E-Commerce.csv` (unmodified, 97 data rows) |

## Goal

Unlike TC-01 to TC-03, which verify what the import *does*, this case verifies what it **shows**.
The five tickets came out of reading a real report and finding the screen harder to read than the
data justified: one status drawn two different ways, columns ordered differently in each table, the
longest table with no search, space spent on nothing, and a bug the interface made invisible.

Each check is independent. Run them in order the first time, since the preconditions leave the
catalog in the state the rest assumes.

## Preconditions

Empty catalog, so the numbers match TC-01 exactly:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE products, import_batches RESTART IDENTITY CASCADE;"
```

Then import `LoanPro Code Challenge E-Commerce.csv` at **Product → Import CSV**. Expected counters,
unchanged from TC-01:

```
  Total rows 97 = Created 85 + Updated 0 + Unchanged 0 + Rejected 10 + Skipped empty 2
```

---

## 1 · A status looks the same everywhere (TK-043)

**Why it exists.** Icons and colours were written by hand inside the summary cards and, again, in a
separate map used by the table badges. They matched on two statuses by chance and disagreed on the
third.

### Steps

1. On the import result screen, look at the six cards at the top.
2. Scroll to the **Rows to review** table and look at the badges in the `Status` column.
3. Look at the legend at the foot of that table.

### Expected result

| Status | Icon | Colour | Where it must be identical |
|---|---|---|---|
| Created | plus in a circle | green | card ↔ `Created rows` header chip |
| Updated | circular arrows | amber | card ↔ badge |
| Rejected | cross in a circle | red | card ↔ badge |
| **Skipped empty** | **minus in a circle** | **blue** | card ↔ badge |

- [ ] The `Skipped empty` card shows a **minus in a circle, in blue** — not an eraser, and not in
      grey. This is the one that disagreed.
- [ ] Every badge in the table uses the same icon and colour as its card.
- [ ] The legend at the foot **is no longer plain text**: each of its three entries shows the icon
      and colour of the badge it explains.

> Reading the legend and then the badges should not require translating between the two.

---

## 2 · The SKU reads before the name, in every table (TK-044)

**Why it exists.** TK-042 put `Name` first in the review table on request; the product listing kept
`SKU` first. This reverses that decision and fixes the product table as the reference.

### Steps

1. On the import result, look at the **Rows to review** header.
2. Look at the **Created rows** header.
3. Go to **Product → Product catalog** and look at the grid header.

### Expected result

- [ ] **Rows to review**: `Status · Line · SKU · Name · Reason` — SKU before Name.
- [ ] **Created rows**: `Line · SKU · Name · …` — unchanged, it already was.
- [ ] **Product catalog**: `SKU · Name · Description · …` — unchanged, it already was.
- [ ] Moving between the three tables never forces you to re-locate the columns.

---

## 3 · The `Created rows` table can be searched (TK-045)

**Why it exists.** 85 created rows with no way to look inside.

### Steps

1. On the import result, find the filter line under the **Created rows** header.
2. Type `speaker`.
3. Clear it with the ✕ in the field.
4. Type `zzzzz`.

### Expected result

- [ ] A search field exists under the header, with a counter reading `Showing 85 of 85`.
- [ ] The header still reads `Created rows (85)` with its subtitle — it describes the **import**,
      not the filtered view, so it must **not** drop to the filtered count.
- [ ] `speaker` narrows the table and the counter drops accordingly.
- [ ] The search covers **line, SKU, name, category and description** — try `Electronics`
      (category) and a word that appears only in a description.
- [ ] The ✕ restores all 85 rows.
- [ ] `zzzzz` shows **"No rows match this filter"**, not a silently empty table.
- [ ] The same field, with the same behaviour, is in **Rows to review** — where it keeps its own
      `Status` dropdown alongside.

---

## 4 · Dashboard layout (TK-046)

### Steps

1. Go to **Product → Product catalog**.
2. Look at the space between the header and the first row.
3. Open the **Columns** control, hide a column and show it again.
4. Count the rows on the first page.
5. Filter down to a handful of products — search `tent`, for example.
6. Select two rows with the checkboxes.

### Expected result

- [ ] **No empty band.** The filters and the `Columns` button share **a single line**. There is no
      strip whose only content is that button.
- [ ] The `Columns` control **still works** — it is the part most likely to break, because the
      button needs the grid's internal context to open its panel.
- [ ] `Reset layout` appears on that same line, and only after you have resized or hidden a column.
- [ ] The first page shows **20 rows**, not 10. The size options include 20.
- [ ] With few results, the pagination footer sits **immediately below the last row** — no blank
      block between them.
- [ ] Selecting rows reveals `Delete (2)` on that same line, and deleting still works.
- [ ] In a short window, the pagination footer is still reachable.

### Header

- [ ] The page header reads **`Product catalog`**, not `List`.
- [ ] The breadcrumb ends in `Product catalog`.
- [ ] The browser tab title reads `Product catalog | Dashboard - …`.
- [ ] The navigation dropdown entry under **Product** reads `Product catalog` and leads here.

### The change to saved links

Changing the default page size changes what a link **without** `limit` means.

- [ ] Open `/dashboard/product` with no query string → 20 rows.
- [ ] Open `/dashboard/product?limit=10` → 10 rows. An explicit value still wins.

> This is deliberate: an absent parameter means "the current default", not a frozen 10.

---

## 5 · Rejected rows carry their name (TK-047)

**Why it exists.** Rows rejected for a duplicate SKU arrived without a name even though the file
carries one, because that rejection path did not propagate it. On screen it rendered as a dash,
exactly like a row that genuinely had no name — so the bug was indistinguishable from correct
behaviour.

This is the check the interface previously could not give you.

### Steps

1. On the import result, open **Rows to review** and set the `Status` filter to `Rejected`.
2. Look at the `Name` column for lines **2, 11, 36, 56 and 89** — the duplicate SKU rejections.
3. Now look at lines **25 and 41**.

### Expected result

| Line | SKU | The Name column must show | Why |
|---|---|---|---|
| 2 | `RS-001` | `Running Shoes` | duplicate SKU — the file **did** carry a name |
| 11 | `BS-021` | `Bluetooth Speaker` | duplicate SKU |
| 36 | `RS-001` | `Running Shoes` | duplicate SKU |
| 56 | `BS-021` | `Bluetooth Speaker` | duplicate SKU |
| 89 | `BS-021` | `Bluetooth Speaker` | duplicate SKU |
| 25 | `HD-099` | dash | the name cell was genuinely **empty** |
| 41 | `WS-001` | dash | the name cell held only whitespace |

- [ ] All five duplicate SKU rows show their **real name**. Before this change all five came out
      blank.
- [ ] Lines 25 and 41 still show the dash, and that dash now means exactly one thing: the file
      carried no name.

### Optional — verify at the contract level

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/sign-in -H 'Content-Type: application/json' \
  -d '{"email":"demo@demo.com","password":"demo"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

BATCH=$(curl -s "http://localhost:4000/api/v1/products/import/batches" -H "Authorization: Bearer $TOKEN" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

curl -s "http://localhost:4000/api/v1/products/import/batches/$BATCH" -H "Authorization: Bearer $TOKEN"
```

> The endpoint sits under `products/import/batches` and **requires a token**. Calling it without
> one returns `401`.

- [ ] Every `rejected` and `warnings` entry carries **both** keys, `name` and `sku`. A blank cell is
      an empty string, never a missing key.

---

## 6 · Old reports still open (regression)

Reports saved before these changes do not carry the new fields. They must not break.

### Steps

1. Go to **Product → Import history**.
2. Open the detail of a batch imported **before** today.

### Expected result

- [ ] The detail renders in full — no blank screen, no error.
- [ ] Cells with no saved value show a dash.
- [ ] The summary cards and badges use the new unified icons, since the frontend draws them and
      they do not depend on what was stored.

---

## Result

| Check | Ticket | Result |
|---|---|---|
| 1 · Status consistency | TK-043 | |
| 2 · SKU before Name | TK-044 | |
| 3 · Filter on `Created rows` | TK-045 | |
| 4 · Dashboard layout | TK-046 | |
| 5 · Rejected rows with a name | TK-047 | |
| 6 · Old reports still open | regression | |

**Notes:**
