# Recipe review: what the machine checks and what you check

`registry-lint` (CI) enforces the eight rules in `docs/contracts/kpi-registry.md`. They are about form: the column exists, the class fits the grain, the ratio has the right shape, nothing required is blank.

You check truth. Three boxes in the PR template, one recipe at a time:
- [ ] `meaning` is the business's sentence from business-context §3, unchanged.
- [ ] The view's grain sentence is true for this recipe's aggregation class (a balance on a snapshot view is `balance-last-day`; a fee on a flow view is `additive`).
- [ ] `excludes` is a decision the owner made, in words, and the `filters` implement exactly that.

A recipe that passes both is DRAFT until the business owner confirms it on the Catalog page (step 6).
