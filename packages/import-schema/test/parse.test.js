import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readExport } from '../src/read.js';
import { recogniseExport } from '../src/recognise.js';
import { parseExport } from '../src/parse.js';
import { emitSource } from '../src/emit.js';
import { parse as parseYaml } from 'yaml';

const fixture = new URL('./fixtures/messy/', import.meta.url).pathname;
const run = () => parseExport(recogniseExport(readExport(fixture).sheets), { system: 'CBS' });
const table = (name) => run().tables.find((t) => t.table === name);

test('sheets are recognised by headers, with a title line above the header', () => {
  const rec = recogniseExport(readExport(fixture).sheets);
  assert.equal(rec.columns.name, 'columns');
  assert.equal(rec.columns.headerRow, 2);
  assert.equal(rec.keys.name, 'keys');
  assert.deepEqual(rec.columns.extras.map((x) => x.header), ['Remarks']);
});

test('rule 1: identifiers upper-cased and trimmed; blank schema and table inherit the row above', () => {
  const t = table('CBS_ACCT_BAL_DLY');
  assert.equal(t.schema, 'RAW_CBS');
  assert.deepEqual(t.columns.map((c) => c.name), ['ACCT_NO', 'BAL_DT', 'LDGR_BAL_AMT', 'CCY_CD']);
});

test('rule 2: PK flags and keys sheet disagree, the keys sheet wins and a question is raised', () => {
  const { tables, report } = run();
  const t = tables.find((x) => x.table === 'CBS_ACCT_BAL_DLY');
  assert.deepEqual(t.key, ['ACCT_NO', 'BAL_DT']);
  assert.ok(t.notes.some((n) => n.startsWith('PK disagreement')));
  assert.ok(report.questions.some((q) => q.table === 'CBS_ACCT_BAL_DLY' && /Which is the primary key/.test(q.text)));
  assert.deepEqual(tables.find((x) => x.table === 'CBS_ACCT').key, ['ACCT_NO']);
});

test('rules 3 and 4: FK text becomes stated relationships; unreadable text goes to notes and questions', () => {
  const { tables, report } = run();
  const t = tables.find((x) => x.table === 'CBS_ACCT');
  assert.deepEqual(t.relationships, [
    { column: 'CUST_ID', references: 'CBS_CUST.CUST_ID', status: 'stated' },
    { column: 'BRNCH_CD', references: 'CBS_BRNCH.BRNCH_CD', status: 'stated' },
  ]);
  assert.ok(t.notes.includes('FK not parsed: joins to products somehow'));
  assert.ok(t.notes.some((n) => n.includes('table CBS_CUST is not in this handover')));
  assert.ok(report.questions.some((q) => /CBS_CUST is not in the export/.test(q.text)));
});

test('rule 5: type spacing normalised, nothing else changed', () => {
  const t = table('CBS_ACCT_BAL_DLY');
  assert.deepEqual(t.columns.map((c) => c.type), ['VARCHAR2(20)', 'DATE', 'NUMBER(18,2)', 'CHAR(3)']);
});

test('rule 6: a blank definition is "", a filled one is the cell verbatim', () => {
  const t = table('CBS_ACCT_BAL_DLY');
  assert.equal(t.columns[3].description, '');
  assert.equal(t.columns[1].description, 'Balance date, calendar');
  assert.equal(t.description, '');
});

test('rule 7: grain is the sentence the key implies', () => {
  assert.equal(table('CBS_ACCT_BAL_DLY').grain, 'one row per ACCT_NO per BAL_DT');
  assert.equal(table('CBS_NOKEY').grain, '');
});

test('rule 8: keys-only table skipped, duplicate column first wins, missing key is a question', () => {
  const { tables, report } = run();
  assert.ok(!tables.some((t) => t.table === 'CBS_PROD'));
  assert.deepEqual(report.skipped.map((s) => s.table), ['CBS_PROD']);
  const dly = tables.find((t) => t.table === 'CBS_ACCT_BAL_DLY');
  assert.equal(dly.columns.filter((c) => c.name === 'LDGR_BAL_AMT').length, 1);
  assert.equal(dly.columns[2].description, 'Ledger balance, account currency');
  assert.ok(report.notes.some((n) => n.includes('LDGR_BAL_AMT listed twice')));
  assert.ok(report.questions.some((q) => q.table === 'CBS_NOKEY' && /No primary key/.test(q.text)));
});

test('extra columns are kept in notes, nullable is written only when given', () => {
  const t = table('CBS_ACCT_BAL_DLY');
  assert.ok(t.notes.includes('LDGR_BAL_AMT Remarks: masked in UAT'));
  assert.equal(t.columns[0].nullable, false);
  assert.equal(table('CBS_NOKEY').columns[0].nullable, undefined);
});

test('the emitted YAML round-trips through a parser and is stable', () => {
  const t = table('CBS_ACCT');
  const text = emitSource(t);
  assert.equal(text, emitSource(table('CBS_ACCT')));
  const doc = parseYaml(text);
  assert.equal(doc.table, 'CBS_ACCT');
  assert.deepEqual(doc.key, ['ACCT_NO']);
  assert.deepEqual(doc.columns.map((c) => c.name), ['ACCT_NO', 'CUST_ID', 'BRNCH_CD']);
  assert.equal(doc.columns[1].type, 'NUMBER(12)');
  assert.equal(doc.relationships[0].status, 'stated');
  assert.ok(doc.notes.includes('FK not parsed'));
  assert.equal(Object.keys(doc).join(','), 'table,system,schema,description,grain,key,columns,relationships,notes');
});
