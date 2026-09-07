# Proof: dim_branch
run_by: data engineer (proof-runner)   run_at: 2026-09-04 09:20   environment: replica, read-only

| check | expected | left | right | result |
|-------|----------|------|-------|--------|
| grain | rows == distinct branch_code | 212 | 212 | PASS |
| orphans | no branch on an account is missing here | 0 | 0 | PASS |
| labels | no missing branch or region name | 0 | 0 | PASS |

Sample rows (5):

| branch_code | branch_name | region_code | region_name |
|---|---|---|---|
| DXB01 | Deira Main | DXB | Dubai |
| DXB07 | Business Bay | DXB | Dubai |
| DXB09 | Jebel Ali | DXB | Dubai |
| AUH02 | Corniche | AUH | Abu Dhabi |
| SHJ01 | Al Wahda | SHJ | Sharjah |
