# Handoff: build the architecture app

You are picking up one task in this repo: build `docs/architecture.html`, an interactive one-page app that explains this platform. Everything you need is already in the repo. Read this file, then build. No questions needed.

## Who reads the app

Three audiences, one page:

1. **The BI engineer** rehearsing the workflow alone before presenting it, on a phone as often as a laptop.
2. **BI engineers and software engineers joining the platform**, who need to know which step they are in, which file they produce, and which skill to run.
3. **Top management**, who get a present mode: the problem, the answer, the controls, what is needed from whom.

The app replaces a scatter of static reference pages. It is the canonical explanation of the platform.

## What already exists

- `docs/steps.js` — the eleven steps, the four phases, the sixty-four clarify items and the executive narrative. **This is the content. Render it; do not rewrite it.**
- `docs/build-architecture.js` — reads `docs/steps.js`, twenty sample files, every skill under `.claude/skills/`, and twelve docs, then injects them into your template. Already written and verified.
- `docs/WORKFLOW.md`, `docs/CONVENTIONS.md`, `docs/rls.md`, `docs/proofs.md`, `docs/grain-and-joins.md`, `docs/review/*`, `docs/contracts/*` — the reference material.
- A worked example throughout: the Cashboard dashboard and the `CBS_*` source tables.
- `docs/RESUME.md` — a list of small contract inconsistencies. Not your task; leave them.

## What you build

**One file: `docs/architecture.template.html`.** Then run `node docs/build-architecture.js`, which writes `docs/architecture.html`.

The template must contain the literal string `/*__DATA__*/` inside a `<script>` tag near the top of `<body>`. The build script replaces it with `window.__DATA__ = {...}`. That is the only interface between the script and your template. Never edit `docs/architecture.html` by hand; it is generated.

### The data you get

```js
window.__DATA__ = {
  PHASES: [ { id, label, steps: [numbers], say } ],            // 4
  STEPS:  [ { n, id, title, owner, ownerNote, lede, gets, does, hands,
              skill: { cmd, status },                          // status: ok | todo | bank
              files: ['path', ...],                            // keys into FILES
              rule, trap,
              clarify: [ { q, who, why } ] } ],                // 11 steps, 64 clarify items
  EXEC:   { headline, problem: [str], answer: [[title, body]], changes: [[title, body]],
            controls: [str], needs: [[who, what]], phases: [[title, body]] },
  FILES:  [ { path, step, owner, editor, note, content } ],    // 23, full file contents
  SKILLS: [ { name, files: [ { name, content } ] } ],          // 9, full SKILL.md text
  DOCS:   [ { path, content } ],                               // 12
  builtAt: '2026-09-04',
};
```

`owner` is one of `you` (BI engineer plus Claude), `de` (data engineers), `biz` (business), `auto` (CI or the deploy pipeline). Give each a colour and use it consistently everywhere: step markers, the owner legend, the clarify grouping.

### The six surfaces

Left sidebar navigation, one entry each. Deep-link every one through the hash so a link survives a reload: `#workflow/3`, `#files/dashboards/cashboard/spec.yaml`, `#skills/model`, `#present/4`.

**1 · Workflow** (the default). The eleven steps as a list of records grouped under the four phases, each row showing the step number, title, owner dot, the file it hands over, and its skill. Clicking a row opens the step's detail. Two modes, toggled at the top of the surface:

- **By step**: the record detail, with four tabs.
  - *Overview* — `lede`, then a three-part strip: Gets → Does → Hands over. Then `rule` and `trap` as two callouts, visually distinct from each other (rule is what must hold, trap is what goes wrong).
  - *Clarify* — the step's clarify items as rows: the question, who answers it, and why it matters. This tab is the reason the app exists, so give it room.
  - *Files* — the step's `files`, each opening the file viewer.
  - *Skill* — the rendered `SKILL.md` (plus any mode files) for that step's skill, with its status chip. Steps whose skill status is `bank` or that have no skill show what happens instead.
- **All open questions**: every clarify item across all eleven steps, grouped by `who` (data team, security, finance, business owner, you), each showing its step number as a link back. This is what gets taken into a meeting, so it must print cleanly.

**2 · Files.** The twenty artifacts as a table: path, the step that produces it, who edits it, the one-line note. Clicking one shows its full content in a monospace viewer with the note and editor above it. Group by folder. Light syntax colouring is welcome; write it yourself with a small regex pass over YAML, SQL, Markdown and TSX. No highlighting library.

**3 · Skills.** The ten skills as a list with their step number and status, each opening its rendered Markdown. `model` and `build` have mode files; show them as tabs inside the skill.

**4 · Security.** Row-level security, built from `docs/rls.md` (in `DOCS`), `security/rls-policies.yaml` and `security/entitlements.sql` (both in `FILES`). It must make four things obvious: the three nouns and where each lives (role and policy in version control, entitlement values in an audited table), the four homes with the step each belongs to, the two compiled queries side by side for an entitled user and a bank-wide user, and the open questions for security. Show the policy file and the table shape inline.

**5 · Platform.** What is built and what is not: the pieces, their status (`exists`, `to build`, `bank-owned`), the step where each is first needed, and the phase. Plus the runtime path as one horizontal strip: a user opens a page → the app asks for each recipe → the query writer returns SQL with the user's row filter → the database runs it on the clean table → the chart renders. Derive the status chips from `SKILLS` and `FILES`; the phases are in `EXEC.phases`.

**6 · Present.** Executive mode, from `EXEC`. Full-bleed slides, one idea each, large type, arrow keys and swipe, a slide counter, and no sidebar. Suggested order: headline · the problem · the answer in four parts · what changes for the business · the controls · what we need from whom · the three phases. It must print to PDF as one slide per page, and it must be readable from across a room.

### Design direction

A dense, calm, records-and-attributes workspace. Concretely, and hold to all of it:

- A calm neutral canvas, not white. Hairline one-pixel borders doing the work that shadows usually do. Radius around six pixels.
- Small type. Thirteen or fourteen pixels for body, a system font stack, tabular numerals for anything numeric. Dense but never cramped: generous line height, tight padding.
- One accent colour, used for the current selection and nothing decorative. Owner colours are the only other hues, and they appear as small dots and chips, never as filled panels.
- Records and attributes, not cards in a grid. A list on the left or on top, a detail on the right or below, and inside the detail a column of label-and-value rows with the label muted and left-aligned at a fixed width.
- Status as a soft pill with a quiet background. Ids and paths in monospace.
- Hover states that are barely there. No gradients, no drop shadows beyond a single subtle one on the detail panel, no animation beyond a hundred-millisecond ease on hover and panel entry.
- Keyboard first: `j`/`k` or arrows move through the list, `Enter` opens, `Escape` closes, `/` focuses search, `?` shows the shortcuts, arrows advance present mode.
- A search box that filters steps, files, skills and clarify questions at once, matching on text and showing which surface each hit belongs to.

### Constraints

- **One self-contained file.** No network at runtime. No CDN, no fonts, no images fetched. It runs from `file://` on a locked-down machine, and that is where it will be judged.
- **No build tooling.** Plain HTML, CSS and JavaScript in the template. Node runs only the injection script.
- **Phone first.** It must work at three hundred and ninety pixels wide: the sidebar collapses to a top bar, the list and detail stack, and nothing scrolls horizontally except code blocks, which scroll inside their own container.
- **Light and dark**, following the system setting, with an explicit toggle. Define the full light palette on `:root` and override only the changed tokens.
- **Print** cleanly: the present mode as one slide per page, and any other surface as a readable document.
- **A small Markdown renderer** for `SKILL.md` and the docs: headings, paragraphs, bold, inline code, fenced code, links, unordered and ordered lists, and tables. Around sixty lines. Escape HTML before rendering; the content is trusted but the habit is not optional.
- **No dataset names in the template.** Every table, column, recipe and dashboard name reaches the page through `window.__DATA__`. Grep the finished template for `CBS_`, `cashboard`, `casa` and `branch_code`; the only allowed hits are inside a comment.
- **Do not restate the contracts.** When the app needs to explain a file's shape, render the contract from `DOCS`.

### When it is done

Check each of these yourself before reporting:

1. `node docs/build-architecture.js` prints eleven steps, twenty-three files, ten skills, thirteen docs, and writes `docs/architecture.html`.
2. Opening `docs/architecture.html` from the file system shows the workflow with no console errors and no network requests.
3. Every one of the eleven steps opens, and all four of its tabs have content. No empty tab, no placeholder.
4. All sixty-four clarify items appear under "All open questions", grouped by who answers them, each linking back to its step.
5. Every one of the twenty-three files opens and shows its full content. Every one of the ten skills renders, including the mode files of `model` and `build`.
6. Present mode runs end to end with the keyboard and prints one slide per page.
7. At three hundred and ninety pixels wide, every surface is usable and the page does not scroll sideways.
8. The grep for dataset names finds nothing outside comments.
9. Editing a sample file and rebuilding changes the page. That is the test that the app really is generated from the repo.

Then report: what you built, the checks you ran, and anything in `docs/steps.js` you found thin. Leave the content itself alone unless it is wrong.

## Suggested skills

- A front-end design skill if the machine has one, for the visual pass: `high-end-visual-design`, `minimalist-ui`, `web-design-guidelines` or `design-taste-frontend`. Read it before writing CSS, not after.
- `writing-for-agents` only if you end up touching a `SKILL.md`, which is not part of this task.

## Rules of this repo that still apply to you

Read `CLAUDE.md`. The two that bite: every database access is read-only, and the modelling gates and contracts are a behaviour contract. Building the app touches neither, so if you find yourself editing `bi_model/`, `catalog/` or `.claude/skills/`, stop.
