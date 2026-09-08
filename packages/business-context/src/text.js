// The input as text: .docx through the reader, anything else as it is.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { docxText } from './docx.js';

export function inputText(path) {
  if (extname(path).toLowerCase() === '.docx') return docxText(readFileSync(path));
  return readFileSync(path, 'utf8');
}
