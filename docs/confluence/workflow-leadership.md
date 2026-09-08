# The dashboard factory, in short

*For leadership. Updated 2026-09-08. The detailed page for the team is "How a dashboard is made".*

## The problem

The bank is leaving Tableau and Power BI. The easy move is to rebuild the same dashboards in a new tool. That keeps the same failures: numbers nobody can trace, a definition that differs from page to page, and a security model that lives inside the tool instead of with the bank.

## What we are building instead

A factory for dashboards, not a dashboard.

The business writes what it needs on a one-page form, in its own words. Those words become text in git: which raw tables, what each number means, which clean table it reads, who may see which rows. Only two things run. Oracle runs SQL and React shows charts. Everything between them is a file that a procedure writes and a person confirms.

Pick any number on any screen and you can follow it back to a sentence the business wrote, a count the data team measured, and a value finance signed off. A definition is written once and every dashboard that uses it shares it. Change the definition and every dashboard changes at once, on purpose.

Attach `workflow-phases.png` here. It shows the four phases below.

## The four phases

| Phase | What happens | Who | How often |
|---|---|---|---|
| 1 · Discovery | The data team's table list becomes one file per table, filed with the export it came from. The business's form becomes a file of their own sentences, with a list of the questions they left open. | Data engineers and the business owner hand over. The Eng. team files. | Tables once per source system. The ask once per dashboard. |
| 2 · Modeling | Clean tables and number definitions are drafted, proven by counts, confirmed by the business, and deployed by the data team. Row-level security is written per table here. | The Eng. team drafts. Data engineers prove and deploy. The business confirms. Security reviews. | Once per dashboard. The next dashboard reuses what this one built. |
| 3 · Design | The page is drawn over the list of confirmed numbers, and every chart is bound to one of them. | Business and design draw. The Eng. team writes the contract. | Once per dashboard. |
| 4 · Build and ship | The page is built from the contract, checked against finance's values, and goes live with row-level security applied on every query. | The Eng. team, finance, security. | Once per dashboard. |

## Where we are

Phase 1 is formulated. The request form, the schema import and the checks that prove both files are built and tested. They have not met a real export or a real form yet. The first run will find gaps, which is expected.

Phase 2 is in progress. We built the schema portal, a model explorer that draws the raw tables, clean tables and number definitions as one graph from git. The automated checks on clean tables are built. We are working through the options for row-level security, because a policy is harder to change once a table is live, and we want it settled before the first model is drafted.

Phases 3 and 4 are designed and not started. We build them after one real dashboard has been through the first two phases. A factory that has not made one real thing is a design, not a factory.

## What we need from each party

| From | What | Why |
|---|---|---|
| Data engineers | The two-sheet schema export for the first source system, now | Nothing starts without it |
| Data engineers | Row counts per table, and someone to run proof queries read-only, at phase 2 | A number is only right when we know what one row means. Counts prove it |
| Data engineers, security | A read-only account on a replica, or a named proof runner | With the account the proof step takes minutes. Without it one person is the bottleneck for every model |
| Business owner | The filled request form, and answers to the follow-up questions | Their words are the definition. Nobody else may write them |
| Business owner | Fifteen minutes to read back and confirm each number's definition | Confirmation is what makes a number official |
| Finance | One signed-off value per number, for one date | The build passes only when it matches finance |
| Security | Review of the row-level security policy per clean table | Who sees which rows is text in git, reviewed like code |

## Risks

The tooling has been tested on realistic fixtures, not on the bank's real export or form. First contact will find gaps. The procedures are written to be fixed, not worked around.

Nothing on the development side touches Oracle. Only the data team's read-only proof runs and their deployment pipeline do. That keeps us safe and makes the data team a dependency at phase 2.

A definition the business did not write is a question, not a number. Dashboards wait on answers. That is the design, and it will feel slow the first time.

## What done looks like for the first dashboard

Phases 1 and 2 run end to end on one real dashboard. The result is a set of clean tables in Oracle, a handful of confirmed number definitions, a security policy per table, and a model explorer that shows how each traces to the raw tables. No page yet. That is the milestone that proves the factory works. The pages come after.
