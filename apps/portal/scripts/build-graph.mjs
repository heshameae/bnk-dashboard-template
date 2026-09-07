// Generates apps/portal/src/data/graph.json from the files that already own the truth:
//   sources/*.yaml            -> the raw layer the DEs hand over
//   catalog/data-dictionary.yaml -> the clean tables we build (generated at step 7)
//   catalog/kpi-registry.yaml    -> the recipes that read them
// Nothing here invents a fact. Run: npm run graph -w @bank-dashboards/portal
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const read = (p) => parse(readFileSync(join(repo, p), 'utf8'));

const sources = readdirSync(join(repo, 'sources'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => read(join('sources', f)));

const dictionary = read('catalog/data-dictionary.yaml');
const registry = read('catalog/kpi-registry.yaml');

const rawTables = sources.map((s) => ({
  id: s.table,
  layer: 'raw',
  name: s.table,
  schema: s.schema,
  system: s.system,
  description: s.description ?? '',
  grain: s.grain ?? '',
  key: s.key ?? [],
  notes: s.notes ?? '',
  profile: s.profile ?? {},
  columns: (s.columns ?? []).map((c) => ({
    name: c.name,
    type: c.type,
    nullable: c.nullable !== false,
    description: c.description ?? '',
    distinct: c.distinct ?? null,
    nullPct: c.null_pct ?? null,
    isKey: (s.key ?? []).includes(c.name),
  })),
}));

// Edges in the raw layer: a declared foreign key, plus the reverse direction so the
// canvas can show both ends. `status` comes straight from the source file; a column
// that references a table nobody filed is dropped rather than guessed at.
const known = new Set(rawTables.map((t) => t.id));
const rawEdges = [];
for (const s of sources) {
  for (const r of s.relationships ?? []) {
    const [toTable, toColumn] = String(r.references).split('.');
    if (!known.has(toTable)) continue;
    rawEdges.push({
      id: `${s.table}.${r.column}->${toTable}.${toColumn}`,
      layer: 'raw',
      from: s.table,
      fromColumn: r.column,
      to: toTable,
      toColumn,
      status: r.status ?? 'declared',
      cardinality: 'many-to-one',
    });
  }
}

const views = (dictionary.views ?? []).map((v) => ({
  id: v.name,
  layer: 'model',
  name: v.name,
  kind: v.name.startsWith('dim_') ? 'dimension' : 'fact',
  description: '',
  grain: v.grain ?? '',
  grainProof: v.grain_proof ?? null,
  rls: v.rls ?? 'none',
  refresh: v.refresh ?? '',
  sources: v.sources ?? [],
  usedBy: v.used_by ?? [],
  columns: (v.columns ?? []).map((c) => ({
    name: c.name,
    type: c.type,
    from: c.from ?? '',
    description: c.description ?? '',
    isRls: c.name === v.rls,
  })),
}));

// Lineage: every raw table a clean view reads.
const modelEdges = [];
for (const v of views) {
  for (const src of v.sources) {
    if (!known.has(src)) continue;
    modelEdges.push({
      id: `${src}=>${v.id}`,
      layer: 'model',
      from: src,
      to: v.id,
      kind: 'lineage',
    });
  }
}

const kpis = (registry.kpis ?? []).map((k) => ({
  id: k.id,
  status: k.status,
  meaning: k.meaning ?? '',
  owner: k.owner ?? '',
  view: k.view ?? '',
  formula: k.formula ?? '',
  aggregation: k.aggregation ?? '',
  filters: k.filters ?? [],
  excludes: k.excludes ?? '',
  dimensions: k.dimensions ?? [],
  format: k.format ?? '',
  introducedBy: k.introduced_by ?? '',
}));

const graph = {
  generatedAt: new Date().toISOString(),
  dictionaryGeneratedAt: dictionary.generated_at ?? null,
  rawTables,
  rawEdges,
  views,
  modelEdges,
  kpis,
};

mkdirSync(join(here, '..', 'src', 'data'), { recursive: true });
writeFileSync(join(here, '..', 'src', 'data', 'graph.json'), JSON.stringify(graph, null, 2) + '\n');
console.log(
  `graph.json: ${rawTables.length} raw tables, ${rawEdges.length} relationships, ` +
  `${views.length} clean tables, ${modelEdges.length} lineage edges, ${kpis.length} recipes`
);
