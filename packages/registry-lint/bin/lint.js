#!/usr/bin/env node
// registry-lint [views] [--root <repo>]
// Runs every implemented check and exits 1 on any FAIL. Views are implemented; the registry,
// acceptance, policy and spec rules are listed in README.md and not implemented yet.
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { lintViews, formatResults } from '../src/views.js';

function findRoot(given) {
  if (given) return resolve(given);
  let d = process.cwd();
  for (;;) {
    if (existsSync(join(d, 'CLAUDE.md')) && existsSync(join(d, 'package.json'))) return d;
    const up = dirname(d);
    if (up === d) return process.cwd();
    d = up;
  }
}

export function main(argv) {
  const rootAt = argv.indexOf('--root');
  const root = findRoot(rootAt >= 0 ? argv[rootAt + 1] : undefined);
  const what = argv.filter((a, i) => !a.startsWith('--') && i !== rootAt + 1);
  const lines = [];
  let ok = true;
  if (!what.length || what.includes('views')) {
    const { files, results } = lintViews({ root });
    lines.push(`views: ${files} file(s) in bi_model/`, formatResults(results));
    ok = ok && results.every((r) => r.pass);
  }
  if (!what.length) lines.push('not implemented yet: kpi-registry, acceptance, rls-policies and spec rules (README.md)');
  return { code: ok ? 0 : 1, text: lines.join('\n') };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const { code, text } = main(process.argv.slice(2));
  process.stdout.write(text + '\n');
  process.exit(code);
}
