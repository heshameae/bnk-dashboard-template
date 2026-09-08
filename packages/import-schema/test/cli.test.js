// End to end in a temporary repo root: import, validate, tamper, validate again, re-import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../src/cli.js';
import { readExport } from '../src/read.js';
import { xlsx } from './helpers.js';

const fixture = new URL('./fixtures/messy/', import.meta.url).pathname;
const freshRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'import-schema-'));
  writeFileSync(join(root, 'CLAUDE.md'), '');
  writeFileSync(join(root, 'package.json'), '{}');
  return root;
};
const lines = (t) => t.split('\n');

test('inventory names every sheet, its header mapping and both PK sources per table', () => {
  const r = main(['inventory', fixture]);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /sheet "columns": columns \(11 rows, header on line 2\)/);
  assert.match(r.text, /kept in notes: "Remarks"/);
  assert.match(r.text, /CBS_ACCT_BAL_DLY\s+4\s+ACCT_NO\s+ACCT_NO, BAL_DT\s+ACCT_NO -> CBS_ACCT.ACCT_NO/);
  assert.match(r.text, /CBS_PROD\s+0 \(skipped\)/);
});

test('import writes the handover, the files and the report, then validates them all PASS', () => {
  const root = freshRoot();
  const r = main(['import', fixture, '--system', 'cbs', '--date', '2026-09-08', '--root', root]);
  assert.equal(r.code, 0, r.text);
  assert.deepEqual(readdirSync(join(root, 'sources')).sort(), ['CBS_ACCT.yaml', 'CBS_ACCT_BAL_DLY.yaml', 'CBS_BRNCH.yaml', 'CBS_NOKEY.yaml', '_handover', '_import-report.md']);
  assert.deepEqual(readdirSync(join(root, 'sources', '_handover')), ['2026-09-08-CBS-schema']);
  const report = readFileSync(join(root, 'sources', '_import-report.md'), 'utf8');
  assert.match(report, /- handover: sources\/_handover\/2026-09-08-CBS-schema/);
  assert.match(report, /## Files written \(4\)/);
  assert.match(report, /## Tables skipped \(1\)\n- CBS_PROD/);
  assert.match(report, /## Questions for the data team \(\d+\)\n1\. /);
  assert.ok(lines(r.text).filter((l) => l.startsWith('PASS')).length >= 8, r.text);
  assert.ok(!r.text.includes('FAIL'), r.text);

  // Re-running is byte-identical and the handover is not touched.
  const before = readFileSync(join(root, 'sources', 'CBS_ACCT.yaml'), 'utf8');
  const again = main(['import', fixture, '--system', 'CBS', '--date', '2026-09-08', '--root', root]);
  assert.equal(again.code, 0, again.text);
  assert.equal(readFileSync(join(root, 'sources', 'CBS_ACCT.yaml'), 'utf8'), before);

  // A hand edit to a description is caught by validate.
  const p = join(root, 'sources', 'CBS_ACCT.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('"Customer id"', '"Customer identifier"'));
  const v = main(['validate', '--root', root]);
  assert.equal(v.code, 1);
  assert.match(v.text, /FAIL every column row of the export is in its file.*CBS_ACCT\.CUST_ID: description differs/);
  assert.match(v.text, /FAIL every description in the files is a cell/);

  // A relationship nobody stated is caught too.
  writeFileSync(p, readFileSync(p, 'utf8').replace('relationships:\n', 'relationships:\n  - { column: ACCT_NO, references: CBS_BRNCH.ACCT_NO, status: proven }\n'));
  const v2 = main(['validate', '--root', root]);
  assert.match(v2.text, /FAIL every relationship traces to the FK cell.*not in the FK cell/);
});

test('a different export under the same handover name is refused', () => {
  const root = freshRoot();
  assert.equal(main(['import', fixture, '--system', 'CBS', '--date', '2026-09-08', '--root', root]).code, 0);
  const other = mkdtempSync(join(tmpdir(), 'export-'));
  cpSync(fixture, other, { recursive: true });
  writeFileSync(join(other, 'keys.csv'), readFileSync(join(other, 'keys.csv'), 'utf8').replace('CBS_PROD,PROD_CD', 'CBS_PROD,PROD_ID'));
  const r = main(['import', other, '--system', 'CBS', '--date', '2026-09-08', '--root', root]);
  assert.equal(r.code, 2);
  assert.match(r.text, /exists with different content/);
});

test('an xlsx export gives the same files as its csv twin', () => {
  const sheets = readExport(fixture).sheets.map((s) => ({ name: s.name, rows: s.rows }));
  const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
  writeFileSync(join(dir, 'export.xlsx'), xlsx(sheets, { deflate: true }));
  const a = freshRoot(); const b = freshRoot();
  assert.equal(main(['import', fixture, '--system', 'CBS', '--date', '2026-09-08', '--root', a]).code, 0);
  const r = main(['import', join(dir, 'export.xlsx'), '--system', 'CBS', '--date', '2026-09-08', '--root', b]);
  assert.equal(r.code, 0, r.text);
  assert.deepEqual(readdirSync(join(b, 'sources', '_handover')), ['2026-09-08-CBS-schema.xlsx']);
  for (const f of ['CBS_ACCT.yaml', 'CBS_ACCT_BAL_DLY.yaml', 'CBS_BRNCH.yaml', 'CBS_NOKEY.yaml']) {
    assert.equal(readFileSync(join(b, 'sources', f), 'utf8'), readFileSync(join(a, 'sources', f), 'utf8'), f);
  }
});

test('without --system or without a recognisable sheet the import stops with a reason and writes nothing', () => {
  const root = freshRoot();
  assert.match(main(['import', fixture, '--root', root]).text, /--system <CODE> is required/);
  const bad = mkdtempSync(join(tmpdir(), 'bad-'));
  writeFileSync(join(bad, 'sheet.csv'), 'Name,Value\nx,1\n');
  const r = main(['import', bad, '--system', 'CBS', '--root', root]);
  assert.equal(r.code, 2);
  assert.match(r.text, /no columns sheet/);
  assert.ok(!readdirSync(root).includes('sources'));
});
