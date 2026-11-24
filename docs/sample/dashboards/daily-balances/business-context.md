# Business context: Daily balances
owner: Head of Finance Reporting        requested: 2026-10-02        status: confirmed

## 1. Who will use it
My reporting team, every morning, to check the balances before the daily position report goes out.

## 2. Questions it should answer
1. What is our total ledger balance as of the last business day, and how did it move against yesterday?
2. How is the total split across product families?
3. How much of it is CASA?

## 3. The numbers
| # | Name they use | Meaning, verbatim | Compare to | Break down by | Leave out | Owner | Recipe |
|---|---------------|-------------------|------------|---------------|-----------|-------|--------|
| 1 | Total balance | "Total ledger balance across all products at close of the last business day" | the day before | product family, customer segment | nothing left out | Head of Treasury | reuse kpi.total_balance |
| 2 | CASA balance | "Total CASA balance at close of the last business day, dormant accounts excluded" | the day before | customer segment | dormant accounts (status D) | Head of Treasury | reuse kpi.casa_balance |

## 4. Filters on the page
Branch and customer segment.

## 5. Where the data comes from
CBS daily balance report. The same feed the Cashboard uses.

## 6. Who is allowed to see it
Finance sees everything.

## 7. Notes from the business
These must match the daily position report to the fils. If they do not, the page is wrong, not the report.

## 8. Open questions
not given
