-- proof: dim_branch   (dimension: grain + orphans; read-only; seconds)
WITH v AS (
  SELECT b.BR_CD AS branch_code, b.BR_NM AS branch_name, b.REGN_CD AS region_code, b.REGN_NM AS region_name
  FROM   RAW_CBS.CBS_BRNCH b
)
SELECT 'grain'   AS check_, COUNT(*) AS left_, COUNT(DISTINCT branch_code) AS right_ FROM v
UNION ALL
-- every branch the fact table points at must exist here, or a join would drop money
SELECT 'orphans', (SELECT COUNT(DISTINCT a.BR_CD) FROM RAW_CBS.CBS_ACCT a
                   WHERE a.BR_CD NOT IN (SELECT branch_code FROM v)), 0 FROM dual
UNION ALL
SELECT 'labels',  (SELECT COUNT(*) FROM v WHERE branch_name IS NULL OR region_code IS NULL), 0 FROM dual;
