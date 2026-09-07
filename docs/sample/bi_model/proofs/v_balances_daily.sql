-- proof: v_balances_daily   (read-only; replica; < 1 minute)
WITH v AS (
  SELECT bal.BAL_DT AS snapshot_date, bal.ACCT_NO AS account_id, acc.BR_CD AS branch_code,
         bal.LDGR_BAL_AMT AS balance_amount
  FROM   RAW_CBS.CBS_ACCT_BAL_DLY bal
  JOIN   RAW_CBS.CBS_ACCT acc ON acc.ACCT_NO = bal.ACCT_NO
  JOIN   RAW_CBS.CBS_PROD prd ON prd.PROD_CD = acc.PROD_CD
  LEFT JOIN RAW_CBS.CBS_CUST cus ON cus.CUST_ID = acc.CUST_ID
)
SELECT 'grain' AS check_, COUNT(*) AS left_, COUNT(DISTINCT account_id || '|' || TO_CHAR(snapshot_date, 'YYYYMMDD')) AS right_ FROM v
UNION ALL
SELECT 'fan_out', (SELECT COUNT(*) FROM RAW_CBS.CBS_ACCT_BAL_DLY WHERE BAL_DT >= DATE '2026-08-01'),
                  (SELECT COUNT(*) FROM v WHERE snapshot_date >= DATE '2026-08-01') FROM dual
UNION ALL
SELECT 'conservation', (SELECT SUM(LDGR_BAL_AMT) FROM RAW_CBS.CBS_ACCT_BAL_DLY WHERE BAL_DT = DATE '2026-08-31'),
                       (SELECT SUM(balance_amount) FROM v WHERE snapshot_date = DATE '2026-08-31') FROM dual;
