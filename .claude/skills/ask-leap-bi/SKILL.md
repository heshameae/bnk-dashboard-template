---
name: ask-leap-bi
description: The map of the platform: the main flow, the on-ramps, where a session starts and ends. With a dashboard name it reads the files and prints the current step, its owner and the exact next command.
disable-model-invocation: true
---

# /ask-leap-bi

You don't remember every skill, so ask. This skill is the map: the one route most work travels, the on-ramps that merge onto it, and where sessions begin and end. With a dashboard name it also reads the files that exist and names the current step, its owner and the next command. The step table with owners and handover files is `docs/WORKFLOW.md`; this file never repeats it.

## Run it
`/ask-leap-bi <dashboard>`: position report for one folder under `dashboards/`. `/ask-leap-bi` alone: the map below, then every dashboard folder with its step number.

## The main flow: ask → live dashboard
Every handover is a file in git, so every step starts by reading the previous step's file and ends by writing its own. Nothing is carried in anyone's head or in a chat.

1. **`/import-schema`** turns the data team's schema export into `sources/*.yaml`, once per source system. Merge onto the flow at step 2 when the tables a dashboard needs are already filed.
2. **`/business-context`** turns the meeting into `business-context.md`: meanings verbatim, owners, exclusions, open questions. **Branch:** when every KPI row reuses a CONFIRMED recipe, the model already exists; skip to step 8.
3. **`/build-model draft`** writes the clean tables, DRAFT recipes, the proof pack and a policy stub. Nothing runs.
4. A data engineer runs the proof pack read-only and writes the result files. This is the one boundary inside the modeling phase: days pass here.
5. **`/build-model finalize`** judges the proofs, runs the checklists, opens the PR. **`/rls <view>`** for every new view, in the same session, before the PR.
6. The business owner confirms each recipe on the Catalog preview. Merge only when every recipe on the page is CONFIRMED.
7. The DEs' pipeline deploys `bi_model/`; CI runs **`/data-dictionary`**.
8. You design in Open Design from the Catalog's recipe list and export.
9. **`/spec`** binds the export to recipes: READY, or BLOCKED with each item sent back to step 3 or step 8.
10. **`/build`** compiles the query snapshot, proves RLS with the test users, generates the page. The business previews; every change is a spec edit and a rebuild.
11. **`/verify`** checks every number against finance's row in `catalog/acceptance.yaml` and the RLS expectations. PASS is live.

## On-ramps
A situation that generates work, and where it joins the flow.
- **A new source system** → `/import-schema`, then step 2. Filing is once; every later dashboard reuses it.
- **A change to a live dashboard** (layout, a widget, a split) → edit `spec.yaml`, then `/build`, then `/verify`. The model is untouched.
- **A change of meaning** (the business wants the number defined differently) → edit the recipe, then step 5 onward: lint, PR, the owner re-confirms, `/verify` re-checks finance's row. Every dashboard using the recipe changes at once, which is the point.
- **A change of reach** (who sees which rows) → `/rls <view>` or `/rls roles` for a rule; the Admin tab for a person's values. Rules are text in git; values are rows in Oracle.
- **A disputed number** → `/verify <dashboard>`. PASS means the recipe matches finance and the dispute is about meaning: step 6. FAIL names the step.
- **A new clean table with no dashboard yet** → still starts at step 2. Every number traces to a business sentence; a view nobody asked for is a question, not a draft.

## Vocabulary underneath
The words the skills share (clean table, recipe, grain, key, proof, policy, entitlement, spec, acceptance) are defined once in the `vocabulary` skill, which loads itself when a word is used loosely. Reach for it directly when the word, not the process, is the problem.

## Where a session starts and ends
- **Steps 2 and 3 share one window.** The draft builds on the thinking of the ask; keep them together, and run step 3 the moment step 2's file is written.
- **Step 4 is a hard boundary.** A data engineer works for days. Start a fresh session for `/build-model finalize`; there is nothing to carry, because the proof results are files.
- **Steps 9 and 10 share one window.** The build reads the spec you just confirmed.
- **Everything else starts fresh** with `/ask-leap-bi <dashboard>`. The files are the handoff document, so none is ever written by hand.
- Mid-step, continue. At a boundary, `/clear`, then `/ask-leap-bi <dashboard>`.

## Reads (position report)
- `sources/*.yaml` (`grain`, `key`, profile counts), `dashboards/<name>/business-context.md` (the `status:` line, numbers-table rows and their `reuse kpi.<id>` marks), `bi_model/*.sql` and `bi_model/proofs/*.md` (result column), `catalog/kpi-registry.yaml` (`status` per recipe), `catalog/acceptance.yaml` (row per recipe), `security/rls-policies.yaml` (policy entry per view), `catalog/data-dictionary.yaml` (`generated_at`), `dashboards/<name>/design-export/`, `dashboards/<name>/spec.yaml` (`status`), `dashboards/<name>/queries.sql`, `dashboards/<name>/verify.md` (`result:` line), `git log` for the last merge touching `bi_model/`.

## Writes
Nothing. Output is a report in the terminal.

## Steps (position report)
1. Resolve the dashboard folder. Completion: the folder exists, or the report says "no dashboard named X; folders: …" and stops.
2. Walk the decision list top to bottom; the first rule that matches names the step. Completion: exactly one step chosen.
   - No `sources/*.yaml` covering a table business-context section 5 names → **step 1** (owner: data engineers; you file it). Next: `/import-schema <handover>`.
   - `business-context.md` absent → **step 2**. Next: `/business-context <name> <notes>`.
   - Every numbers-table row carries `reuse kpi.<id>` and each id is CONFIRMED → the model exists; continue from the step 8 rule.
   - A numbers-table row without a `reuse kpi.` mark and no recipe with `introduced_by: <name>` → **step 3**. Next: `/build-model draft <name>`.
   - A `bi_model/proofs/<view>.sql` exists with no matching `.md`, or the `.md` has a row that is not PASS → **step 4** (owner: data engineers). Next: send them the proof files; then `/build-model finalize <name>`.
   - All proofs PASS and no open PR touches `bi_model/` for these views → **step 5**. Next: `/build-model finalize <name>`; `/rls <view>` for any view without a policy entry.
   - PR open and any recipe of this dashboard is `DRAFT` → **step 6** (owner: business). Next: share the Catalog preview; merge when every recipe is CONFIRMED.
   - PR merged and `data-dictionary.yaml` `generated_at` is older than the merge → **step 7** (owner: DDT / CI). Next: wait for the deploy; `/data-dictionary` runs in CI.
   - `design-export/` absent → **step 8** (owner: you). Next: design in Open Design from the Catalog's recipe list; export into `dashboards/<name>/design-export/`.
   - `spec.yaml` absent, or `status: BLOCKED` → **step 9**. Next: `/spec <name>`; BLOCKED items return to step 3 or step 8.
   - `queries.sql` absent, or spec newer than `queries.sql` → **step 10**. Next: `/build <name>`.
   - `verify.md` absent or `result: FAIL`, or a CONFIRMED recipe on the spec has no row in `catalog/acceptance.yaml` → **step 11**. Next: `/verify <name>`.
   - `verify.md` `result: PASS` → **live**. Next: nothing; see On-ramps for changes.
3. Print the report in this shape. Completion: all five lines present.
   ```
   cashboard · step 9 of 11 · Contract · owner: you + Claude
   next:     /spec cashboard
   blocking: w5 has no recipe (spec.yaml blocked[0]) → step 3
   files:    business-context ✓ · views ✓ (proofs PASS) · recipes 2 CONFIRMED / 2 DRAFT · acceptance 2/2 · spec BLOCKED · queries: · verify none
   see:      docs/WORKFLOW.md
   ```
   (the example above is the sample world; any dashboard name works)
4. When a later file exists but an earlier gate is red (a `spec.yaml` next to a DRAFT recipe, a `verify.md` older than the spec), report the earlier step and name the stale file. Completion: no stale file is left unmentioned.

## Stops when
- The dashboard folder does not exist.
- Two rules match at once because a file is malformed (a registry entry without `status`, a proof table without a `result` column). Report the file and stop; a guess here sends the user to the wrong step.

## After it
Nothing runs. The report names the owner of the detected step and the command on its `next:` line; the user runs it.
