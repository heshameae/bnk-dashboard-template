# portal

React app. Read-only. The shell is modelled on Vercel's dashboard and built on one design system, `src/ds/` (see its README). Every screen is made from its components and tokens.

## What is built

| Page | Route | State |
|---|---|---|
| Dashboards (home) | `#/` | Built. Search, filter, grid or list, and recently opened. |
| One dashboard | `#/d/<name>` | The frame only: title, state, owner, refresh, blocked and draft notices, and the slot the dashboard's own app loads into. Dashboards are separate apps; their pages are not designed here. |
| Analytics | `#/analytics`, `#/analytics/<name>` | The layout only. Pick a dashboard, then viewers, views and return rate over a date range, a chart, and breakdowns by role, person, filter, number and export. The row names are real; every count is empty because the portal does not record usage yet. |
| Catalog | `#/catalog` | Built, read-only. Every number in the owner's words, with Draft or Confirmed. Confirming from the portal is not wired; the business confirms on the pull request. |
| Access | `#/access` | Placeholder. The roles table is real; granting, people, requests and the audit log are not built. |
| Model Explorer | `#/model` | Built (Eng. team). Unchanged, now inside the shell. |

**View as.** The switch at the top of the sidebar stands in for sign-in until SSO is wired. It offers the Eng. team plus every role in `security/rls-policies.yaml`, and it changes navigation only: business viewers do not see Access or Model Explorer, and the catalog shows them only numbers on dashboards they can open. It never changes which rows anyone sees; that is RLS, in `packages/semantic-query` only. The rules are in `src/shell/access.ts`. Which role may open which dashboard is not decided yet, so every viewer sees every dashboard for now.

**Find.** Press F or ⌘K: dashboards, numbers and pages the viewer can open.

## Run it

```sh
npm install
npm run portal-data -w @bank-dashboards/portal   # rebuild src/data/portal.json (dashboards, catalog, roles)
npm run graph -w @bank-dashboards/portal         # rebuild src/data/graph.json (Model Explorer)
npm run dev   -w @bank-dashboards/portal         # http://localhost:5173
```

Add `-- --sample` to either data script to render `docs/sample/` instead of the repo's own files.

## What the shell reads

`scripts/build-portal.mjs` writes `src/data/portal.json`. Every input is optional; a field the files do not hold shows as "not given".

| What you see | Where it is read from |
|---|---|
| Dashboard title, audience, state, numbers, filters, blocked widgets | `dashboards/<name>/spec.yaml` |
| A dashboard with no spec yet ("In progress"), its title and owner | `dashboards/<name>/business-context.md` |
| "Live" rather than "In review" | `dashboards/<name>/verify.md` exists |
| "Refreshes ..." | the `refresh:` of the first clean table the dashboard's recipes read, in `catalog/data-dictionary.yaml` |
| Catalog meaning, status, owner, what it leaves out | `catalog/kpi-registry.yaml` |
| The "view as" roles and the Access roles table | `security/rls-policies.yaml` |
| "Data as of" | nothing yet: it needs the query service to read Oracle, so it says "not connected" |

## What the Model Explorer reads

Nothing in the app is typed by hand and nothing is fetched from Oracle. `scripts/build-graph.mjs`
reads four kinds of file and writes `src/data/graph.json`, which the app imports at build time. Every input is optional: on an empty repo the graph is empty. Pass `-- --sample` to render `docs/sample/` instead.

| What you see on screen | Where it is read from |
|---|---|
| The Sources tables, their grain, key and notes | `sources/<TABLE>.yaml` |
| Row counts, distinct keys, date range, last load, refresh | the `profile:` block of the same file |
| Column names, types, nullability, distinct counts, null percentages, meanings | the `columns:` list of the same file |
| Solid and dotted lines on the Sources graph | the `relationships:` list, with its `status:` |
| The BI model tables, their grain proof, RLS column and refresh | `catalog/data-dictionary.yaml` |
| A clean table drafted at step 3 but not deployed, shown with a `draft` badge | the six-line header of `bi_model/<view>.sql`, when the dictionary does not list it |
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
