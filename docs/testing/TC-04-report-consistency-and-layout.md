# TC-04 · Report consistency, column order, filters and dashboard layout

| | |
|---|---|
| **Status** | ⬜ **To run** |
| **Date** | — |
| **Tickets** | TK-043, TK-044, TK-045, TK-046, TK-047 |
| **File** | `LoanPro Code Challenge E-Commerce.csv` (unmodified, 97 data rows) |

## Objective

Unlike TC-01 to TC-03, which verify what the import *does*, this case verifies what the import
**shows**. All five tickets came from reading a real report and finding the screen harder to
read than the data warranted: a status drawn two different ways, columns ordered differently
per table, the longest table unsearchable, space spent on nothing, and a bug that the interface
made invisible.

Each check below is independent. Run them in order the first time, since the preconditions
leave the catalog in the state the rest assume.

## Preconditions

Empty catalog, so the numbers match TC-01 exactly:

```bash
docker exec ecommerce-db psql -U postgres -d ecommerce -c "TRUNCATE TABLE products, import_batches RESTART IDENTITY CASCADE;"
```

Then import `LoanPro Code Challenge E-Commerce.csv` at **Product → Import CSV**. Expected
counters, unchanged from TC-01:

```
  Total rows 97 = Created 85 + Updated 0 + Unchanged 0 + Rejected 10 + Skipped empty 2
```

---

## 1 · A status looks the same everywhere (TK-043)

**Why this exists.** Icons and colors were written by hand inside the summary cards and, again,
in a separate map used by the table badges. They agreed on two statuses by coincidence and
disagreed on the third.

### Steps

1. On the import result screen, look at the six cards at the top.
2. Scroll to the **Rows to review** table and look at the badges in the `Status` column.
3. Look at the legend at the foot of that table.

### Expected results

| Status | Icon | Color | Where it must be identical |
|---|---|---|---|
| Created | plus in a circle | green | card ↔ `Created rows` header chip |
| Updated | circular arrows | amber | card ↔ badge |
| Rejected | cross in a circle | red | card ↔ badge |
| **Skipped empty** | **minus in a circle** | **blue** | card ↔ badge |

- [ ] The `Skipped empty` card shows a **minus in a circle, in blue** — not an eraser, and not
      greyed out. This is the one that used to disagree.
- [ ] Every badge in the table uses the same icon and color as its card.
- [ ] The legend at the foot is **no longer plain text**: each of its three entries shows the
      icon and color of the badge it explains.

> Reading the legend and then the badges should require no translation between the two.

---

## 2 · SKU is read before Name, in every table (TK-044)

**Why this exists.** TK-042 put `Name` first in the review table on request; the product list
kept `SKU` first. This reverts that decision and fixes the product table as the reference.

### Steps

1. On the import result, look at the header of **Rows to review**.
2. Look at the header of **Created rows**.
3. Go to **Product → Product catalog** and look at the grid header.

### Expected results

- [ ] **Rows to review**: `Status · Line · SKU · Name · Reason` — SKU before Name.
- [ ] **Created rows**: `Line · SKU · Name · …` — unchanged, it already was.
- [ ] **Product catalog**: `SKU · Name · Description · …` — unchanged, it already was.
- [ ] Moving between the three tables never requires re-locating the columns.

---

## 3 · The Created rows table can be searched (TK-045)

**Why this exists.** 85 created rows with no way to look inside them.

### Steps

1. On the import result, find the filter line under the **Created rows** header.
2. Type `speaker`.
3. Clear it with the ✕ inside the field.
4. Type `zzzzz`.

### Expected results

- [ ] A search field exists under the header, with a counter reading `Showing 85 of 85`.
- [ ] The header still reads `Created rows (85)` with its subtitle — it describes the **import**,
      not the filtered view, so it must **not** drop to the filtered count.
- [ ] `speaker` narrows the table and the counter drops accordingly.
- [ ] The search covers **line, SKU, name, category and description** — try `Electronics`
      (category) and a word that only appears in a description.
- [ ] ✕ restores all 85 rows.
- [ ] `zzzzz` shows **"No rows match this filter"**, not a silently empty table.
- [ ] The same field, with the same behaviour, is present on **Rows to review** — where it keeps
      its own `Status` dropdown beside it.

---

## 4 · Dashboard layout (TK-046)

### Steps

1. Go to **Product → Product catalog**.
2. Look at the space between the heading and the first row.
3. Open the **Columns** control and hide a column, then show it again.
4. Count the rows on the first page.
5. Filter down to a handful of products — e.g. search `tent`.
6. Select two rows with the checkboxes.

### Expected results

- [ ] **No empty band.** Filters and the `Columns` button share **one line**. There is no strip
      whose only content is that button.
- [ ] The `Columns` control still **works** — this is the part most likely to break, because the
      button needs the grid's internal context to open its panel.
- [ ] `Reset layout` appears on that same line, and only after you have resized or hidden a column.
- [ ] The first page shows **20 rows**, not 10. The page-size options include 20.
- [ ] With few results, the pagination footer sits **immediately under the last row** — no blank
      block between them.
- [ ] Selecting rows reveals `Delete (2)` on that same line, and deleting still works.
- [ ] On a short window, the pagination footer is still reachable.

### Heading

- [ ] The page heading reads **`Product catalog`**, not `List`.
- [ ] The breadcrumb ends in `Product catalog`.
- [ ] The browser tab title reads `Product catalog | Dashboard - …`.
- [ ] The navigation dropdown entry under **Product** reads `Product catalog` and lands here.

### The saved-link change

Changing the default page size changes what a link **without** `limit` means.

- [ ] Open `/dashboard/product` with no query string → 20 rows.
- [ ] Open `/dashboard/product?limit=10` → 10 rows. An explicit value still wins.

> This is intended: an absent parameter means "the current default", not a frozen 10.

---

## 5 · Rejected rows carry their name (TK-047)

**Why this exists.** Rows rejected for a duplicate SKU arrived without a name even though the
file had one, because that rejection path did not pass it along. On screen it rendered as an
em dash, exactly like a row that genuinely had no name — so the bug was indistinguishable from
correct behaviour.

This is the check the interface could not previously give you.

### Steps

1. On the import result, open **Rows to review** and set the `Status` filter to `Rejected`.
2. Look at the `Name` column for lines **2, 11, 36, 56 and 89** — the duplicate-SKU rejections.
3. Now look at lines **25 and 41**.

### Expected results

| Line | SKU | Name column must show | Why |
|---|---|---|---|
| 2 | `RS-001` | `Running Shoes` | duplicate SKU — the file **had** a name |
| 11 | `BS-021` | `Bluetooth Speaker` | duplicate SKU |
| 36 | `RS-001` | `Running Shoes` | duplicate SKU |
| 56 | `BS-021` | `Bluetooth Speaker` | duplicate SKU |
| 89 | `BS-021` | `Bluetooth Speaker` | duplicate SKU |
| 25 | `HD-099` | em dash | the name cell was genuinely **empty** |
| 41 | `WS-001` | em dash | the name cell held only whitespace |

- [ ] The five duplicate-SKU rows show their **real name**. Before this change all five were blank.
- [ ] Lines 25 and 41 still show the em dash, and it now means one thing only: the file had no name.

### Optional — verify at the contract level

```bash
curl -s http://localhost:4000/api/v1/import/batches | head -1
```

- [ ] Every entry in `rejected` and `warnings` carries **both** `name` and `sku` keys. A blank
      cell is an empty string, never a missing key.

---

## 6 · Old reports still open (regression)

Reports stored before these changes do not carry the new fields. They must not break.

### Steps

1. Go to **Product → Import history**.
2. Open the detail of a batch imported **before** today.

### Expected results

- [ ] The detail renders in full — no blank screen, no error.
- [ ] Cells with no stored value show an em dash.
- [ ] The summary cards and badges use the new unified icons, since those are drawn by the
      frontend and do not depend on what was stored.

---

## Result

| Check | Ticket | Outcome |
|---|---|---|
| 1 · Status consistency | TK-043 | |
| 2 · SKU before Name | TK-044 | |
| 3 · Created rows filter | TK-045 | |
| 4 · Dashboard layout | TK-046 | |
| 5 · Rejected rows carry name | TK-047 | |
| 6 · Old reports still open | regression | |

**Notes:**
