---
name: business-context
description: Turn the business's meeting notes or filled request form into dashboards/<name>/business-context.md, in the shape of docs/contracts/business-context.md.
disable-model-invocation: true
---

# /business-context

Reads what the business said. Writes one file, `dashboards/<dashboard>/business-context.md`, in the shape of `docs/contracts/business-context.md`. Nothing else.

## Run it
`/business-context <dashboard> <input>`
- `<dashboard>` is the folder name under `dashboards/`, for example `cashboard`. Created if missing.
- `<input>` is meeting notes (pasted text or a file path) or the request form the business filled in, as `.docx` or `.md`. A `.docx` is read as text with `textutil -convert txt -stdout <file>`.

`/business-context template` prints the paths of the blank form and the filled example (`docs/templates/business-context-request.docx` and `-example.docx`) to send to the business.

## What it does
1. Reads the input. From the form, each section goes to the section of the same name in the output; the numbers table goes row for row. From notes, sentences are sorted into the sections.
2. Writes the file with `status: draft`. The business's words are copied, never reworded. Every number is one row of the table. A cell that cannot be filled is `?`. A section they left empty says `not given`.
3. Fills the `Recipe` column. If `catalog/kpi-registry.yaml` is missing or has no recipes, every row is `new` and that is normal: the first dashboard is born before any recipe exists, and `/build-model draft` creates the file. Otherwise, a row whose meaning matches a CONFIRMED recipe gets `reuse kpi.<id>`, and any other row gets `new`.
4. Turns every `?` into a question in section 8, at most seven, each with who answers it. Asks those questions in the terminal now, writes in the answers, and leaves the unanswered ones in section 8.
5. Prints the file path and the numbers table, then stops.

Run it again on the same dashboard with new input and it updates the file: headings stay, rows change, and a row the business has confirmed is never overwritten.

## Rules
- No acceptance numbers in this file. If the input contains one, it goes to section 8 as "finance to confirm at verify".
- `status: confirmed` is set by hand after the business has read the file back, never by this skill.
- If a meaning contradicts a CONFIRMED recipe of the same name, both sentences go to section 8 for the owner. The confirmed recipe is never changed.

## Stops when
- The input names no number at all: writes sections 1, 2 and 5, prints "no numbers named; meet again", and stops.

## After it
Nothing runs. You decide the next step: `/build-model draft <dashboard>` when any row is `new`, or step 8 (design from the Catalog) when every row reuses a CONFIRMED recipe.
