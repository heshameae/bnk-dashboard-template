# /model finalize <dashboard> — step 5

Purpose: turn proof results into a reviewed PR. The data engineer's numbers decide; the human review decides truth; lint decides form.

## Steps

1. **Read the evidence.** For every view drafted for this dashboard (header `proof:` line still `(pending)`), read `bi_model/proofs/<view>.md`. A missing result file means step 4 has not happened for that view.
   Done when: each view is listed with its three check rows (`grain`, `fan_out`, `conservation`) and their results, or as `no result file`.

2. **Judge each check.** Any row that is not `PASS` stops that view and names the fix path:
   - `grain` fails (rows ≠ keys): the key is wrong or a join multiplied rows; re-read the source's `key` and `relationships`, fix the view, re-issue the proof.
   - `fan_out` fails (raw rows ≠ view rows): a joined table is not one row per its key; swap it for the one-row-per-key table or aggregate it in a dimension view first.
   - `conservation` fails (raw sum ≠ view sum): an inner join or a filter dropped or duplicated rows; make the join a `LEFT JOIN` with an UNKNOWN member, or move the filter into the recipe.
   Done when: every view is `all PASS` or has a named fix path and goes back to step 3 for that view only.

3. **Stamp the header.** For each `all PASS` view set the `proof:` line to `bi_model/proofs/<view>.md (<run_at date>)` and check the `grain` line equals the grain the proof proved.
   Done when: no header for this dashboard says `(pending)`.

4. **Run the view checklist.** Answer the eight checks of `docs/review/view-checklist.md` for each view, one line each, quoting the proof row or the SQL line that proves it.
   Done when: eight answers per view, every one `yes`; a `no` sends that view back to step 3 with the check number.

5. **Run the recipe questions.** Answer the three questions of `docs/review/recipe-checklist.md` for each DRAFT recipe of this dashboard: quote the §3 sentence next to `meaning`, quote the grain sentence next to the aggregation class, quote the §4 line next to `excludes`.
   Done when: three answers per recipe, every one `yes`.

6. **Check policies.** For each view named by a recipe, confirm `security/rls-policies.yaml` has an entry whose `column` equals the header's `RLS:` line and whose `# TODO confirm with /rls` marker has been removed by `/rls`.
   Done when: every view has a confirmed entry; otherwise print `run /rls <view>` for each and stop.

7. **Lint.** Run `npm run lint:registry`.
   Done when: exit code 0. Otherwise fix the named file and rule, and rerun.

8. **Open the PR** from `.github/PULL_REQUEST_TEMPLATE.md`: one block per view with the eight boxes ticked from step 4 and the proof file linked; one block per recipe with the three boxes from step 5; the RLS box from step 6. Title: `model(<dashboard>): <views> + <n> DRAFT recipes`.
   Done when: the PR exists, every box in it is ticked with evidence, and every proof file it names is in the diff.

## Stops when
- A proof result file is missing or a check is not `PASS` (step 2): the view goes back to step 3; the PR is not opened.
- A recipe's `meaning` differs from business-context §3 by one character: the recipe is not reviewed until it matches.
- A view has no confirmed policy entry (step 6).
- Lint fails (step 7).

## Hands over to
Step 6, the business owner: reads each DRAFT recipe on the Catalog page rendered from the PR branch and confirms or corrects its meaning; `confirmed: { by, at }` is written and `status` becomes CONFIRMED. You merge only when every recipe on the page is CONFIRMED; the merge is the handover to the DEs' pipeline (step 7).
