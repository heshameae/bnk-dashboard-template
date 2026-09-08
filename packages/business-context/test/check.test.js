import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../src/cli.js';

const fixture = readFileSync(new URL('./fixtures/cashboard.md', import.meta.url), 'utf8');
const form = new URL('../../../docs/templates/business-context-request-example.md', import.meta.url).pathname;
const formDocx = form.replace(/\.md$/, '.docx');

function repo(text = fixture, registry = null) {
  const root = mkdtempSync(join(tmpdir(), 'bc-'));
  writeFileSync(join(root, 'CLAUDE.md'), ''); writeFileSync(join(root, 'package.json'), '{}');
  mkdirSync(join(root, 'dashboards', 'cashboard'), { recursive: true });
  writeFileSync(join(root, 'dashboards', 'cashboard', 'business-context.md'), text);
  if (registry) { mkdirSync(join(root, 'catalog')); writeFileSync(join(root, 'catalog', 'kpi-registry.yaml'), registry); }
  return root;
}
const run = (root, input = form) => main(['check', 'cashboard', input, '--root', root]);

test('the example form, copied faithfully, passes every check, from .md and from .docx', () => {
  for (const input of [form, formDocx]) {
    const r = run(repo(), input);
    assert.equal(r.code, 0, r.text);
    assert.equal(r.text.split('\n').filter((l) => l.startsWith('PASS')).length, 8);
  }
});

test('a reworded sentence fails, in the table and in a free section', () => {
  let r = run(repo(fixture.replace('"Total ledger balance across all products at close of the last business day"', '"Total ledger balance across all products at close of the last working day"')));
  assert.equal(r.code, 1);
  assert.match(r.text, /FAIL every meaning is quoted and verbatim.*row 2: meaning is not their sentence/);
  r = run(repo(fixture.replace('Treasury and finance see everything.', 'Treasury and Finance can see all branches.')));
  assert.match(r.text, /FAIL every line of sections 1, 2, 4, 5, 6 and 7.*section 6/);
});

test('an empty Leave out, a "not sure" meaning, and a ? without a question all fail', () => {
  let r = run(repo(fixture.replace('| Same as CASA balance | Head of Treasury', '|  | Head of Treasury')));
  assert.match(r.text, /row 4: Leave out is empty/);
  r = run(repo(fixture.replace('| Average daily net inflow | ? |', '| Average daily net inflow | "Not sure how to define this. Money in minus money out per day, averaged over the month?" |')));
  assert.match(r.text, /row 5: meaning says "not sure"/);
  r = run(repo(fixture.replace(/1\. Average daily net inflow:.*\n/, '')));
  assert.match(r.text, /FAIL every \? in the table has a question.*row 5/);
});

test('reuse needs a registry, a CONFIRMED recipe, and the identical sentence', () => {
  const reuse = fixture.replace('| Same as CASA balance | Head of Treasury | new |', '| Same as CASA balance | Head of Treasury | reuse kpi.casa_share |');
  assert.match(run(repo(reuse)).text, /reuse kpi\.casa_share but there is no catalog/);
  const draft = 'kpis:\n  - { id: kpi.casa_share, status: DRAFT, meaning: "CASA balance as a share of total ledger balance, last business day" }\n';
  assert.match(run(repo(reuse, draft)).text, /kpi\.casa_share is not a CONFIRMED recipe/);
  const other = draft.replace('DRAFT', 'CONFIRMED').replace('last business day', 'last working day');
  assert.match(run(repo(reuse, other)).text, /meaning differs from kpi\.casa_share/);
  const same = draft.replace('DRAFT', 'CONFIRMED');
  const r = run(repo(reuse, same));
  assert.equal(r.code, 0, r.text);
});

test('section 8 is capped at seven, each question names an owner, or the meet-again line covers the rest', () => {
  const many = fixture.replace('## 8. Open questions\n', '## 8. Open questions\n' + Array.from({ length: 6 }, (_, i) => `${i + 10}. Question ${i}? Owner: Finance\n`).join(''));
  assert.match(run(repo(many)).text, /8 questions; at most seven/);
  assert.match(run(repo(fixture.replace(' Owner: Security, with the Head of Treasury.', ''))).text, /names no owner/);
  const covered = fixture.replace(/1\. Average daily net inflow:.*\n/, 'And 1 more gap in the table; meet again before step 3.\n');
  assert.equal(run(repo(covered)).code, 0);
});

test('text prints a .docx as lines and table rows', () => {
  const r = main(['text', formDocx]);
  assert.equal(r.code, 0);
  assert.match(r.text, /\| CASA balance \| Total CASA balance at close of the last business day, dormant accounts excluded \|/);
});
