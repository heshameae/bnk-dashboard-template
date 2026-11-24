# Business context: Product mix
owner: Head of Finance Reporting        requested: 2026-11-02        status: confirmed

## 1. Who will use it
My reporting team, at month end.

## 2. Questions it should answer
1. How is the total balance split across product families?
2. How much sits in term deposits, loans and cards?

## 3. The numbers
| # | Name they use | Meaning, verbatim | Compare to | Break down by | Leave out | Owner | Recipe |
|---|---------------|-------------------|------------|---------------|-----------|-------|--------|
| 1 | Total balance | "Total ledger balance across all products at close of the last business day" | the day before | branch, product family | nothing left out | Head of Treasury | reuse kpi.total_balance |
| 2 | Term deposits | "Total term deposit balance at close of the last business day" | the day before | branch | nothing left out | Head of Treasury | reuse kpi.td_balance |
| 3 | Loan balance | "Total outstanding loan balance at close of the last business day" | same day last month | branch | nothing left out | Head of Retail Lending | reuse kpi.loan_balance |
| 4 | Card balance | "Total card balance outstanding at close of the last business day" | same day last month | branch | nothing left out | Head of Cards | reuse kpi.card_balance |

## 4. Filters on the page
Branch.

## 5. Where the data comes from
CBS daily balance report.

## 6. Who is allowed to see it
Finance sees everything.

## 7. Notes from the business
These must match the monthly balance sheet.

## 8. Open questions
not given
