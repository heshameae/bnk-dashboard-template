# Contract: `catalog/data-dictionary.yaml`

Generated at step 7 by `/data-dictionary` in CI, after the DEs' pipeline has deployed `bi_model/`. Describes the clean tables as they are live. Nobody edits it by hand; the Catalog page and `/spec` read it.

```yaml
generated_at: 2026-09-06T03:12:00+04:00
source: BI_MODEL                        # schema read; 'static' when generated from SQL text without a connection
views:
  - name: v_balances_daily
    grain: "one row per account per snapshot_date (business days only)"   # from the view header
    grain_proof: { rows: 48213977, distinct_key: 48213977, as_of: 2026-09-02, from: bi_model/proofs/v_balances_daily.md }
    rls: branch_code                    # from the view header; must equal rls-policies.yaml
    refresh: "daily after CBS load, ~02:30"
    sources: [CBS_ACCT_BAL_DLY, CBS_ACCT, CBS_PROD, CBS_CUST]
    columns:
      - { name: snapshot_date,    type: DATE,          from: CBS_ACCT_BAL_DLY.BAL_DT,       description: "Business day of the balance" }
      - { name: account_id,       type: VARCHAR2(20),  from: CBS_ACCT_BAL_DLY.ACCT_NO }
      - { name: branch_code,      type: VARCHAR2(6),   from: CBS_ACCT.BR_CD,                description: "Owning branch (RLS)" }
      - { name: product_family,   type: VARCHAR2(20),  from: CBS_PROD.PROD_FMLY }
      - { name: customer_segment, type: VARCHAR2(20),  from: CBS_CUST.SEG_CD }
      - { name: account_status,   type: CHAR(1),       from: CBS_ACCT.ACCT_STS,             description: "A active, D dormant, C closed" }
      - { name: balance_amount,   type: NUMBER(18,2),  from: CBS_ACCT_BAL_DLY.LDGR_BAL_AMT, description: "Ledger balance in AED" }
    used_by: [kpi.casa_balance, kpi.total_balance, kpi.casa_accounts, kpi.casa_share]
```

## Rules
- Column list comes from Oracle metadata when a read-only connection exists (`source: BI_MODEL`), else from parsing the view SQL (`source: static`); the file says which.
- `grain`, `rls`, `refresh` and `sources` are copied from the view header (`docs/CONVENTIONS.md`). A view with a missing header line fails generation, which fails CI.
- `used_by` is computed from the registry so the Catalog can show lineage: raw table → clean table → recipe → dashboard.
