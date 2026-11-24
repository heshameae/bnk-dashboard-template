# Sample world

Thirteen dashboards with arbitrary values, so every file shape can be seen filled in:

- **Cashboard** (`dashboards/cashboard/`): carried part-way through the flow and stopped. One widget has no recipe and one recipe is still DRAFT, so its spec is BLOCKED and verify fails. It shows what a stopped dashboard looks like. The portal does not show it.
- **Twelve published dashboards** (every other folder under `dashboards/`): spec READY, verify passed. They show the end of the flow, and they are what the portal lists. All their recipes read the one clean table, `v_balances_daily`. Some introduced a new recipe (the Recipe column says `new`). Others, like Daily balances and Branch balances, only reuse CONFIRMED recipes, so they went from step 2 straight to step 8. Every recipe they use has finance's number in `catalog/acceptance.yaml`. Same tree as the repo root. No skill reads anything in here; the skills read the real folders at the root, which start empty.

**Usage** (`usage/opens.csv`): made-up opens of the published dashboards, one row per open, up to 23 November 2026. Contract: `docs/contracts/usage.md`. It agrees with the rest of the sample: nobody opens a dashboard before its verify day, and every role is one in `security/rls-policies.yaml`. One dashboard is never opened, one is opened by a single person, and one stops being opened. The portal's Analytics page is counted from this file.

To see the portal with this data instead of the empty repo: `npm run portal-data -w @bank-dashboards/portal -- --sample` and `npm run graph -w @bank-dashboards/portal -- --sample`, then `npm run dev -w @bank-dashboards/portal`. Run both scripts without the flag to go back to the real files.

Delete this folder once a real dashboard has been through the flow and the real files show every shape.
