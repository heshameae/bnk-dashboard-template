# Joins: the one rule, and the seven cases it turns into

Read this at draft step 6, once per join in every view. A join copies a row once per match on the other side. Every wrong number this repo exists to prevent is a join that matched more than once or less than once. Names (`ACCOUNT`, `CUSTOMER`, `business_date`) are illustrations only.

## The one rule

**Every join lands on the joined table's full key, as `sources/<TABLE>.yaml` declares it.** Not most of the key. Not a unique-looking column. The full key.

Why: a table is one row per its key and nothing else. A join on the full key matches at most one row, so it cannot multiply. A join on part of the key matches every row that shares that part. `npm run lint:registry -- views` refuses a join off the full key, so a view that breaks this rule never reaches a data engineer.

The rule has a consequence people miss: when the key includes a date, the join includes the date. That is the as-of join below, and it is the most common join in a warehouse built from daily snapshots.

## The decision

For each table a view needs beyond its subject table:

```
What kind is the joined table? (table-kinds.md)
├── DIMENSION or CALENDAR → case 1, plain join on the key
├── VERSIONED DIMENSION   → case 2, as-of join on key + date
├── MAPPING               → case 3, prove one row per from-key first
├── HIERARCHY             → case 4, flatten into a dim_ view first
├── SNAPSHOT FACT or FLOW FACT → case 5, never. Widen the subject or ask.
└── The same dimension a second time → case 6, role-playing
Then, for every join: case 7, LEFT or inner.
```

### Case 1: plain join to a dimension

```sql
JOIN RAW.<DIM> d ON d.<KEY> = f.<FK>
```
Every column of `d.<KEY>` appears in the ON clause. When the dimension's key is two columns (an entity code and an id), both appear. Nothing else is in the ON clause: a filter there (`AND d.STATUS = 'A'`) silently drops rows and belongs in a recipe as an exclusion.

### Case 2: as-of join to a versioned dimension

The joined table is one row per entity per date. The fact is one row per entity per date. Join on both:

```sql
JOIN RAW.<CUSTOMER> c ON c.<CUST_KEY> = f.<CUST_FK>
                     AND c.<DATE>     = f.<DATE>
                     AND c.<ENTITY>   = f.<ENTITY>     -- when the entity code is in the key
```
This gives the customer as it stood on the fact's day, which is what "balance by segment on the last business day" means. Joining on the id alone multiplies each fact row by every day in the customer table.

When the business wants the customer as it stands **today** (current segment, current manager), that is a different question and a different table: a `dim_<entity>_current` view that keeps one row per entity, then a case 1 join. Do not choose between as-of and current on your own. The numbers table says "break down by segment"; it does not say which day's segment. When the meaning does not settle it, it is a section 8 question for the business, and the draft uses as-of with the question listed, because as-of is the reading that agrees with the fact's own date.

Building `dim_<entity>_current`: a dimension view may use a window function and a WHERE (the lint forbids those in fact views only). Keep the row with the latest date per entity, prove one row per entity, and its key becomes the entity id.

### Case 3: mapping tables

A mapping translates one code into another. It is safe only if each from-code appears once. The source file's key tells you: when the key is the from-side columns alone, the mapping is one row per from-key and joins like a dimension. When the key includes the to-side, or there is no key, the same from-code can map to several targets and the join multiplies.

Procedure:
1. Key is the from-side columns only → case 1 on those columns.
2. Key includes to-side columns, or no key → do not join it. Write `proofs/<map>.sql` with the grain check on the from-side columns. Ask the data team "can one `<from>` map to more than one `<to>`?" The subject is `ready-unproven`. When the answer is yes, the business decides which target wins, and that decision becomes a dimension view with a `WHERE`, proven one row per from-key. Never a `DISTINCT` in the fact view: it hides the duplication instead of resolving it.

Three-column mappings (a product key built from three codes) are joined on all three, in the ON clause, one pair per line. Never concatenate columns to join: `a || b || c = x || y || z` defeats every index, silently matches when the parts shift, and cannot be checked by lint.

### Case 4: hierarchies

A hierarchy table (region over area over branch, or manager over manager) is never joined to a fact as it comes. Two shapes:

- **Level columns already present** (`level_1`, `level_2`, `level_3`): the table is one row per leaf. Build `dim_<hierarchy>` that renames the levels to business words and joins on the leaf key. Case 1.
- **Self-referencing** (`node_id`, `parent_id`): flatten it in `dim_<hierarchy>` with `CONNECT BY` or a fixed number of self-joins, one row per leaf, level columns named. The number of levels is a fact about the bank. Ask when the source file does not say. Prove one row per leaf and one parent per node.

A ragged hierarchy (some leaves at depth 3, some at depth 5) gets its missing levels filled downward with `COALESCE` so every row has every level. Write which levels were filled in the view header's grain line.

### Case 5: fact to fact

Never. Two fact tables at the same grain are one subject; widen the view so the columns of both appear side by side, joined on the full shared key (which includes the date). Two fact tables at different grains are two subjects, two views, and a number that needs both is a `ratio` recipe over two recipes on the same view or a question back to the business. A fact-to-fact join at different grains is the 19x error with extra steps.

### Case 6: role-playing

The same dimension joined twice, because the fact has two foreign keys to it (a primary and a secondary manager; a booking branch and a servicing branch). Two aliases, two joins, each on the full key, and every exposed column carries its role in the name:

```sql
JOIN RAW.<STAFF> rm1 ON rm1.<KEY> = f.<PRIMARY_RM>
JOIN RAW.<STAFF> rm2 ON rm2.<KEY> = f.<SECONDARY_RM>
...
rm1.<NAME> AS primary_manager_name,
rm2.<NAME> AS secondary_manager_name,
```
One raw column, two business names, is allowed here and only here, because the names carry the role. The cross-view lint skips a table that a view joins more than once, so the names are yours to keep consistent; declare the role-play in the header's grain line so a reviewer knows why.

### Case 7: LEFT or inner, for every join

```
Can the joined table be missing a key the fact has? (an account with no customer row, a product code not in the map)
├── Yes, and the fact row must still count → LEFT JOIN, and every column from that side is
│     COALESCE(<col>, 'UNKNOWN') so the missing member is visible and countable.
├── Yes, and the business said those rows are out → still LEFT JOIN. Expose a flag
│     (<side>_matched = CASE WHEN d.<KEY> IS NULL THEN 0 ELSE 1 END) and let the recipe exclude.
│     A view that drops them silently cannot be audited; a recipe that excludes them can.
└── No, the key is always present → JOIN. Say why in the header's grain line
      ("every account has a customer row; constraint in source"). The conservation proof checks it.
```
Inner joins that lose rows fail `conservation`. That proof exists so the choice above is never taken on faith.

## The joins that lint cannot see

Lint checks that the ON clause covers the key. It cannot know whether a mapping is really one row per from-key, whether the customer table is a snapshot or a change log, or whether a hierarchy has four levels or six. Those are the questions in `table-kinds.md`, and each one becomes a line in the proof file or a question in the report. A join that depends on an open question is drafted, marked `ready-unproven`, and finalize refuses it until the count comes back.

## Never

- Never `DISTINCT` to fix a join. It hides fan-out and halves nothing correctly.
- Never concatenate columns to join. One pair per line in the ON clause.
- Never filter in the ON clause or in a WHERE of a fact view. Expose the flag; the recipe excludes.
- Never join on a column the source file does not list as part of the key, however unique it looks. If the data team says it is unique, it goes in the key first, with a count.
- Never write the date logic yourself. "Last business day" comes from `dim_date` and nowhere else.
