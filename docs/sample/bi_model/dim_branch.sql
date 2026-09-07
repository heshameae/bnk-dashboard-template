-- view: dim_branch
-- grain: one row per branch
-- RLS: none, reference data, no balances
-- sources: CBS_BRNCH
-- refresh: daily with CBS_BRNCH
-- proof: bi_model/proofs/dim_branch.md (2026-09-04)
CREATE OR REPLACE VIEW bi_model.dim_branch AS
SELECT b.BR_CD   AS branch_code,
       b.BR_NM   AS branch_name,
       b.REGN_CD AS region_code,
       b.REGN_NM AS region_name
FROM   RAW_CBS.CBS_BRNCH b;
