// The second, independent pass: read the handover copy and the files, and check one against the
// other. Every check is a line: PASS <check> (<count>) or FAIL <check>: <detail>. The checks read
// the raw cells and the YAML with a parser; they never trust the importer's own tables.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readExport } from './read.js';
import { recogniseExport } from './recognise.js';
import { normaliseType } from './parse.js';
import { sha256Of } from './handover.js';

const up = (s) => String(s ?? '').trim().toUpperCase();
const at = (row, sheet, field) => (sheet.map[field] === undefined ? '' : String(row[sheet.map[field]] ?? ''));
const tokens = (s) => new Set(String(s).toUpperCase().split(/[^A-Z0-9_$#]+/).filter(Boolean));

export function validate({ root, handover }) {
  const results = [];
  const check = (name, failures, count) => results.push(failures.length ? { name, pass: false, detail: failures.slice(0, 5).join('; ') + (failures.length > 5 ? ` (+${failures.length - 5} more)` : '') } : { name, pass: true, count });

  const exp = readExport(handover);
  const { columns, keys } = recogniseExport(exp.sheets);
  if (!columns) { results.push({ name: 'export has a columns sheet', pass: false, detail: 'no sheet with table and column headers' }); return results; }

  // The export as cells: per table, its column rows in order; its PK flags, PK list, FK text.
  const expTables = new Map();
  let prevSchema = ''; let prevTable = '';
  for (const row of columns.rows) {
    const schema = up(at(row, columns, 'schema')) || prevSchema;
    const name = up(at(row, columns, 'table')) || prevTable;
    prevSchema = schema; prevTable = name;
    const col = up(at(row, columns, 'column'));
    if (!name || !col) continue;
    if (!expTables.has(name)) expTables.set(name, { schema, rows: [], flags: [], pk: null, fk: '', tdesc: '' });
    const t = expTables.get(name);
    if (t.rows.some((r) => r.col === col)) continue;
    t.rows.push({ col, type: normaliseType(at(row, columns, 'type')), desc: at(row, columns, 'description').trim() });
    if (/^(y|yes|true|1|x|pk)$/i.test(at(row, columns, 'pk').trim())) t.flags.push(col);
    const td = at(row, columns, 'table_description').trim();
    if (td && !t.tdesc) t.tdesc = td;
  }
  const keysOnly = [];
  if (keys) {
    let prev = '';
    for (const row of keys.rows) {
      const name = up(at(row, keys, 'table')) || prev;
      prev = name;
      if (!name) continue;
      if (!expTables.has(name)) { keysOnly.push(name); continue; }
      const t = expTables.get(name);
      const pk = at(row, keys, 'pk').replace(/[()]/g, ' ').split(/[\s,;|]+/).map(up).filter(Boolean);
      if (pk.length) t.pk = pk;
      const fk = at(row, keys, 'fk').trim();
      if (fk) t.fk = t.fk ? `${t.fk}; ${fk}` : fk;
    }
  }
  const allCells = new Set();
  for (const row of [...columns.rows, ...(keys?.rows ?? [])]) for (const c of row) if (String(c).trim()) allCells.add(String(c).trim());

  // The files as YAML.
  const dir = join(root, 'sources');
  const fileNames = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort() : [];
  const files = new Map();
  const bad = [];
  for (const f of fileNames) {
    try {
      const doc = parseYaml(readFileSync(join(dir, f), 'utf8'));
      if (!doc || typeof doc !== 'object') throw new Error('not a mapping');
      if (doc.table !== basename(f, '.yaml')) bad.push(`${f}: table is ${doc.table}`);
      files.set(doc.table, doc);
    } catch (e) { bad.push(`${f}: ${e.message}`); }
  }
  check('every sources/*.yaml parses and is named after its table', bad, fileNames.length);

  const expected = [...expTables.keys()].sort();
  const missing = expected.filter((t) => !files.has(t)).map((t) => `${t}: no file`);
  const extra = keysOnly.filter((t) => files.has(t)).map((t) => `${t}: file exists but the table has no column rows`);
  check('one file per table on the columns sheet, none for a keys-only table', [...missing, ...extra], expected.length);

  const inFiles = (t) => files.get(t) ?? { columns: [], key: [], relationships: [], notes: '' };
  const colFails = [];
  for (const [name, t] of expTables) {
    const cols = (inFiles(name).columns ?? []);
    if (cols.length !== t.rows.length) { colFails.push(`${name}: ${cols.length} columns in the file, ${t.rows.length} rows in the export`); continue; }
    t.rows.forEach((r, i) => {
      const c = cols[i] ?? {};
      if (c.name !== r.col) colFails.push(`${name} column ${i + 1}: file has ${c.name}, export has ${r.col}`);
      else if (String(c.type ?? '') !== r.type) colFails.push(`${name}.${r.col}: type "${c.type}" vs export "${r.type}"`);
      else if (String(c.description ?? '') !== r.desc) colFails.push(`${name}.${r.col}: description differs from the cell`);
    });
  }
  check('every column row of the export is in its file, in order, with its type and description', colFails, [...expTables.values()].reduce((n, t) => n + t.rows.length, 0));

  const keyFails = [];
  for (const [name, t] of expTables) {
    const want = t.pk ?? t.flags;
    const got = inFiles(name).key ?? [];
    if (want.length !== got.length || !want.every((k) => got.includes(k))) keyFails.push(`${name}: key [${got.join(', ')}] vs export [${want.join(', ')}]`);
  }
  check('every key equals the export (keys sheet, else the PK flags)', keyFails, expTables.size);

  const grainFails = [];
  for (const [name, doc] of files) {
    const g = String(doc.grain ?? '');
    if ((doc.key ?? []).length && !g.startsWith('one row per')) grainFails.push(`${name}: grain "${g}"`);
  }
  check('every keyed file has a grain sentence beginning "one row per"', grainFails, files.size);

  const descFails = [];
  for (const [name, doc] of files) {
    for (const d of [doc.description, ...(doc.columns ?? []).map((c) => c.description)]) {
      if (d && !allCells.has(String(d))) descFails.push(`${name}: "${String(d).slice(0, 40)}" is not a cell of the export`);
    }
  }
  check('every description in the files is a cell of the export, verbatim', descFails, files.size);

  const refFails = [];
  let relCount = 0;
  for (const [name, doc] of files) {
    const colNames = new Set((doc.columns ?? []).map((c) => c.name));
    const notes = String(doc.notes ?? '');
    const fkTokens = tokens(expTables.get(name)?.fk ?? '');
    for (const r of doc.relationships ?? []) {
      relCount++;
      const [refTable, refCol] = String(r.references).split('.');
      if (r.status !== 'stated') refFails.push(`${name}.${r.column}: status ${r.status}; only constraints or a count make a relationship proven`);
      if (!fkTokens.has(r.column) || !fkTokens.has(refTable) || !fkTokens.has(refCol)) refFails.push(`${name}.${r.column} -> ${r.references}: not in the FK cell`);
      if (!colNames.has(r.column) && !notes.includes(`FK column ${r.column}`)) refFails.push(`${name}.${r.column}: not a column and not in notes`);
      if (!files.has(refTable) && !notes.includes(`table ${refTable} is not in this handover`)) refFails.push(`${name}.${r.column} -> ${refTable}: no file and not in notes`);
    }
    for (const k of doc.key ?? []) if (!colNames.has(k) && !notes.includes(`key column ${k}`)) refFails.push(`${name}: key column ${k} not a column and not in notes`);
  }
  check('every relationship traces to the FK cell, is stated, and any gap is in notes', refFails, relCount);

  check('no file carries a profile block (the export has no counts)', [...files].filter(([, d]) => d.profile !== undefined).map(([n]) => n), files.size);

  const report = join(dir, '_import-report.md');
  const sha = sha256Of(handover);
  const repFails = [];
  if (!existsSync(report)) repFails.push('sources/_import-report.md missing');
  else {
    const text = readFileSync(report, 'utf8');
    if (!text.includes(`- sha256: ${sha}`)) repFails.push('report sha256 is not this handover');
    for (const t of expected) if (!text.includes(`sources/${t}.yaml`)) repFails.push(`report does not list ${t}`);
  }
  check('the report names this handover (by SHA-256) and every file', repFails, expected.length);
  return results;
}

export const formatResults = (results) => results.map((r) => (r.pass ? `PASS ${r.name} (${r.count})` : `FAIL ${r.name}: ${r.detail}`)).join('\n');
