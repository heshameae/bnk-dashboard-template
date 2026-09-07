# Contract: `dashboards/<name>/spec.yaml`

The pivot artifact. Written at step 9 by `/spec` from the design export and the registry; from here on the design export is never read again. One dashboard as a list: each widget shows one recipe, split by one dimension, with one comparison. The spec never contains a formula, a column expression or a view name.

```yaml
dashboard: cashboard              # folder name
title: "Cash position"
audience: treasury                # a role from business-context section 1
status: READY                     # READY | BLOCKED (BLOCKED iff any widget has kpi: null)
filters:                          # page-level; RLS narrows the values each user sees
  - { dimension: branch_code }
  - { dimension: customer_segment }
widgets:
  - { id: w1, kind: kpi-card, kpi: kpi.casa_balance, show: [value, compare] }
  - { id: w2, kind: line,     kpi: kpi.casa_balance, by: snapshot_date, range: last_90_business_days }
  - { id: w3, kind: bar,      kpi: kpi.casa_balance, by: customer_segment, sort: desc }
  - { id: w4, kind: kpi-card, kpi: kpi.casa_accounts }
  - { id: w5, kind: kpi-card, kpi: null, designer_label: "Avg daily net inflow" }
interactions:
  - { click: w3, sets_filter: customer_segment }
blocked:                          # one entry per widget with kpi: null
  - { widget: w5, needs: "a recipe for average daily net inflow; no flow table exists yet", back_to: 3 }
```

## Rules
- `kind` is a component of the chart kit (`kpi-card`, `line`, `bar`, `table`, `stacked-bar`, `donut`). `/build` refuses any other value.
- `by` and every `filters.dimension` must be in the recipe's `dimensions` list; otherwise the spec is BLOCKED with `needs: "dimension X on kpi.y"`.
- A widget bound to a DRAFT recipe builds a preview and blocks `/verify` (the number is not confirmed).
- Business asks for a change in the preview → the change is an edit here (a new widget, a new interaction, a different `by`), never to generated code.
- `status: BLOCKED` sends the named items back to step 3; the READY widgets can still be previewed.
