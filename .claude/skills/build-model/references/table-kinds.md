# Table kinds: what a raw table is, decided from its key

Read this at draft step 3, once per raw table the dashboard needs. Every later decision (the grain sentence, how the table joins, which proof it needs, which aggregation class its numbers take) follows from the kind. Decide the kind from the key and the columns in `sources/<TABLE>.yaml`, in the order below. Never decide it from the table's name: a table called `DIM_` can be a snapshot and a table called `_DTLS` can be a dimension.

Names below (`ACCOUNT`, `CUSTOMER`, `business_date`) are illustrations only. The skill assumes none of them.

## The decision

Walk it top to bottom. Stop at the first match.

```
Does the source file have a key?
├── No → kind: UNKNOWN. Blocked. Ask "what makes one row unique?" Nothing is drafted on it.
└── Yes
    Does the key contain a date column?
    ├── Yes
    │   Do the non-key columns hold amounts or counts (balance, outstanding, limit, revenue, volume)?
    │   ├── Yes → kind: SNAPSHOT FACT (one row per entity per day, dense)
    │   │         unless the source's grain sentence or description says "per transaction",
    │   │         "per posting", "per event" → kind: FLOW FACT with a date in the key.
    │   └── No  → kind: VERSIONED DIMENSION (the entity's attributes as they stood that day)
    └── No
        Is the key one column, or one entity id plus nothing else?
        ├── Yes
        │   Do the non-key columns hold amounts that change over time?
        │   ├── Yes → kind: FLOW FACT (one row per event; the event id is the key)
        │   └── No  → kind: DIMENSION (one row per thing, current values only)
        └── No (two or more columns, none a date)
            Are all key columns foreign keys to other tables?
            ├── Yes → kind: MAPPING (a bridge between two or more things)
            └── No  → kind: FLOW FACT at a compound grain (one row per <a> per <b>)
```

Two more kinds are recognised by their columns, not their key:

- **HIERARCHY**: a table whose rows point at other rows of the same table (`parent_id`), or whose columns are named levels (`level_1`, `level_2`, `region`, `area`, `branch`). Treat it as a DIMENSION for the join rule, and read the hierarchy section of `joins.md` before using it.
- **CALENDAR**: one row per calendar day with business-day or holiday flags. It becomes `dim_date` and nothing else. When no such table exists, stop and ask the data team; do not build one from the fact table's dates, because a fact table only knows the days it has rows for.

## What each kind means

| Kind | Grain sentence | Joins as | Proof | Its numbers are |
|---|---|---|---|---|
| SNAPSHOT FACT | one row per `<entity>` per `<date>` | the subject of a `v_<subject>_daily` view | grain, fan-out, conservation | `balance-last-day` |
| FLOW FACT | one row per `<event>` | the subject of a `v_<subject>` view | grain, fan-out, conservation | `additive` |
| VERSIONED DIMENSION | one row per `<entity>` per `<date>` | joined on entity key **and** date (see `joins.md`, as-of join) | grain (rows equal distinct key) | never a number; its columns are dimensions and flags |
| DIMENSION | one row per `<entity>` | joined on the entity key | grain, orphans | never a number |
| MAPPING | one row per `<a>` per `<b>` | joined on the from side's key only after the mapping proves one row per that key | grain, plus one row per from-key | never a number |
| HIERARCHY | one row per `<node>` | flattened into a `dim_` view first, then joined on the leaf key | grain, one parent per node | never a number |
| CALENDAR | one row per calendar day | `dim_date`, joined on the fact's date column | grain, one last business day per month | never a number |

## Rules, and why

- **A snapshot is dense or it is not a snapshot.** A snapshot table holds every entity every day. If the source says rows appear only when something changed, it is a change log, not a snapshot, and reading one day gives only the entities that moved. That is a question for the data team before any balance recipe is written ("does every account appear every day, or only the ones that changed?"). Until answered, the kind is SNAPSHOT FACT with the question listed as blocking finalize.
- **A versioned dimension is not a dimension.** Its key includes the date, so it is not one row per entity. Joining it on the entity key alone multiplies every fact row by the number of days in the table. The lint catches this because the join misses part of the key; the as-of join in `joins.md` is the fix.
- **A mapping table is where fan-out hides.** It is written to translate one code into another and nobody checks that each from-code appears once. Before a fact view joins to it, the proof must show one row per from-key. When it does not, the mapping is a question, never a `DISTINCT`.
- **A hierarchy is never joined as it comes.** A self-referencing table joined to a fact multiplies rows by depth. Flatten it into fixed levels in a dimension view, one row per leaf, and prove that grain. The number of levels is a fact about the bank; when it is not written in the source file, ask.
- **Amounts on a dimension are a smell.** A table classified as a dimension that carries a balance is either a snapshot fact misfiled, or a dimension with a derived number someone put there. Ask which. Do not expose the amount from a dimension view.
- **An entity code in every key** (a multi-entity bank, or a source system code) is part of the grain and part of every join. Treat it like the date: it goes in the grain sentence, it goes in the as-of join, and it is a candidate for the RLS column. Never drop it from a key to make a join simpler.

## What to write down at step 3

One line per raw table, before any view is drafted:

```
<TABLE>  kind: SNAPSHOT FACT   key: [<date>, <entity>]   grain: one row per <entity> per <date>   open: <question or none>
```

A table whose kind is UNKNOWN, or whose kind depends on an open question, is listed with the question. The subject that needs it is `blocked` (no key) or `ready-unproven` (kind decided, question open). Nothing about the kind is carried in your head into step 6.
