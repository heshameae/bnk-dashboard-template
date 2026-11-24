# Verify: liquidity
run_at: 2026-10-24 07:55   spec: dashboards/liquidity/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.available_balance | 58113702440.30 | 58113702440.30 | PASS |
| w2 | kpi.total_balance | 63900412000.55 | 63900412000.55 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.available_balance | 590882310.75 | 1555900218.45 | 58113702440.30 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.total_balance | 655120300.25 | 1702334118.90 | 63900412000.55 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 4b91c3). PASS
