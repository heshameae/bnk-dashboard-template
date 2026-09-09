// The joins sheet: one row per column pair, the shape in docs/templates/schema-export-joins.csv.
// Rules 10 and 11 in the README. The fixture mirrors the shapes a real export has thrown at us:
// a two-column join, a join that lands on part of a key, a target that is not in the export, and
// a half-filled row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readExport } from '../src/read.js';
import { recogniseExport } from '../src/recognise.js';
import { parseExport } from '../src/parse.js';

const FIXTURE = new URL('./fixtures/template/', import.meta.url).pathname;
const load = () => {
  const rec = recogniseExport(readExport(FIXTURE).sheets);
  return { rec, ...parseExport(rec, { system: 'T' }) };
};
const find = (tables, name) => tables.find((t) => t.table === name);
const asked = (report, table, needle) => report.questions.some((q) => q.table === table && q.text.includes(needle));

test('a sheet with from and to headers is recognised as joins, not as columns', () => {
  const { rec } = load();
  assert.equal(rec.joins?.name, 'joins');
  assert.equal(rec.columns?.name, 'columns');
  assert.equal(rec.keys, null);
  assert.deepEqual(Object.keys(rec.joins.map).sort(), ['from_column', 'from_table', 'to_column', 'to_table']);
});

test('each complete row becomes one stated relationship, in sheet order', () => {
  const { tables } = load();
  const t = find(tables, 'ACCT_BALANCE');
  assert.deepEqual(t.relationships, [
    { column: 'PROD_CD', references: 'PRODUCT_MAP.PROD_CD', status: 'stated' },
    { column: 'GL_CD', references: 'PRODUCT_MAP.GL_CD', status: 'stated' },
    { column: 'CUST_NUM', references: 'CUSTOMER.CUST_NUM', status: 'stated' },
    { column: 'CUST_NUM', references: 'MISSING_TABLE.CUST_NUM', status: 'stated' },
  ]);
});

test('identifiers are upper-cased, so a lower-case row joins the same table', () => {
  const { tables } = load();
  assert.ok(find(tables, 'ACCT_BALANCE').relationships.some((r) => r.references === 'CUSTOMER.CUST_NUM'));
});

test('rows sharing a target whose columns are its whole key ask nothing', () => {
  const { tables, report } = load();
  assert.deepEqual(find(tables, 'PRODUCT_MAP').key, ['PROD_CD', 'GL_CD']);
  assert.equal(asked(report, 'ACCT_BALANCE', 'to PRODUCT_MAP'), false);
  assert.equal(find(tables, 'ACCT_BALANCE').notes.some((n) => n.includes('PRODUCT_MAP')), false);
});

test('a join landing on part of the target key asks whether it can duplicate rows', () => {
  const { tables, report } = load();
  assert.ok(asked(report, 'ACCT_BALANCE', 'to CUSTOMER uses [CUST_NUM], which is not CUSTOMER\'s key [BUSINESS_DT, CUST_NUM]'));
  assert.ok(find(tables, 'ACCT_BALANCE').notes.some((n) => n.includes('join to CUSTOMER lands on [CUST_NUM]')));
});

test('a target table that is not in the export is a note and a question', () => {
  const { tables, report } = load();
  assert.ok(asked(report, 'ACCT_BALANCE', 'MISSING_TABLE is not in the export'));
  assert.ok(find(tables, 'ACCT_BALANCE').notes.some((n) => n.includes('table MISSING_TABLE is not in this handover')));
});

test('a row missing one of the four sides is set aside with its line number', () => {
  const { report } = load();
  assert.ok(report.notes.some((n) => /^joins sheet line 6: incomplete row/.test(n)));
});

test('the joins sheet wins over FK text and says so in the notes', () => {
  const sheets = [
    { name: 'columns', rows: [['Table', 'Column', 'PK'], ['A', 'ID', 'Y'], ['B', 'ID', 'Y']] },
    { name: 'keys', rows: [['Table', 'Primary Key', 'Foreign Keys'], ['A', 'ID', 'ID -> B.ID']] },
    { name: 'joins', rows: [['From table', 'From column', 'To table', 'To column'], ['A', 'ID', 'B', 'ID']] },
  ];
  const { tables } = parseExport(recogniseExport(sheets), { system: 'T' });
  const a = find(tables, 'A');
  assert.equal(a.relationships.length, 1);
  assert.ok(a.notes.some((n) => n.includes('FK text on the keys sheet was not read')));
});

test('a join name groups columns even when the targets differ, and that is a question', () => {
  const sheets = [
    { name: 'columns', rows: [['Table', 'Column', 'PK'], ['A', 'X', ''], ['A', 'Y', ''], ['B', 'X', 'Y'], ['C', 'Y', 'Y']] },
    { name: 'joins', rows: [['Join name', 'From table', 'From column', 'To table', 'To column'], ['J1', 'A', 'X', 'B', 'X'], ['J1', 'A', 'Y', 'C', 'Y']] },
  ];
  const { report } = parseExport(recogniseExport(sheets), { system: 'T' });
  assert.ok(asked(report, 'A', 'points at more than one table'));
});

test('a target named only on the joins sheet gets no file; the question names it', () => {
  const { tables, report } = load();
  assert.equal(find(tables, 'MISSING_TABLE'), undefined);
  assert.equal(report.skipped.some((x) => x.table === 'MISSING_TABLE'), false);
  assert.ok(asked(report, 'ACCT_BALANCE', 'MISSING_TABLE is not in the export'));
});

test('a from-table with no column rows is skipped, and the joins sheet is named as the reason', () => {
  const sheets = [
    { name: 'columns', rows: [['Table', 'Column', 'PK'], ['B', 'ID', 'Y']] },
    { name: 'joins', rows: [['From table', 'From column', 'To table', 'To column'], ['A', 'ID', 'B', 'ID']] },
  ];
  const { tables, report } = parseExport(recogniseExport(sheets), { system: 'T' });
  assert.equal(find(tables, 'A'), undefined);
  const s = report.skipped.find((x) => x.table === 'A');
  assert.ok(s, 'A should be skipped');
  assert.match(s.reason, /joins sheet/);
});

test('a duplicate column pair is kept once and named', () => {
  const sheets = [
    { name: 'columns', rows: [['Table', 'Column', 'PK'], ['A', 'ID', ''], ['B', 'ID', 'Y']] },
    { name: 'joins', rows: [['From table', 'From column', 'To table', 'To column'], ['A', 'ID', 'B', 'ID'], ['A', 'ID', 'B', 'ID']] },
  ];
  const { tables, report } = parseExport(recogniseExport(sheets), { system: 'T' });
  assert.equal(find(tables, 'A').relationships.length, 1);
  assert.ok(report.notes.some((n) => n.includes('listed twice')));
});
