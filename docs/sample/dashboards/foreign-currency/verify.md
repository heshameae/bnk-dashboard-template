# Verify: foreign-currency
run_at: 2026-10-22 08:30   spec: dashboards/foreign-currency/spec.yaml   result: PASS

## Acceptance (catalog/acceptance.yaml · finance daily position report, as of 2026-08-31)
| widget | recipe | expected | got | result |
|--------|--------|----------|-----|--------|
| w1 | kpi.fcy_balance | 9870115320.85 | 9870115320.85 | PASS |

## RLS
| recipe | test.branch.a | test.branch.b | test.hq | test.none | result |
|--------|---------------|---------------|---------|-----------|--------|
| kpi.fcy_balance | 70450110.30 | 291004875.10 | 9870115320.85 | no rows | PASS (A ≠ B, hq = total, none = empty) |

## Spec drift
Generated page matches spec.yaml (hash b9a347). PASS
