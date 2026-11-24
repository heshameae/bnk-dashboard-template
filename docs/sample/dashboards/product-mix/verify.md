# Verify: product-mix
run_at: 2026-11-12 08:40   spec: dashboards/product-mix/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.total_balance | 63900412000.55 | 63900412000.55 | PASS |
| w2 | kpi.td_balance | 14822650100.40 | 14822650100.40 | PASS |
| w3 | kpi.loan_balance | 5233108455.10 | 5233108455.10 | PASS |
| w4 | kpi.card_balance | 2584653445.05 | 2584653445.05 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.total_balance | 655120300.25 | 1702334118.90 | 63900412000.55 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.td_balance | 151200400.15 | 388415002.70 | 14822650100.40 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.loan_balance | 61200880.00 | 140775310.35 | 5233108455.10 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.card_balance | 30418520.00 | 84373603.75 | 2584653445.05 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 453c2b). PASS
