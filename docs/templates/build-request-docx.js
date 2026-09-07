#!/usr/bin/env node
// Builds the "Dashboard request" form the business fills in Word, with no dependencies:
//   business-context-request.docx          blank form to send
//   business-context-request-example.docx  the same form filled in for the Cashboard, to send beside it
// Free text everywhere except "The numbers you want to see", which is a table.
// A .docx is a zip of XML parts; this writes them and zips. Run: node docs/templates/build-request-docx.js
const fs = require('fs'); const path = require('path'); const os = require('os'); const { execSync } = require('child_process');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- tiny WordprocessingML helpers
const run = (t, o = {}) => `<w:r><w:rPr>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}${o.c ? `<w:color w:val="${o.c}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (runs, o = {}) => `<w:p><w:pPr><w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 100}"/>${o.keep ? '<w:keepNext/>' : ''}${o.rule ? '<w:pBdr><w:bottom w:val="dotted" w:sz="6" w:space="1" w:color="A6A6A6"/></w:pBdr>' : ''}</w:pPr>${runs}</w:p>`;
const heading = (t) => para(run(t, { b: true, sz: 26, c: '1F3864' }), { before: 260, after: 60, keep: true });
const note = (t) => para(run(t, { c: '595959' }), { after: 120 });
const writeLine = () => para(run(' '), { after: 200, rule: true });                       // a dotted line to write on
const free = (text, n) => text ? text.split('\n').map((t) => para(run(t), { after: 80 })).join('') : Array.from({ length: n }, writeLine).join('');
const field = (name, value) => para(run(name + ':  ', { b: true }) + run(value || ''), { after: 120, rule: !value });
const numbered = (items, n) => Array.from({ length: n }, (_, i) => para(run((i + 1) + '.  ', { b: true }) + run(items[i] || ''), { after: 120, rule: !items[i] })).join('');

const cell = (xml, w, o = {}) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>${xml}</w:tc>`;
const row = (cells, h) => `<w:tr>${h ? `<w:trPr><w:trHeight w:val="${h}" w:hRule="atLeast"/><w:cantSplit/></w:trPr>` : ''}${cells}</w:tr>`;
const borders = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="6" w:space="0" w:color="A6A6A6"/>`).join('') + '</w:tblBorders>';
const table = (rows, widths) => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>${para('', { after: 160 })}`;
const blank = () => para(run(' '), { after: 0 });
const text = (t) => (t ? para(run(t), { after: 0 }) : blank());

// --- the one table: the numbers
const NUM_W = [1700, 3000, 1500, 1700, 1800];   // Number · What it means · Compare it to · Break it down by · Any filtering
const NUM_H = ['Number', 'What it means, in one sentence', 'Compare it to', 'Break it down by', 'Any filtering on this number?'];
const NUM_EX = ['CASA balance', 'The total balance of all CASA accounts at the end of the last working day', 'The day before', 'Branch, customer type', 'Leave out dormant accounts'];
const numbersTable = (rows) => table(
  [row(NUM_H.map((h, i) => cell(para(run(h, { b: true, c: 'FFFFFF' }), { after: 0 }), NUM_W[i], { shade: '1F3864' })).join(''), 420)].concat(rows
    ? rows.map((r) => row(r.map((v, i) => cell(text(v), NUM_W[i])).join(''), 560))
    : [row(NUM_EX.map((v, i) => cell(para(run(v, { i: true, c: '595959' }), { after: 0 }), NUM_W[i], { shade: 'F2F2F2' })).join(''), 560)]
        .concat([1, 2, 3, 4, 5, 6].map(() => row(NUM_W.map((w) => cell(blank(), w)).join(''), 620)))),
  NUM_W);

function build(d, file) {
  const body = [
    para(run('Dashboard request', { b: true, sz: 40, c: '1F3864' }), { after: 60 }),
    d.banner ? para(run(d.banner, { b: true, c: 'C00000' }), { after: 120 }) : '',
    note('Fill in what you can, in plain words. If you are not sure about something, write "not sure" and we will come and ask.'),
    field('Dashboard name', d.name),
    field('Your name and role', d.who),
    field('Date', d.date),

    heading('Who will use it?'),
    note('Who opens this dashboard, how often, and what do they do with what they see?'),
    free(d.audience, 3),

    heading('Questions it should answer'),
    note('In the order you would ask them. Each one should be answerable by looking at the page.'),
    numbered(d.questions, 5),

    heading('The numbers you want to see'),
    note(d.numbers ? 'One line per number. The most important column is what it means: the sentence you would say to a new colleague. If a number is worked out from other numbers, say which ones. For example, total costs divided by total income.'
                   : 'One line per number. The grey line is an example. The most important column is what it means: the sentence you would say to a new colleague. If a number is worked out from other numbers, say which ones. For example, total costs divided by total income.'),
    numbersTable(d.numbers),

    heading('Filters on the page'),
    note('What should people be able to filter the page by? A date, a branch, a customer segment, and so on. Also tell us what the page should show when it first opens.'),
    free(d.filters, 3),

    heading('Where does the data come from?'),
    note('The systems, reports or files the numbers live in, and who owns them, as far as you know.'),
    free(d.sources, 3),

    heading('Who is allowed to see it (RLS)?'),
    note('Who should see everything, and who should only see their own part? For example, branch managers seeing only their own branches. If some numbers should stay visible to everyone, say which.'),
    free(d.rls, 3),

    heading('Anything else we should know?'),
    note('Anything odd about the data, or definitions that people disagree on.'),
    free(d.anythingElse, 4),

  ].join('');

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1100" w:right="1100" w:bottom="1100" w:left="1100" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const out = path.join(__dirname, file);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-'));
  fs.mkdirSync(path.join(tmp, '_rels')); fs.mkdirSync(path.join(tmp, 'word', '_rels'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '[Content_Types].xml'), contentTypes);
  fs.writeFileSync(path.join(tmp, '_rels', '.rels'), rels);
  fs.writeFileSync(path.join(tmp, 'word', 'document.xml'), document);
  fs.writeFileSync(path.join(tmp, 'word', 'styles.xml'), styles);
  fs.writeFileSync(path.join(tmp, 'word', '_rels', 'document.xml.rels'), docRels);
  if (fs.existsSync(out)) fs.unlinkSync(out);
  execSync(`cd "${tmp}" && zip -X -r "${out}" "[Content_Types].xml" _rels word >/dev/null`);
  fs.rmSync(tmp, { recursive: true });
  console.log('wrote', path.relative(process.cwd(), out), fs.statSync(out).size, 'bytes');
}

// --- 1. the blank form
build({ name: '', who: '', date: '', audience: '', questions: [], numbers: null, filters: '', sources: '', rls: '', anythingElse: '' },
  'business-context-request.docx');

// --- 2. the same form filled in, the way a business owner actually writes (kept in step with dashboards/cashboard/business-context.md)
build({
  name: 'Cashboard',
  who: 'Head of Treasury',
  date: '3 September 2026',
  audience: 'Me and my two analysts, every morning before the 9am call. We check where CASA closed yesterday and whether anything moved that we need to explain on the call.\nRegional heads and branch managers, maybe once a week, usually on the phone. They should only see their own branches.',
  questions: [
    'What is our CASA balance as of the last business day, and how did it move against yesterday?',
    'Which customer segments hold the CASA balance, and is the mix shifting?',
    'How many CASA accounts actually carry a balance?',
    'What share of our total balances is CASA?',
    'Later, if the data exists: what is our average daily net inflow?',
  ],
  numbers: [
    ['CASA balance', 'Total CASA balance at close of the last business day, dormant accounts excluded', 'The day before', 'Branch, customer segment', 'Leave out dormant accounts (status D)'],
    ['Total balance', 'Total ledger balance across all products at close of the last business day', 'The day before', 'Branch, segment, product family', 'Nothing left out'],
    ['CASA accounts', 'Number of CASA accounts with a positive balance at close of the last business day', 'Same day last month', 'Branch, customer segment', 'Leave out dormant. A zero balance does not count.'],
    ['CASA share', 'CASA balance as a share of total ledger balance, last business day', 'Same day last month', 'Branch, customer segment', 'Same as CASA balance'],
    ['Average daily net inflow', 'Not sure how to define this. Money in minus money out per day, averaged over the month?', 'Last month', 'Branch', 'Not sure, can we discuss?'],
  ],
  filters: 'Date. It should open on the last business day, but we need to be able to pick an earlier day to look back.\nBranch and customer segment. The whole page should follow these two.\nProduct family only matters for total balance, so a filter on that section is enough.\nA period switch: month to date, quarter to date, year to date. And we want to compare against the same period last year.',
  sources: 'CBS daily balance report. All account balances, every day. The data team owns it.\nFinance daily position report (Excel). The totals finance signs off every morning. These are the numbers we go by. Finance owns it.\nTransactions: not sure where they sit. Only needed for the net inflow number.',
  rls: 'Branch managers see their own branches only. Regional heads see their region.\nTreasury and finance see everything.\nTotal CASA and CASA share should stay visible to everyone so a region can compare itself to the bank, but please check that with Security first.',
  anythingElse: 'For history we take the CASA balance at month end. For the current month we take the last business day we have. So a monthly view is all the month ends plus where we are now.\nCASA share has caused arguments before because finance and the branches counted dormant accounts differently. Please use the finance definition.\nForeign currency accounts are fine in AED, the core system converts them.\nThe CBS report is sometimes late on the first working day after a holiday. When that happens the page should say the data is old, not just show the previous day.',
}, 'business-context-request-example.docx');
