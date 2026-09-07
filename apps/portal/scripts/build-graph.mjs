// Generates apps/portal/src/data/graph.json from the files that already own the truth:
//   sources/*.yaml            -> the raw layer the DEs hand over
//   catalog/data-dictionary.yaml -> the clean tables we build (generated at step 7)
//   catalog/kpi-registry.yaml    -> the recipes that read them
//   bi_model/*.sql               -> clean tables drafted but not yet deployed (status: draft)
// A clean table is `live` when the data dictionary lists it and `draft` until then.
// Nothing here invents a fact. Run: npm run graph -w @bank-dashboards/portal
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
// --sample renders docs/sample (arbitrary values, every shape filled) instead of the real files.
const sample = process.argv.includes('--sample');
const repo = sample ? join(root, 'docs', 'sample') : root;
const read = (p) => (existsSync(join(repo, p)) ? parse(readFileSync(join(repo, p), 'utf8')) : null);
const list = (dir, ext) => (existsSync(join(repo, dir)) ? readdirSync(join(repo, dir)).filter((f) => f.endsWith(ext)) : []);

// Every input is optional: the repo starts empty and the files appear step by step.
const sources = list('sources', '.yaml').map((f) => read(join('sources', f))).filter(Boolean);
const dictionary = read('catalog/data-dictionary.yaml') ?? { views: [], generated_at: null };
const registry = read('catalog/kpi-registry.yaml') ?? { kpis: [] };

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
  status: 'live',
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

// Drafts: a view file in bi_model/ that the dictionary does not list yet. Step 3 writes the
// file; step 7 deploys it and regenerates the dictionary. Until then the portal shows it as a
// draft, with its columns read from the SELECT list's aliases. Facts come from the six-line
// header (docs/CONVENTIONS.md); nothing is inferred beyond that.
const live = new Set(views.map((v) => v.id));
const header = (text, key) => {
  const m = text.match(new RegExp(`^--\\s*${key}:\\s*(.*)$`, 'mi'));
  return m ? m[1].trim() : '';
};
for (const f of list('bi_model', '.sql')) {
  const sql = readFileSync(join(repo, 'bi_model', f), 'utf8');
  const name = header(sql, 'view') || f.replace(/\.sql$/, '');
  if (live.has(name)) continue;
  const rlsLine = header(sql, 'RLS');
  const rls = /^none\b/i.test(rlsLine) || rlsLine === '' ? 'none' : rlsLine.split(/\s/)[0];
  const columns = [...sql.matchAll(/\bAS\s+([a-z_][a-z0-9_]*)\s*(?:,|\n|$)/gi)]
    .map((m) => m[1])
    .filter((c, i, a) => a.indexOf(c) === i && !/^(select|from|where|left|join|on)$/i.test(c))
    .map((c) => ({ name: c, type: '', from: '', description: '', isRls: c === rls }));
  views.push({
    id: name,
    layer: 'model',
    status: 'draft',
    name,
    kind: name.startsWith('dim_') ? 'dimension' : 'fact',
    description: '',
    grain: header(sql, 'grain'),
    grainProof: null,
    rls,
    refresh: header(sql, 'refresh'),
    sources: header(sql, 'sources').split(',').map((s) => s.trim()).filter(Boolean),
    usedBy: [],
    columns,
  });
}

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

graph.from = sample ? 'docs/sample' : 'repo';
mkdirSync(join(here, '..', 'src', 'data'), { recursive: true });
writeFileSync(join(here, '..', 'src', 'data', 'graph.json'), JSON.stringify(graph, null, 2) + '\n');
console.log(
  `graph.json (${graph.from}): ${rawTables.length} raw tables, ${rawEdges.length} relationships, ` +
  `${views.length} clean tables (${views.filter((v) => v.status === 'draft').length} draft), ${modelEdges.length} lineage edges, ${kpis.length} recipes`
);
