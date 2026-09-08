// The export is copied unchanged under sources/_handover/ and never overwritten.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export function sha256Of(path) {
  const h = createHash('sha256');
  if (statSync(path).isDirectory()) {
    for (const f of readdirSync(path).sort()) h.update(f).update(readFileSync(join(path, f)));
  } else h.update(readFileSync(path));
  return h.digest('hex');
}

export function fileHandover({ root, exportPath, kind, system, date }) {
  const dir = join(root, 'sources', '_handover');
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${date}-${system}-schema${kind === 'xlsx' ? '.xlsx' : ''}`);
  const sha = sha256Of(exportPath);
  if (existsSync(target)) {
    if (sha256Of(target) !== sha) throw new Error(`${target} exists with different content; a corrected export is a new dated file (use --date)`);
  } else if (kind === 'xlsx') copyFileSync(exportPath, target);
  else cpSync(exportPath, target, { recursive: true, filter: (p) => statSync(p).isDirectory() || p.toLowerCase().endsWith('.csv') });
  if (sha256Of(target) !== sha) throw new Error(`copy of the export at ${target} does not match the original`);
  return { target, sha };
}

export function newestHandover(root) {
  const dir = join(root, 'sources', '_handover');
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-.+-schema(\.xlsx)?$/.test(f)).sort();
  return names.length ? join(dir, names[names.length - 1]) : null;
}
