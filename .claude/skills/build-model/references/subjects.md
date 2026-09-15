# Subjects: how the numbers table becomes a set of views

Read this at draft step 3, after every raw table has a kind (`table-kinds.md`). A subject is one fact table at one grain plus the dimensions its numbers need. A view is one subject. Names (`ACCOUNT`, `balance`) are illustrations only.

## Cutting subjects

```
For each `new` row in the numbers table:
  Which raw table holds the amount or count the meaning names?
  ├── One SNAPSHOT or FLOW FACT table → that table's subject. Add the row to it.
  ├── Two fact tables at the same grain → one subject, the wider view (joins.md case 5).
  ├── Two fact tables at different grains → the row is a ratio of two numbers, one per subject,
  │     or it cannot be drafted. Stop on that row and say which.
  ├── A dimension table only (a count of customers, of branches) → a subject on that dimension,
  │     grain "one row per <entity>". Counts of things are recipes over dimension views.
  └── No raw table holds it → the row is blocked. Name what is missing. Never derive an
        amount the source does not have.
```

Then, per subject:

```
Does a view for this subject exist in bi_model/?
├── Yes, same grain
│   Does it expose every column the new rows need?
│   ├── Yes → reuse. No view is written.
│   └── No  → widen it: add the columns, keep the name, re-issue its proof. Say so in the report.
├── Yes, different grain → a new view. Two grains never share a view.
└── No → a new view, named per docs/CONVENTIONS.md.
```

Widen rather than add when the grain is the same. Two views over one fact table at one grain means two definitions of the same rows, and the next dashboard picks the wrong one.

## Which columns the view exposes

Every column below, and nothing the numbers table does not need. A view is not a copy of the raw table.

1. **Every key column** of the subject table, renamed. The date, the entity code, the id.
2. **Every column a recipe names**: the amount in each meaning, the columns each `Leave out` cell filters on, the columns each `Break down by` cell splits by.
3. **The RLS column**, the one the business slices access by (section 6 of the business context). It must be a column the view exposes, so the policy can name it.
4. **Status and flag columns** the exclusions need, exposed as they are. The view keeps every row; the recipe excludes. A view that filters cannot be audited.
5. **A `<side>_matched` flag** for every LEFT JOIN that can miss (joins.md case 7).
6. **Date columns that are not the key date**, renamed to say what they are (`opened_date`, `maturity_date`, `value_date`). The key date is the snapshot date; the others are attributes.

Not exposed: columns nobody asked for, raw codes when a mapped business word exists (expose the word; keep the code too only if a recipe filters on it), audit columns from the load.

## Choices that are questions, not decisions

Each of these looks like a modeling decision and is a fact about the bank. Draft with the reading stated below, and put the question in the report.

| Choice | Draft reading | Question for |
|---|---|---|
| Several amount columns (ledger, available, cleared, principal) and the meaning says "balance" | the one whose description matches the meaning's words; when none does, the row is `?` | the business, section 8 |
| Several date columns and the meaning says "as of" | the key date | the business, when the key date is not what "as of" means |
| Amounts in account currency and a rate table exists | expose both the amount and the currency code; convert in a second column only when the rate table is a proven dimension keyed by date and currency | the business: which currency the number is reported in |
| Amounts in account currency and no rate table | expose the amount and the currency code; no conversion | the data team: where the reporting-currency amount lives |
| An entity code in every key | a dimension column, and the candidate RLS column when section 6 mentions entities | the business, section 6 |
| A code column with no value list in its definition | expose the code as is; the recipe's filter is `?` | the data team: the values and their meanings |
| The business names a number the source does not hold | blocked | the business: where they see it today |

## Where a calculation lives

```
Can it be worked out from one row alone?
├── Yes → in the view, once, as a named column. Examples: a flag from a status code,
│         a product family from a product code (via the mapping), a band from an amount,
│         days between two dates on the row, an amount times a rate on the row.
└── No (it adds, counts, divides or compares across rows or across days) → a recipe.
      Examples: a total, a count, a share, a change since yesterday, an average balance.
```
Why: a row-local calculation in the view is written once and every recipe reads the same value. A cross-row calculation in the view is metric math, and the lint refuses it in a fact view because it fixes the grain and the period before any recipe can choose them.

An exclusion is never a calculation in the view. The view carries the flag; the recipe decides. Two dashboards can exclude differently over one view; they cannot un-exclude a row the view dropped.

## Naming

- The view: `v_<subject>_<grain>` for facts (`v_balances_daily`, `v_transactions`), `dim_<thing>` for dimensions. Lower snake_case, no source-system prefix.
- Columns: business words in snake_case. The same raw column gets the same business word in every view; the cross-view lint enforces it. Before naming, search existing views for the raw column and reuse the name. Role-playing joins are the one exception (joins.md case 6).
- The grain line: "one row per `<entity>` per `<date>`", using the business words the view exposes, not the raw ones.

## What step 3 writes down

One block per subject, before any SQL:

```
subject: <name>          view: v_<subject>_<grain>   (new | widen | reuse)
grain:   one row per <entity> per <date>
fact:    <TABLE> (SNAPSHOT FACT)
joins:   <TABLE> as-of on [<key cols>] · <TABLE> plain on [<key>] · <MAP> blocked: one row per from-key unproven
exposes: <date>, <entity>, <amount>, <status>, <segment>, <branch>, ...
rows:    numbers-table rows 1, 3, 4
open:    <question> · <question>
status:  ready | ready-unproven | blocked
```
Step 6 writes the SQL from this block and nothing else. A column that is not in `exposes` is not in the SELECT; a join that is not in `joins` is not in the FROM.
