# View review: eight checks, in the PR, by a human

Run on every file in `bi_model/` a PR adds or changes. Each check is yes or the PR waits. Checks 1 (the header shape), 3, 4, 5 (the join and the WHERE, not the counts), 7 and 8 are also run by `npm run lint:registry -- views`; a PR with a FAIL line is not reviewed. Checks 2 and 6 are yours alone.

1. **Grain sentence** in the header is true: the proof file's `grain` row is PASS with today's numbers. Dimensions included, since a duplicate key there multiplies every fact that joins to it.
2. **One subject**: the view answers one grain; a balances view has no transaction columns.
3. **Renamed once**: every raw column appears under one business name, and that name means the same thing in every other view.
4. **Joins are to dimensions only**: every joined table has one row per key (`sources/*.yaml` grain), and the proof's `fan_out` row is PASS.
5. **Nothing dropped silently**: inner joins that can lose rows are LEFT JOINs with an "Unknown" member, or the drop is written in the header. The `conservation` row is PASS.
6. **Dates go through `dim_date`**: no hand-written business-day logic.
7. **No metric math**: no SUM, ratio or window that belongs in a recipe. The view is rows, not answers.
8. **RLS line** names a column the view exposes (or `none` with a reason), and `rls-policies.yaml` has the matching entry.
