// Minimal zip reader (stored and deflated entries), shared by the xlsx and docx readers.
import { inflateRawSync } from 'node:zlib';

const SIG_EOCD = 0x06054b50;
const SIG_CEN = 0x02014b50;
const SIG_LOC = 0x04034b50;

function zipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end-of-central-directory record)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (p === 0xffffffff) throw new Error('zip64 archives are not supported');
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== SIG_CEN) throw new Error('corrupt zip central directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    entries.set(name, { method, csize, usize, off });
    p += 46 + nlen + xlen + clen;
  }
  return entries;
}

function readEntry(buf, e) {
  if (buf.readUInt32LE(e.off) !== SIG_LOC) throw new Error('corrupt zip local header');
  const nlen = buf.readUInt16LE(e.off + 26);
  const xlen = buf.readUInt16LE(e.off + 28);
  const start = e.off + 30 + nlen + xlen;
  const data = buf.subarray(start, start + e.csize);
  if (e.method === 0) return data.toString('utf8');
  if (e.method === 8) return inflateRawSync(data).toString('utf8');
  throw new Error(`unsupported zip compression method ${e.method}`);
}

export function readZip(buf) {
  const entries = zipEntries(buf);
  return { has: (name) => entries.has(name), read: (name) => (entries.has(name) ? readEntry(buf, entries.get(name)) : null) };
}
