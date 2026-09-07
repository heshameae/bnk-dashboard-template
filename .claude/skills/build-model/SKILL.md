---
name: build-model
description: Draft the clean tables, DRAFT recipes and proof pack for a dashboard (step 3), or, once a data engineer has run the proofs, finalize them and open the PR (step 5).
disable-model-invocation: true
---

# /build-model

Turns a business context plus the source files into clean tables (`bi_model/*.sql`), DRAFT recipes (`catalog/kpi-registry.yaml`) and the evidence that they are right. Two modes with a real boundary between them: a data engineer runs the proofs (step 4).

- **draft** proposes. It writes the views, the DRAFT recipes, one proof query per view, and a policy stub. Nothing runs against a database.
- A data engineer runs each proof query read-only and pastes the numbers into `bi_model/proofs/<view>.md`.
- **finalize** judges. It reads those numbers, sends any failed view back to draft, runs the two checklists and lint, and opens the PR.

## Run it
- `/build-model draft <dashboard>`: read [`draft.md`](draft.md) and follow it.
- `/build-model finalize <dashboard>`: read [`finalize.md`](finalize.md) and follow it.
Anything else: print these two lines and stop.

## Reads
- `dashboards/<dashboard>/business-context.md` (contract: `docs/contracts/business-context.md`)
- `sources/*.yaml` (contract: `docs/contracts/sources.md`)
- `bi_model/*.sql`, `bi_model/proofs/*`, `catalog/kpi-registry.yaml`, `security/rls-policies.yaml`

## Writes
- `draft`: `bi_model/<view>.sql`, `bi_model/proofs/<view>.sql`, DRAFT entries in `kpi-registry.yaml` (creating the file on the first dashboard), policy stubs in `rls-policies.yaml`, and the portal graph.
- `finalize`: header fixes in `bi_model/<view>.sql`, the PR body. Files only; the database is never written.

## Rules for both modes
- Every database access is read-only and only through a configured read-only account. Without one, the proof pack is the only way to touch data, and a data engineer runs it.
- A recipe names exactly one clean table and never joins. Joins and renames live in the view (`docs/CONVENTIONS.md`, "The one-view rule").
- Every view carries the six-line header from `docs/CONVENTIONS.md`, in order. A view without it is not a draft; it is a bug, because `/data-dictionary` and lint read the header.
- Reuse first: a CONFIRMED recipe or an existing view that already answers a row is referenced, never duplicated. Two definitions of one number is the failure this repo exists to prevent.
- Every number traces to one row of the business-context numbers table. A number that appears in nothing the business wrote is a question for the owner, not a recipe.

## After it
Nothing runs. After `draft`, the user sends the proof queries to a data engineer. After `finalize`, the user shares the PR's Catalog preview with the business owner, who confirms each DRAFT recipe; the user merges only when every recipe on the page is CONFIRMED.
