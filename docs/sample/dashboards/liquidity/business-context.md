# Business context: Available versus ledger balance, bank-wide, by branch, customer segment and product family
owner: Head of ALM        requested: 2026-10-15        status: confirmed

## 1. Who will use it
The ALM desk, every morning before the liquidity call.

## 2. Questions it should answer
1. How much of the ledger balance is actually available?
2. Where is the gap biggest?

## 3. The numbers
| # | Name they use | Meaning, verbatim | Compare to | Break down by | Leave out | Owner | Recipe |
|---|---------------|-------------------|------------|---------------|-----------|-------|--------|
| 1 | Available balance | "Total available balance across all products at close of the last business day" | the day before | branch, customer segment, product family | nothing left out | Head of ALM | new |
| 2 | Total balance | "Total ledger balance across all products at close of the last business day" | the day before | branch, customer segment, product family | nothing left out | Head of Treasury | reuse kpi.total_balance |

## 4. Filters on the page
Branch and customer segment and product family.

## 5. Where the data comes from
CBS daily balance report.

## 6. Who is allowed to see it
Finance and treasury see everything.

## 7. Notes from the business
Available is what the customer can withdraw today. Holds and blocks are already taken off by the core system.

## 8. Open questions
not given
