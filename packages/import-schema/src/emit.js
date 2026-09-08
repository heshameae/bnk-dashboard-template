// sources/<TABLE>.yaml text, in the contract's field order, byte-stable across runs.
const PLAIN = /^[A-Z_][A-Z0-9_]*$/;
const q = (s) => JSON.stringify(String(s ?? ''));
const id = (s) => (PLAIN.test(s) ? s : q(s));
const list = (xs) => `[${xs.map(id).join(', ')}]`;

export function emitSource(t) {
  const out = [];
  out.push(`table: ${id(t.table)}`);
  out.push(`system: ${id(t.system)}`);
  out.push(`schema: ${t.schema ? id(t.schema) : '""'}`);
  out.push(`description: ${q(t.description)}`);
  out.push(`grain: ${q(t.grain)}`);
  out.push(`key: ${list(t.key)}`);
  out.push('columns:');
  const w = Math.max(0, ...t.columns.map((c) => c.name.length));
  const wt = Math.max(0, ...t.columns.map((c) => q(c.type).length));
  for (const c of t.columns) {
    const parts = [`name: ${(id(c.name) + ',').padEnd(w + 1)}`, `type: ${(q(c.type) + ',').padEnd(wt + 1)}`];
    if (c.nullable !== undefined) parts.push(`nullable: ${c.nullable ? 'true, ' : 'false,'}`);
    parts.push(`description: ${q(c.description)}`);
    out.push(`  - { ${parts.join(' ')} }`);
  }
  if (t.relationships.length) {
    out.push('relationships:');
    for (const r of t.relationships) out.push(`  - { column: ${id(r.column)}, references: ${id(r.references)}, status: ${r.status} }`);
  } else out.push('relationships: []');
  if (t.notes.length === 0) out.push('notes: ""');
  else out.push(`notes: |`, ...t.notes.map((n) => `  ${n.replace(/\s+/g, ' ')}`));
  return out.join('\n') + '\n';
}

export function emitReport({ handover, sha256, date, system, sheets, written, stale, skipped, questions, notes }) {
  const L = [];
  L.push('# Import report', '');
  L.push(`- handover: ${handover}`);
  L.push(`- sha256: ${sha256}`);
  L.push(`- imported: ${date}`);
  L.push(`- system: ${system} (given on the command line; the export carries no system code)`);
  for (const s of sheets) L.push(`- sheet "${s.name}": ${s.role}${s.role === 'ignored' ? ` (${s.reason})` : ` (${s.rows.length} rows, header on line ${s.headerRow})`}`);
  L.push('', `## Files written (${written.length})`);
  for (const t of written) L.push(`- sources/${t.table}.yaml: ${t.columns.length} columns, key [${t.key.join(', ')}], ${t.relationships.length} relationships${t.notes.length ? `, ${t.notes.length} notes` : ''}`);
  L.push('', `## Files in sources/ not in this handover (${stale.length})`);
  for (const f of stale) L.push(`- sources/${f}: left as it was; re-import its handover or delete it by hand`);
  L.push('', `## Tables skipped (${skipped.length})`);
  for (const s of skipped) L.push(`- ${s.table}: ${s.reason}`);
  L.push('', `## Questions for the data team (${questions.length})`);
  questions.forEach((qn, i) => L.push(`${i + 1}. ${qn.table}: ${qn.text}`));
  if (notes.length) { L.push('', `## Rows set aside by the parser (${notes.length})`); for (const n of notes) L.push(`- ${n}`); }
  L.push('', '## Still missing (the contract\'s ask, docs/contracts/sources.md)');
  L.push('- Row count and distinct count of the primary key per table, min and max of each date column, last load time (step 4; every table is declared, not proven, until then).');
  L.push('- ALL_CONSTRAINTS and ALL_CONS_COLUMNS, which turn stated relationships into proven.');
  L.push('- A read-only account on a replica, or a named proof-runner for step 4.');
  return L.join('\n') + '\n';
}
