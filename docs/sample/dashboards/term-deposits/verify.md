# Verify: term-deposits
run_at: 2026-10-09 08:20   spec: dashboards/term-deposits/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.td_balance | 14822650100.40 | 14822650100.40 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.td_balance | 151200400.15 | 388415002.70 | 14822650100.40 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash c367a8). PASS
