# /build-model draft <dashboard> (step 3)

Purpose: one clean table per subject, one DRAFT recipe per KPI row, one proof file per view. Nothing runs against the database in this mode.

## Steps

1. **Load the inputs.** Read `dashboards/<dashboard>/business-context.md`, every `sources/*.yaml`, every `bi_model/*.sql` header, and `catalog/kpi-registry.yaml`.
   Done when: every numbers-table row is listed with its meaning, owner, compare-to and break-down-by, and every source file's `grain`, `key`, profile counts and `relationships` are in a table you can point at.

2. **Reuse before drafting.** For each numbers-table row, search the registry for a CONFIRMED recipe whose `meaning` matches the row's verbatim meaning, and search `bi_model/` for a view at the grain the row needs.
   Done when: each row is marked `reuse recipe <id>`, `reuse view <name>`, or `new`, with the reason in one line.

3. **Assign subjects and grains.** Group the `new` rows by subject (balances, transactions, customers, ...). For each subject decide the one grain the clean table will have, using `docs/grain-and-joins.md`: a snapshot subject is "one row per <entity> per <snapshot date>", a flow subject is "one row per <event>".
   Done when: every `new` row belongs to exactly one subject, and each subject has a grain sentence starting with "one row per".

4. **Check the sources.** For each subject list the raw tables it needs and the join keys from `relationships`. A raw table with no `sources/<TABLE>.yaml`, or a join whose target column is not the target table's `key`, goes into the gap report and blocks that subject. A table whose `profile` is absent, or whose counts are unequal, does not block: its grain is declared by the data team's key, so the subject is drafted, and every view and recipe built on it is listed as `unproven` in the report. Finalize (step 5) refuses those until the proofs exist.
   Done when: every subject is `ready` (all sources proven), `ready-unproven` (at least one source declared only), or `blocked` with the table and the missing fact named.

5. **Make sure the calendar exists.** Any `balance-last-day` or `compare: previous_business_day` recipe needs `bi_model/dim_date.sql`. If it is missing, draft it from the calendar source (`docs/CONVENTIONS.md`, "Dates") as one more view in this run.
   Done when: `bi_model/dim_date.sql` exists with a six-line header, or no recipe in this run needs business days.

6. **Draft each ready view** as `bi_model/<view>.sql`, named per `docs/CONVENTIONS.md`: header of six lines (`view`, `grain`, `RLS`, `sources`, `refresh` copied from the sources' `profile.refresh`, `proof: bi_model/proofs/<view>.md (pending)`), then `CREATE OR REPLACE VIEW bi_model.<view> AS SELECT ...`. Rename every raw column once to a business word; join only to one-row-per-key tables; a join that can lose rows is a `LEFT JOIN` with `COALESCE(..., 'UNKNOWN')`; the view keeps rows and exposes status columns so recipes can exclude. No `SUM`, ratio or window function in a fact view.
   Done when: each view file has the six header lines in order, every column in the SELECT is renamed, every joined table is one row per its join key, and the view contains no aggregate.

7. **Draft one recipe per `new` row** in `catalog/kpi-registry.yaml`, creating the file with an empty `kpis:` list when it does not exist yet (the first dashboard), per `docs/contracts/kpi-registry.md`: `status: DRAFT`; `meaning` copied from the numbers table character for character; `owner` from the `Owner` column as a role; `view` = the subject's clean table; `formula` over that view's columns; `aggregation` from the grain (snapshot → `balance-last-day`, flow → `additive`, a share of two recipes → `ratio` with `formula: kpi.a / kpi.b` on the same view); `filters` implementing the `Leave out` cell exclusion for that row; `excludes` in the owner's words (or the explicit "nothing; confirmed by <role>" line from the `Leave out` cell); `dimensions` from "Break down by" as view columns; `compare` from "Compare to"; `format` chosen from the meaning; `introduced_by: <dashboard>`. No number goes in a recipe; finance's value arrives at step 11 in `catalog/acceptance.yaml`.
   Done when: every `new` row has exactly one recipe, and each recipe passes lint rules 1–4 and 6 of the contract by inspection (columns exist on the view, class fits the grain, ratio shape, compare and format present, excludes filled).

8. **Write the proof pack.** For each drafted view write `bi_model/proofs/<view>.sql` in the shape of `docs/proofs.md` section 2: the view's SELECT verbatim in a `WITH v AS (...)`, then the `grain`, `fan_out` and `conservation` checks with the window and the day chosen from the source's `date_max`, then the five-sample-rows query.
   Done when: every drafted view has a proof file whose three check names match the result-file template exactly, and the conservation day is a business day inside the source's date range.

9. **Stub the policy.** For each drafted view add an entry to `security/rls-policies.yaml` per `docs/contracts/rls-policies.md`: a view exposing customer or balance figures gets the column the business slices access by (`column: <col>` and `default: none`, every existing role listed as `by_entitlement` unless the role's note says bank-wide); a reference or calendar view gets `column: none` with a `reason`. Mark each new entry with the comment `# TODO confirm with /rls`. Make the view header's `-- RLS:` line match.
   Done when: every drafted view has a policy entry and its header `RLS:` line equals the entry's `column`.

10. **Lint the drafts.** `npm run lint:registry -- views`. Print its output.
    Done when: every line reads `PASS`. A `FAIL` names the view and the check (header, rename, sources line, join off the key, metric math or a WHERE in a fact view, RLS mismatch, one raw column with two names); fix the view file and run again. This runs before anyone reads the SQL, so a data engineer never spends a proof run on a view that code could reject.

11. **Rebuild the portal graph:** `npm run graph -w @bank-dashboards/portal`. Every view drafted in this run is not in `catalog/data-dictionary.yaml` yet, so the portal shows it with a `draft` badge; every recipe shows `DRAFT`. Print the script's output line.
    Done when: the clean-table count it prints includes every view drafted in this run.

12. **Report.** Print one table: view · grain · sources · recipes · proof file · status (`ready` / `ready-unproven` / `blocked`). Below it the gap report (blocked subjects, unproven sources, unparsed relationships) and the contract's ask when a gap needs the data team. End with the list of proof files a data engineer must run.
    Done when: the table lists every subject from step 3 and every proof file is named.

## Stops when
- `business-context.md` is missing or has a numbers-table row with an empty meaning: stop and name the row; step 2 owns the fix.
- A subject needs a raw table with no `sources/<TABLE>.yaml`: the subject is `blocked`, the other subjects still get drafted. A table that is declared but not proven never blocks a draft; it blocks finalize.
- A numbers-table row needs two clean tables at once: stop on that row and propose the widened view, never a joining recipe.

## After it
Nothing runs. The user sends every `bi_model/proofs/<view>.sql` to a data engineer, who runs it read-only on the replica and pastes the results into `bi_model/proofs/<view>.md` in the template of `docs/proofs.md`. When the result files exist, the user runs `/build-model finalize <dashboard>`.

Example (illustration only; the skill assumes none of these names): a numbers-table row "Total CASA balance at close of the last business day" over `CBS_ACCT_BAL_DLY` (one row per account per business day) becomes `v_balances_daily`, recipe `kpi.casa_balance` with `aggregation: balance-last-day`, proof `bi_model/proofs/v_balances_daily.sql`.
