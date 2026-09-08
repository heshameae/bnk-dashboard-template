// A tiny xlsx writer for tests only: stored or deflated zip entries, shared strings and inline strings.
import { deflateRawSync } from 'node:zlib';

function crc32(buf) {
  let c; const table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function zip(files, { deflate = false } = {}) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, 'utf8');
    const data = deflate ? deflateRawSync(raw) : raw;
    const n = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(deflate ? 8 : 0, 8);
    head.writeUInt32LE(crc32(raw), 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(n.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(deflate ? 8 : 0, 10);
    cen.writeUInt32LE(crc32(raw), 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(raw.length, 24); cen.writeUInt16LE(n.length, 28); cen.writeUInt32LE(offset, 42);
    locals.push(head, n, data); centrals.push(cen, n);
    offset += head.length + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(centrals.length / 2, 8); eocd.writeUInt16LE(centrals.length / 2, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ref = (c, r) => { let s = ''; c++; while (c > 0) { s = String.fromCharCode(64 + ((c - 1) % 26) + 1) + s; c = Math.floor((c - 1) / 26); } return s + (r + 1); };

// sheets: [{ name, rows: (string|number|{inline: string}|{rich: string[]}|null)[][] }]
export function xlsx(sheets, opts = {}) {
  const strings = []; const index = (s) => { let i = strings.indexOf(s); if (i < 0) { i = strings.length; strings.push(s); } return i; };
  const files = {};
  const sheetXml = sheets.map((sh) => {
    const rows = sh.rows.map((row, r) => {
      const cells = row.map((v, c) => {
        if (v === null || v === undefined || v === '') return '';
        if (typeof v === 'number') return `<c r="${ref(c, r)}"><v>${v}</v></c>`;
        if (typeof v === 'object' && v.inline !== undefined) return `<c r="${ref(c, r)}" t="inlineStr"><is><t>${esc(v.inline)}</t></is></c>`;
        if (typeof v === 'object' && v.rich) { const i = strings.length; strings.push({ rich: v.rich }); return `<c r="${ref(c, r)}" t="s"><v>${i}</v></c>`; }
        if (typeof v === 'boolean') return `<c r="${ref(c, r)}" t="b"><v>${v ? 1 : 0}</v></c>`;
        return `<c r="${ref(c, r)}" t="s"><v>${index(String(v))}</v></c>`;
      }).join('');
      return `<row r="${r + 1}">${cells}</row>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  });
  files['[Content_Types].xml'] = '<?xml version="1.0"?><Types/>';
  files['xl/workbook.xml'] = `<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  files['xl/_rels/workbook.xml.rels'] = `<Relationships>${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`;
  sheetXml.forEach((x, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = x; });
  files['xl/sharedStrings.xml'] = `<sst>${strings.map((s) => (typeof s === 'object' ? `<si>${s.rich.map((r) => `<r><rPr/><t xml:space="preserve">${esc(r)}</t></r>`).join('')}</si>` : `<si><t>${esc(s)}</t></si>`)).join('')}</sst>`;
  return zip(files, opts);
}
