# Verify: branch-balances
run_at: 2026-10-14 09:05   spec: dashboards/branch-balances/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.casa_balance | 41260000000 | 41260000000.00 | PASS |
| w3 | kpi.total_balance | 63900412000.55 | 63900412000.55 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.casa_balance | 412300500.10 | 1088770212.40 | 41260000000.00 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.total_balance | 655120300.25 | 1702334118.90 | 63900412000.55 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash c2d91a). PASS
