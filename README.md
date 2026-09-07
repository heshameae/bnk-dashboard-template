# bank-dashboards

One repo for the BI platform's text: clean tables (`bi_model/`), the recipe book and finance's numbers (`catalog/`), access rules (`security/`), one folder per dashboard (`dashboards/`), the source handover from the data team (`sources/`), and the code that turns recipes into SQL (`packages/`) and pages (`apps/portal`).

Start with `docs/architecture.html` (open it in a browser; it is self-contained) for the interactive map, or `docs/WORKFLOW.md` for the table.

```
bank-dashboards/
  sources/                   step 1  · data team's dictionary + profile, one YAML per raw table
  dashboards/<name>/         steps 2, 8–11 · business-context.md, design-export/, spec.yaml, queries.sql, verify.md
  bi_model/                  steps 3–7 · clean tables as SQL views; proofs/ holds the evidence
  catalog/                   steps 3–7, 11 · kpi-registry.yaml (recipes), data-dictionary.yaml (generated), acceptance.yaml (finance)
  security/                  steps 5, 10 · rls-policies.yaml (roles + policies), test-users.yaml, entitlements.sql
  packages/semantic-query/   recipe + user → SQL with the RLS predicate (TypeScript)
  packages/registry-lint/    CI checks on recipes, policies and specs
  apps/portal/               React: Model Explorer · Dashboards · Catalog · Explore · Admin
                             Model Explorer is built; it reads sources/, catalog/ and
                             nothing else. See apps/portal/README.md.
  docs/                      contracts, templates (the form the business fills), review checklists, the RLS model, the app
  .claude/skills/            the Claude Code skills, one per step
```

Rebuild the app after editing any sample file: `node docs/build-architecture.js`.
