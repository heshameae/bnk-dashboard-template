import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readXlsx } from '../src/xlsx.js';
import { xlsx } from './helpers.js';

const rows = [['Table', 'Column', 'Type'], ['T1', 'A', 'VARCHAR2(20)'], ['T1', null, 'x & y <z>'], [null, { inline: 'inline text' }, 42], [{ rich: ['two ', 'runs'] }, true, '']];

test('stored and deflated workbooks give the same dense rows', () => {
  for (const deflate of [false, true]) {
    const sheets = readXlsx(xlsx([{ name: 'columns', rows }, { name: 'keys', rows: [['Table', 'PK'], ['T1', 'A']] }], { deflate }));
    assert.equal(sheets.length, 2);
    assert.equal(sheets[0].name, 'columns');
    assert.deepEqual(sheets[0].rows, [
      ['Table', 'Column', 'Type'],
      ['T1', 'A', 'VARCHAR2(20)'],
      ['T1', '', 'x & y <z>'],
      ['', 'inline text', '42'],
      ['two runs', 'TRUE', ''],
    ]);
    assert.deepEqual(sheets[1].rows, [['Table', 'PK'], ['T1', 'A']]);
  }
});

test('a file that is not a workbook is refused with a reason', () => {
  assert.throws(() => readXlsx(Buffer.from('not a zip')), /not a zip/);
});
