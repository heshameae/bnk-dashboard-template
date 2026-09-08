import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { docxText } from '../src/docx.js';

const templates = new URL('../../../docs/templates/', import.meta.url).pathname;

test('the filled example form reads as the same text as its markdown twin', () => {
  const text = docxText(readFileSync(templates + 'business-context-request-example.docx'));
  const md = readFileSync(templates + 'business-context-request-example.md', 'utf8');
  assert.match(text, /^Dashboard request\n/);
  assert.match(text, /Dashboard name:\s+Cashboard/);
  for (const sentence of [
    'Me and my two analysts, every morning before the 9am call.',
    'Which customer segments hold the CASA balance, and is the mix shifting?',
    'The CBS report is sometimes late on the first working day after a holiday.',
  ]) assert.ok(text.includes(sentence), sentence);
  const rows = text.split('\n').filter((l) => l.startsWith('|'));
  const mdRows = md.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('|--'));
  assert.equal(rows.length, mdRows.length);
  assert.equal(rows[1], mdRows[1]);
});

test('a file that is not a docx is refused', () => {
  assert.throws(() => docxText(Buffer.from('nope')), /not a zip/);
});
