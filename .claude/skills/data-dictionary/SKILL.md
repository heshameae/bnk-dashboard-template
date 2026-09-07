---
name: data-dictionary
description: Regenerate catalog/data-dictionary.yaml from the live BI_MODEL schema or from view SQL text — step 7, run by CI after the DEs' pipeline deploys bi_model/.
disable-model-invocation: true
---

# /data-dictionary

The only writer of `catalog/data-dictionary.yaml`: the clean tables as they are live. Shape and rules: `docs/contracts/data-dictionary.md`. Header format: `docs/CONVENTIONS.md`. Every database access is a `SELECT` on `ALL_*` metadata through the read-only account.

## Arguments
`/data-dictionary [--source BI_MODEL|static]`
- `BI_MODEL`: column facts come from Oracle metadata. Default when a read-only connection is configured.
- `static`: no connection; column facts are parsed from the view SQL text. The output file records which one ran.

## Reads
- `bi_model/*.sql` — the six-line header gives `grain`, `rls`, `sources`, `refresh`, `proof`; the SELECT list gives column order.
- `bi_model/proofs/<view>.md` — the `grain` row feeds `grain_proof`.
- `catalog/kpi-registry.yaml` — computes `used_by`.
- `security/rls-policies.yaml` — the header's `RLS:` must equal the policy entry.
- `sources/<TABLE>.yaml` — column types in `static` mode.
- Oracle `ALL_TAB_COLUMNS`, `ALL_COL_COMMENTS` for owner `BI_MODEL`, in `BI_MODEL` mode.

## Writes
`catalog/data-dictionary.yaml`, replaced wholesale: keys in the contract's order, views sorted by name, columns in SELECT-list order.

## Steps
1. Pick the source. `BI_MODEL` when a read-only DSN is configured (env `ORACLE_READONLY_DSN` or the CI secret), else `static`. Done when the first line of output says which.
2. Parse every header. Each `bi_model/*.sql` yields the six lines `view`, `grain`, `RLS`, `sources`, `refresh`, `proof`, in that order, then the `CREATE OR REPLACE VIEW` body. Done when every file yields all six; a file short of six goes to Stops.
3. Cross-check RLS. For every view, the header's `RLS:` column (or `none`) equals `policies.<view>.column` in `rls-policies.yaml`. Done when every view matches; a mismatch or a missing entry goes to Stops.
4. Collect columns. `BI_MODEL`: `SELECT column_name, data_type, data_length, data_precision, data_scale, nullable FROM all_tab_columns WHERE owner = 'BI_MODEL' AND table_name = :view ORDER BY column_id`, plus comments. `static`: each `expr AS alias` in the SELECT list gives `name: alias`; `from: <TABLE>.<COLUMN>` when the expression is one qualified column (type copied from `sources/<TABLE>.yaml`), else `from: derived`. Done when every view's `columns` length equals its SELECT-list length.
5. Attach the proof. Copy the `grain` row's left and right values and the run date from `bi_model/proofs/<view>.md` into `grain_proof`. Done when every view whose header names a proof file has `grain_proof`; a missing proof file is listed in step 7's summary.
6. Compute `used_by`. For every view, every recipe id whose `view` equals it, in registry order, `RETIRED` recipes excluded. Done when every view has a `used_by` list (empty is valid).
7. Write and diff. Write the file with `generated_at` (ISO 8601 with offset) and `source`. Diff against the committed version and print: views added / changed / removed; per changed view, columns added / removed / type-changed, and any `rls` or `grain` change; views live in `BI_MODEL` with no file in `bi_model/` as "undocumented, excluded". Done when the file is written and the summary is printed ("no changes" counts).

## Stops when
- A header line is missing or out of order → name the file and the line; write nothing.
- The header's `RLS:` differs from `rls-policies.yaml`, or the view has no policy entry → name the view and both values; write nothing; say `run /rls <view>`.
- A view in `bi_model/` is absent from `BI_MODEL` under `--source BI_MODEL` → write nothing; the deploy has not happened (step 7 is the DEs' pipeline).
- A recipe in `used_by` names a column the view does not expose → name recipe and column; write nothing.

## Hands over to
Step 8 (You: design the page). The Catalog page and `/spec` read the new dictionary; the registry rendered on that page is the KPI list the designer picks from.
