---
name: model
description: Draft the clean tables, recipes and proof pack for a dashboard (step 3), or finalize them from the proof results and open the PR (step 5).
disable-model-invocation: true
---

# /model

Turns a business context plus the data team's source files into clean tables (`bi_model/*.sql`), DRAFT recipes (`catalog/kpi-registry.yaml`) and the evidence that they are right. Two modes, separated by a real boundary: a data engineer runs the proofs (step 4) between them.

## Arguments
- `draft <dashboard>` → read [`draft.md`](draft.md) and follow it. Step 3.
- `finalize <dashboard>` → read [`finalize.md`](finalize.md) and follow it. Step 5.
Anything else: print these two lines and stop.

## Reads
- `dashboards/<dashboard>/business-context.md` (contract: `docs/contracts/business-context.md`)
- `sources/*.yaml` (contract: `docs/contracts/sources.md`)
- `bi_model/*.sql`, `bi_model/proofs/*`, `catalog/kpi-registry.yaml`, `security/rls-policies.yaml`

## Writes
- `draft`: `bi_model/<view>.sql`, `bi_model/proofs/<view>.sql`, DRAFT entries in `kpi-registry.yaml`, policy stubs in `rls-policies.yaml`.
- `finalize`: header fixes in `bi_model/<view>.sql`, review answers in the PR body. Files only; the database is never written.

## Gates shared by both modes
- Every database access is read-only (`SELECT`, metadata) and happens only when a read-only account is configured. Without one, the proof pack is the only way to touch data, and a data engineer runs it.
- A recipe names exactly one clean table and never joins. Joins and renames live in the view (`docs/CONVENTIONS.md`, "The one-view rule").
- Every view carries the six-line header from `docs/CONVENTIONS.md`, in order. A view without it is not a draft; it is a bug.
- Reuse first: a CONFIRMED recipe or an existing view that already answers a KPI row is referenced, never duplicated.
- Every number the business will see traces to one row of business-context §3. A KPI that appears in nothing the business wrote is a question for the owner, not a recipe.

## Hands over to
- After `draft`: step 4, a data engineer, who runs `bi_model/proofs/<view>.sql` read-only and writes `bi_model/proofs/<view>.md` (`docs/proofs.md`).
- After `finalize`: step 6, the business owner, who confirms each DRAFT recipe on the Catalog page (PR preview). Merge happens only when every recipe on the page is CONFIRMED.
