---
name: rls
description: Add or edit a row-level-security policy, the roles→SSO-groups mapping, or an exemption in security/rls-policies.yaml — step 5, and whenever access rules change.
disable-model-invocation: true
---

# /rls

Edits the rules of row-level security as text in git. The model (three nouns, four homes, the enforcement algorithm, the traps): `docs/rls.md`. The file shape and its rules: `docs/contracts/rls-policies.md`. Entitlement values (which person sees which branch) are rows in `BI_SECURITY.ENTITLEMENTS`, written by the portal's Admin tab; this skill writes rules only and points value requests there.

## Arguments
- `/rls <view>` — add or edit the policy entry for one clean table.
- `/rls roles` — edit the roles → SSO groups mapping.
- `/rls exempt <kpi>` — declare a recipe RLS-exempt (a bank-wide comparator), with an approver.

## Reads
`security/rls-policies.yaml` · `bi_model/<view>.sql` (header + SELECT list) · `catalog/data-dictionary.yaml` · `catalog/kpi-registry.yaml` · `security/test-users.yaml` · `docs/rls.md` · `docs/contracts/rls-policies.md`.

## Writes
`security/rls-policies.yaml` · the `-- RLS:` header line of `bi_model/<view>.sql` when it disagrees · `security/test-users.yaml` when a new dimension appears · `catalog/kpi-registry.yaml` (`rls_exempt: true`) for `exempt`.

## Steps — `/rls <view>`
1. Classify the view from its SELECT list. A column identifying a customer, an account or an amount (ids, balances, transactions) makes the view **restricted**: it needs a `column`. Reference or calendar data only: `column: none` with a `reason` in words. Done when the classification and the deciding columns are printed.
2. Choose the column. Restricted view: the column the bank grants access by (the branch or unit code), present in the SELECT list; an existing entry under `dimensions:` wins over a new one. Done when `column` names a SELECT-list column, or is `none` with `reason`.
3. Resolve every role. Each role under `roles:` gets `all`, `by_entitlement` or `none`. Copy the rules from an existing policy on a view of the same subject when one exists; otherwise ask at most three questions ("Which roles see every row of <view>?", "Which roles see only entitled values?", the rest are `none`). `default: none` always. Done when every role has a rule and `default: none` is present.
4. Register the dimension. `dimensions.<column>` has `values_from` (a dim view's key column that exists in `bi_model/`), `label`, and `parent` when a hierarchy exists (it lets the Admin tab grant by parent while storing leaf values). Done when the entry is present and its `values_from` view exists.
5. Align the header. The view's `-- RLS:` line equals the policy's `column`, or `none — <reason>`. Edit the header line when it differs. Done when both say the same thing.
6. Cover the test users. A new dimension gets entitlements in `security/test-users.yaml`: `test.branch.a` and `test.branch.b` disjoint, `test.region` a superset; `expect` keeps "A ≠ B; hq == unfiltered; none == no rows". Done when every dimension under `dimensions:` appears in the test users' entitlements.
7. Show the two SQL shapes for a recipe on this view: an entitled user (`AND <column> IN (:v1 …)`) and a role with `all` (no predicate), as in `docs/rls.md`. Done when both are printed.
8. Lint and note review. Run `npm run lint:registry`. Print the open questions for security in this order: SSO group names per role · the maker-checker pair per region · roles bank-wide besides head office and finance · VPD underneath (the DEs' call). Done when lint is green and the questions are printed with the note that CODEOWNERS requests review from security and the data owner.

## Steps — `/rls roles`
1. Print the current table (role · groups · note). Done when printed.
2. Apply the change; every role keeps at least one SSO group and a `note` describing its reach. Done when the table is rewritten.
3. Every policy still names each role or relies on `default`. Done when lint is green and the CODEOWNERS note is printed.

## Steps — `/rls exempt <kpi>`
1. The recipe exists and its view is restricted. Done when both are confirmed.
2. Ask for the approver (a role) and the reason. Done when both are given.
3. Write `{ kpi, approver, reason, since }` under `exemptions:` and `rls_exempt: true` on the recipe. Done when lint is green and the line "CI prints this exemption in every PR" is printed.

## Stops when
- `<view>` has no file in `bi_model/` → name it; `/model draft` comes first.
- A restricted view's SELECT list has no column the bank grants access by → stop; the fix is a widened view (step 3), never a policy of `all`.
- `values_from` for the chosen column cannot be named → ask once, then stop until answered.
- A `default` other than `none` is requested without a written approval named in the entry → keep `none`.
- The request is about values (who sees which branch) → point to the Admin tab and stop.

## Hands over to
Step 5 continues: `/model finalize` opens the PR with this file changed; CODEOWNERS routes review to security and the data owner. Enforcement is `packages/semantic-query` (step 10); proof is `/verify` (step 11).
