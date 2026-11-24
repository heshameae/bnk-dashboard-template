# Verify: card-balances
run_at: 2026-10-15 10:05   spec: dashboards/card-balances/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.card_balance | 2584653445.05 | 2584653445.05 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.card_balance | 30418520.00 | 84373603.75 | 2584653445.05 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 575540). PASS
