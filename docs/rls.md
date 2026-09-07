# Row-level security: roles, policies, entitlements

One sentence: **the policy says which column, the entitlement says which values, semantic-query filters, verify proves it.** Oracle runs the same view for everyone; the WHERE clause is what differs per user.

## Three nouns

| Noun | Answers | Lives in | Who defines it | How many |
|------|---------|----------|----------------|----------|
| **Role** | what *kind* of reach a person has | `security/rls-policies.yaml` → `roles`, mapped from SSO groups | security + business owner, by PR | a handful (head_office, finance, region_head, branch_manager) |
| **Policy** | for one clean table: which column is restricted, and per role: `all`, `by_entitlement`, or `none` | `rls-policies.yaml` → `policies`, one entry per clean table | the view's data owner + security, by PR (CODEOWNERS) | one per clean table |
| **Entitlement** | which *values* of that column this person may see | `BI_SECURITY.ENTITLEMENTS`, an Oracle table | branch/region admins in the portal's Admin tab; approver signs | one row per user × dimension × value |

Roles and policies are text in git because they are rules, and rules are reviewed. Entitlements are rows in a table because they change weekly and must not need a deploy.

## How a query gets its filter (semantic-query, one function)
1. Read the user's groups from the SSO token → roles, via `roles` in the policy file.
2. Recipe → clean table → policy entry. No entry: refuse the query and log it.
3. `column: none` → no predicate.
4. Take the most permissive rule among the user's roles. `all` → no predicate. `by_entitlement` → `AND <column> IN (:v1 … :vn)` with the user's values from ENTITLEMENTS (cached ≤ 60 s, invalidated on write). No values → `AND 1 = 0`: no rows, never all rows. `none` → `AND 1 = 0`.
5. Write one audit line per query: user, kpi, view, rule, number of values, timestamp.

Two users, one recipe, one view, two different SQLs:
```sql
-- test.branch.a (branch_manager, entitled to DXB01)
SELECT SUM(balance_amount) FROM bi_model.v_balances_daily
WHERE snapshot_date = :last_business_day AND product_family = 'CASA'
  AND branch_code IN (:v1);                              -- :v1 = 'DXB01'

-- test.hq (head_office)
SELECT SUM(balance_amount) FROM bi_model.v_balances_daily
WHERE snapshot_date = :last_business_day AND product_family = 'CASA';
```

## Four homes, one job each
1. **Declare** (step 5): the view header `-- RLS: branch_code` and the policy entry. A clean table without both cannot be queried.
2. **Entitle** (Admin tab): values only, never rules. Maker-checker: one person grants, another approves. Values are picked from the dimension's own list (`dimensions.branch_code.values_from`), never typed. "All branches of region X" writes the branch rows, so the runtime stays a bound list. Every change is audited; revocation is live within 60 s. View-as-user for admins.
3. **Enforce** (step 10): semantic-query, one function, unit-tested. Not in views, not in React.
4. **Test** (step 11): CI runs every widget as `security/test-users.yaml`; user A ≠ user B on every restricted recipe, `test.none` gets no rows, `test.hq` equals the unfiltered total.

## Questions to settle with security and the DEs (write the answers into `rls-policies.yaml`)
- Which SSO groups exist today, and which role each maps to.
- Who approves entitlements per region (the maker-checker pair).
- Whether any role is bank-wide on balances (`all`) besides head office and finance.
- Whether Oracle also filters underneath: **VPD** (`DBMS_RLS.ADD_POLICY` on the `BI_MODEL` views, predicate function reading the same ENTITLEMENTS table through `SYS_CONTEXT`). It stacks safely with the app filter and must be re-applied on materialized views. Their call; nothing above changes if they say yes.
- An index on the RLS column of every big raw table (the four-item ask, item d).

## Two traps
- **Region vs branch grain**: entitlements are stored at branch level even when granted by region, so a manager moved between regions loses and gains the right branches without a rule change.
- **Bank-wide comparators** ("my branch vs the bank"): a branch manager's total is *their* total. A comparator is a separate recipe with `rls_exempt: true`, listed under `exemptions:` with an approver, printed by CI in every PR.
