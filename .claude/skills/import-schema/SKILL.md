---
name: import-schema
description: Turn the data team's dictionary and table profile into one sources/<TABLE>.yaml per raw table, with a gap report.
disable-model-invocation: true
---

# /import-schema

Step 1 of `docs/WORKFLOW.md`: file the data team's handover as one `sources/<TABLE>.yaml` per raw table so `/model` can read grain, keys and dates without guessing. Contract: `docs/contracts/sources.md`.

## Arguments
`/import-schema <path or pasted text>` — a folder, a file, or text pasted into the prompt. Any format the data team uses: an `ALL_TAB_COLUMNS` CSV, a stats export (`NUM_ROWS`, `NUM_DISTINCT`, min/max dates), a constraints export, a Word or markdown profile. `/import-schema <TABLE>` re-files one table from the same handover folder.

## Reads
- The handover material given in the argument.
- Existing `sources/*.yaml`, to update rather than duplicate.
- Oracle metadata (`ALL_TAB_COLUMNS`, `ALL_CONSTRAINTS`, `ALL_CONS_COLUMNS`, `ALL_TABLES`, `ALL_TAB_COL_STATISTICS`) only when a read-only account is configured; every query is a `SELECT` on catalog views. Row data is read only through the proof queries in `docs/proofs.md` §1, and only on that read-only account. Say which of the two modes is active in the first line of output.

## Writes
- `sources/<TABLE>.yaml`, upper-case table name as in Oracle, one file per table.

## Steps
1. Inventory the handover: list every table it mentions and which facts it carries per table (columns, types, nullability, comments, keys, row count, distinct counts, date range, last load). Completion: a table × facts matrix printed, with a dash for every fact the handover lacks.
2. For each table write the YAML in the contract's field order. Copy `description` from the data team's comment; a blank comment becomes `description: ""`. Copy every column in their order with their type. Completion: every column in the handover appears in the file; no column has an invented description.
3. Set `grain` and `key`. `grain` is the data team's sentence, starting "one row per"; when they gave none, write the sentence the `key` implies. The counts prove it: `profile.rows` equal to `profile.distinct_key` means the sentence is true. Unequal counts mean the `key` is wrong, so try the key the data team's own uniqueness constraint implies, and record what you tried in `notes`. Completion: every file has `grain` and `key`, and either the two counts are equal or `notes` says which counts came back and what is unexplained.
4. Fill `profile` with the numbers given, dated with `profiled_at`. Omit a missing number; never estimate or zero it. Completion: every number in the file traces to a line in the handover.
5. Fill `relationships` from constraints (`status: proven`) or from the data team's words (`status: stated`). Completion: every FK in the handover appears; every stated join is marked `stated`.
6. Print the gap report. Completion: the four lists below are printed, each possibly empty, followed by the ask when any list is non-empty.
   - tables whose `profile.rows` and `profile.distinct_key` are absent or unequal
   - tables without a `key`
   - tables with a date column but no `date_min`/`date_max`
   - tables whose `last_load` is older than their `refresh` allows, or missing
   Then the four-item ask from `docs/contracts/sources.md`, addressed to the data team, listing only the items still missing.

## Stops when
- The handover names a table but carries no column list for it: write nothing for that table, list it in the gap report.
- A read-only account is not configured and the user asks to "just query it": stop and print the ask instead. Row access outside the read-only account is an incident (`CLAUDE.md`).

## Hands over to
Step 2 (`/business-context`) for a new dashboard, or step 3 (`/model draft`) when the business context already exists. A table whose counts are absent or unequal is unusable by `/model` until the data team answers.

Example, marked as such: the sample world's `sources/CBS_ACCT_BAL_DLY.yaml` shows a fully proven file.
