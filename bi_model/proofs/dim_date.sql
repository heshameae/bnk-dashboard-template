-- proof: dim_date   (dimension: grain + the derived business-day logic; read-only; seconds)
WITH v AS (
  SELECT c.CAL_DT AS date_key,
         CASE WHEN c.IS_BUS_DAY = 'Y' THEN 1 ELSE 0 END AS is_business_day,
         TRUNC(c.CAL_DT, 'MM') AS month_start,
         CASE WHEN c.IS_BUS_DAY = 'Y'
               AND c.CAL_DT = MAX(CASE WHEN c.IS_BUS_DAY = 'Y' THEN c.CAL_DT END)
                              OVER (PARTITION BY TRUNC(c.CAL_DT, 'MM'))
              THEN 1 ELSE 0 END AS is_last_business_day_of_month
  FROM   RAW_CBS.CBS_CALENDAR c
)
SELECT 'grain'      AS check_, COUNT(*) AS left_, COUNT(DISTINCT date_key) AS right_ FROM v
UNION ALL
-- exactly one last-business-day per month, or "last business day" is undefined somewhere
SELECT 'last_bd',   (SELECT COUNT(*) FROM (SELECT month_start FROM v WHERE is_last_business_day_of_month = 1
                                           GROUP BY month_start HAVING COUNT(*) <> 1)), 0 FROM dual
UNION ALL
-- business days per month stay in a sane band, or the holiday flag is wrong
SELECT 'bd_band',   (SELECT COUNT(*) FROM (SELECT month_start, SUM(is_business_day) bd FROM v
                                           GROUP BY month_start HAVING SUM(is_business_day) NOT BETWEEN 17 AND 23)), 0 FROM dual
UNION ALL
-- the calendar must cover the fact table's whole date range
SELECT 'coverage',  (SELECT COUNT(*) FROM RAW_CBS.CBS_ACCT_BAL_DLY b
                     WHERE b.BAL_DT NOT IN (SELECT date_key FROM v WHERE is_business_day = 1)), 0 FROM dual;
