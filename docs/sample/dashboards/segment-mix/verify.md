# Verify: segment-mix
run_at: 2026-11-06 11:00   spec: dashboards/segment-mix/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.total_balance | 63900412000.55 | 63900412000.55 | PASS |
| w2 | kpi.casa_balance | 41260000000 | 41260000000 | PASS |
| w3 | kpi.td_balance | 14822650100.40 | 14822650100.40 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.total_balance | 655120300.25 | 1702334118.90 | 63900412000.55 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.casa_balance | 412300500.10 | 1088770212.40 | 41260000000 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.td_balance | 151200400.15 | 388415002.70 | 14822650100.40 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 2be4a7). PASS
