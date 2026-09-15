# Recipes: from a numbers-table row to a DRAFT recipe

Read this at draft step 7, once per `new` row. The contract is `docs/contracts/kpi-registry.md`; this page is how each field is decided from the row's words. Names are illustrations only.

## Aggregation class, from the view's kind and the meaning's verb

```
Which kind is the recipe's view? (table-kinds.md)
├── SNAPSHOT FACT
│   Does the meaning say a total, a position, a count of things, "as of", "at close", "outstanding"?
│   ├── Yes → balance-last-day
│   └── It says a movement, a change, an inflow, "during", "in the month"
│         → the number is a difference of two snapshots, or a flow the snapshot does not hold.
│           A difference of two balance-last-day recipes is a `ratio`-shaped derived recipe only
│           when the contract allows subtraction; otherwise it is a question. Never `additive`
│           on a snapshot: summing daily balances across days is the 19x error.
├── FLOW FACT
│   Does the meaning say a total, a volume, a count of events, revenue, fees, "in the period"?
│   ├── Yes → additive
│   └── It says a position or a balance → the flow table is the wrong view. Find the snapshot.
├── DIMENSION (a count of customers, of accounts open)
│   → additive over the dimension view (COUNT), with no time window, or balance-last-day
│     over the versioned dimension when the count is "as of a day".
└── The meaning says a share, a ratio, a rate, a percentage, "per", "average"
    → ratio: formula `kpi.a / kpi.b`, both on the same view, both drafted in this run.
      "Average" is a question first: average of what, over what? An average daily balance
      is a ratio of a sum over days to a count of days, and needs the business to say so.
```

## Formula

- One column of the view, wrapped in the aggregate the class implies: `SUM(<amount>)`, `COUNT(*)`, `COUNT(DISTINCT <entity>)`.
- A count is `COUNT(*)` when the thing counted is the entity the view is one row per (accounts on a one-row-per-account view). It is `COUNT(DISTINCT <column>)` when the thing counted is coarser than the grain (customers on a one-row-per-account view). The grain line of the view decides; write which in the meaning's words.
- Never a CASE inside the formula to exclude rows. That is a `filters` entry.
- Never a column from another view. The one-view rule is not negotiable; the fix is a wider view.

## Filters and excludes, from the `Leave out` cell

```
What does the cell say?
├── A sentence naming a state ("dormant accounts", "internal accounts", "zero balances")
│   → excludes: the sentence, verbatim.
│     filters: the predicate that implements it on the view's columns.
│     The predicate needs a code value. Is it in the column's description?
│     ├── Yes → write it (`account_status <> 'D'`).
│     └── No  → filters: [] and a question for the data team naming the column.
│               The recipe is drafted with the gap visible, never with a guessed value.
├── "Nothing left out", in their words → excludes: "nothing; confirmed by <role>", filters: [].
├── "Same as <other number>" → copy that row's filters; excludes says "same as kpi.<id>".
└── `?` (blank or "not sure") → excludes: "?", filters: [], and the section 8 question stands.
      The recipe passes lint rule 6 only after the business answers; finalize refuses it until then.
```

A filter on a column the view does not expose means the view is missing a column (subjects.md), not that the filter goes somewhere else.

## Dimensions, from `Break down by`

Each phrase becomes one view column. "Branch" is the branch code column; "segment" is the segment column. A phrase with no column on the view is a missing column in the view (subjects.md), unless the phrase is a hierarchy level that needs `joins.md` case 4 first. Every dimension listed must be a column the view exposes, because `semantic-query` refuses a `by` that is not in the recipe's dimensions.

The RLS column of the view is always a dimension, even when the business did not ask to split by it, because entitlement filtering uses it.

## Compare, from `Compare to`

| Their words | `compare` |
|---|---|
| "the day before", "yesterday", "previous business day" | `previous_business_day` |
| "last month", "same day last month", "month end" | `previous_month` |
| "last year", "same period last year" | `previous_year` |
| blank or "no" | `none` |
| anything else ("budget", "target", "plan") | `none`, plus a question: a comparator that is not a prior period is another recipe or an acceptance value, and the business must say which |

## Format, from the meaning

Amounts in a reporting currency in millions → `aed_millions` or the bank's equivalent from existing recipes; counts → `integer`; ratios → `percent`. Reuse the format id an existing recipe uses for the same kind of number. A new format id is a question, not an invention.

## Reuse, and the near-miss

A row reuses a CONFIRMED recipe only when its meaning matches character for character. A meaning that differs by one word is a new recipe plus a section 8 question ("is this the same number as `kpi.<id>`?"). Two recipes with meanings that differ only in an exclusion are two numbers, and both exist on purpose. The business decides sameness; the draft never merges.

## What each recipe must survive before step 7 ends

Lint rules 1 to 4 and 6 of the contract, by inspection: the view exists, every column named exists on it, the class fits the view's kind, a ratio names two recipes on one view, `compare` and `format` are present, `excludes` is filled or `?`. A recipe that fails any of these is not written; the row goes to the report with the rule number.
