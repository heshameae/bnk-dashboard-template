-- view: dim_date
-- grain: one row per calendar day
-- RLS: none — calendar
-- sources: CBS_CALENDAR
-- refresh: yearly with CBS_CALENDAR
-- proof: bi_model/proofs/dim_date.md (2026-09-04)
CREATE OR REPLACE VIEW bi_model.dim_date AS
SELECT c.CAL_DT                                             AS date_key,
       CASE WHEN c.IS_BUS_DAY = 'Y' THEN 1 ELSE 0 END      AS is_business_day,
       TRUNC(c.CAL_DT, 'MM')                               AS month_start,
       CASE WHEN c.IS_BUS_DAY = 'Y'
             AND c.CAL_DT = MAX(CASE WHEN c.IS_BUS_DAY = 'Y' THEN c.CAL_DT END)
                            OVER (PARTITION BY TRUNC(c.CAL_DT, 'MM'))
            THEN 1 ELSE 0 END                              AS is_last_business_day_of_month,
       c.HOL_NM                                            AS holiday_name
FROM   RAW_CBS.CBS_CALENDAR c;
