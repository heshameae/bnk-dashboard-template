---
name: business-context
description: Turn meeting notes into dashboards/<name>/business-context.md, the fixed-shape page every later step reads.
disable-model-invocation: true
---

# /business-context

Step 2 of `docs/WORKFLOW.md`: turn the notes from the meeting with the business owner into the fixed template in `docs/contracts/business-context.md`, so `/model` reads meanings, owners and exclusions without guessing.

## Arguments
`/business-context <dashboard> <notes>` — the folder name under `dashboards/` and the notes: pasted text, a file path, or the form the business filled in (`docs/templates/business-context-request.md`, sent to them as the `.docx` beside it). A returned `.docx` is read as text first: `textutil -convert txt -stdout <file>` on macOS, or the PDF/pasted text the business sent. Form mapping: Who will use it → §1; Questions → §2; each numbers row → §3 with the requester as `Owner` until the read-back names another role, and `Any filtering` as its §4 line;; Filters on the page → the `Slice by` column of §3 (every page filter is a dimension the clean tables must expose) plus a note for `/spec` page controls, including the default view; Where the data comes from → §5, checked against `sources/`; Who is allowed to see it → §6 as a note for `/rls`; Anything else → §4 when it names an exclusion or a definition, otherwise §6. `/business-context template` prints the paths of the blank `.docx` and the filled-in example (`business-context-request-example.docx`) to send together. Run again with new notes to update the same file; the headings stay, the rows change.

## Reads
- The notes given in the argument.
- `dashboards/<name>/business-context.md` when it exists (update, keep confirmed rows).
- `catalog/kpi-registry.yaml`: when a KPI in the notes matches an existing recipe's `meaning`, write `reuse recipe <id>` in that row so step 3 reuses it and `/ask-leap-bi` can see it.
- `sources/*.yaml` names, to link §5 to filed tables where the business named a system.

## Writes
- `dashboards/<name>/business-context.md` with `status: draft`. The business owner's read-back sets `status: confirmed`, by hand, never by this skill.

## Steps
1. Fill §1, §2, §5 straight from the notes, in the business's words. Completion: §1 has one line per role, §2 is numbered, §5 lists every system or report the notes mention.
2. Build the §3 table, one row per number the business wants to see. `Meaning, verbatim` is their sentence in quotes; when the notes hold no sentence for a KPI, leave the cell `?` for step 4. `Owner` is a role. `Compare to` is one of the registry's `compare` values or `?`. `Slice by` lists the dimensions they named. Completion: every KPI in the notes has a row; every cell is filled or `?`.
3. Fill §4 with one line per KPI: the exclusion in their words, or `?`. Completion: §4 has exactly as many lines as §3 has rows.
4. Turn every `?` into a question in §6, at most seven, each with the role that answers it and a date. Ask about real gaps only: a KPI without a verbatim meaning, a missing owner, a missing compare-to, a blank exclusion, a system named but unfiled in `sources/`. Order by how much they block step 3 (meaning first, exclusion second). When more than seven gaps exist, keep the seven that block the most KPIs and list the rest in one line under §6 as "deferred". Completion: §6 ≤ 7 numbered questions, each with an answerer; no `?` remains in §3 or §4 without a matching question.
5. Ask the user those questions now, in the terminal, in §6 order; write each answer into the table or §4 and remove the question. Completion: every answer the user gave is in the file; unanswered questions remain in §6.
6. Print the file path and the §3 table. Completion: the printed table has no `?` in `Meaning, verbatim`, or the print is followed by "step 3 will mark these DRAFT with a placeholder meaning; get the sentence before step 6".

Acceptance values (the numbers finance would bet on) belong to step 11 and `catalog/acceptance.yaml`; this file carries none. When the notes contain one, keep it in §6 as "finance to confirm at verify" so it is not lost and not treated as a definition.

## Stops when
- The notes name no KPI at all: write §1, §2, §5 only, and print "no numbers named; meet again before step 3".
- A KPI's meaning in the notes contradicts an existing CONFIRMED recipe with the same name: keep both sentences in §6 as a question for the owner; never overwrite the confirmed meaning.

## Hands over to
Step 3, `/model draft <dashboard>` (you + Claude), in this same session: the draft builds on the thinking of the ask. Step 3 runs on `status: draft` and marks every recipe DRAFT regardless; the business's read-back can happen in parallel with drafting.

Branch: when every §3 row carries `reuse recipe <id>` and each id is CONFIRMED, the model already exists; hand over to step 8 (design from the Catalog's recipe list) and say so.

Example, marked as such: `dashboards/cashboard/business-context.md` is a filled, confirmed instance.
