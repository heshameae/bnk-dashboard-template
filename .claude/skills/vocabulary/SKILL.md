---
name: vocabulary
description: The platform's words (clean table, recipe, grain, key, proof, fan-out, conservation, policy, entitlement, spec, acceptance), each defined once with the file that owns it. Use when one is used loosely, two are confused, or a new term is about to be coined.
---

# Vocabulary

One meaning per word, one home per meaning. When a conversation reaches for a synonym, use the word below instead; when it needs a word that is not here, that is a design question for the human, not a coinage.

| Word | Means | Home |
|------|-------|------|
| **Source** | A raw table as the data team hands it over: columns, key (declared), and later the profile counts that prove the key. Never queried by a dashboard. | `sources/<TABLE>.yaml` · `docs/contracts/sources.md` |
| **Clean table** | One SQL view per subject at one grain: renames once, joins once, stores nothing, holds no metric math. The only thing a recipe may name. | `bi_model/<view>.sql` · `docs/CONVENTIONS.md` |
| **Dimension** | A clean table that is one row per key and exists to be joined to or split by (`dim_*`). | `bi_model/dim_*.sql` |
| **Grain** | What one row is, as a sentence starting "one row per". The **key** is the grain as columns; equal `rows` and `distinct_key` prove it. | the view header · `docs/grain-and-joins.md` |
| **Fan-out** | Rows multiplied by a join to a table that is not one row per its key. The proof catches it; the fix is the join, never a DISTINCT. | `docs/grain-and-joins.md` |
| **Conservation** | The view's total equals the raw total for one day. Rows were neither dropped nor duplicated. | `docs/proofs.md` |
| **Proof** | Evidence beside the thing it proves. A view's proof is counts (`bi_model/proofs/`); a recipe's proof is finance's number (`catalog/acceptance.yaml`). | `docs/proofs.md` · `docs/contracts/acceptance.md` |
| **Recipe** | The definition of one number: meaning verbatim, one clean table, formula, aggregation class, exclusions. Confirmed once, shared by every dashboard. | `catalog/kpi-registry.yaml` · `docs/contracts/kpi-registry.md` |
| **Aggregation class** | How a recipe treats time: `additive` (sum the period), `balance-last-day` (last business day only), `ratio` (recomputed, never averaged). | `docs/contracts/kpi-registry.md` |
| **Catalog** | The folder of definitions and their evidence, and the portal tab that renders it. Nothing in it runs. | `catalog/` |
| **Acceptance** | Finance's number for a recipe on one date, with its source. Re-checked on every build. | `catalog/acceptance.yaml` |
| **Role** | A kind of reach (bank-wide, own region, own branches), mapped from SSO groups. | `security/rls-policies.yaml` → `roles` · `docs/rls.md` |
| **Policy** | For one clean table: the restricted column and, per role, `all`, `by_entitlement` or `none`. Missing policy means the table cannot be queried. | `security/rls-policies.yaml` → `policies` |
| **Entitlement** | The values one person may see for one dimension. Rows in Oracle, written by the Admin tab, never in git. | `BI_SECURITY.ENTITLEMENTS` · `security/entitlements.sql` |
| **Business context** | The ask in the business's own words, in fixed headings. The only place a number is born. | `dashboards/<name>/business-context.md` |
| **Spec** | The contract for one page: widgets bound to recipes by id, splits, comparisons, interactions. No formula, column or view name. | `dashboards/<name>/spec.yaml` · `docs/contracts/spec.md` |
| **Blocked** | A spec item with no recipe or a missing dimension, recorded with the step it goes back to. Never fixed in the spec. | `spec.yaml` → `blocked:` |
| **Step** | One of eleven, flat, one owner each. A handover is a file in git. | `docs/WORKFLOW.md` · `/ask-leap-bi` |

Two sentences that settle most confusions: only two things run, Oracle runs SQL and React shows charts, everything else is text in git. A definition never carries its own evidence.
