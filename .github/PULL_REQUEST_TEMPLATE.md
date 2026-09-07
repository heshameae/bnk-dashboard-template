## What this PR changes
<!-- one line per file family: bi_model/, catalog/, security/, dashboards/<name>/ -->

## Views (`docs/review/view-checklist.md`) — one block per view added or changed
- [ ] 1 grain sentence true (proof `grain` PASS, linked below)
- [ ] 2 one subject · [ ] 3 renamed once · [ ] 4 joins to dimensions only (`fan_out` PASS)
- [ ] 5 nothing dropped silently (`conservation` PASS) · [ ] 6 dates via dim_date · [ ] 7 no metric math
- [ ] 8 RLS line matches `rls-policies.yaml`

Proof file(s): `bi_model/proofs/<view>.md`

## Recipes (`docs/review/recipe-checklist.md`) — one block per recipe
- [ ] `meaning` is the business's sentence, unchanged
- [ ] grain sentence true for the aggregation class
- [ ] `excludes` is a decision, not a blank

## RLS
- [ ] policy entry exists for every new view (CODEOWNERS review requested automatically)
