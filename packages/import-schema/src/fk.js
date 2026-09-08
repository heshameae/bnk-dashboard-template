// FK text to relationships. The data team writes joins as free text; these are the shapes we read.
// Anything else is returned under `unparsed`, untouched, for the notes and the report.
//   COL -> TABLE.COL            COL references TABLE(COL)      COL = TABLE.COL
//   TABLE.COL                   (A, B) -> TABLE(X, Y)          FOREIGN KEY (A) REFERENCES T (X)
//   SCHEMA.TABLE.COL (the schema is dropped; `references` is always TABLE.COL)
// Several joins in one cell are split on commas, semicolons or line breaks outside parentheses.
const IDENT = /^[A-Za-z_][A-Za-z0-9_$#]*$/;
const OP = /\s*(->|→|=>|=|\breferences\b|\brefs?\b|\bfk\s+to\b)\s*/i;

function splitOutsideParens(text) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || ch === ';' || ch === '\n' || ch === '\r')) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const idents = (s) => s.replace(/[()]/g, ' ').split(/[\s,]+/).filter(Boolean);
const valid = (list) => list.length > 0 && list.every((c) => IDENT.test(c));

function parseRhs(rhs) {
  const m = /^([A-Za-z_][A-Za-z0-9_$#]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_$#]*)*)\s*(?:\(\s*([^()]*?)\s*\))?$/.exec(rhs.trim());
  if (!m) return null;
  const parts = m[1].split(/\s*\.\s*/);
  if (m[2] !== undefined) {
    const cols = idents(m[2]);
    if (!valid(cols)) return null;
    return { table: parts[parts.length - 1], columns: cols };
  }
  if (parts.length < 2) return null;
  return { table: parts[parts.length - 2], columns: [parts[parts.length - 1]] };
}

function parseSegment(seg) {
  const s = seg.replace(/^\s*(foreign\s+key|fk)\s*:?\s*/i, '').trim();
  const op = OP.exec(s);
  if (op && op.index > 0) {
    const lhs = idents(s.slice(0, op.index));
    const rhs = parseRhs(s.slice(op.index + op[0].length));
    if (!valid(lhs) || !rhs || lhs.length !== rhs.columns.length) return null;
    return lhs.map((c, i) => ({ column: c.toUpperCase(), references: `${rhs.table}.${rhs.columns[i]}`.toUpperCase() }));
  }
  if (op) return null;
  const rhs = parseRhs(s);
  if (!rhs || rhs.columns.length !== 1 || /[()]/.test(s)) return null;
  return [{ column: rhs.columns[0].toUpperCase(), references: `${rhs.table}.${rhs.columns[0]}`.toUpperCase() }];
}

export function parseFk(text) {
  const relationships = [];
  const unparsed = [];
  for (const seg of splitOutsideParens(String(text ?? ''))) {
    const rels = parseSegment(seg);
    if (rels) relationships.push(...rels); else unparsed.push(seg);
  }
  return { relationships, unparsed };
}
