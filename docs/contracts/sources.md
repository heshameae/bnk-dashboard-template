# Contract: `sources/<TABLE>.yaml`

One file per raw table, written at step 1 by `/import-schema` from the data team's schema export. It is the only description of raw data the rest of the repo reads.

A table's grain is **declared** by its key (the data team's primary key) and **proven** later, at step 4, when `profile.rows` equals `profile.distinct_key` for that key. A file without `profile` is declared, not proven. `/build-model draft` works from declared tables and marks every view and recipe that depends on one `unproven`. `/build-model finalize` (step 5) refuses to open the PR until the counts exist and are equal. Phase one (from 2026-09-07) starts every table as declared, because the export carries no counts.

```yaml
table: CBS_ACCT_BAL_DLY          # exact raw name, upper case as in Oracle
system: CBS                      # source system code
schema: RAW_CBS                  # Oracle schema the DEs expose (read-only)
description: "Daily ledger balance per account"     # data team's words; "" when they gave none
grain: "one row per account per calendar day"       # a sentence with 'one row per'; derived from key until the data team gives one
key: [ACCT_NO, BAL_DT]           # the data team's primary key
profile:                         # OPTIONAL until step 4: numbers the data team measured, with the date
  profiled_at: 2026-09-03
  rows: 48213977
  distinct_key: 48213977         # equal to rows: the grain sentence above is proven
  date_column: BAL_DT
  date_min: 2019-01-01
  date_max: 2026-09-02
  last_load: 2026-09-03T02:10:00+04:00
  refresh: "daily, 02:00, full day appended"
columns:
  - { name: ACCT_NO,      type: VARCHAR2(20),  nullable: false, description: "Account number" }
  - { name: BAL_DT,       type: DATE,          nullable: false, description: "Balance date (calendar)" }
  - { name: LDGR_BAL_AMT, type: NUMBER(18,2),  nullable: true,  description: "Ledger balance, account currency" }
relationships:                   # from the export's FK column, or from ALL_CONSTRAINTS when they send it
  - { column: ACCT_NO, references: CBS_ACCT.ACCT_NO, status: stated }   # stated = declared by the data team; proven = from constraints or a matched-count query
notes: "Weekends carry the Thursday balance forward."   # anything the data team said that a modeler must know, plus any FK text we could not parse
```

## The export, as the data team sends it

One workbook, two sheets. CSV twins of the same two sheets are accepted too.

**Sheet `columns`, one row per column:** schema name · table name · column name · data type · primary key (Y/N) · business definition. Optional extras that are used when present: nullable (Y/N), a table description.

**Sheet `keys`, one row per table:** table · PK columns list · FK. The FK cell is free text naming the joins.

Anything else on either sheet is kept in `notes`, never dropped.

## How `/import-schema` reads it

The reading is done by a deterministic parser (`packages/import-schema`), not by the model, so the same workbook always gives the same files. The parser's fixtures are messy real-shaped inputs, and every rule below is a test.

1. Identifiers are upper-cased and trimmed. A blank schema or table cell inherits the row above, which is what a merged cell looks like once exported.
2. `key` comes from the Y flags on `columns` and from the PK list on `keys`. When both exist they must agree. When they disagree the file carries the `keys` list and `notes` records the disagreement; the report lists it as a question.
3. FK text is parsed for these shapes: `COL -> TABLE.COL`, `COL references TABLE(COL)`, `COL = TABLE.COL`, `TABLE.COL`, and a comma-separated run of them. Anything else is kept verbatim in `notes` with no relationship written, and the report lists it.
4. A relationship that came from the export is `status: stated`. Only constraints or a matched-count query make it `proven`.
5. Types are kept as written with spacing normalised: `VARCHAR2 (20)` becomes `VARCHAR2(20)`.
6. A blank definition becomes `description: ""`. No description is ever written by us.
7. `grain` is the data team's sentence when they gave one, else the sentence the key implies: key `[ACCT_NO, BAL_DT]` gives "one row per ACCT_NO per BAL_DT", and the modeler rewrites it in business words at step 3.
8. A table on `keys` with no rows on `columns`: no file, one report line. A key or FK column that is not in the column list: the file is written, the report lists it. Duplicate column rows: the first wins, the report lists it.
9. Every value in a file traces to a cell. The report, `sources/_import-report.md`, has three lists: files written, tables skipped, questions for the data team. Re-running on a corrected workbook rewrites the files and the report.

## Rules
- `grain` is a sentence beginning "one row per". It is proven only when `profile.rows == profile.distinct_key` for the listed `key`. Unequal counts mean the `key` is wrong, not that the table is unusable: correct the key until they match, or say in `notes` what the extra rows are.
- Every column the data team listed appears under `columns`, in their order, with their type. Descriptions are theirs; a column they left blank gets `description: ""` so the gap is visible.
- `profile` numbers are copied, never estimated. A missing number is omitted, not zeroed. A missing block means declared, not proven.
- `relationships.status` is `proven` when it comes from constraints or a matched-count query, else `stated`.
- The file's `last_load` and `date_max` are what `/verify` compares against "as of" dates later; keep them current when the data team re-profiles.

## What the data team is asked for
1. Now: the two-sheet export above. Nullable and a table description are welcome extras.
2. At step 4: row count and distinct count of the primary key per table (`ALL_TABLES.NUM_ROWS`, `ALL_TAB_COL_STATISTICS.NUM_DISTINCT`, or the proof pack run read-only), plus min and max of each date column and the last load time.
3. When available: `ALL_CONSTRAINTS` + `ALL_CONS_COLUMNS`, which turns `stated` relationships into `proven`.
4. A read-only account on a replica, or a named proof-runner for step 4.
