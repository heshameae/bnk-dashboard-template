# Business context: Branch balances
owner: Head of Branch Network        requested: 2026-10-06        status: confirmed

## 1. Who will use it
Branch managers, at the start of the week, for their own branches. Regional heads, to compare the branches in their region.

## 2. Questions it should answer
1. How much CASA does each of my branches hold, and how did it move against yesterday?
2. Which customer segments hold the balances in my branches?

## 3. The numbers
| # | Name they use | Meaning, verbatim | Compare to | Break down by | Leave out | Owner | Recipe |
|---|---------------|-------------------|------------|---------------|-----------|-------|--------|
| 1 | CASA balance | "Total CASA balance at close of the last business day, dormant accounts excluded" | the day before | branch, customer segment | dormant accounts (status D) | Head of Treasury | reuse kpi.casa_balance |
| 2 | Total balance | "Total ledger balance across all products at close of the last business day" | the day before | customer segment | nothing left out | Head of Treasury | reuse kpi.total_balance |

## 4. Filters on the page
Branch.

## 5. Where the data comes from
CBS daily balance report.

## 6. Who is allowed to see it
Branch managers see their own branches only. Regional heads see their region.

## 7. Notes from the business
not given

## 8. Open questions
not given
