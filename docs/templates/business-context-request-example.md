# Dashboard request

Fill in what you can, in plain words. If you are not sure about something, write "not sure" and we will come and ask.

**Dashboard name:** Cashboard
**Your name and role:** Head of Treasury
**Date:** 3 September 2026

## Who will use it?
Me and my two analysts, every morning before the 9am call. We check where CASA closed yesterday and whether anything moved that we need to explain on the call.

Regional heads and branch managers, maybe once a week, usually on the phone. They should only see their own branches.

## Questions it should answer
1. What is our CASA balance as of the last business day, and how did it move against yesterday?
2. Which customer segments hold the CASA balance, and is the mix shifting?
3. How many CASA accounts actually carry a balance?
4. What share of our total balances is CASA?
5. Later, if the data exists: what is our average daily net inflow?

## The numbers you want to see
One line per number. The most important column is what it means: the sentence you would say to a new colleague. If a number is worked out from other numbers, say which ones. For example, total costs divided by total income.

| Number | What it means, in one sentence | Compare it to | Break it down by | Any filtering on this number? |
|---|---|---|---|---|
| CASA balance | Total CASA balance at close of the last business day, dormant accounts excluded | The day before | Branch, customer segment | Leave out dormant accounts (status D) |
| Total balance | Total ledger balance across all products at close of the last business day | The day before | Branch, segment, product family | Nothing left out |
| CASA accounts | Number of CASA accounts with a positive balance at close of the last business day | Same day last month | Branch, customer segment | Leave out dormant. A zero balance does not count. |
| CASA share | CASA balance as a share of total ledger balance, last business day | Same day last month | Branch, customer segment | Same as CASA balance |
| Average daily net inflow | Not sure how to define this. Money in minus money out per day, averaged over the month? | Last month | Branch | Not sure, can we discuss? |

## Filters on the page
Date. It should open on the last business day, but we need to be able to pick an earlier day to look back.

Branch and customer segment. The whole page should follow these two.

Product family only matters for total balance, so a filter on that section is enough.

A period switch: month to date, quarter to date, year to date. And we want to compare against the same period last year.

## Where does the data come from?
CBS daily balance report. All account balances, every day. The data team owns it.

Finance daily position report (Excel). The totals finance signs off every morning. These are the numbers we go by. Finance owns it.

Transactions: not sure where they sit. Only needed for the net inflow number.

## Who is allowed to see it (RLS)?
Branch managers see their own branches only. Regional heads see their region.

Treasury and finance see everything.

Total CASA and CASA share should stay visible to everyone so a region can compare itself to the bank, but please check that with Security first.

## Anything else we should know?
For history we take the CASA balance at month end. For the current month we take the last business day we have. So a monthly view is all the month ends plus where we are now.

CASA share has caused arguments before because finance and the branches counted dormant accounts differently. Please use the finance definition.

Foreign currency accounts are fine in AED, the core system converts them.

The CBS report is sometimes late on the first working day after a holiday. When that happens the page should say the data is old, not just show the previous day.

---
*BI team: this is what `/business-context cashboard <this file>` turns into `dashboards/cashboard/business-context.md`. Row 5 ("not sure how to define") becomes an open question with an owner, not a recipe. The late-report note in the last section is a data note for §5 and a "data as of" requirement for the spec. Regenerate the `.docx` twin with `node docs/templates/build-request-docx.js`.*
