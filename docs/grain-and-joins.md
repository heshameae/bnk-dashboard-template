# Grain and joins: the two errors that produce confident wrong numbers

## Grain
Grain is what one row means: "one row per account per day". Every number on a dashboard is a sum, count or ratio over rows, so it is only right if the rows are what you think they are.

The classic miss: `CBS_ACCT_BAL_DLY` holds one row per account per day. Summing `LDGR_BAL_AMT` for August gives each account's balance about 19 times over: 12.8bn instead of 678m. The rows were daily snapshots, the sum treated them as flows.

- Flows (transactions, fees) add up across time: `additive`.
- Snapshots (balances, headcount) do not: take the last business day, then sum: `balance-last-day`.
- Ratios are recomputed at every grain, never averaged: `ratio`.

Proof: count rows and count distinct keys. Equal means the grain sentence is true.
```sql
SELECT COUNT(*) AS rows_, COUNT(DISTINCT ACCT_NO || '|' || TO_CHAR(BAL_DT,'YYYYMMDD')) AS keys_,
       MIN(BAL_DT), MAX(BAL_DT)
FROM   RAW_CBS.CBS_ACCT_BAL_DLY;
```

## Joins and fan-out
A join copies a row once per match on the other side. Join accounts to a customer table that has one row per customer *address* and every account with two addresses appears twice. Balances go up 3%, nobody notices, the number is wrong forever.

Rules that make fan-out impossible:
1. Know the grain of both sides before writing the join. `sources/*.yaml` says it, and its counts prove it: `profile.rows` equal to `profile.distinct_key`. Counts missing or unequal means prove it first.
2. Join only to tables whose key is one row per value (a dimension). Never join two fact tables.
3. Count rows before and after the join in the proof file. Equal or the join is wrong.
4. Joins live in the view. Recipes never join; the app never joins.
