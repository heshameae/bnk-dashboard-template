---
name: verify
description: Check every widget against finance's numbers in catalog/acceptance.yaml and prove RLS; write dashboards/<name>/verify.md. Step 11.
disable-model-invocation: true
---

# /verify

Runs in CI on every `dashboards/**` change and by hand before a release. A dashboard ships only when this file says PASS. The recipe defines the number; `catalog/acceptance.yaml` proves it (`docs/contracts/acceptance.md`); this skill is the only writer of that file.

## Run it
`/verify <dashboard>` · `/verify --all` (CI: every folder under `dashboards/`).

## Reads
- `dashboards/<name>/spec.yaml`
- `catalog/kpi-registry.yaml`: each recipe's `status`, `meaning` and `format`
- `catalog/acceptance.yaml`: one row per recipe: `value`, `as_of`, `source`, `given_by`
- `security/test-users.yaml`, `security/rls-policies.yaml`, `docs/rls.md`: the RLS expectations
- `apps/portal/src/dashboards/<name>/page.spec-hash`

## Writes
- `dashboards/<name>/verify.md`, shaped like `docs/sample/dashboards/cashboard/verify.md` (example)
- `catalog/acceptance.yaml`: the row of a recipe finance has just supplied a number for; never the recipe book

## Steps
1. Load the spec and classify every widget: BLOCKED (`kpi: null`), DRAFT recipe, CONFIRMED recipe. Done when every widget has one class.
2. For each CONFIRMED widget whose recipe has a row in `catalog/acceptance.yaml`: compile with semantic-query as `test.hq`, `period.as_of = as_of`, run read-only, compare to `value` within the tolerance the contract gives for the recipe's `format`. A `ratio` recipe without a row uses its two parts' rows. Done when each such widget has a PASS or FAIL row showing expected and got.
3. For each CONFIRMED recipe with no row: ask finance with the exact sentence "What is the value of <meaning> as of <date>, and from which report?"; write the answer as a row (`kpi`, `value`, `as_of`, `source`, `given_by`); rerun step 2 for it. Done when every CONFIRMED recipe on the page has a row, or its verify row reads WAITING with the question text.
4. RLS: for every recipe whose view has a policy column, run its compiled query as each user in `security/test-users.yaml` for the same `as_of`; check the `expect` line (A ≠ B, hq = unfiltered, none = no rows). Done when the RLS table has one row per restricted recipe with a result.
5. Spec drift: compare `sha256(dashboards/<name>/spec.yaml)` to `page.spec-hash`. Done when the drift line reads PASS or FAIL.
6. Write `dashboards/<name>/verify.md`: header (run_at, spec path, result), the acceptance table, the RLS table, the drift line, and, unless the result is PASS, a `Go back to:` line naming a step per failing row: BLOCKED widget → 3, DRAFT recipe → 6, wrong number → 5, RLS fail → `/rls <view>` or the Admin tab's entitlements, drift → 10. Result is PASS only when every row is PASS. Done when every widget has a row with a result and the file ends with `PASS` or a `Go back to:` line.

## Stops when
- No read-only account is configured → write verify.md with result `NOT RUN` and stop.
- Any row FAILs → compute every row first, then stop with all failures listed; a partial run hides the second problem.
- Finance's `as_of` is outside the clean table's date range → WAITING; ask for a date inside `profile.date_max`.

## After it
Nothing runs. PASS: the user merges, the dashboard is live in the portal's Dashboards tab, and `/ask-leap-bi <dashboard>` reports `live`. Anything else: the step named in `Go back to:`. A number disputed after go-live starts here too: PASS means the recipe matches finance and the dispute is about meaning (step 6); FAIL means the model (step 5).
