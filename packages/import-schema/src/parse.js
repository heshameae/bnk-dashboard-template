// The rules. Each numbered rule below is a test in test/parse.test.js and a line in the README.
// Input: the recognised sheets. Output: tables in a stable order, plus everything the report lists.
import { parseFk } from './fk.js';

const up = (s) => String(s ?? '').trim().toUpperCase();
const cell = (row, sheet, field) => (sheet.map[field] === undefined ? '' : String(row[sheet.map[field]] ?? ''));
const yes = (s) => /^(y|yes|true|1|x|pk)$/i.test(String(s).trim());
const no = (s) => /^(n|no|false|0)$/i.test(String(s).trim());
export const normaliseType = (t) => String(t ?? '').trim().replace(/\s+/g, ' ').replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')').replace(/\s*,\s*/g, ',');
const splitList = (s) => String(s ?? '').replace(/[()]/g, ' ').split(/[\s,;|]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
export const grainFromKey = (key) => (key.length ? `one row per ${key.join(' per ')}` : '');

export function parseExport({ columns, keys, joins }, { system }) {
  const tables = new Map();
  const report = { skipped: [], questions: [], notes: [] };
  const question = (table, text) => report.questions.push({ table, text });

  const table = (name, schema) => {
    if (!tables.has(name)) {
      tables.set(name, { table: name, system, schema, description: '', grain: '', key: [], columns: [], relationships: [], notes: [], flagsKey: [], keysKey: null, fk: '', joins: [], onColumns: false, onKeys: false, onJoins: false });
    }
    const t = tables.get(name);
    if (!t.schema && schema) t.schema = schema;
    return t;
  };

  // Rule 1: identifiers upper-cased and trimmed; a blank schema or table inherits the row above.
  let prevSchema = '';
  let prevTable = '';
  columns.rows.forEach((row, i) => {
    const line = columns.headerRow + 1 + i;
    const schema = up(cell(row, columns, 'schema')) || prevSchema;
    const name = up(cell(row, columns, 'table')) || prevTable;
    prevSchema = schema; prevTable = name;
    const col = up(cell(row, columns, 'column'));
    if (!name) { report.notes.push(`columns sheet line ${line}: no table name; row skipped`); return; }
    if (!col) { report.notes.push(`columns sheet line ${line}: no column name; row skipped`); return; }
    const t = table(name, schema);
    t.onColumns = true;
    // Rule 8: duplicate column rows, the first wins.
    if (t.columns.some((c) => c.name === col)) { report.notes.push(`${name}: column ${col} listed twice (line ${line}); the first row was kept`); return; }
    const c = { name: col, type: normaliseType(cell(row, columns, 'type')), description: cell(row, columns, 'description').trim() }; // Rules 5, 6
    const nullable = cell(row, columns, 'nullable');
    if (yes(nullable)) c.nullable = true; else if (no(nullable)) c.nullable = false;
    t.columns.push(c);
    if (yes(cell(row, columns, 'pk'))) t.flagsKey.push(col);
    const tdesc = cell(row, columns, 'table_description').trim();
    if (tdesc && !t.description) t.description = tdesc;
    const grain = cell(row, columns, 'grain').trim();
    if (grain && !t.grainGiven) t.grainGiven = grain;
    for (const x of columns.extras) { // anything else on the sheet is kept, never dropped
      const v = String(row[x.index] ?? '').trim();
      if (v) t.notes.push(`${col} ${x.header}: ${v}`);
    }
  });

  if (keys) {
    let prev = '';
    keys.rows.forEach((row, i) => {
      const line = keys.headerRow + 1 + i;
      const name = up(cell(row, keys, 'table')) || prev;
      prev = name;
      if (!name) { report.notes.push(`keys sheet line ${line}: no table name; row skipped`); return; }
      const t = table(name, up(cell(row, keys, 'schema')));
      t.onKeys = true;
      const pk = splitList(cell(row, keys, 'pk'));
      if (pk.length) t.keysKey = pk;
      const fk = cell(row, keys, 'fk').trim();
      if (fk) t.fk = t.fk ? `${t.fk}; ${fk}` : fk;
      for (const x of keys.extras) {
        const v = String(row[x.index] ?? '').trim();
        if (v) t.notes.push(`${x.header}: ${v}`);
      }
    });
  }

  // Rule 10: the joins sheet is one row per column pair. Every cell is an identifier on its own, so
  // nothing is parsed out of a sentence. A row missing any of the four sides is set aside, named.
  if (joins) {
    joins.rows.forEach((row, i) => {
      const line = joins.headerRow + 1 + i;
      const sides = { fromT: up(cell(row, joins, 'from_table')), fromC: up(cell(row, joins, 'from_column')), toT: up(cell(row, joins, 'to_table')), toC: up(cell(row, joins, 'to_column')) };
      const given = Object.values(sides).filter(Boolean);
      if (!given.length) return;
      if (given.length < 4) { report.notes.push(`joins sheet line ${line}: incomplete row [${given.join(', ')}]; set aside`); return; }
      const t = table(sides.fromT, up(cell(row, joins, 'from_schema')));
      t.onJoins = true;
      if (t.joins.some((j) => j.column === sides.fromC && j.references === `${sides.toT}.${sides.toC}`)) { report.notes.push(`joins sheet line ${line}: ${sides.fromT}.${sides.fromC} to ${sides.toT}.${sides.toC} listed twice; the first row was kept`); return; }
      t.joins.push({ column: sides.fromC, references: `${sides.toT}.${sides.toC}`, toTable: sides.toT, toColumn: sides.toC, name: up(cell(row, joins, 'join_name')) });
      for (const x of joins.extras) {
        const v = String(row[x.index] ?? '').trim();
        if (v) t.notes.push(`join ${sides.fromC} to ${sides.toT}.${sides.toC} ${x.header}: ${v}`);
      }
    });
  }

  // Pass one: the key and the grain of every table, so pass two can compare a join against them.
  for (const t of [...tables.values()]) {
    // Rule 8: a table that is only named on the keys or joins sheet gets no file.
    if (!t.onColumns) {
      const where = [t.onKeys && 'the keys sheet', t.onJoins && 'the joins sheet'].filter(Boolean).join(' and ');
      report.skipped.push({ table: t.table, reason: `named on ${where}, no rows on the columns sheet` });
      tables.delete(t.table);
      continue;
    }
    const colNames = t.columns.map((c) => c.name);
    // Rule 2: the key from the flags and from the keys sheet must agree; the keys sheet wins.
    if (t.keysKey && t.flagsKey.length && !same(t.keysKey, t.flagsKey)) {
      t.key = t.keysKey;
      t.notes.push(`PK disagreement: columns sheet flags [${t.flagsKey.join(', ')}]; keys sheet lists [${t.keysKey.join(', ')}]; the keys sheet was used`);
      question(t.table, `PK flags say [${t.flagsKey.join(', ')}] but the keys sheet says [${t.keysKey.join(', ')}]. Which is the primary key?`);
    } else t.key = t.keysKey ?? t.flagsKey;
    if (!t.key.length) question(t.table, 'No primary key given. What is one row of this table?');
    for (const k of t.key.filter((k) => !colNames.includes(k))) { // Rule 8
      t.notes.push(`key column ${k} is not in the column list`);
      question(t.table, `Key column ${k} is not in the column list. Is the key or the column list wrong?`);
    }
    // Rule 7: grain is their sentence when given, else the sentence the key implies.
    t.grain = t.grainGiven ?? grainFromKey(t.key);
  }

  // Pass two: relationships, from the joins sheet when there is one, else from the FK text.
  const names = new Set(tables.keys());
  const keyOf = (name) => tables.get(name)?.key ?? null;
  for (const t of tables.values()) {
    const colNames = t.columns.map((c) => c.name);
    if (t.joins.length) {
      if (t.fk) t.notes.push('FK text on the keys sheet was not read: this export has a joins sheet, which wins');
      t.relationships = t.joins.map((j) => ({ column: j.column, references: j.references, status: 'stated' })); // Rule 4
      // Rule 11: rows sharing a join name, or sharing a target table when no name is given, are one
      // join on several columns. When those columns are the target's whole key the join cannot
      // duplicate rows and nothing is asked. When they are not, it can, and that is the question.
      const groups = new Map();
      for (const j of t.joins) {
        const k = j.name || j.toTable;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(j);
      }
      for (const g of groups.values()) {
        const toT = g[0].toTable;
        if (g.some((j) => j.toTable !== toT)) {
          const named = g[0].name;
          t.notes.push(`join ${named} names more than one target table: ${[...new Set(g.map((j) => j.toTable))].join(', ')}`);
          question(t.table, `Join ${named} points at more than one table (${[...new Set(g.map((j) => j.toTable))].join(', ')}). Should it be one join per table?`);
          continue;
        }
        const key = keyOf(toT);
        if (!key || !key.length) continue; // the missing key was already asked about
        const cols = g.map((j) => j.toColumn);
        if (same(cols, key)) continue;
        t.notes.push(`join to ${toT} lands on [${cols.join(', ')}], which is not its key [${key.join(', ')}]`);
        question(t.table, `The join from ${t.table} to ${toT} uses [${cols.join(', ')}], which is not ${toT}'s key [${key.join(', ')}]. Can one ${t.table} row match more than one ${toT} row?`);
      }
    } else {
      // Rules 3, 4: FK text to stated relationships; unparsed text to notes.
      const { relationships, unparsed } = parseFk(t.fk);
      t.relationships = relationships.map((r) => ({ ...r, status: 'stated' }));
      for (const u of unparsed) { t.notes.push(`FK not parsed: ${u}`); question(t.table, `FK text "${u}" could not be read. Which column joins to which table and column?`); }
    }
    for (const r of t.relationships) {
      if (!colNames.includes(r.column)) { t.notes.push(`FK column ${r.column} is not in the column list`); question(t.table, `FK column ${r.column} is not in the column list.`); }
      const refTable = r.references.split('.')[0];
      if (!names.has(refTable)) { t.notes.push(`${r.references}: table ${refTable} is not in this handover`); question(t.table, `${r.column} references ${r.references}, but ${refTable} is not in the export. Is it in scope?`); continue; }
      const refCol = r.references.split('.')[1];
      if (!tables.get(refTable).columns.some((c) => c.name === refCol)) { t.notes.push(`${r.references}: column ${refCol} is not in ${refTable}`); question(t.table, `${r.column} references ${r.references}, but ${refTable} has no column ${refCol}.`); }
    }
    delete t.flagsKey; delete t.keysKey; delete t.fk; delete t.joins; delete t.onColumns; delete t.onKeys; delete t.onJoins; delete t.grainGiven;
  }
  const ordered = [...tables.values()].sort((a, b) => a.table.localeCompare(b.table));
  return { tables: ordered, report };
}
