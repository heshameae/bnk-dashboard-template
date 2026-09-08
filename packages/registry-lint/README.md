# registry-lint (runs in CI on every PR)

Checks the model as text and exits 1 on any failure, one line per check: `PASS <view>: <check> (<count>)` or `FAIL <view>: <check>: <what and where>`.

```
npm run lint:registry            # everything implemented
npm run lint:registry -- views   # the view checks only
```

## Views (implemented)
For every `bi_model/*.sql`, the lines of `docs/review/view-checklist.md` and `docs/CONVENTIONS.md` that code can decide. It reads the one shape the repo allows (six-line header, `CREATE OR REPLACE VIEW bi_model.<name> AS SELECT ... FROM ... JOIN ... ON ...`) and reports what it cannot read.

1. Header: six lines in order; `view` equals the file name; `grain` begins "one row per"; `proof` is `bi_model/proofs/<view>.md (<date>|pending)`.
2. Statement: `CREATE OR REPLACE VIEW bi_model.<file name> AS SELECT ... FROM ...`.
3. Every SELECT item has `AS <snake_case name>` and does not keep the raw column name. A raw column is renamed exactly once.
4. The header's `sources` line equals the set of tables in FROM and JOIN.
5. Every table read has a `sources/<TABLE>.yaml`, and every JOIN lands on the joined table's full `key` from that file. A join off the full key multiplies rows. RIGHT, FULL and CROSS joins fail.
6. A fact view (`v_*`) has no aggregate, window function, GROUP BY or WHERE: sums belong in recipes, and a filter in a view drops rows silently. A dimension view (`dim_*`) may use a window (a calendar derives flags) but no GROUP BY.
7. The `RLS` line names a column the view exposes, or `none, <reason>`; `security/rls-policies.yaml` has a matching entry.
8. Across views: one raw column (`TABLE.COL`) has one business name.

The checklist lines that stay with the reviewer: one subject per view, dates through `dim_date`.

## Not implemented yet
The rules in `docs/contracts/kpi-registry.md` (eight), `docs/contracts/acceptance.md`, `docs/contracts/rls-policies.md` and `docs/contracts/spec.md`, and the `exemptions:` print. The runner says so on every run.

## Tests
`npm test`. The sample world in `docs/sample/` is the PASS case; each test breaks one rule in a temporary copy and expects the line.
