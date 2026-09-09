#!/usr/bin/env node
// import-schema inventory <export>
// import-schema import <export> --system <CODE> [--date YYYY-MM-DD] [--root <repo>]
// import-schema validate [<handover>] [--root <repo>]
// Exit 0 on success, 1 on a FAIL line, 2 when the export cannot be read or recognised.
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { readExport } from './read.js';
import { recogniseExport, fieldName } from './recognise.js';
import { parseExport } from './parse.js';
import { emitSource, emitReport } from './emit.js';
import { fileHandover, newestHandover } from './handover.js';
import { validate, formatResults } from './validate.js';

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else out._.push(argv[i]);
  }
  return out;
}

function findRoot(given) {
  if (given) return resolve(given);
  let d = process.cwd();
  for (;;) {
    if (existsSync(join(d, 'CLAUDE.md')) && existsSync(join(d, 'package.json'))) return d;
    const up = dirname(d);
    if (up === d) return process.cwd();
    d = up;
  }
}

const pad = (s, n) => String(s).padEnd(n);

function inventory(exportPath) {
  const exp = readExport(exportPath);
  const rec = recogniseExport(exp.sheets);
  const lines = [];
  for (const s of rec.all) {
    const role = rec.columns === s ? 'columns' : rec.keys === s ? 'keys' : rec.joins === s ? 'joins' : 'ignored';
    if (role === 'ignored') { lines.push(`sheet "${s.name}": ignored (headers: ${s.headers.map((h) => JSON.stringify(String(h))).join(', ') || 'none'})`); continue; }
    const mapped = Object.keys(s.map).map((f) => `${f}=${JSON.stringify(fieldName(s, f))}`).join(' ');
    const extras = s.extras.length ? `; kept in notes: ${s.extras.map((x) => JSON.stringify(x.header)).join(', ')}` : '';
    lines.push(`sheet "${s.name}": ${role} (${s.rows.length} rows, header on line ${s.headerRow}) ${mapped}${extras}`);
  }
  if (!rec.columns) return { ok: false, text: lines.concat('no columns sheet: no sheet has both a table header and a column header').join('\n') };
  const { tables, report } = parseExport(rec, { system: '?' });
  const rows = [['table', 'columns', 'pk (flags)', 'pk (keys sheet)', 'fk text']];
  // Re-derive the two PK sources from the sheets so a disagreement is visible before any file exists.
  const flags = new Map(); const pks = new Map(); const fks = new Map();
  let prev = '';
  for (const row of rec.columns.rows) {
    const t = String(row[rec.columns.map.table] ?? '').trim().toUpperCase() || prev; prev = t;
    const c = String(row[rec.columns.map.column] ?? '').trim().toUpperCase();
    if (!flags.has(t)) flags.set(t, []);
    if (rec.columns.map.pk !== undefined && /^(y|yes|true|1|x|pk)$/i.test(String(row[rec.columns.map.pk] ?? '').trim())) flags.get(t).push(c);
  }
  if (rec.keys) {
    prev = '';
    for (const row of rec.keys.rows) {
      const t = String(row[rec.keys.map.table] ?? '').trim().toUpperCase() || prev; prev = t;
      if (rec.keys.map.pk !== undefined) pks.set(t, String(row[rec.keys.map.pk] ?? '').trim());
      if (rec.keys.map.fk !== undefined) fks.set(t, String(row[rec.keys.map.fk] ?? '').trim().replace(/\s+/g, ' '));
    }
  }
  if (rec.joins) {
    rows[0][4] = 'joins (from the joins sheet)';
    for (const row of rec.joins.rows) {
      const g = (f) => String(row[rec.joins.map[f]] ?? '').trim().toUpperCase();
      const [ft, fc, tt, tc] = ['from_table', 'from_column', 'to_table', 'to_column'].map(g);
      if (!ft || !fc || !tt || !tc) continue;
      fks.set(ft, [fks.get(ft), `${fc} -> ${tt}.${tc}`].filter(Boolean).join('; '));
    }
  }
  const all = [...new Set([...tables.map((t) => t.table), ...report.skipped.map((s) => s.table)])].sort();
  for (const name of all) {
    const t = tables.find((x) => x.table === name);
    rows.push([name, t ? String(t.columns.length) : '0 (skipped)', (flags.get(name) ?? []).join(', ') || '-', pks.get(name) || '-', fks.get(name) || '-']);
  }
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  for (const r of rows) lines.push(r.map((c, i) => (i === r.length - 1 ? c : pad(c, w[i]))).join('  '));
  lines.push(`${tables.length} tables with columns, ${report.skipped.length} skipped, ${report.questions.length} questions`);
  return { ok: true, text: lines.join('\n') };
}

function importCmd(exportPath, opts) {
  const root = findRoot(opts.root);
  if (!opts.system || opts.system === true) throw new Error('--system <CODE> is required (the source system code, e.g. the schema prefix the data team uses); the export carries none');
  const system = String(opts.system).toUpperCase();
  const date = opts.date && opts.date !== true ? String(opts.date) : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got ${date}`);
  const exp = readExport(exportPath);
  const rec = recogniseExport(exp.sheets);
  if (!rec.columns) throw new Error('no columns sheet: no sheet has both a table header and a column header. Run `inventory` to see the headers.');
  const { target, sha } = fileHandover({ root, exportPath, kind: exp.kind, system, date });
  const { tables, report } = parseExport(rec, { system });
  const dir = join(root, 'sources');
  mkdirSync(dir, { recursive: true });
  const before = new Set(readdirSync(dir).filter((f) => f.endsWith('.yaml')));
  for (const t of tables) { writeFileSync(join(dir, `${t.table}.yaml`), emitSource(t)); before.delete(`${t.table}.yaml`); }
  const stale = [...before].sort();
  const sheets = rec.all.map((s) => ({ name: s.name, role: rec.columns === s ? 'columns' : rec.keys === s ? 'keys' : rec.joins === s ? 'joins' : 'ignored', reason: rec.ignored.find((x) => x.name === s.name)?.reason, rows: s.rows, headerRow: s.headerRow }));
  const handover = relative(root, target);
  writeFileSync(join(dir, '_import-report.md'), emitReport({ handover, sha256: sha, date, system, sheets, written: tables, stale, skipped: report.skipped, questions: report.questions, notes: report.notes }));
  const lines = [
    `handover: ${handover} (sha256 ${sha})`,
    `files written: ${tables.length}`,
    `tables skipped: ${report.skipped.length}`,
    `files not in this handover: ${stale.length}`,
    `questions for the data team: ${report.questions.length}`,
    `report: sources/_import-report.md`,
    '',
  ];
  const results = validate({ root, handover: target });
  lines.push(formatResults(results));
  return { ok: results.every((r) => r.pass), text: lines.join('\n') };
}

function validateCmd(handover, opts) {
  const root = findRoot(opts.root);
  const path = handover ? resolve(handover) : newestHandover(root);
  if (!path) throw new Error('no handover under sources/_handover/; run `import` first');
  const results = validate({ root, handover: path });
  return { ok: results.every((r) => r.pass), text: `handover: ${relative(root, path)}\n${formatResults(results)}` };
}

export function main(argv) {
  const a = args(argv);
  const [cmd, target] = a._;
  try {
    let r;
    if (cmd === 'inventory' && target) r = inventory(target);
    else if (cmd === 'import' && target) r = importCmd(target, a);
    else if (cmd === 'validate') r = validateCmd(target, a);
    else return { code: 2, text: readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 5).map((l) => l.replace(/^\/\/ ?/, '')).join('\n') };
    return { code: r.ok ? 0 : 1, text: r.text };
  } catch (e) {
    return { code: 2, text: `error: ${e.message}` };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const { code, text } = main(process.argv.slice(2));
  process.stdout.write(text + '\n');
  process.exit(code);
}
