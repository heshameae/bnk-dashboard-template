# import-schema

The deterministic parser behind `/import-schema` (step 1). It reads the data team's schema export and writes one `sources/<TABLE>.yaml` per raw table, the handover copy and the report, then validates the files against the export. The model never reads a cell; it runs these commands and carries the questions. File shape: `docs/contracts/sources.md`. No dependency but `yaml`; the `.xlsx` reader is `src/xlsx.js`.

## Commands
Run from the repo root.

```
npm run import-schema -- inventory <export>
npm run import-schema -- import <export> --system <CODE> [--date YYYY-MM-DD]
npm run import-schema -- validate [<handover>]
npm test
```

- `<export>` is a `.xlsx` workbook or a folder with one `.csv` per sheet. Sheet names do not matter.
- The templates the data team fills are `docs/templates/schema-export-columns.csv` and `docs/templates/schema-export-joins.csv`.
- `--system` is the source system code written to every file. The export carries none, so it is given, never guessed.
- `--date` defaults to today and names the handover copy; a corrected export is a new date.
- `inventory` prints each sheet with its role and header mapping, then one row per table: column count, PK from the flags, PK from the keys sheet, FK text. Nothing is written.
- `import` copies the export unchanged to `sources/_handover/<date>-<SYSTEM>-schema[.xlsx]` (a csv folder is copied as a folder), writes the files and `sources/_import-report.md`, then runs every check below. It refuses to overwrite a handover of the same name with different content.
- `validate` re-reads the newest handover (or the one given) and every `sources/*.yaml` and prints one `PASS`/`FAIL` line per check.
- Exit codes: 0 all PASS; 1 a FAIL line; 2 the export could not be read or recognised (the message says why; nothing is written).

## Sheet recognition
Three roles. A sheet is the **joins** sheet when its headers carry all four sides of a join: from table, from column, to table, to column. It is the **columns** sheet when its headers include a table name and a column name. It is the **keys** sheet when they include a table name and a PK or FK column and no column name. Any other sheet is ignored and named in the report.

The joins sheet is the template. The keys sheet is the shape data teams send before they have the template, with the key as a list in one cell and the joins as free text. Both are read. When an export has both, the joins sheet wins and the file's notes say the FK text was not read, because a column pair in its own cells cannot be misread and a sentence can. The header row is the first row within the top ten that makes the sheet recognisable, so a title line above the table is fine. Headers match by meaning, not spelling (`Column Name`, `COLUMN_NAME`, `col` all work); the synonym lists are in `src/recognise.js`, and a new export with a new header gets its synonym there, with a fixture. Headers that map to nothing are kept: their cells go to `notes`.

## Rules
Each is a test in `test/parse.test.js` on the fixture in `test/fixtures/messy/`.

1. Identifiers are upper-cased and trimmed. A blank schema or table cell inherits the row above, which is what a merged cell looks like once exported.
2. `key` comes from the PK flags on the columns sheet and the PK list on the keys sheet. When both exist they must agree. When they disagree the file carries the keys-sheet list, `notes` records both, and the report asks which is right.
3. FK text is read in these shapes: `COL -> TABLE.COL`, `COL references TABLE(COL)`, `COL = TABLE.COL`, `TABLE.COL`, `FOREIGN KEY (A, B) REFERENCES T (X, Y)`, a schema prefix (`SCHEMA.TABLE.COL`, dropped), and a run of them separated by commas, semicolons or line breaks. Anything else is kept verbatim in `notes` as `FK not parsed: ...` with no relationship written, and the report asks.
4. A relationship from the export is `status: stated`. Only constraints or a matched-count query make it `proven`; this parser never writes `proven`.
5. Types are kept as written with spacing normalised: `VARCHAR2 (20)` becomes `VARCHAR2(20)`, `NUMBER (18, 2)` becomes `NUMBER(18,2)`.
6. A blank definition becomes `description: ""`. Cells are trimmed of surrounding whitespace and otherwise copied verbatim. No description is ever written by us. `nullable` is written only when the export has a nullable column.
7. `grain` is the data team's sentence when the columns sheet has a grain column, else the sentence the key implies: key `[ACCT_NO, BAL_DT]` gives `one row per ACCT_NO per BAL_DT`. No key gives `grain: ""` and a question.
8. A table on the keys sheet with no rows on the columns sheet: no file, one report line under "Tables skipped". A key or FK column that is not in the column list: the file is written, `notes` says so, the report asks. A referenced table with no file: `notes` says so, the report asks. Duplicate column rows: the first wins, the report lists it.
9. The joins sheet is one row per column pair. All four sides must be filled or the row is set aside with its line number. A duplicate pair is kept once. A from-table with no column rows is skipped like any other; a target named only there gets no file and a question instead.
10. Rows sharing a join name, or sharing a target table when no name is given, are one join on several columns. When those columns are the target's whole key, the join cannot duplicate rows and nothing is asked. When they are not, one row on this side can match many on the other, so the report asks. A named join pointing at two different tables is a question, not a guess.
11. The report opens with the handover path and its SHA-256, then: files written, files in `sources/` not in this handover (left untouched), tables skipped, questions for the data team, rows set aside, and the contract's standing ask. Re-running on the same export gives byte-identical files.

## The validator's checks
Independent of the writer: it reads the raw cells and the YAML files with a parser and compares them. A hand edit to any file fails a check.

- every `sources/*.yaml` parses and is named after its `table`
- one file per table on the columns sheet, none for a keys-only table
- every column row of the export is in its file, in order, with its type and description
- every key equals the export (keys sheet, else the PK flags)
- every keyed file has a grain sentence beginning "one row per"
- every description in the files is a cell of the export, verbatim
- every relationship is a row on the joins sheet (or, with no joins sheet, traces to the FK cell), is `stated`, and any gap (column or table missing) is in `notes`
- every complete row of the joins sheet is a relationship in its file
- no file carries a `profile` block (the export has no counts; profiles arrive at step 4)
- the report names this handover by SHA-256 and lists every file

## Tests
`npm test` runs `node --test`. `test/fixtures/template/` is a csv export in the two-sheet template shape, with a two-column join on a whole key, a join landing on part of a key, a target that is not in the export and a half-filled row. `test/fixtures/messy/` is a csv export with a title line above the header, merged-cell blanks, mixed-case identifiers, spaced types, a quoted comma in a definition, a PK disagreement, a duplicate column, a blank definition, an extra column, a keys-only table, a table with no key, an unreadable FK and a BOM. `test/helpers.js` builds `.xlsx` files (stored and deflated) so the workbook reader is tested against the same rows.
