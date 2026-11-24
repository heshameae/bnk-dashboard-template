# Verify: customer-base
run_at: 2026-10-30 09:30   spec: dashboards/customer-base/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.active_customers | 301775 | 301775 | PASS |
| w2 | kpi.active_accounts | 612480 | 612480 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.active_customers | 3204 | 8810 | 301775 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.active_accounts | 6115 | 17202 | 612480 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 619758). PASS
