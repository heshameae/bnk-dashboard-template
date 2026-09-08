# bank-dashboards

Read this whole file before doing anything. It is short on purpose.

## What we are building

A **factory for dashboards**, not a dashboard. The bank is leaving Tableau and Power BI. What replaces them is a way of working: the business says what it needs in its own words, the model is written as text in git, and every number on every screen traces back to that text. The repo carries a sample dashboard (the Cashboard) whose values were filled in arbitrarily to show the file shapes. It proves nothing. The factory is proven by running a real dashboard through it end to end.

So when you are asked to work in this repo, you are almost always working on the **machinery**: a skill, a contract, a parser, the query compiler, the portal, a review gate. You are almost never hand-building a page or hand-writing a metric's SQL. If you find yourself doing either, stop and ask which piece of the machinery should have done it.

Only two things run: Oracle runs SQL, React shows charts. Everything else in this repo is text that tells those two what to do.

## The model, in two words

- A **clean table** is a saved query (an Oracle view, `bi_model/<view>.sql`) that renames the raw columns and joins the raw tables once. It stores nothing.
- A **recipe** is one number's definition (`catalog/kpi-registry.yaml`): which clean table, which column, how to add it up, what to leave out. It names exactly one clean table and never joins.

The rest of the vocabulary is in the `vocabulary` skill. Use its words; do not invent synonyms.

## The flow

Eleven steps, one owner each, every handover a file in git: `docs/WORKFLOW.md`. Type `/ask-leap-bi <dashboard>` to learn which step a dashboard is on and the exact next command. Skills are run by the user, one at a time; no skill ever invokes another.

**Phase one, the current focus:** get four steps working end to end on a real dashboard.

1. `/import-schema`: the data team's Excel (schema, table, column, type, PK flag, definition; plus a keys sheet with PK lists and FK text) becomes one `sources/<TABLE>.yaml` per table.
2. `/business-context`: the filled request form or meeting notes become `dashboards/<name>/business-context.md`.
3. `/build-model draft`: those two become clean tables, DRAFT recipes and a proof pack.
4. `npm run graph -w @bank-dashboards/portal`: the portal's Model Explorer renders the files.

Proofs, design, spec, build and verify come after phase one works. Do not build ahead of it.

## What is real and what is not

Be exact about this; it has caused confusion before.

| Piece | State |
|---|---|
| Ten skills in `.claude/skills/` | Written from the design. **None has been run on a real input yet.** Expect them to be wrong in places; fixing them is the work. |
| `docs/contracts/*` | The file shapes every skill reads and writes. The source of truth when a skill and a contract disagree. |
| `docs/sample/` | The **sample world**: one dashboard (the Cashboard) with arbitrary values, showing what every file looks like part-way through the flow. Same tree as the root. No skill reads it. The root folders `sources/`, `bi_model/`, `catalog/`, `security/`, `dashboards/` start empty and are filled only by the skills. |
| `apps/portal` | The Model Explorer is built and reads `sources/` and `catalog/` only. Dashboards, Catalog, Explore and Admin tabs are not built. |
| `packages/import-schema`, `packages/business-context` | Built, with tests. Step 1's parser and validator; step 2's `.docx` reader and checker. |
| `packages/registry-lint` | The view checks are built and tested (`npm run lint:registry -- views`). The registry, acceptance, policy and spec rules are not. |
| `packages/semantic-query` | README only. No code. `package.json` scripts and `.github/workflows/ci.yml` point at files that do not exist yet. |
| `docs/architecture.html` | Never built; `docs/HANDOFF-architecture-app.md` describes it. Superseded by the portal. |

There is no Oracle connection on this machine and none is assumed anywhere. The data team's Excel is the only source of truth about raw tables until they send counts.

## How to work here

- **Walk the first dashboard before trusting a step.** The registry, the dictionary, the proofs and the policies do not exist on day one. A step that reads a file must say what happens when the file is missing. When you write or edit a skill, run it in your head on an empty repo with only the Excel and the form, and fix what breaks.
- **Fix the skill, not the chat.** When a skill needs to be told something mid-run, that sentence belongs in the skill, with the reason, before the next run. Nothing is carried in a conversation.
- **Contracts before code.** A new file shape gets a contract in `docs/contracts/` first. A parser or skill is written against the contract, with the messy cases as tests.
- **Deterministic where it can be.** Reading the Excel, linting the registry, compiling a recipe to SQL, building the portal graph: code, with tests, not a model's judgment. The model's judgment is for proposing clean tables and recipes and for asking the business the right questions.
- **Dataset-agnostic.** Nothing in a skill, package or app may assume a table, column, recipe or dashboard name. `CBS_`, `cashboard`, `casa`, `branch_code` appear only in the sample world and in tests.
- **Their words.** Business meanings are copied verbatim, never paraphrased. The data team's definitions are copied verbatim, never written by us. A blank stays visibly blank (`""`, `?`, `not given`).
- **Plain writing.** No em dashes. No section-sign symbols; say "section 3" or "the numbers table". Short sentences, one idea each. Skills, contracts and docs are read by people who did not write them.

## Rules that stop the build

- Every database access from this repo is read-only (`SELECT`, metadata), and only through a configured read-only account. Views reach Oracle only through the data team's pipeline from `bi_model/` after a merged PR. A write from a session is an incident.
- A recipe names exactly one clean table and never joins. Joins and renames live in `bi_model/*.sql` only. A page may use many clean tables; a recipe may not.
- A change the business asks for is an edit to `dashboards/<name>/spec.yaml` or to a recipe. Generated code is never edited by hand.
- A missing recipe, a missing RLS policy, or a missing acceptance value stops the build. Fail closed and name the step to go back to.
- One home per concern: joins in the view, meaning in the recipe, layout in the spec, who-sees-what in `BI_SECURITY.ENTITLEMENTS`, which-column-per-role in `security/rls-policies.yaml`, finance's number in `catalog/acceptance.yaml`. A definition never carries its own evidence: views are proven in `bi_model/proofs/`, recipes in `catalog/acceptance.yaml`.
- Row-level security is applied in `packages/semantic-query` and nowhere else: not in views, not in a dashboard, not in React.

## Repo map

```
sources/            step 1 · one YAML per raw table; _handover/ keeps the data team's Excel as received (empty until step 1 runs)
dashboards/<name>/  steps 2, 8 to 11 · business-context.md, design-export/, spec.yaml, queries.sql, verify.md
bi_model/           steps 3 to 7 · clean tables as SQL; proofs/ holds the evidence
catalog/            kpi-registry.yaml (recipes), data-dictionary.yaml (generated), acceptance.yaml (finance)
security/           rls-policies.yaml, test-users.yaml, entitlements.sql
packages/           import-schema (step 1 parser + validator; built), business-context (step 2 docx reader + checker; built), registry-lint (view checks built; registry rules to build), semantic-query (recipe + user to SQL)
apps/portal/        React; Model Explorer built, other tabs to build
docs/               WORKFLOW.md, contracts/, templates/ (the form the business fills), review/, rls.md, proofs.md, CONVENTIONS.md, sample/ (the filled example, read by nothing)
.claude/skills/     one skill per step, plus ask-leap-bi (the map) and vocabulary
```

`docs/RESUME.md` lists known contract gaps. Read it before changing a contract.
