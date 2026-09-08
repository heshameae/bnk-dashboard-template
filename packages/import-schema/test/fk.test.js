import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFk } from '../src/fk.js';

const rel = (column, references) => ({ column, references });

test('arrow, references, equals and bare TABLE.COL', () => {
  assert.deepEqual(parseFk('ACCT_NO -> CBS_ACCT.ACCT_NO').relationships, [rel('ACCT_NO', 'CBS_ACCT.ACCT_NO')]);
  assert.deepEqual(parseFk('cust_id references cbs_cust(cust_id)').relationships, [rel('CUST_ID', 'CBS_CUST.CUST_ID')]);
  assert.deepEqual(parseFk('BRNCH_CD = CBS_BRNCH.BRNCH_CD').relationships, [rel('BRNCH_CD', 'CBS_BRNCH.BRNCH_CD')]);
  assert.deepEqual(parseFk('CBS_PROD.PROD_CD').relationships, [rel('PROD_CD', 'CBS_PROD.PROD_CD')]);
});

test('schema prefix dropped, DDL style, composite keys, unicode arrow', () => {
  assert.deepEqual(parseFk('ACCT_NO -> RAW_CBS.CBS_ACCT.ACCT_NO').relationships, [rel('ACCT_NO', 'CBS_ACCT.ACCT_NO')]);
  assert.deepEqual(parseFk('FOREIGN KEY (ACCT_NO) REFERENCES CBS_ACCT (ACCT_NO)').relationships, [rel('ACCT_NO', 'CBS_ACCT.ACCT_NO')]);
  assert.deepEqual(parseFk('(A, B) -> T(X, Y)').relationships, [rel('A', 'T.X'), rel('B', 'T.Y')]);
  assert.deepEqual(parseFk('A → T.X').relationships, [rel('A', 'T.X')]);
});

test('a run of joins is split outside parentheses; the unreadable part is kept verbatim', () => {
  const r = parseFk('CUST_ID references CBS_CUST(CUST_ID); BRNCH_CD = CBS_BRNCH.BRNCH_CD, joins to products somehow');
  assert.deepEqual(r.relationships, [rel('CUST_ID', 'CBS_CUST.CUST_ID'), rel('BRNCH_CD', 'CBS_BRNCH.BRNCH_CD')]);
  assert.deepEqual(r.unparsed, ['joins to products somehow']);
});

test('shapes that are not a join are unparsed, never guessed', () => {
  for (const text of ['ACCT_NO', 'A -> B', 'see the DE team', '(A, B) -> T(X)', 'A -> T.X.Y.Z.W extra']) {
    const r = parseFk(text);
    assert.deepEqual(r.relationships, [], text);
    assert.equal(r.unparsed.length, 1, text);
  }
  assert.deepEqual(parseFk(''), { relationships: [], unparsed: [] });
});
