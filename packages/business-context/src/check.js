// The checks on dashboards/<name>/business-context.md. Each is a PASS/FAIL line. The one that
// matters most is "their words": every sentence in the file is a substring of the input text,
// case and spacing aside. A reworded sentence, however slightly, fails.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { inputText } from './text.js';

export const SECTIONS = ['Who will use it', 'Questions it should answer', 'The numbers', 'Filters on the page', 'Where the data comes from', 'Who is allowed to see it', 'Notes from the business', 'Open questions'];
export const COLUMNS = ['#', 'Name they use', 'Meaning, verbatim', 'Compare to', 'Break down by', 'Leave out', 'Owner', 'Recipe'];
const MORE = /^And \d+ more gaps? in the table; meet again before step 3\.$/;

export const norm = (s) => String(s ?? '').toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const unquote = (s) => s.replace(/^"(.*)"$/s, '$1');
const bare = (s) => norm(unquote(s.trim())).replace(/[.;:,]+$/, '');

export function parseContext(text) {
  const lines = text.split('\n');
  const title = /^# Business context: (.+)$/.exec(lines[0] ?? '')?.[1] ?? null;
  const meta = /^owner:\s*(.+?)\s{2,}requested:\s*(\S+)\s{2,}status:\s*(draft|confirmed)\s*$/.exec(lines[1] ?? '');
  const sections = [];
  let cur = null;
  for (const line of lines.slice(2)) {
    const h = /^## (\d)\. (.+)$/.exec(line);
    if (h) { cur = { n: Number(h[1]), title: h[2], lines: [] }; sections.push(cur); } else if (cur) cur.lines.push(line);
  }
  for (const s of sections) while (s.lines.length && s.lines[s.lines.length - 1].trim() === '') s.lines.pop();
  const numbers = sections.find((s) => s.n === 3);
  const tableLines = (numbers?.lines ?? []).filter((l) => l.trim().startsWith('|'));
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const table = { header: tableLines[0] ? cells(tableLines[0]) : [], rows: tableLines.slice(2).map(cells) };
  return { title, meta: meta ? { owner: meta[1], requested: meta[2], status: meta[3] } : null, sections, table };
}

export function check({ root, dashboard, inputs }) {
  const results = [];
  const add = (name, failures, count) => results.push(failures.length ? { name, pass: false, detail: failures.slice(0, 5).join('; ') + (failures.length > 5 ? ` (+${failures.length - 5} more)` : '') } : { name, pass: true, count });
  const path = join(root, 'dashboards', dashboard, 'business-context.md');
  if (!existsSync(path)) { results.push({ name: 'the file exists', pass: false, detail: `${path} missing` }); return results; }
  const doc = parseContext(readFileSync(path, 'utf8'));
  const input = norm(inputs.map(inputText).join('\n'));
  const said = (s) => input.includes(bare(s));

  const head = [];
  if (!doc.title) head.push('line 1 is not "# Business context: <name>"');
  if (!doc.meta) head.push('line 2 is not "owner: <role>  requested: <date>  status: draft|confirmed"');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.meta.requested)) head.push(`requested "${doc.meta.requested}" is not YYYY-MM-DD`);
  add('title line, owner, requested date and status', head, 1);

  const sec = [];
  SECTIONS.forEach((t, i) => {
    const s = doc.sections[i];
    if (!s || s.n !== i + 1 || s.title !== t) sec.push(`section ${i + 1} should be "${t}"`);
    else if (!s.lines.some((l) => l.trim())) sec.push(`section ${i + 1} is empty (write "not given")`);
  });
  add('all eight sections, in the contract\'s order, none empty', sec, SECTIONS.length);

  const free = [];
  for (const n of [1, 2, 4, 5, 6, 7]) {
    for (const line of doc.sections.find((s) => s.n === n)?.lines ?? []) {
      const t = line.trim().replace(/^(\d+\.|-|\*)\s+/, '');
      if (!t || t === 'not given') continue;
      if (!said(t)) free.push(`section ${n}: "${t.slice(0, 50)}" is not in the input`);
    }
  }
  add('every line of sections 1, 2, 4, 5, 6 and 7 is their sentence, verbatim', free, 6);

  const tab = [];
  const { header, rows } = doc.table;
  if (header.join('|') !== COLUMNS.join('|')) tab.push(`table header is [${header.join(' | ')}]`);
  rows.forEach((r, i) => { if (r.length !== COLUMNS.length) tab.push(`row ${i + 1} has ${r.length} cells`); });
  if (!rows.length) tab.push('no rows');
  add('the numbers table has the contract\'s eight columns and full rows', tab, rows.length);

  const row = (r) => Object.fromEntries(COLUMNS.map((c, i) => [c, r[i] ?? '']));
  const words = [];
  const gaps = [];
  for (const r of rows.map(row)) {
    const m = r['Meaning, verbatim'];
    if (m === '?') gaps.push(r);
    else if (!/^".+"$/s.test(m)) words.push(`row ${r['#']}: meaning is not in quotes`);
    else if (!said(m)) words.push(`row ${r['#']}: meaning is not their sentence`);
    else if (norm(m).includes('not sure')) words.push(`row ${r['#']}: meaning says "not sure"; write ? and ask`);
    for (const col of ['Compare to', 'Break down by']) {
      const v = r[col];
      if (v === '?') { if (!gaps.includes(r)) gaps.push(r); continue; }
      if (v === 'not given') continue;
      if (!v) words.push(`row ${r['#']}: ${col} is empty; write ? or not given`);
      else if (!said(v)) words.push(`row ${r['#']}: ${col} "${v}" is not their words`);
    }
    const lo = r['Leave out'];
    if (lo === '?') { if (!gaps.includes(r)) gaps.push(r); } else if (!lo) words.push(`row ${r['#']}: Leave out is empty; an empty exclusion is a question, write ?`);
    else if (norm(lo).includes('not sure')) words.push(`row ${r['#']}: Leave out says "not sure"; write ? and ask`);
    else if (!said(lo)) words.push(`row ${r['#']}: Leave out "${lo}" is not their words`);
    if (!r.Owner) words.push(`row ${r['#']}: no owner`);
  }
  add('every meaning is quoted and verbatim; compare, break down and leave out are their words, ? or not given', words, rows.length);

  const registry = existsSync(join(root, 'catalog', 'kpi-registry.yaml')) ? parseYaml(readFileSync(join(root, 'catalog', 'kpi-registry.yaml'), 'utf8')) : null;
  const confirmed = new Map((registry?.kpis ?? []).filter((k) => k.status === 'CONFIRMED').map((k) => [k.id, k]));
  const rec = [];
  for (const r of rows.map(row)) {
    const v = r.Recipe;
    if (v === 'new') continue;
    const id = /^reuse (kpi\.[a-z0-9_]+)$/.exec(v)?.[1];
    if (!id) { rec.push(`row ${r['#']}: Recipe "${v}" is not new or reuse kpi.<id>`); continue; }
    if (!registry) { rec.push(`row ${r['#']}: reuse ${id} but there is no catalog/kpi-registry.yaml`); continue; }
    const k = confirmed.get(id);
    if (!k) { rec.push(`row ${r['#']}: ${id} is not a CONFIRMED recipe`); continue; }
    if (unquote(r['Meaning, verbatim']) !== String(k.meaning)) rec.push(`row ${r['#']}: meaning differs from ${id}; reuse needs the same sentence character for character`);
  }
  add('Recipe is new, or reuse of a CONFIRMED recipe with the identical meaning', rec, rows.length);

  const q = doc.sections.find((s) => s.n === 8)?.lines.map((l) => l.trim()).filter(Boolean) ?? [];
  const questions = q.filter((l) => /^\d+\. /.test(l));
  const more = q.find((l) => MORE.test(l));
  const qf = [];
  if (questions.length > 7) qf.push(`${questions.length} questions; at most seven`);
  for (const l of questions) if (!/ Owner: \S/.test(l)) qf.push(`"${l.slice(0, 40)}" names no owner (end with "Owner: <role>, by <date>")`);
  for (const l of q) if (!/^\d+\. /.test(l) && !MORE.test(l) && l !== 'not given') qf.push(`"${l.slice(0, 40)}" is neither a numbered question nor the "And N more gaps" line`);
  add('section 8: at most seven numbered questions, each with an owner', qf, questions.length);

  const cover = [];
  for (const r of gaps) {
    const name = norm(r['Name they use']);
    if (!questions.some((l) => norm(l).includes(name)) && !more) cover.push(`row ${r['#']} (${r['Name they use']}) has a ? and no question names it`);
  }
  add('every ? in the table has a question naming the number, or the "meet again" line', cover, gaps.length);
  return results;
}

export const formatResults = (results) => results.map((r) => (r.pass ? `PASS ${r.name} (${r.count})` : `FAIL ${r.name}: ${r.detail}`)).join('\n');
