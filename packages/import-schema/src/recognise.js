// Which sheet is which, and which header means what. Decided by headers, never by sheet name.
// The header row is the first row (within the top ten) whose headers make the sheet recognisable,
// so a title line above the table does not break the import.
//
// Three roles. A **columns** sheet is one row per column. A **joins** sheet is one row per column
// pair, which is the template in docs/templates/. A **keys** sheet is one row per table with the key
// as a list and the joins as free text, which is the shape data teams send before they have the
// template. A joins sheet and a keys sheet can both be present; the joins sheet wins, because a
// column pair in its own cells cannot be misread and free text can.
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const COLUMN_FIELDS = {
  schema: ['schema', 'schemaname', 'owner', 'schemaowner'],
  table: ['table', 'tablename', 'tabname', 'tbl'],
  column: ['column', 'columnname', 'colname', 'col', 'field', 'fieldname', 'attribute'],
  type: ['type', 'datatype', 'dtype', 'columntype', 'datatypeandlength'],
  pk: ['pk', 'primarykey', 'pkflag', 'ispk', 'iskey', 'key', 'primarykeyyn', 'pkyn'],
  description: ['definition', 'businessdefinition', 'description', 'columndescription', 'columndefinition', 'comment', 'comments', 'meaning', 'businessmeaning'],
  nullable: ['nullable', 'isnullable', 'null', 'nulls', 'allownull', 'allowsnull', 'nullableyn'],
  table_description: ['tabledescription', 'tabledefinition', 'tablecomment', 'tablecomments'],
  grain: ['grain', 'tablegrain', 'onerowper'],
};
const KEY_FIELDS = {
  schema: COLUMN_FIELDS.schema,
  table: COLUMN_FIELDS.table,
  pk: ['pk', 'primarykey', 'pkcolumns', 'primarykeycolumns', 'key', 'keycolumns', 'pkcolumn', 'primarykeys'],
  fk: ['fk', 'foreignkey', 'foreignkeys', 'fks', 'fkcolumns', 'joins', 'references', 'relationships', 'relations', 'fktext'],
};
// The joins sheet. Every header carries its side, so "table" alone never appears and cannot be
// confused with the columns sheet. Join name is optional and only groups a multi-column join.
const JOIN_FIELDS = {
  join_name: ['joinname', 'join', 'joinid', 'joingroup', 'joinkey', 'constraint', 'constraintname', 'fkname'],
  from_schema: ['fromschema', 'sourceschema', 'childschema', 'leftschema'],
  from_table: ['fromtable', 'fromtablename', 'sourcetable', 'childtable', 'lefttable', 'fktable'],
  from_column: ['fromcolumn', 'fromcolumnname', 'fromcol', 'sourcecolumn', 'childcolumn', 'leftcolumn', 'fkcolumn'],
  to_schema: ['toschema', 'targetschema', 'parentschema', 'rightschema', 'referencedschema'],
  to_table: ['totable', 'totablename', 'targettable', 'parenttable', 'righttable', 'referencedtable', 'reftable', 'pktable'],
  to_column: ['tocolumn', 'tocolumnname', 'tocol', 'targetcolumn', 'parentcolumn', 'rightcolumn', 'referencedcolumn', 'refcolumn', 'pkcolumn'],
};

function mapHeaders(headers, fields) {
  const map = {};
  const extras = [];
  headers.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    const field = Object.keys(fields).find((f) => fields[f].includes(n) && map[f] === undefined);
    if (field) map[field] = i; else extras.push({ header: String(h).trim(), index: i });
  });
  return { map, extras };
}

function classify(headers) {
  // Joins first: it needs all four sides, so it never steals a columns or keys sheet.
  const joins = mapHeaders(headers, JOIN_FIELDS);
  if (['from_table', 'from_column', 'to_table', 'to_column'].every((f) => joins.map[f] !== undefined)) return { role: 'joins', ...joins };
  const cols = mapHeaders(headers, COLUMN_FIELDS);
  if (cols.map.table !== undefined && cols.map.column !== undefined) return { role: 'columns', ...cols };
  const keys = mapHeaders(headers, KEY_FIELDS);
  if (keys.map.table !== undefined && (keys.map.pk !== undefined || keys.map.fk !== undefined)) return { role: 'keys', ...keys };
  return null;
}

export function recogniseSheet(sheet) {
  const limit = Math.min(10, sheet.rows.length);
  for (let r = 0; r < limit; r++) {
    const found = classify(sheet.rows[r]);
    if (found) {
      const data = sheet.rows.slice(r + 1).filter((row) => row.some((c) => String(c).trim() !== ''));
      return { name: sheet.name, headerRow: r + 1, headers: sheet.rows[r], rows: data, ...found };
    }
  }
  return { name: sheet.name, role: 'ignored', headers: sheet.rows[0] ?? [], rows: [], map: {}, extras: [] };
}

// One sheet of each role. A second sheet of the same role is ignored and named in the report.
export function recogniseExport(sheets) {
  const all = sheets.map(recogniseSheet);
  const pick = (role) => all.find((s) => s.role === role) ?? null;
  const columns = pick('columns');
  const keys = pick('keys');
  const joins = pick('joins');
  const ignored = all.filter((s) => s !== columns && s !== keys && s !== joins).map((s) => ({ ...s, role: 'ignored', reason: s.role === 'ignored' ? 'no recognised headers' : `a second ${s.role} sheet` }));
  return { columns, keys, joins, ignored, all };
}

export const fieldName = (sheet, field) => (sheet.map[field] === undefined ? '' : String(sheet.headers[sheet.map[field]]).trim());
