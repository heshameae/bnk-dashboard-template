# Cashboard — business context
owner: Head of Treasury        requested: 2026-09-03        status: confirmed

## 1. Who it is for
- Head of Treasury and two treasury analysts: every morning, desktop.
- Regional heads and branch managers: their own branches, weekly, mostly phone.

## 2. Questions it must answer
1. What is our CASA balance as of the last business day, and how did it move against yesterday?
2. Which segments hold the CASA balance, and is the mix shifting?
3. How many CASA accounts actually carry a balance?
4. What share of total balances is CASA?

## 3. KPIs in their words
| # | Name they use | Meaning, verbatim | Owner | Compare to | Slice by | Recipe |
|---|---------------|-------------------|-------|------------|----------|--------|
| 1 | CASA balance | "Total CASA balance at close of the last business day, dormant accounts excluded" | Head of Treasury | previous business day | branch, segment | new |
| 2 | Total balance | "Total ledger balance across all products at close of the last business day" | Head of Treasury | previous business day | branch, segment, product family | new |
| 3 | CASA accounts | "Number of CASA accounts with a positive balance at close of the last business day" | Head of Treasury | previous month | branch, segment | new |
| 4 | CASA share | "CASA balance as a share of total ledger balance, last business day" | Head of Treasury | previous month | branch, segment | new |

## 4. What to leave out
- Dormant accounts (status D) from CASA balance and CASA accounts. Closed accounts drop out of the daily file on their own.
- Nothing excluded from total balance; confirmed by the Head of Treasury.
- Foreign-currency accounts are shown in AED equivalent as the core system converts them; no separate FX view on this page.

## 5. Sources they named
- "The CBS daily balance report" (the core banking system's daily balance file).
- "Finance's daily position report" (Excel; the numbers they would bet on, used for acceptance at step 11).

## 6. Open questions
1. Should "average daily net inflow" be on the first release? Needs a transaction feed nobody has profiled yet. Owner: Head of Treasury, by 2026-09-10.
2. Regional heads: do they see their region's total only, or also a bank-wide comparator? Owner: Head of Treasury with Security.
