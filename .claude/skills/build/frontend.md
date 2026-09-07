# /build frontend <dashboard>

Generates the portal page from the spec with the chart kit. Layout, filters and interactions come from `spec.yaml`; numbers arrive through semantic-query at runtime; appearance belongs to the kit.

## Reads
- `dashboards/<name>/spec.yaml`: the only description of the page
- `catalog/kpi-registry.yaml`: `meaning`, `format`, `compare`, `status` for labels and badges
- `apps/portal/README.md` and the kit's `design.md`: the component API

## Writes
- `apps/portal/src/dashboards/<name>/`: `index.tsx`, `widgets.ts` (the spec as a typed object), `page.spec-hash` (sha256 of the spec used; `/verify` compares it)

## Steps
1. Map every widget `kind` to a kit component: `kpi-card → KpiCard`, `line → LineChart`, `bar → BarChart`, `table → DataTable`, `stacked-bar → StackedBar`, `donut → Donut`. Done when every widget has a component.
2. Generate `index.tsx`: a `Page` with `title`; a `Filters` component listing the spec's filter dimensions; one component per widget in spec order carrying `kpi`, `by`, `range`, `sort`, `show`; a `draft` badge prop on widgets whose recipe is DRAFT; a placeholder card per `blocked:` widget showing `designer_label` and `needs`. Each component asks semantic-query for its recipe at runtime. Done when the widget count in the file equals the spec's and `grep -ri "select\|sum(\|count(" apps/portal/src/dashboards/<name>/` returns nothing.
3. Wire interactions: each `{ click, sets_filter }` becomes the kit's `onSelect` on that widget, setting the page filter. Done when the interaction count in the file equals the spec's.
4. Write `page.spec-hash`. Done when it equals `shasum -a 256 dashboards/<name>/spec.yaml`.
5. Start the dev server and print the dev URL plus the preview checklist for the business: one line per widget: id, what it shows in the recipe's `meaning` words, split by, comparison, and `DRAFT: number not yet confirmed` where applicable: ending with "Ask for changes by describing the widget; every change is a spec edit and a rebuild." Done when the checklist has one line per widget.

## Stops when
- `page.spec-hash` already equals the current spec hash and no `--force` was given → nothing to rebuild; print the dev URL.
- A `kind` has no kit component → name it; a kit change, not a spec change.
- A generated file lacks its `GENERATED` header or differs from a fresh generation (someone edited it) → regenerate from the spec and say which file was overwritten.

## After it
Nothing runs. The business previews on the dev URL. Every requested change is a spec edit, then `/build frontend <dashboard>` again. When the preview is accepted the user runs `/verify <dashboard>`.
