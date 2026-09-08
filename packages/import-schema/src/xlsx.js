// Minimal .xlsx reader: enough for a schema export (strings, numbers, booleans, formula results).
// No dependency, so what the bank scans is this file. A workbook is a zip of XML parts; we read
// the central directory, inflate the parts we need and pull cell values with a small XML scan.
// Returns [{ name, rows: string[][] }] in workbook order, every row dense (blank = '').
import { readZip } from './zip.js';

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// All <t> text inside an element, concatenated: a rich-text cell is several runs.
const textOf = (xml) => decode([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));

function sharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
}

const colIndex = (ref) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

function sheetRows(xml, strings) {
  const rows = [];
  for (const [, rowXml] of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    const re = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let m;
    while ((m = re.exec(rowXml))) {
      const attrs = m[1];
      const inner = m[2] ?? '';
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      const idx = ref ? colIndex(ref) : cells.length;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? 'n';
      let value = '';
      if (type === 's') {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        value = v === undefined ? '' : (strings[Number(v)] ?? '');
      } else if (type === 'inlineStr') {
        value = textOf(inner);
      } else if (type === 'b') {
        value = /<v>1<\/v>/.test(inner) ? 'TRUE' : 'FALSE';
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        value = v === undefined ? '' : decode(v);
      }
      while (cells.length < idx) cells.push('');
      cells[idx] = value;
    }
    rows.push(cells);
  }
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => { while (r.length < width) r.push(''); return r; });
}

export function readXlsx(buf) {
  const part = readZip(buf).read;
  const workbook = part('xl/workbook.xml');
  if (!workbook) throw new Error('not an xlsx workbook (xl/workbook.xml missing)');
  const rels = new Map(
    [...(part('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => {
      const id = /\bId="([^"]+)"/.exec(m[1])?.[1];
      const target = /\bTarget="([^"]+)"/.exec(m[1])?.[1] ?? '';
      return [id, target.replace(/^\/?(xl\/)?/, 'xl/')];
    }),
  );
  const strings = sharedStrings(part('xl/sharedStrings.xml'));
  const sheets = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = decode(/\bname="([^"]*)"/.exec(m[1])?.[1] ?? '');
    const rid = /\br:id="([^"]+)"/.exec(m[1])?.[1];
    const path = rels.get(rid);
    const xml = path ? part(path) : null;
    if (xml === null) throw new Error(`sheet "${name}": part ${path ?? '(unknown)'} missing`);
    sheets.push({ name, rows: sheetRows(xml, strings) });
  }
  return sheets;
}
