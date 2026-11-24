# Contract: `usage/opens.csv`

Who opened which dashboard, and when: one row per open. The portal's Analytics page is counted from this file and from nothing else.

Nothing writes this file yet. The portal has no server to record an open, so the file does not exist at the root and the Analytics page says "Usage is not recorded yet". `docs/sample/usage/opens.csv` is a made-up one. It shows the shape, and it lets the page be seen with numbers in it.

```csv
at,dashboard,person,role
2026-11-24T08:12:40,daily-balances,p0412,finance
2026-11-24T08:14:05,daily-balances,p0077,head_office
2026-11-24T08:31:19,branch-balances,p0077,head_office
```

| Column | Holds |
|---|---|
| `at` | When it was opened, in the bank's local time, written `YYYY-MM-DDTHH:MM:SS`. No offset. The day and the hour on screen are read straight from these characters, so a viewer in another time zone sees the same chart. |
| `dashboard` | The dashboard's folder name under `dashboards/`. |
| `person` | An opaque id, the same for the same person every time. Never a name, a staff number or an email. It is there so a person is counted once. |
| `role` | The role the person held at that moment: a key of `roles:` in `security/rls-policies.yaml`. Blank when it is not known. |

## Rules
- One row per open: the portal loading a dashboard for a person. Moving a filter is not an open. Reloading the page is.
- Rows are appended, never edited. Their order does not matter.
- The header row is required, with the four columns in that order.
- The page shows counts only. It never shows a `person` id and never says who opened what.
- "The last 30 days" on the page ends on the day of the newest row in the file, not on the day the page is viewed. The page prints that day.

## The reader stops the build when
The reader is `apps/portal/scripts/usage.mjs`. How it counts (people, came back, change, busiest) is written at the top of that file and tested beside it; a contract holds a file shape, a reader holds its process.

1. The header is missing or is not `at,dashboard,person,role`.
2. A row does not have four cells.
3. `at` is not a real date and time in that format.
4. `dashboard` or `person` is blank.

A row for a dashboard that is not published is skipped and counted in the script's last line. A dashboard can be unpublished after people opened it.

## Open
- Nothing records an open. A recorder needs a server in front of the portal (sign-in gives it the person and the role) and somewhere to append to. Until one exists, only the sample has this file.
- When a recorder exists, decide how long rows are kept. The page reads the last 180 days: 90 to show, and the 90 before them to compare against.
