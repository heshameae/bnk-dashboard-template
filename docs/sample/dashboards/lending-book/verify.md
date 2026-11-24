# Verify: lending-book
run_at: 2026-10-13 09:10   spec: dashboards/lending-book/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.loan_balance | 5233108455.10 | 5233108455.10 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.loan_balance | 61200880.00 | 140775310.35 | 5233108455.10 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash 647a97). PASS
