# Contract: `dashboards/<name>/business-context.md`

Written at step 2 by `/business-context` from meeting notes or from the form the business filled in (`docs/templates/business-context-request.md`, same sections in their words). Fixed headings, always in this order, so `/model` reads it without guessing. Acceptance values are NOT captured here; finance supplies them at step 11 and `/verify` writes them into `catalog/acceptance.yaml`.

```markdown
# <Dashboard name> — business context
owner: <business owner, role>        requested: 2026-09-03        status: draft | confirmed

## 1. Who it is for
Roles that open it, how often, on what device. One line per role.

## 2. Questions it must answer
Numbered. Each one a question a person would ask out loud.

## 3. KPIs in their words
| # | Name they use | Meaning, verbatim | Owner | Compare to | Slice by | Recipe |
|---|---------------|-------------------|-------|------------|----------|--------|
| 1 | CASA balance | "total CASA balance at close of the last business day, dormant excluded" | Head of Treasury | previous business day | branch, segment | new |

`Recipe` is `new`, or `reuse kpi.<id>` when a CONFIRMED recipe already carries this exact meaning; `/model draft` and `/ask-leap-bi` read it. When every row reuses, the model exists and the dashboard goes from here to step 8.

## 4. What to leave out
Explicit exclusions, in their words. A blank row here is a question for section 6, never a silent default.

## 5. Sources they named
Systems and reports they mentioned ("the CBS balance report", "the finance Excel"). Names only; the data team maps them at step 1.

## 6. Open questions
At most seven. Each with who answers it.
```

## Rules
- Section 3 `Meaning, verbatim` is the business's sentence, quoted. The recipe's `meaning` is copied from it unchanged at step 3.
- Every KPI row names an owner (a role, not a person's name) and a `Compare to`. A blank `Compare to` becomes an open question.
- Section 4 must contain at least one line per KPI or an explicit "nothing excluded" confirmed by the owner.
- The file is `status: confirmed` only after the business owner has read it back. `/model draft` runs on `draft` too, but marks every recipe it writes DRAFT regardless.
