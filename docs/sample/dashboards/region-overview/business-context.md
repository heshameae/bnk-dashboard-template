# Business context: Region overview
owner: Head of Branch Network        requested: 2026-10-22        status: confirmed

## 1. Who will use it
Regional heads, every Monday.

## 2. Questions it should answer
1. How do the branches in my region compare on CASA and total balances?
2. How many active accounts does each hold?

## 3. The numbers
| # | Name they use | Meaning, verbatim | Compare to | Break down by | Leave out | Owner | Recipe |
|---|---------------|-------------------|------------|---------------|-----------|-------|--------|
| 1 | CASA balance | "Total CASA balance at close of the last business day, dormant accounts excluded" | the day before | branch | dormant accounts (status D) | Head of Treasury | reuse kpi.casa_balance |
| 2 | Total balance | "Total ledger balance across all products at close of the last business day" | the day before | branch | nothing left out | Head of Treasury | reuse kpi.total_balance |
| 3 | Active accounts | "Number of active accounts at close of the last business day" | same day last month | branch | dormant and closed accounts | Head of Retail Banking | reuse kpi.active_accounts |

## 4. Filters on the page
Branch.

## 5. Where the data comes from
CBS daily balance report.

## 6. Who is allowed to see it
Regional heads see their region only.

## 7. Notes from the business
not given

## 8. Open questions
not given
