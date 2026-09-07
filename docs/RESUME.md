# Resume note (updated 2026-09-07)

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

## Not done
0. `packages/import-schema`: the deterministic Excel/CSV parser behind `/import-schema`, with messy fixtures as tests. First code to write. Until it exists the skill reads CSVs (one per sheet) and validates its own output against them.
0b. Portal (2026-09-07): `build-graph.mjs` now also reads `bi_model/*.sql` headers, so a view drafted at step 3 shows in the Model Explorer with a `draft` badge until the dictionary lists it. Verified with a throwaway view; tsc clean.
1. The app: `docs/architecture.template.html`, then `node docs/build-architecture.js`. **Moved to the bank machine on purpose.** Spec: `docs/HANDOFF-architecture-app.md`; content: `docs/steps.js`.
2. Contract gaps still open (none blocks a demo):
   - spec.md: say "status BLOCKED iff `blocked:` is non-empty" (a dimension mismatch keeps the kpi bound but adds a blocked entry).
   - kpi-registry.md: add `rls_exempt` field + lint rule; say whether the business-context "Compare to" column uses the registry tokens or plain words normalised at step 3.
   - rls-policies.md vs lint rule 7: policy required for every view in bi_model/ (stricter rule wins); consider a machine-visible `status: stub` for policy stubs.
   - CONVENTIONS.md: header `proof:` line may read `(pending)` on draft branches; lint and /data-dictionary must accept it.
   - WORKFLOW/detection: nothing records which sources a dashboard depends on beyond section 5; PR-open detection needs `gh` (a registry status IN_REVIEW would remove it).
   - ci.yml passes `--readonly` that nothing defines. Kit component names (DataTable, StackedBar, Donut) need confirming against the kit's design.md. `page.spec-hash` location should be in apps/portal/README.md. semantic-query README should say how `compare` maps to `period`.
