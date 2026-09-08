// A .docx as plain text: one line per paragraph, a table as markdown rows. Enough for the request
// form and for meeting notes saved from Word. Text only; formatting, images and comments are dropped.
import { readZip } from '@bank-dashboards/import-schema/src/zip.js';

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const paragraphText = (xml) => decode(
  xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n')
    .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, '$1')
    .replace(/<[^>]+>/g, ''),
);

export function docxText(buf) {
  const xml = readZip(buf).read('word/document.xml');
  if (!xml) throw new Error('not a .docx (word/document.xml missing)');
  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(xml)?.[1] ?? xml;
  const lines = [];
  const blocks = body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g);
  for (const [block] of blocks) {
    if (block.startsWith('<w:tbl>')) {
      for (const [, row] of block.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)) {
        const cells = [...row.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map(([, tc]) =>
          [...tc.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map(([, p]) => paragraphText(p).trim()).filter(Boolean).join(' '));
        lines.push(`| ${cells.join(' | ')} |`);
      }
      lines.push('');
    } else lines.push(paragraphText(block).replace(/\s+$/, ''));
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
