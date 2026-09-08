# Resume note (updated 2026-09-08)

## Done
- Scaffold: CLAUDE.md, README.md, docs/WORKFLOW.md (11 steps), docs/CONVENTIONS.md, docs/rls.md, docs/proofs.md, docs/grain-and-joins.md, docs/review/*, docs/contracts/* (sources, business-context, kpi-registry, acceptance, spec, rls-policies, data-dictionary).
- Sample world (Cashboard), moved to docs/sample/ on 2026-09-07 so no skill reads it: sources/CBS_*.yaml, bi_model/{dim_date,dim_branch,v_balances_daily}.sql + proofs/ (fact and dimension proofs), catalog/{kpi-registry,acceptance,data-dictionary}.yaml, security/{rls-policies,test-users}.yaml + entitlements.sql, dashboards/cashboard/{business-context.md, design-export/, spec.yaml, queries.sql, verify.md}, packages/*/README.md, apps/portal/README.md, .github/*.
- Ten skills in .claude/skills/: ask-leap-bi (the map + position detector), import-schema, business-context, model (SKILL + draft.md + finalize.md), data-dictionary, rls, spec, build (SKILL + backend.md + frontend.md), verify, and vocabulary (model-invoked; the one glossary).
- docs/steps.js: 11 steps x {owner, gets, does, hands over, rule, trap, skill, files, clarify[]} + 4 phases + the executive narrative.
- docs/build-architecture.js: reads steps.js + 23 sample files + every skill + 13 docs, injects `window.__DATA__` into the template. Verified against a stub template.
- docs/HANDOFF-architecture-app.md: the build spec for whoever builds the app.

## Decisions on 2026-09-04
- `semantic-model/` is now `catalog/` (the portal's Catalog tab renders it); `rls-policies.yaml` moved to `security/` beside the test users and the entitlements DDL.
- Recipes carry no numbers. Finance's value per recipe lives in `catalog/acceptance.yaml` (contract `docs/contracts/acceptance.md`), written only by `/verify`, owned by finance in CODEOWNERS. Lint rule 8 checks the row exists. The parallel is deliberate: views are proven in `bi_model/proofs/`, recipes in `catalog/acceptance.yaml`.
- `grain_status` and per-recipe `acceptance` are gone; `relationships[].status` (proven | stated) stays for now.
- the business-context numbers table has a `Recipe` column (`new` | `reuse kpi.<id>`); a dashboard whose rows all reuse goes from step 2 to step 8, and `/ask-leap-bi` detects it.

## Decisions on 2026-09-07
- Phase one = steps 1, 2, 3 and the portal graph on a real dashboard (the Cashboard sample is arbitrary); nothing else until that runs end to end. See CLAUDE.md.
- `/workflow` renamed `/ask-leap-bi`; `/sources` renamed `/import-schema`; `/model` renamed `/build-model`.
- The data team's export has no counts. Grain is declared by their PK and proven at step 4; `/build-model draft` runs on declared tables and marks results `unproven`; finalize refuses until proven. Contract: `docs/contracts/sources.md`, which now also fixes the two-sheet Excel layout, the parser rules and `sources/_handover/`.
- business-context contract rewritten to mirror the request form one to one (8 sections; exclusions are a column of the numbers table). Every reader updated. No section-sign symbols anywhere.
- The request form (`docs/templates/`) is free text except the numbers table; blank and filled `.docx` are built by `build-request-docx.js`.
- `catalog/kpi-registry.yaml` is created by `/build-model draft` on the first dashboard; `/business-context` treats a missing registry as "every row new".

## Decisions on 2026-09-08
- `packages/import-schema` built: dependency-free xlsx and csv reader, the parser (rules 1 to 9), a validator that re-reads the handover and the files and prints PASS/FAIL per check, `node --test` fixtures. Commands: `npm run import-schema -- inventory|import|validate`. `import` ends by validating; `validate` runs alone against the newest handover.
- The parsing rules moved out of `docs/contracts/sources.md` into `packages/import-schema/README.md`: a contract holds a file shape, a parser holds its process. The contract points there.
- `/import-schema` rewritten: the model runs the commands and carries the questions; it never reads a cell or writes a file. `system` is given on the command line, never derived.
- `packages/business-context` built: a `.docx` reader (`text`) and a checker (`check`) that proves `business-context.md` is in the business's words (every sentence a substring of the input), the table complete, `?` cells questioned, `reuse` exact, section 8 capped at seven. Tests use the filled example form in `docs/templates/`.
- `/business-context` rewritten: exact-match rule for `reuse` (a close sentence is `new` plus a question), "not sure" and an empty Leave out become `?`, relayed answers go into a dated notes file before the cell, a confirmed file is never overwritten, the checker runs last.
- Contract `business-context.md`: question line format `N. <question> Owner: <role>, by <date>`, the meet-again line, the exact-match reuse rule.
- `packages/registry-lint` started with the view checks (`npm run lint:registry -- views`): header shape, renamed once, sources line equals tables read, every join on the joined table's full key from `sources/`, no aggregate/window/GROUP BY/WHERE in a fact view, RLS line matches the policy file, one raw column one business name across views. Sample world is the PASS fixture. `/build-model draft` runs it as step 10, before the graph rebuild. The registry, acceptance, policy and spec rules are still not implemented; the runner says so.
- `npm test` at the root runs every workspace's tests; CI job `packages` runs them.
- Diagrams: `docs/workflow-diagram.html` (dark, one flow, the two question loops and the proof loop) and `docs/workflow-phases.html` (light, four phases). In the phases file a card is a step and its outputs are a muted footer inside the card, never cards of their own; loops run in a side lane or over the top of the panels, and a label is only ever placed on empty canvas. Its script computes the canvas size and writes it to `@page` and to `data-size` on `.world`. Exports by headless Chrome: read the size with `--dump-dom | grep data-size`, then `--headless=new --hide-scrollbars --window-size=W,H --screenshot=...` and `--no-pdf-header-footer --print-to-pdf=...`. Chrome renders `box-shadow` as a hard rectangle, so the cards have none.
- Confluence drafts in `docs/confluence/`: `workflow-team.md` (the whole team: the goal, the words, each phase as goal plus a who/in/out/template table plus steps, the asks, the rules, where we are, next actions) and `workflow-leadership.md` (the short version). Four phase names used everywhere: discovery (the tables and the ask, each with its question loop), modeling, design, build and ship.

## Not done
0. `/import-schema` and `/business-context` have not been run on a real input yet. The sample `docs/sample/dashboards/cashboard/business-context.md` predates the checker and would fail it (reworded cells); it is read by nothing. `/import-schema` Expect header synonyms and FK shapes to need adding in `packages/import-schema/src/recognise.js` and `src/fk.js`, each with a fixture row.
0b. Portal (2026-09-07): `build-graph.mjs` now also reads `bi_model/*.sql` headers, so a view drafted at step 3 shows in the Model Explorer with a `draft` badge until the dictionary lists it. Verified with a throwaway view; tsc clean.
1. The app: `docs/architecture.template.html`, then `node docs/build-architecture.js`. **Moved to the bank machine on purpose.** Spec: `docs/HANDOFF-architecture-app.md`; content: `docs/steps.js`.
2. Contract gaps still open (none blocks a demo):
   - spec.md: say "status BLOCKED iff `blocked:` is non-empty" (a dimension mismatch keeps the kpi bound but adds a blocked entry).
   - kpi-registry.md: add `rls_exempt` field + lint rule; say whether the business-context "Compare to" column uses the registry tokens or plain words normalised at step 3.
   - rls-policies.md vs lint rule 7: policy required for every view in bi_model/ (stricter rule wins); consider a machine-visible `status: stub` for policy stubs.
   - CONVENTIONS.md: header `proof:` line may read `(pending)` on draft branches; lint and /data-dictionary must accept it.
   - WORKFLOW/detection: nothing records which sources a dashboard depends on beyond section 5; PR-open detection needs `gh` (a registry status IN_REVIEW would remove it).
   - ci.yml passes `--readonly` that nothing defines. Kit component names (DataTable, StackedBar, Donut) need confirming against the kit's design.md. `page.spec-hash` location should be in apps/portal/README.md. semantic-query README should say how `compare` maps to `period`.
