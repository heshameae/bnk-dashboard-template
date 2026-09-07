# The workflow: eleven steps, one owner each

Every handover between steps is a file in git. No emails, no tickets. Step numbers are flat; there are no sub-steps.

| # | Step | Owner | Skill / tool | Hands over |
|---|------|-------|--------------|------------|
| 1 | Intake sources | Data engineers (you file it) | `/import-schema` | `sources/<TABLE>.yaml` |
| 2 | Capture the ask | You + Claude | `/business-context` | `dashboards/<name>/business-context.md` |
| 3 | Draft the model | You + Claude | `/build-model draft` | draft `bi_model/*.sql`, DRAFT recipes, `bi_model/proofs/*.sql` |
| 4 | Prove the drafts | Data engineers | their SQL client, read-only | `bi_model/proofs/<view>.md` |
| 5 | Finalize & review | You + Claude | `/build-model finalize`, `/rls`, CI registry-lint | an open PR (judgment moment 1) |
| 6 | Confirm meanings | Business | Catalog page (PR preview) | PR merged; recipes CONFIRMED |
| 7 | Deploy & document | DDT (the DEs' pipeline) | CI runs `/data-dictionary` | `BI_MODEL` live, `data-dictionary.yaml` |
| 8 | Design the page | You | Open Design + chart kit | `dashboards/<name>/design-export/` |
| 9 | Contract | You + Claude | `/spec` | `dashboards/<name>/spec.yaml` READY or BLOCKED → step 3 (judgment moment 2) |
| 10 | Build & preview | You + Claude | `/build` on semantic-query | dev URL, `queries.sql`; business previews |
| 11 | Verify & ship | You + finance | `/verify` in CI | `catalog/acceptance.yaml` rows, `verify.md` green → live dashboard |

Four phases, for anyone who needs the short version: **Tables in** (1) · **Model & recipes** (2–7) · **Design & contract** (8–9) · **Build & ship** (10–11).

Step 1 happens once per source system and is reused by every later dashboard. Dashboard #2 starts at step 2.

The on-ramps (a live-dashboard change, a change of meaning, a change of reach, a disputed number) and where a session starts and ends are in `/ask-leap-bi` (`.claude/skills/ask-leap-bi/SKILL.md`). The words the steps share are in the `vocabulary` skill.
