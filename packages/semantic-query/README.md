# semantic-query (to build, phase 1)

The only writer of metric SQL. Recipe + user in, SQL out. It never joins and never reads a dashboard.

```ts
compile({ kpi: 'kpi.casa_balance', user, period: { as_of: '2026-08-31' }, by?: 'customer_segment', filters?: [...] })
// → { sql, binds, rls: { view: 'v_balances_daily', rule: 'by_entitlement', values: 1 } }
```

Steps inside `compile`, in order; each is a pure function with its own tests:
1. `loadRecipe(id)` from `catalog/kpi-registry.yaml`; refuse `RETIRED`; mark `DRAFT` in the result.
2. `timeWindow(recipe.aggregation, period)` using `dim_date`: `balance-last-day` → `snapshot_date = :last_business_day`; `additive` → a date range; `ratio` → compile both operands with the same window and divide.
3. `select(recipe, by)` → `SELECT [by,] <formula> AS value FROM bi_model.<view> WHERE <filters> [GROUP BY by]`.
4. `applyRls(view, user)` → the predicate from `security/rls-policies.yaml` + `BI_SECURITY.ENTITLEMENTS` (`docs/rls.md`). One function, fail closed, cache ≤ 60 s.
5. `log(user, kpi, view, rule, values, duration)` to `bi_security.query_log`.

Bound parameters only; no string concatenation of values. `by` and `filters` must be in the recipe's `dimensions`. Connection is a read-only Oracle account.
