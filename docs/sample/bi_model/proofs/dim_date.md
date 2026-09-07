# Proof: dim_date
run_by: data engineer (proof-runner)   run_at: 2026-09-04 09:24   environment: replica, read-only

| check | expected | left | right | result |
|-------|----------|------|-------|--------|
| grain | rows == distinct date_key | 4018 | 4018 | PASS |
| last_bd | exactly one last business day per month | 0 months wrong | 0 | PASS |
| bd_band | business days per month between 17 and 23 | 0 months outside | 0 | PASS |
| coverage | every balance date is a business day here | 0 unmatched | 0 | PASS |

Sample rows (5):

| date_key | is_business_day | month_start | is_last_business_day_of_month | holiday_name |
|---|---|---|---|---|
| 2026-08-28 | 1 | 2026-08-01 | 0 | |
| 2026-08-29 | 0 | 2026-08-01 | 0 | |
| 2026-08-30 | 0 | 2026-08-01 | 0 | |
| 2026-08-31 | 1 | 2026-08-01 | 1 | |
| 2026-09-01 | 1 | 2026-09-01 | 0 | |
