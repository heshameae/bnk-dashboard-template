---
name: import-schema
description: Step 1. Run the deterministic parser on the data team's schema export (xlsx or a folder of csv), read its PASS/FAIL lines, and carry its questions to the data team. Writes sources/<TABLE>.yaml, sources/_import-report.md and the portal graph, all through code.
disable-model-invocation: true
---

# /import-schema

Step 1. The parser in `packages/import-schema` reads the export and writes the files. You never read a cell and never write a file: you run the commands, stop on what they refuse, and carry their questions to the data team. A value typed by you would be a fact nobody stated. File shape: `docs/contracts/sources.md`. Parser rules and the validator's checks: `packages/import-schema/README.md`.

## Run it
`/import-schema <export> <SYSTEM>`
- `<export>`: the workbook (`.xlsx`) or a folder with one `.csv` per sheet. Two sheets: one row per column, one row per join. The templates the data team fills are `docs/templates/schema-export-columns.csv` and `docs/templates/schema-export-joins.csv`. An older export with the key as a list and the joins as free text is read too.
- `<SYSTEM>`: the source system code, written as `system:` in every file. The export does not carry it. When it is not given, ask; never derive it from the schema name, because a derived code looks exactly like one the data team gave.

## Reads
The export. Everything else (`sources/*.yaml`, `sources/_handover/`) is read by the commands, not by you.

## Writes
Through the parser only: `sources/_handover/<date>-<SYSTEM>-schema[.xlsx]`, `sources/<TABLE>.yaml`, `sources/_import-report.md`. Through the portal script: `apps/portal/src/data/graph.json`. Never edit any of these by hand, even to fix an obvious typo: the validator compares every file to the export cell by cell, and a hand edit fails it on the next run.

## Steps
Run each command, print its output in full, and check the done line before the next command.

1. **Inventory.** `npm run import-schema -- inventory <export>`. Done when every sheet line reads `columns`, `joins`, `keys` or `ignored` with a reason, and every table the data team said they sent is in the table. Point the user at two things in the output: the header mapping (which header was taken as table, column, type, pk, description), because a wrong mapping writes wrong files silently; and the two PK columns side by side, because a disagreement is cheapest to see before any file exists. When the export has a joins sheet, the last column lists the joins it read; a join the data team said they sent that is not there is a row the parser set aside, and the report names the line. A needed sheet that reads `ignored` stops here: the fix is a header synonym in `src/recognise.js` with a fixture, or a corrected export from the data team, never an edit to the export.

2. **Import.** `npm run import-schema -- import <export> --system <SYSTEM>`. Done when every line of the last block reads `PASS`. The command copies the export under `sources/_handover/`, writes the files and the report, then validates them. A `FAIL` line names the check and the first cells that differ: it is a parser bug or an export shape the parser has not met. Fix the parser with a test in `packages/import-schema/test/`, then re-run. Never fix the file.
   - `exists with different content`: a handover with this date and system is already filed. Pass `--date <YYYY-MM-DD>` with the date on the new export. A handover is never deleted or overwritten; it is the evidence every value traces to.

3. **Validate from the filed copy.** `npm run import-schema -- validate`. Done when every line reads `PASS`. Step 2 validated against the path the user gave; this reads the copy under `sources/_handover/` that will be committed, so what the repo holds is what was checked. It is a separate command so it can be run alone, by CI or a reviewer, at any later date.

4. **Print the questions.** Open `sources/_import-report.md` and print the "Questions for the data team" section verbatim, then the "Files in sources/ not in this handover" section if it is not empty. Done when the user has seen both. The questions are the step's real deliverable: each is a fact the export did not state, and nobody downstream is allowed to state it instead. Files not in this handover were left as they were; say so, and do not delete them.

5. **Rebuild the portal graph.** `npm run graph -w @bank-dashboards/portal`. Done when the raw-table count it prints equals "files written" from step 2. Unequal counts stop here: the portal must never show a table the repo does not have.

## Stops when
- The inventory finds no `columns` sheet. Print the header cells it found and stop; the data team's export has a shape the parser does not know.
- Any `FAIL` line. Print it, stop, and name the check.
- The user asks for anything from Oracle (counts, constraints, sample rows). Print the report's "Still missing" section instead. Row access outside the read-only account is an incident (`CLAUDE.md`).

## After it
Nothing runs. The user decides: `/business-context <dashboard> <input>` for a new dashboard, or `/build-model draft <dashboard>` when the business context exists. A table with an open question is usable at step 3 (its grain is declared) and blocks step 5 until the data team answers.
