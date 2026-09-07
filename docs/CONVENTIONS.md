# Conventions for clean tables and recipes

## Names
- Clean tables: `v_<subject>_<grain>` for facts (`v_balances_daily`, `v_transactions`), `dim_<thing>` for dimensions (`dim_date`, `dim_branch`). Lower case, snake_case, no source-system prefixes.
- Columns: snake_case business words (`balance_amount`, `snapshot_date`, `branch_code`). A raw column is renamed exactly once, in the view. The same business word always maps to the same raw column across views.
- Recipes: `kpi.<snake_case>`; the id is permanent. Retire with `status: RETIRED`, never delete.
- Dashboards: folder name is the id (`dashboards/cashboard/`).

## The view header (every file in `bi_model/`)
```sql
-- view: v_balances_daily
-- grain: one row per account per snapshot_date (business days only)
-- RLS: branch_code            | or:  -- RLS: none — reference data
-- sources: CBS_ACCT_BAL_DLY, CBS_ACCT, CBS_PROD, CBS_CUST
-- refresh: daily after CBS load, ~02:30
-- proof: bi_model/proofs/v_balances_daily.md (2026-09-04)
CREATE OR REPLACE VIEW bi_model.v_balances_daily AS
SELECT ...
```
Six lines, in this order. `/data-dictionary` copies them; `registry-lint` checks `RLS:` against `rls-policies.yaml`; CI fails on a missing line.

## The one-view rule
A recipe reads one clean table. A page may read many; that is normal. When a number needs two tables, the join belongs in a new or widened view, never in a recipe and never in the app.

## Dates
`dim_date` is the single calendar: `date_key`, `is_business_day`, `business_day_of_month`, `last_business_day_of_month`. "Last business day" in any recipe means the max `snapshot_date` in the period where `dim_date.is_business_day = 1`. Nothing else defines it.

## Where performance lives
In the DEs' hands only: an index on the raw table (the RLS column first), a materialized view, or Oracle Database In-Memory on the hot tables. Same SQL, same views. A per-dashboard table is never the answer.
