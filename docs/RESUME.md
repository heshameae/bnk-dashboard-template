# Resume note (updated 2026-09-04)

## Done
- Scaffold: CLAUDE.md, README.md, docs/WORKFLOW.md (11 steps), docs/CONVENTIONS.md, docs/rls.md, docs/proofs.md, docs/grain-and-joins.md, docs/review/*, docs/contracts/* (sources, business-context, kpi-registry, acceptance, spec, rls-policies, data-dictionary).
- Sample world (Cashboard): sources/CBS_*.yaml, bi_model/{dim_date,dim_branch,v_balances_daily}.sql + proofs/ (fact and dimension proofs), catalog/{kpi-registry,acceptance,data-dictionary}.yaml, security/{rls-policies,test-users}.yaml + entitlements.sql, dashboards/cashboard/{business-context.md, design-export/, spec.yaml, queries.sql, verify.md}, packages/*/README.md, apps/portal/README.md, .github/*.
- Ten skills in .claude/skills/: ask-leap-bi (the map + position detector), import-schema, business-context, model (SKILL + draft.md + finalize.md), data-dictionary, rls, spec, build (SKILL + backend.md + frontend.md), verify, and vocabulary (model-invoked; the one glossary).
- docs/steps.js: 11 steps x {owner, gets, does, hands over, rule, trap, skill, files, clarify[]} + 4 phases + the executive narrative.
- docs/build-architecture.js: reads steps.js + 23 sample files + every skill + 13 docs, injects `window.__DATA__` into the template. Verified against a stub template.
- docs/HANDOFF-architecture-app.md: the build spec for whoever builds the app.

## Decisions on 2026-09-04
- `semantic-model/` is now `catalog/` (the portal's Catalog tab renders it); `rls-policies.yaml` moved to `security/` beside the test users and the entitlements DDL.
- Recipes carry no numbers. Finance's value per recipe lives in `catalog/acceptance.yaml` (contract `docs/contracts/acceptance.md`), written only by `/verify`, owned by finance in CODEOWNERS. Lint rule 8 checks the row exists. The parallel is deliberate: views are proven in `bi_model/proofs/`, recipes in `catalog/acceptance.yaml`.
- `grain_status` and per-recipe `acceptance` are gone; `relationships[].status` (proven | stated) stays for now.
- business-context §3 has a `Recipe` column (`new` | `reuse kpi.<id>`); a dashboard whose rows all reuse goes from step 2 to step 8, and `/ask-leap-bi` detects it.

## Not done
1. The app: `docs/architecture.template.html`, then `node docs/build-architecture.js`. **Moved to the bank machine on purpose.** Spec: `docs/HANDOFF-architecture-app.md`; content: `docs/steps.js`.
2. Contract gaps still open (none blocks a demo):
   - spec.md: say "status BLOCKED iff `blocked:` is non-empty" (a dimension mismatch keeps the kpi bound but adds a blocked entry).
   - kpi-registry.md: add `rls_exempt` field + lint rule; say whether business-context §3 "Compare to" uses the registry tokens or plain words normalised at step 3.
   - rls-policies.md vs lint rule 7: policy required for every view in bi_model/ (stricter rule wins); consider a machine-visible `status: stub` for policy stubs.
   - CONVENTIONS.md: header `proof:` line may read `(pending)` on draft branches; lint and /data-dictionary must accept it.
   - WORKFLOW/detection: nothing records which sources a dashboard depends on beyond §5; PR-open detection needs `gh` (a registry status IN_REVIEW would remove it).
   - ci.yml passes `--readonly` that nothing defines. Kit component names (DataTable, StackedBar, Donut) need confirming against the kit's design.md. `page.spec-hash` location should be in apps/portal/README.md. semantic-query README should say how `compare` maps to `period`.
