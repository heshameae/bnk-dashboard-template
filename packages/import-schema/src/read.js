// The export as sheets. A workbook gives its sheets; a folder gives one sheet per .csv, named by file.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, extname } from 'node:path';
import { readXlsx } from './xlsx.js';
import { parseCsv } from './csv.js';

export function readExport(path) {
  const st = statSync(path);
  if (st.isDirectory()) {
    const files = readdirSync(path).filter((f) => extname(f).toLowerCase() === '.csv').sort();
    if (!files.length) throw new Error(`no .csv files in ${path}`);
    return {
      kind: 'csv',
      path,
      sheets: files.map((f) => ({ name: f.replace(/\.csv$/i, ''), rows: parseCsv(readFileSync(join(path, f), 'utf8')) })),
    };
  }
  const ext = extname(path).toLowerCase();
  if (ext === '.xlsx' || ext === '.xlsm') return { kind: 'xlsx', path, sheets: readXlsx(readFileSync(path)) };
  if (ext === '.csv') return { kind: 'csv', path, sheets: [{ name: basename(path, ext), rows: parseCsv(readFileSync(path, 'utf8')) }] };
  throw new Error(`unsupported export ${path}: expected .xlsx, .csv or a folder of .csv`);
}
