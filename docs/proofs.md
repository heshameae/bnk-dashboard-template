# Proofs: the read-only queries that turn a guess into evidence

A proof is a small SQL file a data engineer (or a read-only replica account) runs; the result is pasted into a markdown file next to it and stays in the PR. Three kinds.

## 1. Table proof (step 1 if the data team did not profile; else skipped)
Row count, distinct key, date range, five sample rows. The result fills `sources/<TABLE>.yaml` → `profile`.

## 2. View proof (step 3 writes it, step 4 runs it)

Two shapes, because a fact view and a dimension view fail in different ways. The proof exists because the view is not deployed yet: it copies the view's SELECT into a `WITH` block and asks questions of it.
### Fact view: grain, fan-out, conservation
`bi_model/proofs/<view>.sql`:
```sql
-- proof: v_balances_daily   (read-only; runs in < 1 minute on the replica)
WITH v AS ( <the view's SELECT, verbatim> )
SELECT 'grain'        AS check_, COUNT(*) AS rows_, COUNT(DISTINCT account_id || '|' || TO_CHAR(snapshot_date,'YYYYMMDD')) AS keys_ FROM v
UNION ALL
SELECT 'fan_out', (SELECT COUNT(*) FROM RAW_CBS.CBS_ACCT_BAL_DLY b WHERE b.BAL_DT >= DATE '2026-08-01'), COUNT(*) FROM v WHERE snapshot_date >= DATE '2026-08-01'
UNION ALL
SELECT 'conservation', (SELECT SUM(LDGR_BAL_AMT) FROM RAW_CBS.CBS_ACCT_BAL_DLY WHERE BAL_DT = DATE '2026-08-31'), SUM(balance_amount) FROM v WHERE snapshot_date = DATE '2026-08-31';
```
- `grain`: rows == keys, or the header's grain sentence is false.
- `fan_out`: raw rows == view rows for the same window, or a join multiplied.
- `conservation`: the raw total equals the view total for one day, or a filter or join dropped or duplicated money.
Then `SELECT * FROM v WHERE ROWNUM <= 5`.

### Dimension view: grain, orphans, and its own derived logic
Fan-out and conservation are fact checks; they involve money and a join, and a dimension has neither. What a dimension must prove is that it is one row per key, because that is the single fact that stops it multiplying a fact table when joined. Three checks:
- `grain`: rows equal distinct key. A dimension with a duplicate key silently doubles every total that joins to it.
- `orphans`: no key used by the fact table is missing here. A missing key drops money on an inner join.
- Whatever the view derives. A rename-only dimension has nothing more to prove and its source counts carry over. A calendar derives flags, so it proves them: exactly one last business day per month, business days per month inside a sane band, and every fact date present as a business day. See `bi_model/proofs/dim_date.sql`.

## 3. Acceptance proof (step 11)
Not SQL: finance's number for a date, one row per recipe in `catalog/acceptance.yaml` (`docs/contracts/acceptance.md`). `/verify` compiles the recipe for that date and compares. Same shape as a view proof: evidence beside the thing it proves, never inside it.

## Result file `bi_model/proofs/<view>.md`
```markdown
# Proof: v_balances_daily
run_by: <DE role>   run_at: 2026-09-04 10:12   environment: replica (read-only)

| check | expected | left | right | result |
|-------|----------|------|-------|--------|
| grain | rows == keys | 48213977 | 48213977 | PASS |
| fan_out | raw == view | 55836242 | 55836242 | PASS |
| conservation | raw sum == view sum (2026-08-31) | 63900412000.55 | 63900412000.55 | PASS |

Sample rows: (five rows, columns as in the view)
```
`/build-model finalize` reads this file; a row that is not PASS blocks the PR.
