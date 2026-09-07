# bank-dashboards

The bank's BI platform: clean tables + recipes, built as text in git. Only two things run: Oracle runs SQL, React shows charts. Everything else here is text that tells those two what to do.

## Where you are in the flow
Type `/ask-leap-bi <dashboard>` at any time: it reads the files that exist and names the current step and the skill to run. The eleven steps, their owners and the file each one hands over are in `docs/WORKFLOW.md`.

## Rules that stop the build
- Every database access from this repo is READ-ONLY (`SELECT`, metadata). Views reach Oracle only through the DEs' pipeline from `bi_model/` after a merged PR. A write from a session is an incident.
- A recipe (`catalog/kpi-registry.yaml`) names exactly one clean table and never joins. Joins and renames live in `bi_model/*.sql` only.
- A change the business asks for is an edit to `dashboards/<name>/spec.yaml` or a recipe. Generated code under `apps/portal/src/dashboards/` is never edited by hand.
- A missing recipe, a missing RLS policy, or a missing acceptance value stops the build. Fail closed, then name the step to go back to.
- One home per concern: joins in the view, meaning in the recipe, layout in the spec, who-sees-what in `BI_SECURITY.ENTITLEMENTS`, which-column-per-role in `security/rls-policies.yaml`, finance's number in `catalog/acceptance.yaml`. A definition never carries its own evidence: views are proven in `bi_model/proofs/`, recipes in `catalog/acceptance.yaml`.

## File contracts
Every file a step hands over has a contract in `docs/contracts/`. Read the contract before writing the file; the skills do.

## Sample world
`dashboards/cashboard/` and the `CBS_*` sources are a worked example. Nothing in the skills or packages may assume those names.
