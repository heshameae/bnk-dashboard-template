# Verify: cashboard
run_at: 2026-09-12 08:40   spec: dashboards/cashboard/spec.yaml   result: FAIL (1 blocked widget, 1 DRAFT recipe)

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.casa_balance | 41260000000 | 41260000000.00 | PASS |
| w4 | kpi.casa_accounts | (none: DRAFT) | 218404 | BLOCKED — confirm the recipe (step 6) |
| w5 | — | — | — | BLOCKED — no recipe (step 3) |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.casa_balance | 412300500.10 | 1088770212.40 | 41260000000.00 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 9f31c2). PASS

Go back to: step 6 for w4, step 3 for w5.
