# Contract: `catalog/acceptance.yaml`

Finance's evidence for the recipes: one row per recipe, the value finance would bet on for one date, and where it came from. A recipe defines a number; this file proves the definition produces the right one. Written at step 11 by `/verify` from finance's answer, read by `/verify` on every build afterwards. Owned by finance through CODEOWNERS; the recipe book is never edited to record a number.

```yaml
- kpi: kpi.casa_balance                 # a recipe id in catalog/kpi-registry.yaml
  value: 41260000000                    # the number, in the recipe's base unit (AED, count, or a 0–1 ratio)
  as_of: 2026-08-31                     # the business day the number is for; /verify compiles the recipe for this day
  source: "finance daily position report"   # the report or system finance read it from
  given_by: head_of_finance_reporting   # a role
```

## Rules
- One row per recipe. A newer number replaces the row; the git history is the trail.
- `as_of` is a business day inside the clean table's date range (`sources/*.yaml` → `profile.date_max`), otherwise `/verify` cannot compile it.
- `/verify` compiles the recipe as `test.hq` for `as_of` and compares within the tolerance of the recipe's `format`: `aed_millions` → nearest 1,000; `integer` → exact; `percent_1dp` → 0.05.
- A row for a `ratio` recipe is optional when both of its parts have rows; `/verify` derives the expectation.

## Lint (CI, `registry-lint`) fails the PR when
1. `kpi` is not an id in `catalog/kpi-registry.yaml`, or names a `RETIRED` recipe.
2. A CONFIRMED recipe referenced by a spec with `status: READY` has no row here (verify would have nothing to check).
3. `as_of` is not a date, or `value` is not a number.

The parallel: a view is proven by `bi_model/proofs/<view>.md` (counts); a recipe is proven by its row here (finance's number). Both are evidence files beside the thing they prove, never inside it.
