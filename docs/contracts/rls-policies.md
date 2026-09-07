# Contract: `security/rls-policies.yaml`

Who may see which rows, as text in git. Three nouns: a **role** (a kind of reach), a **policy** (which column of a clean table is restricted, and how, per role), and an **entitlement** (the values one person may see, kept in `BI_SECURITY.ENTITLEMENTS`, never in this file). Read `docs/rls.md` for the model; this page is the file shape.

```yaml
roles:                                   # few. A role = one kind of data reach.
  head_office:    { groups: [GRP-BI-HQ],      note: "bank-wide" }
  finance:        { groups: [GRP-BI-FINANCE], note: "bank-wide, read-only" }
  region_head:    { groups: [GRP-BI-REGION],  note: "their regions' branches" }
  branch_manager: { groups: [GRP-BI-BRANCH],  note: "their branches" }

dimensions:                              # columns that can carry entitlements, and where valid values live
  branch_code:
    values_from: dim_branch.branch_code
    label: dim_branch.branch_name
    parent: dim_branch.region_code       # lets the Admin tab grant "all branches of region X"

policies:                                # one entry per clean table. Missing entry = the table cannot be queried.
  v_balances_daily:
    column: branch_code
    head_office: all
    finance: all
    region_head: by_entitlement
    branch_manager: by_entitlement
    default: none                        # any other role sees no rows
  dim_branch:
    column: none
    reason: "reference data; no customer or balance figures"
  dim_date:
    column: none
    reason: "calendar"
```

## Rules
- Every clean table in `bi_model/` has a policy entry, and `column` is a column of that view or `none` with a `reason`. The view header's `-- RLS:` line must match.
- A role's rule is one of `all`, `by_entitlement`, `none`. `default` is required and is `none` unless a written approval says otherwise.
- A user with several roles gets the most permissive rule among them (`all` > `by_entitlement` > `none`).
- `by_entitlement` with no rows in ENTITLEMENTS for that user and column yields no rows, never all rows.
- `groups` are the identity provider's group names as they appear in the SSO token. Changing a mapping is a PR reviewed by the CODEOWNERS of this file (security + the data owner).
- Exemptions (a bank-wide comparator on a restricted table) are a separate recipe with `rls_exempt: true` listed under `exemptions:` here with an approver; CI prints them in every PR.
