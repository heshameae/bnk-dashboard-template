// The sample world is the PASS case; each test then breaks one rule in a copy and expects the line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../bin/lint.js';

const sample = new URL('../../../docs/sample/', import.meta.url).pathname;
function repo(edit) {
  const root = mkdtempSync(join(tmpdir(), 'lint-'));
  writeFileSync(join(root, 'CLAUDE.md'), ''); writeFileSync(join(root, 'package.json'), '{}');
  for (const d of ['sources', 'bi_model', 'security']) cpSync(join(sample, d), join(root, d), { recursive: true });
  rmSync(join(root, 'bi_model', 'proofs'), { recursive: true });
  if (edit) edit(root);
  return root;
}
const view = (root, name) => join(root, 'bi_model', `${name}.sql`);
const patch = (root, name, from, to) => { const p = view(root, name); const s = readFileSync(p, 'utf8'); assert.ok(s.includes(from), `fixture lacks "${from}"`); writeFileSync(p, s.replace(from, to)); };
const run = (root) => main(['views', '--root', root]);

test('the sample views pass every check', () => {
  const r = run(repo());
  assert.equal(r.code, 0, r.text);
  assert.ok(!r.text.includes('FAIL'));
  assert.match(r.text, /views: 3 file\(s\)/);
});

test('an empty repo passes with nothing to check', () => {
  const root = mkdtempSync(join(tmpdir(), 'lint-empty-'));
  writeFileSync(join(root, 'CLAUDE.md'), ''); writeFileSync(join(root, 'package.json'), '{}');
  const r = main(['--root', root]);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /not implemented yet/);
});

test('header: a missing line, a wrong view name, a bad grain sentence', () => {
  let r = run(repo((root) => patch(root, 'v_balances_daily', '-- refresh: daily after CBS load, ~02:30\n', '')));
  assert.match(r.text, /FAIL v_balances_daily: header.*line 5 should be "-- refresh: ..."/);
  r = run(repo((root) => patch(root, 'v_balances_daily', '-- grain: one row per', '-- grain: a row per')));
  assert.match(r.text, /grain does not begin "one row per"/);
  r = run(repo((root) => patch(root, 'dim_branch', '-- view: dim_branch', '-- view: dim_branches')));
  assert.match(r.text, /header view "dim_branches" is not the file name/);
});

test('renames: a raw name kept, a column without AS', () => {
  let r = run(repo((root) => patch(root, 'v_balances_daily', 'bal.CCY_CD                       AS currency', 'bal.CCY_CD AS ccy_cd')));
  assert.match(r.text, /ccy_cd keeps the raw column name/);
  r = run(repo((root) => patch(root, 'v_balances_daily', 'bal.CCY_CD                       AS currency', 'bal.CCY_CD')));
  assert.match(r.text, /has no AS <business_name>/);
});

test('sources line must equal the tables read, and every table needs a sources file', () => {
  let r = run(repo((root) => patch(root, 'v_balances_daily', '-- sources: CBS_ACCT_BAL_DLY, CBS_ACCT, CBS_PROD, CBS_CUST', '-- sources: CBS_ACCT_BAL_DLY, CBS_ACCT, CBS_PROD')));
  assert.match(r.text, /CBS_CUST is read but not in the header/);
  r = run(repo((root) => rmSync(join(root, 'sources', 'CBS_PROD.yaml'))));
  assert.match(r.text, /CBS_PROD: no sources\/CBS_PROD.yaml/);
});

test('a join off the full key fails; a RIGHT JOIN fails', () => {
  let r = run(repo((root) => patch(root, 'v_balances_daily', 'ON acc.ACCT_NO = bal.ACCT_NO', 'ON acc.CUST_ID = bal.ACCT_NO')));
  assert.match(r.text, /CBS_ACCT: joined on \[CUST_ID\], its key is \[ACCT_NO\]/);
  r = run(repo((root) => patch(root, 'v_balances_daily', 'LEFT JOIN RAW_CBS.CBS_CUST', 'RIGHT JOIN RAW_CBS.CBS_CUST')));
  assert.match(r.text, /CBS_CUST: RIGHT JOIN/);
});

test('metric math and a WHERE in a fact view fail; a window in a dimension is allowed', () => {
  let r = run(repo((root) => patch(root, 'v_balances_daily', 'bal.LDGR_BAL_AMT                 AS balance_amount', 'SUM(bal.LDGR_BAL_AMT) AS balance_amount')));
  assert.match(r.text, /an aggregate in the SELECT/);
  r = run(repo((root) => patch(root, 'v_balances_daily', 'ON cus.CUST_ID = acc.CUST_ID;', "ON cus.CUST_ID = acc.CUST_ID WHERE acc.ACCT_STS <> 'D';")));
  assert.match(r.text, /WHERE acc\.ACCT_STS.*drops rows silently/);
  r = run(repo());
  assert.match(r.text, /PASS dim_date: dimension view: no GROUP BY/);
});

test('RLS: the column must be exposed and the policy must match', () => {
  let r = run(repo((root) => patch(root, 'v_balances_daily', '-- RLS: branch_code', '-- RLS: region_code')));
  assert.match(r.text, /RLS column region_code is not a column the view exposes/);
  assert.match(r.text, /policy column "branch_code" differs from the header's "region_code"/);
  r = run(repo((root) => patch(root, 'dim_branch', '-- RLS: none, reference data, no balances', '-- RLS: none')));
  assert.match(r.text, /RLS: none needs a reason/);
  r = run(repo((root) => rmSync(join(root, 'security', 'rls-policies.yaml'))));
  assert.match(r.text, /rls-policies.yaml missing/);
});

test('one raw column, one business name across views', () => {
  const r = run(repo((root) => patch(root, 'dim_branch', 'b.BR_CD   AS branch_code', 'b.BR_CD   AS branch_id')));
  // dim_branch reads CBS_BRNCH.BR_CD; v_balances_daily reads CBS_ACCT.BR_CD, a different raw column, so no conflict yet.
  assert.equal(r.code, 0, r.text);
  const r2 = run(repo((root) => {
    patch(root, 'dim_branch', 'b.BR_CD   AS branch_code', 'b.BR_CD   AS branch_id');
    writeFileSync(view(root, 'dim_region'), readFileSync(view(root, 'dim_branch'), 'utf8').replace(/dim_branch/g, 'dim_region').replace('b.BR_CD   AS branch_id', 'b.BR_CD   AS branch_code'));
    const pol = join(root, 'security', 'rls-policies.yaml');
    writeFileSync(pol, readFileSync(pol, 'utf8').replace('exemptions: []', '  dim_region:\n    column: none\n    reason: "reference data"\nexemptions: []'));
  }));
  assert.match(r2.text, /FAIL \*: one raw column, one business name.*CBS_BRNCH\.BR_CD is branch_id in dim_branch and branch_code in dim_region/);
});
