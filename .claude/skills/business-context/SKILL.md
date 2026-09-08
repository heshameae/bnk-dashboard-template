---
name: business-context
description: Step 2. Sort the business's filled request form (.docx or .md) or meeting notes into dashboards/<name>/business-context.md in their own words, then run the checker that proves every sentence is theirs.
disable-model-invocation: true
---

# /business-context

Step 2. You read what the business said and sort it into the eight sections of `docs/contracts/business-context.md`. You copy sentences; you never reword one. This is the one step in phase one where your judgment does the work (which sentence answers which section, which cell is a gap), so the checker in `packages/business-context` exists for the one thing judgment gets wrong here: improving their words. A tidied sentence fails the check.

## Run it
`/business-context <dashboard> <input>`
- `<dashboard>`: the folder name under `dashboards/`, created if missing.
- `<input>`: the filled form as `.docx` or `.md`, or meeting notes as a file or pasted text.
- `/business-context template` prints the paths of the blank form and the filled example (`docs/templates/business-context-request.docx` and `-example.docx`) to send to the business.

## Reads
The input. `dashboards/<dashboard>/business-context.md` if it exists. `catalog/kpi-registry.yaml` if it exists.

## Writes
`dashboards/<dashboard>/business-context.md`. Pasted notes and relayed answers go to `dashboards/<dashboard>/notes-<YYYY-MM-DD>.md` first. Nothing else.

## Steps
1. **Get the text as a file.** A `.docx`: print `npm run business-context -- text <file>` and read that output, not a converter's, so the text you copy from is the text the checker compares against. A `.md` or `.txt`: read it as is. Pasted notes: save them unchanged to `dashboards/<dashboard>/notes-<date>.md` before reading. Done when every input is a file on disk.

2. **Refuse to overwrite a confirmed file.** If the existing file has `status: confirmed`, stop with "confirmed by the business; a change is a new read-back, set status back to draft by hand first". The read-back is the business's signature; a skill run must not erase it.

3. **Sort into sections.** From the form, section to section in order and the table row for row. From notes, each sentence goes to the one section it answers; a sentence that answers none goes to section 7. Never split, merge or fix a sentence: a sentence that reads oddly is what they said, and step 6 is where they read it back. A section with nothing is `not given`. `owner:` is the role from "Your name and role", never the name. `requested:` is the date on the form or in the notes as `YYYY-MM-DD`, else the date of this run.

4. **Fill the numbers table**, one row per number in their order. Meaning in quotes. These cells become `?`: a meaning or exclusion that says "not sure" in any form (the form tells them to write that when they do not know), and an empty Leave out cell (an exclusion nobody stated is a question, never "nothing left out"; "Nothing left out" written by them is an answer).

5. **Fill the Recipe column.** No `catalog/kpi-registry.yaml`, or no recipe in it with `status: CONFIRMED`: every row is `new`, which is the normal case on the first dashboards; `/build-model draft` creates the file. Otherwise `reuse kpi.<id>` only when the meaning is the same sentence, character for character, as a CONFIRMED recipe's `meaning`; anything else is `new`. When a CONFIRMED recipe's meaning contains the row's "Name they use" but the sentences differ, the row is still `new` and section 8 asks "same number as kpi.<id>, or different?". A near-match decided by you would silently change what the number means.

6. **Write section 8.** One question per `?` cell, each quoting what they wrote if they wrote anything, then your other questions. Rank: meaning gaps, then Leave out gaps, then the rest. Each line: `N. <question> Owner: <role>, by <date>` (or `Owner: <role>` alone). Keep the first seven. When more remain, the last line is `And N more gaps in the table; meet again before step 3.` and you print "meet again": more than seven gaps means the form was not filled, and a list longer than seven is not answered.

7. **Re-run rule.** When a draft file exists, a filled cell is never replaced by `?`, and a `?` is replaced only by words that are in an input file. Nothing said in the chat goes into the file: an answer the user relays from the business is appended to `notes-<date>.md` as `<date>, <role>: "<their words>"` first, then the cell is filled from it.

8. **Check.** `npm run business-context -- check <dashboard> <input> [<notes> ...]`, naming every input file. Done when every line reads `PASS`. A FAIL names the row or line; fix the file (it is yours, unlike step 1's), never the input, and run again.

9. **Print** the file path, the numbers table and section 8, then stop.

## Rules
- No acceptance numbers in this file. A number the business quotes goes to section 8 as "finance to confirm at verify".
- `status: confirmed` is set by hand after the read-back, never by this skill.
- A meaning that contradicts a CONFIRMED recipe of the same name: both sentences go to section 8 for the owner. The recipe is never changed here.

## Stops when
- The input names no number at all: write sections 1, 2 and 5, print "no numbers named; meet again", stop.
- The existing file is `status: confirmed` (step 2).
- Any FAIL you cannot fix without rewording their sentence: print it and stop. The sentence is the problem to take back to the business, not to fix.

## After it
Nothing runs. The user decides: `/build-model draft <dashboard>` when any row is `new`, or step 8 (design from the Catalog) when every row reuses a CONFIRMED recipe.
