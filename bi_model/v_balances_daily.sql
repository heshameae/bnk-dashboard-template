-- view: v_balances_daily
-- grain: one row per account per snapshot_date (business days only)
-- RLS: branch_code
-- sources: CBS_ACCT_BAL_DLY, CBS_ACCT, CBS_PROD, CBS_CUST
-- refresh: daily after CBS load, ~02:30
-- proof: bi_model/proofs/v_balances_daily.md (2026-09-04)
CREATE OR REPLACE VIEW bi_model.v_balances_daily AS
SELECT bal.BAL_DT                       AS snapshot_date,
       bal.ACCT_NO                      AS account_id,
       acc.CUST_ID                      AS customer_id,
       acc.BR_CD                        AS branch_code,
       prd.PROD_FMLY                    AS product_family,
       COALESCE(cus.SEG_CD, 'UNKNOWN')  AS customer_segment,
       acc.ACCT_STS                     AS account_status,
       bal.LDGR_BAL_AMT                 AS balance_amount,
       bal.AVL_BAL_AMT                  AS available_amount,
       bal.CCY_CD                       AS currency
FROM   RAW_CBS.CBS_ACCT_BAL_DLY bal
JOIN   RAW_CBS.CBS_ACCT  acc ON acc.ACCT_NO = bal.ACCT_NO      -- one row per account
JOIN   RAW_CBS.CBS_PROD  prd ON prd.PROD_CD = acc.PROD_CD      -- one row per product
LEFT JOIN RAW_CBS.CBS_CUST cus ON cus.CUST_ID = acc.CUST_ID;   -- one row per customer; missing → UNKNOWN
