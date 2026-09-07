# Proof: v_balances_daily
run_by: data engineer (proof-runner)   run_at: 2026-09-04 10:12   environment: replica, read-only

| check | expected | left | right | result |
|-------|----------|------|-------|--------|
| grain | rows == keys | 48213977 | 48213977 | PASS |
| fan_out | raw rows == view rows (from 2026-08-01) | 16801822 | 16801822 | PASS |
| conservation | raw sum == view sum (2026-08-31) | 63900412000.55 | 63900412000.55 | PASS |

Sample rows (5):

| snapshot_date | account_id | branch_code | product_family | customer_segment | account_status | balance_amount |
|---|---|---|---|---|---|---|
| 2026-09-02 | 0011002345 | DXB01 | CASA | RETAIL | A | 15230.50 |
| 2026-09-02 | 0011002346 | DXB01 | CASA | SME | A | 402118.00 |
| 2026-09-02 | 0011002347 | DXB07 | TD | CORPORATE | A | 5000000.00 |
| 2026-09-02 | 0011002348 | DXB07 | CASA | UNKNOWN | D | 12.75 |
| 2026-09-02 | 0011002349 | AUH02 | LOAN | RETAIL | A | -184220.10 |
