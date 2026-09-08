# business-context

Step 2 tooling behind `/business-context`. The sorting of the business's words into sections is the model's judgment; this package holds the two things that are not: reading a `.docx` as text, and checking that the file the model wrote is in the business's words.

## Commands
Run from the repo root.

```
npm run business-context -- text <file.docx|.md>
npm run business-context -- check <dashboard> <input> [<input> ...]
```

- `text` prints a `.docx` as plain text: one line per paragraph, a table as `| a | b |` rows. Any other file is printed as it is. The skill reads the form through this command so the text it copies from is the text the checker compares against.
- `check` reads `dashboards/<dashboard>/business-context.md`, the inputs (the form, the notes, any file holding answers the business gave) and `catalog/kpi-registry.yaml` if it exists, and prints one `PASS`/`FAIL` line per check. Exit 0 all PASS, 1 a FAIL, 2 a file could not be read.

## The checks
"Their words" means: the sentence, with case and spacing ignored, is a substring of the input text. A reworded sentence fails, however small the change.

- title line, owner, requested date (`YYYY-MM-DD`) and status (`draft` or `confirmed`)
- all eight sections, in the contract's order, none empty (`not given` counts as filled)
- every line of sections 1, 2, 4, 5, 6 and 7 is their sentence, verbatim
- the numbers table has the contract's eight columns and full rows
- every meaning is quoted and verbatim; Compare to, Break down by and Leave out are their words, `?`, or `not given`; an empty Leave out fails (an unspoken exclusion is a question); a cell that says "not sure" fails (write `?` and ask)
- Recipe is `new`, or `reuse kpi.<id>` where the registry exists, the recipe is CONFIRMED, and its meaning is the same sentence character for character
- section 8 has at most seven numbered questions, each ending with `Owner: <role>` and optionally `, by <date>`; nothing else but the line `And N more gaps in the table; meet again before step 3.`
- every `?` in the table has a question that names the number, or that meet-again line is present

## Tests
`npm test` runs `node --test`. The fixture is the filled example form in `docs/templates/` (both `.md` and `.docx`) and a faithful `business-context.md` made from it; the tests then reword a sentence, blank an exclusion, drop a question and misuse `reuse`, and expect each to fail.
