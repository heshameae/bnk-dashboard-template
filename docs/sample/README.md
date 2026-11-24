# Sample world

Three dashboards with arbitrary values, so every file shape can be seen filled in:

- **Cashboard** (`dashboards/cashboard/`): carried part-way through the flow and stopped. One widget has no recipe and one recipe is still DRAFT, so its spec is BLOCKED and verify fails. It shows what a stopped dashboard looks like. The portal does not show it.
- **Daily balances** and **Branch balances** (`dashboards/daily-balances/`, `dashboards/branch-balances/`): published. Every number reuses a CONFIRMED recipe the Cashboard introduced, so they went from step 2 straight to step 8, and verify passed. They show the end of the flow, and they are what the portal lists. Same tree as the repo root. No skill reads anything in here; the skills read the real folders at the root, which start empty.

To see the portal with this data instead of the empty repo: `npm run portal-data -w @bank-dashboards/portal -- --sample` and `npm run graph -w @bank-dashboards/portal -- --sample`, then `npm run dev -w @bank-dashboards/portal`. Run both scripts without the flag to go back to the real files.

Delete this folder once a real dashboard has been through the flow and the real files show every shape.
