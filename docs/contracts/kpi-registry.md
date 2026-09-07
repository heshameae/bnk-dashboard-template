# Contract: `catalog/kpi-registry.yaml`

The recipe book. One entry per number; shared by every dashboard. The file is created by `/build-model draft` on the first dashboard and grows from there; it is never authored by hand from scratch. Recipes are written DRAFT at step 3, become CONFIRMED at step 6, and are read by `/spec`, `semantic-query`, `/verify` and the Catalog page. A recipe names exactly one clean table and never joins. A recipe is a definition only; the number finance vouches for lives beside it in `catalog/acceptance.yaml` (`docs/contracts/acceptance.md`).

```yaml
kpis:
  - id: kpi.casa_balance             # kpi.<snake_case>, unique, never reused after deletion
    status: CONFIRMED                # DRAFT | CONFIRMED | RETIRED
    meaning: "Total CASA balance at close of the last business day"   # copied verbatim from the business-context numbers table
    owner: head_of_treasury          # a role
    view: v_balances_daily           # exactly one clean table from bi_model/
    formula: SUM(balance_amount)     # SQL over that view's columns only
    aggregation: balance-last-day    # additive | balance-last-day | ratio
    filters:                         # applied to the view before the formula
      - product_family = 'CASA'
    excludes: "dormant accounts (account_status = 'D')"   # a decision in words; the filter that implements it is above
    dimensions: [branch_code, customer_segment]           # columns of the view a dashboard may split by
    compare: previous_business_day   # previous_business_day | previous_month | previous_year | none
    format: aed_millions
    introduced_by: cashboard         # dashboard whose business-context first named it
    confirmed: { by: head_of_treasury, at: 2026-09-05 }
```

## Aggregation classes (time treatment)
- `additive`: sum every row in the period. Flows: transactions, fees, new accounts.
- `balance-last-day`: keep only the rows of the last business day in the period (per `dim_date`), then apply the formula. Balances, headcounts, anything that is a snapshot. Summing snapshots across days is the 19× error.
- `ratio`: `formula` divides two other recipe ids (`kpi.a / kpi.b`). Recomputed at every grain; never averaged across rows.

## Lint (CI, `registry-lint`) fails the PR when
1. `view` is not a file in `bi_model/`, or a column in `formula`, `filters` or `dimensions` is not in that view.
2. `aggregation` contradicts the view's grain sentence (a snapshot view with `additive`, a flow view with `balance-last-day`).
3. `aggregation: ratio` and `formula` is not `kpi.x / kpi.y` with both ids present and on the same view.
4. `compare` is missing, or `format` is missing.
5. `status: CONFIRMED` without `confirmed.by`.
6. `excludes` is missing or empty (an explicit `excludes: "nothing; confirmed by <role>"` passes).
7. A view named by any recipe has no entry in `rls-policies.yaml`.
8. A CONFIRMED recipe referenced by a spec with `status: READY` has no row in `catalog/acceptance.yaml` (verify would have nothing to check).

## Three questions only a human answers (PR template)
- Is `meaning` the business's sentence, unchanged?
- Is the view's grain sentence true for this recipe's class?
- Is `excludes` a decision, or a blank?
