#!/usr/bin/env node
// business-context text <file.docx|.md>
// business-context check <dashboard> <input> [<input> ...] [--root <repo>]
// Exit 0 all PASS, 1 a FAIL line, 2 the input could not be read.
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { inputText } from './text.js';
import { check, formatResults } from './check.js';

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else out._.push(argv[i]);
  }
  return out;
}
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
  const a = args(argv);
  const [cmd, ...rest] = a._;
  try {
    if (cmd === 'text' && rest[0]) return { code: 0, text: inputText(rest[0]) };
    if (cmd === 'check' && rest.length >= 2) {
      const results = check({ root: findRoot(a.root), dashboard: rest[0], inputs: rest.slice(1).map((p) => resolve(p)) });
      return { code: results.every((r) => r.pass) ? 0 : 1, text: formatResults(results) };
    }
    return { code: 2, text: 'usage: business-context text <file> | business-context check <dashboard> <input...> [--root <repo>]' };
  } catch (e) {
    return { code: 2, text: `error: ${e.message}` };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const { code, text } = main(process.argv.slice(2));
  process.stdout.write(text.endsWith('\n') ? text : text + '\n');
  process.exit(code);
}
