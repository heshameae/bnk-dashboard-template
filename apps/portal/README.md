# portal

React app. Read-only except the Admin tab's ENTITLEMENTS table.

- **Model Explorer** (built): the two layers of the model as a graph you can walk. `Sources` is the
  raw tables the DEs filed in `sources/*.yaml`; `BI model` is the clean tables in
  `catalog/data-dictionary.yaml` with the recipes that read them. Click a table for its grain,
  profile, relationships and what every column means.
- **Dashboards**: generated pages under `src/dashboards/<name>/` from `dashboards/<name>/spec.yaml`; every number comes through semantic-query.
- **Catalog**: `kpi-registry.yaml` and `data-dictionary.yaml` rendered; lineage raw table → clean table → recipe → dashboard; business confirms DRAFT recipes here (phase 1: the PR preview of the same page).
- **Explore**: drag a recipe and a dimension from one clean table; the same semantic-query, the same RLS.
- **Admin**: the "RLS portal". Grant and revoke entitlement values, maker-checker, audit log, view-as-user. Values are picked from the dimension's list, never typed.

## Run it

```sh
npm install
npm run graph -w @bank-dashboards/portal   # rebuild src/data/graph.json from the yaml
npm run dev   -w @bank-dashboards/portal   # http://localhost:5173
```

## What the Model Explorer reads

Nothing in the app is typed by hand and nothing is fetched from Oracle. `scripts/build-graph.mjs`
reads four kinds of file and writes `src/data/graph.json`, which the app imports at build time.

| What you see on screen | Where it is read from |
|---|---|
| The Sources tables, their grain, key and notes | `sources/<TABLE>.yaml` |
| Row counts, distinct keys, date range, last load, refresh | the `profile:` block of the same file |
| Column names, types, nullability, distinct counts, null percentages, meanings | the `columns:` list of the same file |
| Solid and dotted lines on the Sources graph | the `relationships:` list, with its `status:` |
| The BI model tables, their grain proof, RLS column and refresh | `catalog/data-dictionary.yaml` |
| Which source tables a clean table reads (the Reads panel) | the `sources:` list of that view |
| The recipes, their meaning, formula, filters, exclusions and owner | `catalog/kpi-registry.yaml` |
| CONFIRMED and DRAFT badges, and the banner that says a build is blocked | the `status:` of each recipe |

Re-run `npm run graph -w @bank-dashboards/portal` after any of those files change. Every
number, name and sentence on screen is a copy of something one of those files already says,
so the app can never disagree with the repo.

The one thing it derives rather than reads is the join between two clean tables. The data
dictionary records no view-to-view relationships, so `inferModelEdges` in
`src/model/graph.ts` proposes them from the two rules in `docs/CONVENTIONS.md`:
the same business word is the same column everywhere, and `dim_date` is the single calendar
that any date column joins. Those edges are drawn dashed and labelled `inferred` wherever they
appear, on the canvas and in the panel. They are joinable, not proven.

It reads nothing else. There is no database connection, no network call and no write path.

## Design

The chrome follows a workflow-editor pattern: a sidebar with a segmented layer switch, a canvas
of badged node cards on a dotted grid, a floating zoom dock, and a right-hand detail panel that
collapses to a pill. `src/styles/tokens.css` holds every colour, radius and shadow the app uses,
so the whole thing restyles from that one file.

The values in it were measured off a reference design rather than picked, which is why they look
arbitrary: a card is 14px and its chip is a 24px squircle at 30% radius, a type badge is white
under a 10% wash of its own hue, hover is a background change to `#f6f7f7` and never a shadow,
and the canvas is `#fbfbfb` behind a 1px dot on a 10px pitch. Change them in the token file, not
at the call site.
