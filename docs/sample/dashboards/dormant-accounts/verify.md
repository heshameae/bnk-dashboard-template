# Verify: dormant-accounts
run_at: 2026-10-17 08:45   spec: dashboards/dormant-accounts/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.dormant_accounts | 38215 | 38215 | PASS |
| w2 | kpi.dormant_balance | 912400300.00 | 912400300.00 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.dormant_accounts | 402 | 1190 | 38215 | no rows | PASS (A ≠ B, hq = total, none = empty) |
| kpi.dormant_balance | 8100250.50 | 22917030.20 | 912400300.00 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash efdb6b). PASS
