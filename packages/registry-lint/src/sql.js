// A small reader for the one SQL shape bi_model/ allows: a six-line header, then
// CREATE OR REPLACE VIEW bi_model.<name> AS SELECT <items> FROM <table> [JOIN <table> ON ...]* [WHERE ...].
// It is not a SQL parser. It reads exactly what the checks need and reports what it could not read.
const HEADER = ['view', 'grain', 'RLS', 'sources', 'refresh', 'proof'];

export function readHeader(text) {
  const lines = text.split('\n');
  const header = {};
  const problems = [];
  HEADER.forEach((key, i) => {
    const m = new RegExp(`^--\\s*${key}:\\s*(.*)$`).exec(lines[i] ?? '');
    if (!m) problems.push(`line ${i + 1} should be "-- ${key}: ..."`);
    else header[key] = m[1].trim();
  });
  return { header, problems, body: lines.slice(HEADER.length).join('\n') };
}

const stripComments = (sql) => sql.replace(/--[^\n]*/g, '');

// Split on commas at parenthesis depth 0.
function splitTop(text) {
  const out = [];
  let depth = 0; let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

// Index of the first top-level occurrence of a keyword (outside parentheses).
function topIndex(text, word, from = 0) {
  const re = new RegExp(`\\b${word}\\b`, 'gi');
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (depth === 0) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m && m.index === i) return i;
    }
  }
  return -1;
}

export function readView(text) {
  const { header, problems, body } = readHeader(text);
  const sql = stripComments(body);
  const view = { header, problems, name: null, items: [], tables: [], joins: [], where: null, selectText: '', hasGroupBy: false };
  const create = /CREATE\s+OR\s+REPLACE\s+VIEW\s+(?:[\w$#]+\.)?([\w$#]+)\s+AS\s+SELECT\b/i.exec(sql);
  if (!create) { problems.push('no "CREATE OR REPLACE VIEW bi_model.<name> AS SELECT"'); return view; }
  view.name = create[1];
  const afterSelect = create.index + create[0].length;
  const fromAt = topIndex(sql, 'FROM', afterSelect);
  if (fromAt < 0) { problems.push('no top-level FROM'); return view; }
  view.selectText = sql.slice(afterSelect, fromAt);
  for (const item of splitTop(view.selectText)) {
    const m = /^([\s\S]*?)\s+AS\s+([\w$#"]+)$/i.exec(item);
    if (!m) { view.items.push({ expr: item, alias: null }); continue; }
    const expr = m[1].trim();
    const plain = /^([\w$#]+)\.([\w$#]+)$/.exec(expr);
    view.items.push({ expr, alias: m[2].replace(/"/g, ''), source: plain ? { alias: plain[1], column: plain[2] } : null });
  }
  let rest = sql.slice(fromAt);
  const end = rest.search(/;\s*$/);
  if (end >= 0) rest = rest.slice(0, end);
  const whereAt = topIndex(rest, 'WHERE');
  const groupAt = topIndex(rest, 'GROUP');
  if (groupAt >= 0) view.hasGroupBy = true;
  const cut = [whereAt, groupAt].filter((i) => i >= 0);
  const fromClause = cut.length ? rest.slice(0, Math.min(...cut)) : rest;
  if (whereAt >= 0) view.where = rest.slice(whereAt + 5, groupAt > whereAt ? groupAt : undefined).trim();
  const re = /\b(FROM|(?:(LEFT|RIGHT|FULL|INNER|CROSS)\s+(?:OUTER\s+)?)?JOIN)\s+(?:([\w$#]+)\.)?([\w$#]+)(?:\s+(?:AS\s+)?(?!ON\b|JOIN\b|LEFT\b|RIGHT\b|FULL\b|INNER\b|CROSS\b|WHERE\b)([\w$#]+))?/gi;
  const parts = [...fromClause.matchAll(re)];
  parts.forEach((m, i) => {
    const kind = m[1].toUpperCase() === 'FROM' ? 'FROM' : (m[2] ?? 'INNER').toUpperCase();
    const table = m[4].toUpperCase();
    const alias = m[5] ?? m[4];
    const next = parts[i + 1]?.index ?? fromClause.length;
    const tail = fromClause.slice(m.index + m[0].length, next);
    const on = /\bON\b([\s\S]*)$/i.exec(tail)?.[1]?.trim() ?? null;
    const entry = { kind, schema: m[3] ?? null, table, alias, on };
    view.tables.push(entry);
    if (kind !== 'FROM') view.joins.push(entry);
  });
  if (!view.tables.length) problems.push('no table after FROM');
  return view;
}

export const columnRefs = (text, alias) => [...String(text ?? '').matchAll(new RegExp(`\\b${alias}\\.([\\w$#]+)`, 'g'))].map((m) => m[1].toUpperCase());
