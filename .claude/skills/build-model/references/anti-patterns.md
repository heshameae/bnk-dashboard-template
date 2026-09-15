# Anti-patterns: the ways a view produces a confident wrong number

Read this once before drafting and again at finalize when a proof row fails. Each entry: what it looks like, which proof or check catches it, what the fix is. Every one has happened somewhere with real money. Names are illustrations only.

| # | Pattern | What it looks like | Caught by | Fix |
|---|---|---|---|---|
| 1 | **Summing a snapshot** | A monthly balance 19 to 22 times too large. `SUM(balance)` over a daily snapshot with a month window. | The recipe checklist (class vs grain); acceptance at verify. | `balance-last-day`, never `additive`, on a SNAPSHOT FACT. |
| 2 | **Versioned dimension joined on the id** | Every fact row repeated once per day the customer table holds. Totals up by hundreds of times; a small history looks like a 3% error. | Lint (join off the full key); `fan_out`. | As-of join on key plus date (joins.md case 2). |
| 3 | **Mapping table that is not one row per from-key** | Balances up 2% to 10%; nobody notices; the products with two mappings are double counted forever. | Mapping grain proof; `fan_out`. | Prove one row per from-key; when it is not, the business picks a winner in a dim view. Never `DISTINCT`. |
| 4 | **Hierarchy joined raw** | Rows multiplied by depth; a branch total counted at every level above it. | `fan_out`; `grain`. | Flatten to one row per leaf in a `dim_` view (joins.md case 4). |
| 5 | **Inner join that loses the unmapped** | Total balance below the raw total; the missing rows are the accounts with no product mapping, which are usually the odd ones finance asks about. | `conservation`. | LEFT JOIN with `UNKNOWN`, and a `_matched` flag so the recipe can decide. |
| 6 | **Filter in the view** | A view that drops dormant accounts. The next dashboard needs them and cannot get them; the count of accounts is wrong for everyone. | Lint (WHERE in a fact view); `conservation`. | Expose the status; exclude in the recipe. |
| 7 | **DISTINCT to hide fan-out** | A join that doubles rows, "fixed" with `SELECT DISTINCT`. Rows that were legitimately identical are now lost too, and the proof passes by accident. | Reviewer, check 4 of the view checklist. | Remove the DISTINCT; fix the join to land on the full key. |
| 8 | **Concatenated join** | `a || b || c = x || y || z`. Matches when parts shift (`'1' || '23'` equals `'12' || '3'`), defeats indexes, invisible to lint. | Reviewer; `grain` on the mapping. | One pair per line in the ON clause. |
| 9 | **Two names for one column** | `office_code` in one view, `office_id` in another, for the same raw column. Two dashboards, two filters, two answers. | Cross-view lint. | One business word per raw column, found by searching existing views first. |
| 10 | **Hand-written business day** | `WHERE day_of_week NOT IN (6, 7)`, in a view. Wrong on the first public holiday. | Reviewer, check 6. | `dim_date.is_business_day`, nowhere else. |
| 11 | **Averaged ratio** | Average of daily shares, presented as the monthly share. Off whenever the denominator moves. | Recipe checklist (class). | `ratio` recomputed at every grain from two recipes. |
| 12 | **Change log read as a snapshot** | Reading one day of a table that only holds changed rows. The balance for the day is the balance of the accounts that moved. | Table-kinds question ("does every entity appear every day?"); `conservation` against the raw day total. | Ask before drafting. A change log needs a last-known-value view, which is a design question for the human. |
| 13 | **Entity code dropped from a join** | A multi-entity bank; account ids repeat across entities; the join on id alone matches both. | Lint (join off the full key). | The entity code is part of every key and every join. |
| 14 | **Amount picked by name** | The meaning says "balance"; the table has four balance columns; the draft picked the first. | Nothing automatic. Acceptance at verify, weeks later. | The amount whose description matches the meaning, else `?` and a question (subjects.md). |
| 15 | **Code value guessed** | `account_status <> 'D'` because D probably means dormant. | Nothing automatic. Acceptance at verify. | The value from the column's definition, else an empty filter and a question. |
| 16 | **Two views over one fact table at one grain** | A second dashboard drafted its own balances view. Two definitions of the same rows drift apart. | Reviewer, `subjects.md` reuse rule. | Widen the existing view. |

Patterns 14 and 15 have no automatic catch. They are why step 3 writes the subject block down and why `?` is a valid cell: a visible gap is caught in review, a guess is caught by finance in production.
