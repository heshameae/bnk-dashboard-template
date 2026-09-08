# Contract: `dashboards/<name>/business-context.md`

The ask, in the business's own words, in fixed headings. Written by `/business-context` (step 2) from meeting notes or from the request form. Read by `/build-model`, `/ask-leap-bi`, `/spec` and the portal. Nobody else writes it, except the business owner's read-back, which sets `status: confirmed` by hand.

The request form (`docs/templates/business-context-request.md`) has the same sections in the same order, so a filled form maps onto this file one to one. Every section is always present; one the business left empty says `not given`.

```markdown
# Business context: <Dashboard name>
owner: <business owner, role>        requested: <date>        status: draft | confirmed

## 1. Who will use it
Their words. Who opens it, how often, what they do with it.

## 2. Questions it should answer
Numbered, in their order.

## 3. The numbers
| # | Name they use | Meaning, verbatim | Compare to | Break down by | Leave out | Owner | Recipe |
|---|---------------|-------------------|------------|---------------|-----------|-------|--------|
| 1 | CASA balance | "Total CASA balance at close of the last business day, dormant accounts excluded" | the day before | branch, customer segment | dormant accounts (status D) | Head of Treasury | new |

## 4. Filters on the page
Their words: what the page filters by, and what it shows when it first opens.

## 5. Where the data comes from
Their words: systems, reports, files, and who owns them. Names only; the data team maps them at step 1.

## 6. Who is allowed to see it
Their words: who sees everything, who sees only their part, which numbers stay bank-wide.

## 7. Notes from the business
Anything else they wrote, verbatim: quirks in the data, definitions people disagree on.

## 8. Open questions
1. <question> Owner: <role>, by <date>
At most seven, ranked: meaning gaps, exclusion gaps, the rest. When more remain, the last line is "And N more gaps in the table; meet again before step 3."
```

## The numbers table
- `Meaning, verbatim` is the business's sentence, in quotes, never reworded. At step 3 the recipe's `meaning` is copied from it character for character.
- `Compare to`, `Break down by` and `Leave out` are their words too. An empty `Leave out` cell means they said nothing, which is a question for section 8, never a silent "nothing excluded". "Nothing left out" is a valid answer when they wrote it.
- `Owner` is a role, not a person's name. It defaults to the requester until the read-back names someone else.
- `Recipe` is filled by the skill, not the business: `new`, or `reuse kpi.<id>` when a CONFIRMED recipe in `catalog/kpi-registry.yaml` carries the same meaning, the same sentence character for character. A close sentence is `new` plus a question; the business says whether it is the same number, never the skill. On the first dashboard the registry does not exist yet, so every row is `new`; `/build-model draft` creates the file. When every row reuses, the model already exists and the dashboard goes from here to step 8.
- A cell the skill cannot fill is `?`: a blank, or anything the business marked "not sure". Every `?` has a question in section 8 naming the number, or the "meet again" line covers it.

## Rules
- Their words everywhere. The skill sorts and copies; it does not summarise, paraphrase or fill gaps. `packages/business-context` checks it: every sentence in the file must appear in the input files, case and spacing aside.
- No acceptance values here. Finance supplies them at step 11 into `catalog/acceptance.yaml`. A number the business quotes goes to section 8 as "finance to confirm at verify".
- `status: confirmed` only after the business owner has read the file back. `/build-model draft` runs on `draft` too, and marks every recipe it writes DRAFT regardless.
