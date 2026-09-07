---
name: spec
description: Step 9 — bind the design export to recipes and write dashboards/<name>/spec.yaml (READY or BLOCKED)
disable-model-invocation: true
---

# /spec — the contract

Turns the design export into the pivot artifact: one widget per kit component, each bound to exactly one recipe by id. Once this file exists the design export is never read again.

## Arguments
`/spec <dashboard>` — the folder name under `dashboards/`.

## Reads
- `dashboards/<name>/design-export/` — every kit component and its props: `kpi`, `by`, `range`, `sort`, `show`, `onClick`, `label`.
- `catalog/kpi-registry.yaml` — recipe `id`, `status`, `meaning`, `dimensions`, `compare`.
- `catalog/data-dictionary.yaml` — the views and columns that are live.
- `docs/contracts/spec.md` — the file shape and rules. Read it before writing.

## Writes
- `dashboards/<name>/spec.yaml`. Nothing else changes; blocked items are recorded here, never fixed here.

## Steps
1. List every kit component in the export in document order with all its props. Done when the number of rows equals the number of components and each row shows the component name and every prop it carries.
2. Assign widget ids `w1, w2, …` in document order and a `kind` from the kit map: `KpiCard → kpi-card`, `LineChart → line`, `BarChart → bar`, `DataTable → table`, `StackedBar → stacked-bar`, `Donut → donut`. Done when every widget has an id and a kind listed in `docs/contracts/spec.md`; a component outside the map becomes a blocked entry with `needs: "kit component <X>"`.
3. Bind `kpi`. A `kpi` prop equal to a registry id binds to it. A `label` prop binds only when it equals a registry `id` or a registry `meaning` character for character; every other label yields `kpi: null` with `designer_label: <label>`. A label that merely resembles a recipe stays null: the human decides in step 8. Done when every widget has either an id that exists in the registry or `kpi: null` + `designer_label`.
4. Validate dimensions. Every widget `by` and every page-level filter dimension must appear in the bound recipe's `dimensions`; copy `range`, `sort`, `show` as given. A mismatch keeps the binding and adds a blocked entry `needs: "dimension <col> on <kpi.id>"`. Done when each `by` and each filter dimension is either listed in its recipe's `dimensions` or has a blocked entry.
5. Interactions: each `onClick="filter"` on a widget that has a `by` becomes `{ click: <id>, sets_filter: <by> }`. Done when the interactions count equals the count of `onClick` props.
6. Write `blocked:` — one entry per null-kpi widget and one per dimension mismatch: `{ widget, needs, back_to: 3 }`. Set `status: BLOCKED` when `blocked:` is non-empty, else `READY`. Done when every blocked entry names a widget that exists and status matches the list.
7. Write `dashboards/<name>/spec.yaml` and run `npm run lint:registry`. Done when lint exits 0.
8. Print the binding table for one-pass confirmation — columns: widget · component · recipe · by · compare (from the recipe) · status (READY / DRAFT recipe / BLOCKED) — then ask one yes/no question per BLOCKED row: "new recipe (back to step 3) or design change (back to step 8)?" Record each answer as a comment on its blocked entry. Done when the human has said yes to the table and every BLOCKED row carries an answer.

## Stops when
- `dashboards/<name>/design-export/` is missing or holds no kit component → "run step 8 first".
- `catalog/data-dictionary.yaml` is missing → "step 7 has not run; the views are not live".
- A bound recipe has `status: RETIRED` → blocked entry `needs: "replacement for <id>"`.
- Lint fails → fix the spec. The registry and the views are never edited from this skill.

## Hands over to
Step 10, `/build <dashboard>` (you + Claude), when status is READY. Each BLOCKED item goes to step 3 (`/model draft`, a new recipe) or step 8 (a design change) as answered; READY widgets can be previewed meanwhile.
