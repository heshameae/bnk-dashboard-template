# How a dashboard is made

*For the whole team: Eng. team, data engineers, business owners, design, finance, security. Updated 2026-09-08. The repo is the source of truth. This page is the readable copy of it.*

## The goal

The bank is leaving Tableau and Power BI. We are not rebuilding the same dashboards in a new tool. We are changing how a dashboard gets made.

The business writes what it needs on a form, in its own words. Those words become text files in git: which raw tables, what each number means, which clean table it reads, who may see which rows. Only two things run. Oracle runs SQL and React shows charts. Everything between them is a file that a procedure writes and a person confirms.

The test of the whole thing is simple. Pick any number on any screen and you can follow it back to a sentence the business wrote, a count the data team measured, and a value finance signed off. If you cannot, the build fails.

The diagrams `workflow-diagram.png` (the single flow with its loops) and `workflow-phases.png` (the same flow in four phases) live in `docs/` in the repo. Attach both here.

## The words we use

We use these words and no synonyms for them. The vocabulary is a skill in the repo, so Claude uses the same words we do.

| Word | Meaning | File |
|---|---|---|
| Source | A raw table as the data team hands it over: columns, key, joins as stated. A dashboard never queries a source. | `sources/<TABLE>.yaml` |
| Clean table | A saved query (an Oracle view) that renames the raw columns and joins the raw tables once. It stores nothing. | `bi_model/<view>.sql` |
| Grain | What one row means, such as "one row per account per business day". The key declares it. Counts prove it. | the header of every view and source |
| Recipe | The definition of one number: the business's sentence, one clean table, the formula, what to leave out. Every dashboard shares the same recipe book. | `catalog/kpi-registry.yaml` |
| Proof | Evidence kept beside the thing it proves. A view's proof is counts. A recipe's proof is finance's number. | `bi_model/proofs/`, `catalog/acceptance.yaml` |
| Policy | Which column of a clean table is restricted, and how, per role. | `security/rls-policies.yaml` |
| Entitlement | The values one person may see, such as their branches. Rows in Oracle, managed in the portal's Admin tab. | `BI_SECURITY.ENTITLEMENTS` |
| Spec | The contract for one page: which chart shows which recipe, split how. No formulas. | `dashboards/<name>/spec.yaml` |
| Skill | A written procedure the Eng. team runs with Claude, one step at a time. A skill reads files and writes files. Nothing is carried in a chat. | `.claude/skills/` |

## The four phases

Phase 1 has two halves. The tables come in once per source system. The ask comes in once per dashboard. Phases 2 to 4 happen once per dashboard, and each dashboard reuses the clean tables and recipes the ones before it built.

### Phase 1 · Discovery

Two inputs from two parties. Each has its own loop of questions and answers, and the phase is done when both loops are empty.

#### The tables

The goal is one file per raw table in git, with its columns, key and joins exactly as the data team stated them. Nothing we wrote, nothing we guessed.

| | |
|---|---|
| Who | The data engineers hand over. The Eng. team files it. |
| In | The schema export: one Excel workbook, or a folder of CSV files. A columns sheet (schema, table, column, type, PK flag, definition) and a keys sheet (table, PK list, FK text). Sheet names and header spelling do not matter. |
| Out | `sources/<TABLE>.yaml`, one per table. The export itself, unchanged and dated, under `sources/_handover/`. A report, `sources/_import-report.md`, with the questions for the data team. |
| Template | The two-sheet shape above. The parser's README in `packages/import-schema` lists every accepted header and FK spelling. |

Steps.

1. The data engineers send the export.
2. The Eng. team runs `/import-schema`. A parser reads the workbook and writes the files. No person and no model reads a cell. The export is filed under `sources/_handover/` with the date, so a year from now any value can be traced to the cell it came from.
3. A validator re-reads the filed export and every file and compares them. One PASS or FAIL line per check. A hand edit to any file fails it.
4. The report lists the questions: a key the two sheets disagree on, a join written in a way the parser could not read, a table with no key.

The loop. The data team answers by sending a corrected export, not an email. It is filed as a new dated handover and the import runs again. A typed answer has no cell to trace to, so it has nowhere to go.

Later, at phase 2, we ask the data team for row counts and distinct key counts per table, the date range, and either a read-only account on a replica or a named person to run proof queries.

#### The ask

The goal is one file per dashboard holding what the business asked for, sentence by sentence, unchanged.

| | |
|---|---|
| Who | The business owner fills the form. The Eng. team runs the skill. |
| In | The request form, filled. Or meeting notes, when the form was not used. |
| Out | `dashboards/<name>/business-context.md`. Its section 8 is the list of open questions, one per gap, each with an owner. |
| Template | `docs/templates/business-context-request.docx`. Eight sections and a numbers table: name, meaning in one sentence, compare to, break down by, what to leave out. A filled example sits beside it. |

Steps.

1. The Eng. team sends the form.
2. The business fills it in plain words. Where they are not sure they write "not sure". That is a valid answer.
3. The Eng. team runs `/business-context`. It sorts their sentences into the eight sections and copies them verbatim. It never rewords.
4. Every gap becomes a `?` cell: a blank, a "not sure", or an exclusion nobody stated. Every `?` gets a numbered question in section 8.
5. A checker proves the file. Every sentence in it appears in the input. The table is complete. Every `?` has a question. Section 8 has at most seven. A tidied sentence fails.

The loop. Section 8 goes back to the business. Their answers are saved as a dated notes file next to the form, in their words, and the skill runs again on form plus notes. The `?` cells fill and the questions drop out.

The recipe column. Each number is marked `new` or `reuse`. On the first dashboard everything is `new`, because no recipe exists yet. From the second dashboard on, a number reuses an existing recipe only when its sentence is identical, character for character. A close sentence is `new` plus a question to the business: same number, or different? The skill never decides that. I would rather ask one extra question than silently merge two numbers that turn out to differ.

### Phase 2 · Modeling

The goal is the clean tables and recipes one dashboard needs, proven by counts, confirmed by the business, and deployed by the data team. This phase is the factory. Everything after it is assembly.

| | |
|---|---|
| Who | The Eng. team drafts. The data engineers prove and deploy. The business confirms. Security reviews the policies. |
| In | The source files and the business context from phase 1. |
| Out | `bi_model/<view>.sql` per clean table. `catalog/kpi-registry.yaml` with one recipe per number. `bi_model/proofs/` with the queries and the counts. `security/rls-policies.yaml` with one policy per view. After deploy, `catalog/data-dictionary.yaml`, which describes what is live. |
| Template | The file shapes are contracts in `docs/contracts/`. The review checklists are in `docs/review/`. |

Steps.

1. `/build-model draft` reads the two phase 1 inputs. It proposes one clean table per subject at one grain, one DRAFT recipe per number, and one proof query per view. Nothing runs against a database.
2. A view lint checks every drafted view by code. The six-line header. Every raw column renamed once. Every join landing on the joined table's full key. No sums and no filters inside a view, because sums belong in recipes and a filter in a view drops rows silently. The security column exposed and matching the policy file. One business name per raw column across all views.
3. The proof queries go to the data engineers. They run each one read-only and paste three counts (grain, fan-out, conservation) into a result file beside the query. Days may pass here.
4. `/build-model finalize` reads the counts. A failed check sends that view back to the draft with the fix named. A passed one turns its recipes CONFIRMED and fills the review checklists.
5. `/rls` writes one policy per clean table: which column carries the restriction and how each role sees it. The policy is applied by the query layer at query time and nowhere else. Not in the view, not in the page.
6. A pull request carries the views, recipes, proofs and policies. CI runs the lint. Both teams review. The business owner reads each recipe on the PR's Catalog page and confirms it or corrects the sentence.
7. The data team's pipeline deploys the views into the `BI_MODEL` schema. CI writes the data dictionary. The portal's Model Explorer shows the model as a graph, raw tables to clean tables to recipes.

Where a calculation lives. If it can be worked out from one row alone (a flag from a status code, a product family from a code, a band from an amount) it goes in the view, once. If it adds, counts, divides or compares across rows, it is a recipe. An exclusion is never in a view. The view carries the flag and the recipe decides.

What stays with a human reviewer. One subject per view, and dates going through the calendar table. Everything else on the view checklist is checked by code first.

### Phase 3 · Design

The goal is a page design where every chart is bound to a confirmed recipe and nothing is invented on the page.

| | |
|---|---|
| Who | The business and the design team draw the page. The Eng. team writes the contract. |
| In | The recipe book, the data dictionary and the business context. The Catalog page in the portal shows the first two as one list: which numbers exist, and what each can be split by. |
| Out | `dashboards/<name>/design-export/` from Open Design. `dashboards/<name>/spec.yaml`, the contract. |
| Template | The spec shape is `docs/contracts/spec.md`. The chart kit is the design system's component list. |

Steps.

1. The page is drawn in Open Design, picking numbers from the Catalog. The design is exported into git.
2. `/spec` binds every chart to a recipe id and writes the spec: layout, splits, comparisons. No formula, column or view name may appear in it. The spec is READY, or BLOCKED. A blocked chart goes back to phase 2 when the number has no recipe, or back to the design when the kit has no such chart.

### Phase 4 · Build and ship

The goal is a live page where every number is finance's number and every viewer sees only their rows.

| | |
|---|---|
| Who | The Eng. team builds and ships. Finance supplies the acceptance values. Security owns the entitlements. |
| In | The spec and the design from phase 3. The recipes and the data dictionary from phase 2. Finance's values in `catalog/acceptance.yaml`. |
| Out | The page in `apps/portal`. `dashboards/<name>/queries.sql`, generated. `dashboards/<name>/verify.md`, the evidence. |
| Template | `docs/contracts/acceptance.md` for finance's file. |

Steps.

1. `/build` compiles the spec and the recipes into the page and its queries, and proves row-level security with two test users. The business previews it. Every change is an edit to the spec or a recipe and a rebuild. Generated code is never edited by hand.
2. Finance puts its value for each recipe, for one date, in the acceptance file.
3. `/verify` runs in CI on every change. It compiles each recipe for that date and compares. PASS means live.
4. At runtime every query goes through the query layer, `semantic-query`, which adds the row filter from the policy and the viewer's entitlements.

## What we need from each party

| From | What | When |
|---|---|---|
| Data engineers | The two-sheet schema export for the first source system | now |
| Data engineers | Row counts and distinct key counts per table, and the date range | phase 2 |
| Data engineers, security | A read-only account on a replica, or a named person to run proof queries | phase 2 |
| Business owner | The filled request form, then answers to the section 8 questions | phase 1 |
| Business owner | Fifteen minutes to read back and confirm each recipe on the PR | phase 2 |
| Design | The page drawn in Open Design over the Catalog | phase 3 |
| Finance | One signed-off value per number, for one date | phase 4 |
| Security | Review of the policy per clean table | phase 2 |

## The rules that stop the build

- Every database access from the repo is read-only, through a configured read-only account. A write from a session is an incident.
- A recipe names exactly one clean table and never joins. Joins live in views only.
- A change the business asks for is an edit to the spec or to a recipe. Generated code is never edited.
- A missing recipe, a missing policy or a missing acceptance value stops the build. It fails closed and names the step to go back to.
- One home per concern. Joins in the view. Meaning in the recipe. Layout in the spec. Who sees what in entitlements. Which column per role in the policy file. Finance's value in the acceptance file.

## Where we are

Phase 1 is formulated. The request form exists as a Word template with a filled example. The schema parser, its validator and the form checker are built and tested against messy fixtures, and both skills are written against their contracts. None of it has met a real export or a real form yet. The first run will find gaps, and the skills are written to be fixed when it does.

Phase 2 is where the work is now. We built the schema portal: the Model Explorer reads the source files and the recipe book from git and draws them as a graph, raw tables to clean tables to recipes. The view lint is built and tested. The draft and finalize skills are written. The open question is row-level security: how the policy is written per view, how the query layer applies it, and how security reviews it. We are working through the options before the first model is drafted, because a policy is harder to change once a view is live.

Phases 3 and 4 are designed and not started. Their skills and contracts are written. The query layer is a README. We build them after one real dashboard has been through phases 1 and 2, on purpose. A factory that has not made one real thing is a design, not a factory.

## Next actions

| Action | Owner | Waiting on |
|---|---|---|
| Send the two-sheet schema export for the first source system | Data engineers | nothing |
| Run `/import-schema` on it and send the report's questions back | Eng. team | the export |
| Send the request form to the first business owner | Eng. team | nothing |
| Fill the form for the first dashboard | Business owner | the form |
| Run `/business-context`, send section 8 back, run again with the answers | Eng. team | the filled form |
| Settle the row-level security approach | Eng. team, security | nothing |
| Run `/build-model draft` and send the proof queries | Eng. team | both halves of phase 1 |
| Run the proofs read-only and paste the counts | Data engineers | the proof queries |
| Name a read-only replica account or a proof runner | Data engineers, security | nothing |
| Confirm each recipe on the PR's Catalog page | Business owner | the PR |

## Where the files are

```
sources/            phase 1 · one YAML per raw table · _handover/ keeps every export as received
dashboards/<name>/  phases 1, 3, 4 · business-context.md · design-export/ · spec.yaml · queries.sql · verify.md
bi_model/           phase 2 · clean tables as SQL · proofs/ holds the queries and the counts
catalog/            kpi-registry.yaml (recipes) · data-dictionary.yaml (what is live) · acceptance.yaml (finance)
security/           rls-policies.yaml · test-users.yaml
packages/           import-schema · business-context · registry-lint · semantic-query (to build)
apps/portal/        the Model Explorer · other tabs to build
docs/               WORKFLOW.md · contracts/ (every file shape) · templates/ (the request form) · this page
```
