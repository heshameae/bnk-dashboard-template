---
name: import-schema
description: Turn the data team's schema export (Excel or CSV) into one sources/<TABLE>.yaml per raw table, validate the files against the export, and rebuild the portal graph.
disable-model-invocation: true
---

# /import-schema

Step 1. The data team's export becomes the only description of raw tables the repo reads. The export layout and every parsing rule are in `docs/contracts/sources.md`; the steps below refer to its rules by number. Read it first.

## Run it
`/import-schema <file or folder>`
- An `.xlsx` workbook. When `packages/import-schema` exists, `npm run import-schema -- <file>` converts it to one CSV per sheet. Until it exists, ask for the sheets saved as CSV, or save them yourself, and point at the folder.
- A folder of `.csv`, one per sheet. Sheet names do not matter. A sheet is recognised by its headers: one with a column-name header is the columns sheet; one with a PK or FK header is the keys sheet; any other sheet is listed in the report and ignored.

The export is copied unchanged to `sources/_handover/<YYYY-MM-DD>-<SYSTEM>-schema.<ext>` before anything else (contract, "Where the export lives"). It is never edited, because every value in every file must trace back to a cell in it.

## Reads
- The export.
- Existing `sources/*.yaml`, so a re-run updates a file instead of duplicating it.
- `docs/contracts/sources.md`.

## Writes
- `sources/<TABLE>.yaml`, one per table, upper-case name as in Oracle.
- `sources/_import-report.md`.
- `apps/portal/src/data/graph.json`, through the portal's build script (step 6).

## Steps
1. **Inventory.** Print one line per sheet: recognised as columns, keys, or ignored, with its row count. Then one row per table found on either sheet: column count, PK from the flags, PK from the keys sheet, FK text. Done when every table on either sheet is in this list. The two PK sources are printed side by side so a disagreement (rule 2) is seen before any file is written.
2. **Write the files**, one per table with columns, in the contract's field order, applying rules 1 to 8 exactly. Every `description` is a cell copied verbatim; a blank cell writes `""`. `grain` comes from `key` (rule 7). `profile` is written only from numbers the export carries; this export carries none, so it is omitted. Done when every table with columns has a file.
3. **Parse the FK text** (rule 3). Print each FK cell next to what was parsed from it, or `unparsed` with the text moved to `notes`. Done when every FK cell is printed with its outcome. A join guessed from unparsed text would be a fact nobody stated.
4. **Validate the files against the export.** Re-read every file written with a YAML parser (`node -e` with the `yaml` package). Print one line per check with its count:
   - files written equals tables with columns minus tables skipped
   - every column row of the export appears in exactly one file, in the export's order
   - every `key` column and every `relationships[].column` exists in that file's `columns`
   - every `relationships[].references` names a table that has a file, or is listed as a question
   - every `description` string in the files appears verbatim in the export
   - no file has a `profile` block
   Done when every line reads PASS. A FAIL stops here with the file and the cell named. This step exists because the parse was done by hand: a file that drifts from the export poisons every step after it.
5. **Write the report** `sources/_import-report.md` (rule 9): the handover file name, files written, tables skipped, questions for the data team, then the contract's ask for anything still missing.
6. **Rebuild the portal graph:** `npm run graph -w @bank-dashboards/portal`. Print its output line. Done when the raw-table count it prints equals the files written. A mismatch stops here; the portal must never show a table the repo does not have.

## Stops when
- No sheet has a header row matching either recognised shape: print the header cells and stop. Guessing which column is which writes wrong files silently.
- There are no PK flags and no keys sheet: write the files with `key: []`, list every table as a question, and stop before step 6 with "no keys; grain cannot be declared". A table without a key cannot be modeled.
- The user asks to query Oracle for what the export lacks: stop and print the ask instead. Row access outside a configured read-only account is an incident (`CLAUDE.md`).

## After it
Nothing runs. The user decides: `/business-context <dashboard> <input>` for a new dashboard, or `/build-model draft <dashboard>` when the business context exists. A table listed under questions is usable by the draft (its grain is declared) but blocks the finalize until the data team answers.
