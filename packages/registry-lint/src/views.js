// The checks on bi_model/*.sql. One PASS/FAIL line per check per view, plus the cross-view check.
// Each mirrors a line of docs/review/view-checklist.md or docs/CONVENTIONS.md that code can decide;
// the checklist's judgment lines (one subject, dates through dim_date) stay with the reviewer.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readView, columnRefs } from './sql.js';

const AGG = /\b(SUM|COUNT|AVG|MIN|MAX|LISTAGG|STDDEV|VARIANCE|MEDIAN)\s*\(/i;
const WINDOW = /\bOVER\s*\(/i;
const SNAKE = /^[a-z][a-z0-9_]*$/;

function loadSources(root) {
  const dir = join(root, 'sources');
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
    try { const d = parseYaml(readFileSync(join(dir, f), 'utf8')); if (d?.table) out.set(String(d.table).toUpperCase(), d); } catch { /* reported elsewhere */ }
  }
  return out;
}

export function lintViews({ root }) {
  const dir = join(root, 'bi_model');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.sql')).sort() : [];
  const sources = loadSources(root);
  const policyPath = join(root, 'security', 'rls-policies.yaml');
  const policies = existsSync(policyPath) ? (parseYaml(readFileSync(policyPath, 'utf8'))?.policies ?? {}) : null;
  const results = [];
  const add = (view, name, failures, count = 1) => results.push({ view, name, pass: !failures.length, count, detail: failures.join('; ') });
  const renames = new Map(); // TABLE.COL -> { name, view }

  for (const f of files) {
    const fileName = basename(f, '.sql');
    const v = readView(readFileSync(join(dir, f), 'utf8'));
    const isFact = !fileName.startsWith('dim_');

    // 1. Header: six lines in order, view equals file name, grain sentence, proof path.
    const head = [...v.problems.filter((p) => p.startsWith('line '))];
    if (v.header.view && v.header.view !== fileName) head.push(`header view "${v.header.view}" is not the file name`);
    if (v.header.grain !== undefined && !/^one row per /.test(v.header.grain)) head.push('grain does not begin "one row per"');
    if (v.header.proof !== undefined && !new RegExp(`^bi_model/proofs/${fileName}\\.md \\((\\d{4}-\\d{2}-\\d{2}|pending)\\)$`).test(v.header.proof)) head.push(`proof line is not "bi_model/proofs/${fileName}.md (<date>|pending)"`);
    add(fileName, 'header: six lines in order, view is the file name, grain sentence, proof path', head);

    // 2. Statement shape.
    const shape = v.problems.filter((p) => !p.startsWith('line '));
    if (v.name && v.name !== fileName) shape.push(`CREATE VIEW names ${v.name}, file is ${fileName}`);
    add(fileName, 'statement: CREATE OR REPLACE VIEW bi_model.<file name> AS SELECT ... FROM ...', shape);
    if (!v.name || !v.tables.length) continue;

    const aliases = new Map(v.tables.map((t) => [t.alias, t]));

    // 3. Renamed once: every select item has a snake_case business name and is not the raw name.
    const ren = [];
    for (const it of v.items) {
      if (!it.alias) { ren.push(`"${it.expr.slice(0, 40)}" has no AS <business_name>`); continue; }
      if (!SNAKE.test(it.alias)) ren.push(`${it.alias} is not snake_case`);
      if (it.source && it.source.column.toLowerCase() === it.alias.toLowerCase()) ren.push(`${it.alias} keeps the raw column name`);
      if (it.source && !aliases.has(it.source.alias)) ren.push(`${it.alias} reads ${it.source.alias}.${it.source.column} but ${it.source.alias} is not a table in FROM`);
    }
    add(fileName, 'every column is renamed once to a snake_case business name', ren, v.items.length);

    // 4. Header sources equal the tables in FROM and JOIN.
    const declared = new Set((v.header.sources ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
    const used = new Set(v.tables.map((t) => t.table));
    const src = [];
    for (const t of used) if (!declared.has(t)) src.push(`${t} is read but not in the header's sources line`);
    for (const t of declared) if (!used.has(t)) src.push(`${t} is in the header but not read`);
    add(fileName, 'the header sources line equals the tables read', src, used.size);

    // 5. Every table has a sources file; every join is to a table on its full key.
    const jn = [];
    for (const t of v.tables) if (!sources.has(t.table)) jn.push(`${t.table}: no sources/${t.table}.yaml`);
    for (const j of v.joins) {
      if (j.kind === 'RIGHT' || j.kind === 'FULL' || j.kind === 'CROSS') { jn.push(`${j.table}: ${j.kind} JOIN; a view joins to a dimension with JOIN or LEFT JOIN only`); continue; }
      const key = (sources.get(j.table)?.key ?? []).map((k) => String(k).toUpperCase());
      if (!key.length) { jn.push(`${j.table}: no key in its sources file, so the join cannot be checked`); continue; }
      const onCols = [...new Set(columnRefs(j.on, j.alias))];
      if (onCols.length !== key.length || !key.every((k) => onCols.includes(k))) jn.push(`${j.table}: joined on [${onCols.join(', ')}], its key is [${key.join(', ')}]; a join off the full key multiplies rows`);
    }
    add(fileName, 'every table has a sources file and every join lands on the joined table\'s full key', jn, v.joins.length);

    // 6. No metric math and no silent row loss in a fact view.
    const math = [];
    if (isFact) {
      if (AGG.test(v.selectText) && !WINDOW.test(v.selectText)) math.push('an aggregate in the SELECT; sums and counts belong in a recipe');
      if (WINDOW.test(v.selectText)) math.push('a window function in a fact view; that is metric math, it belongs in a recipe');
      if (v.hasGroupBy) math.push('GROUP BY; the view is rows, not answers');
      if (v.where) math.push(`WHERE ${v.where.slice(0, 40)}: a filter in a fact view drops rows silently; expose a status column and let the recipe exclude`);
    } else if (v.hasGroupBy) math.push('GROUP BY in a dimension view; a dimension is one row per key of its source');
    add(fileName, isFact ? 'fact view: no aggregate, window, GROUP BY or WHERE' : 'dimension view: no GROUP BY', math);

    // 7. RLS line names an exposed column or none with a reason; the policy file agrees.
    const rls = [];
    const line = v.header.RLS ?? '';
    const col = /^none\b/i.test(line) ? 'none' : line.split(/[\s,]/)[0];
    if (col === 'none' && !/^none\s*,\s*\S/.test(line)) rls.push('RLS: none needs a reason after a comma');
    if (col !== 'none' && !v.items.some((it) => it.alias === col)) rls.push(`RLS column ${col} is not a column the view exposes`);
    if (!policies) rls.push('security/rls-policies.yaml missing; the draft writes the stub and /rls confirms it');
    else {
      const p = policies[fileName];
      if (!p) rls.push(`no policy entry for ${fileName}; a table without one cannot be queried`);
      else if (String(p.column) !== col) rls.push(`policy column "${p.column}" differs from the header's "${col}"`);
      else if (col === 'none' && !p.reason) rls.push('policy has column: none without a reason');
    }
    add(fileName, 'RLS line names an exposed column (or none with a reason) and the policy entry matches', rls);

    // Cross-view: one raw column, one business name.
    for (const it of v.items) {
      if (!it.source || !it.alias) continue;
      const t = aliases.get(it.source.alias);
      if (!t) continue;
      const key = `${t.table}.${it.source.column.toUpperCase()}`;
      const seen = renames.get(key);
      if (seen && seen.name !== it.alias) results.push({ view: '*', name: 'one raw column, one business name across views', pass: false, count: 1, detail: `${key} is ${seen.name} in ${seen.view} and ${it.alias} in ${fileName}` });
      else if (!seen) renames.set(key, { name: it.alias, view: fileName });
    }
  }
  if (!results.some((r) => r.view === '*')) results.push({ view: '*', name: 'one raw column, one business name across views', pass: true, count: renames.size, detail: '' });
  return { files: files.length, results };
}

export const formatResults = (results) => results.map((r) => (r.pass ? `PASS ${r.view}: ${r.name} (${r.count})` : `FAIL ${r.view}: ${r.name}: ${r.detail}`)).join('\n');
