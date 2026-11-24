// Generates apps/portal/src/data/portal.json, the shell's data, from the files that own the truth:
//   dashboards/<name>/spec.yaml              -> the dashboards grid (title, status, numbers, blocked items)
//   dashboards/<name>/business-context.md    -> a dashboard still in steps 2 to 8 (no spec yet): title and owner
//   catalog/kpi-registry.yaml                -> the catalog (meaning verbatim, status, owner)
//   catalog/data-dictionary.yaml             -> refresh sentence per clean table
//   security/rls-policies.yaml               -> the roles the "view as" switch offers
// Nothing here invents a fact. A field the files do not hold is null and the screen says so.
// Run: npm run portal-data -w @bank-dashboards/portal   (add -- --sample for docs/sample)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const sample = process.argv.includes('--sample');
const repo = sample ? join(root, 'docs', 'sample') : root;
const has = (p) => existsSync(join(repo, p));
const text = (p) => (has(p) ? readFileSync(join(repo, p), 'utf8') : null);
const yaml = (p) => (has(p) ? parse(text(p)) : null);

const registry = yaml('catalog/kpi-registry.yaml') ?? { kpis: [] };
const dictionary = yaml('catalog/data-dictionary.yaml') ?? { views: [] };
const policies = yaml('security/rls-policies.yaml') ?? { roles: {} };

const refreshOf = Object.fromEntries((dictionary.views ?? []).map((v) => [v.name, v.refresh ?? null]));
const kpiById = Object.fromEntries((registry.kpis ?? []).map((k) => [k.id, k]));

// The first "owner:" on the business context's header line, as written.
const ownerFrom = (md) => md?.match(/^owner:\s*(.+?)(?:\s{2,}|$)/m)?.[1]?.trim() ?? null;
const titleFrom = (md) => md?.match(/^#\s*Business context:\s*(.+)$/m)?.[1]?.trim() ?? null;

const names = has('dashboards')
  ? readdirSync(join(repo, 'dashboards'), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name)
  : [];

const dashboards = names.map((name) => {
  const spec = yaml(`dashboards/${name}/spec.yaml`);
  const context = text(`dashboards/${name}/business-context.md`);
  const widgets = spec?.widgets ?? [];
  const numbers = [...new Set(widgets.map((w) => w.kpi).filter(Boolean))];
  const views = [...new Set(numbers.map((id) => kpiById[id]?.view).filter(Boolean))];
  return {
    id: name,
    title: spec?.title ?? titleFrom(context) ?? name,
    owner: ownerFrom(context),
    audience: spec?.audience ?? null,
    // No spec yet means the dashboard is somewhere in steps 2 to 8.
    status: spec?.status ?? 'IN_PROGRESS',
    verified: has(`dashboards/${name}/verify.md`),
    numbers,
    drafts: numbers.filter((id) => kpiById[id]?.status === 'DRAFT'),
    filters: (spec?.filters ?? []).map((f) => f.dimension),
    widgets: widgets.length,
    blocked: (spec?.blocked ?? []).map((b) => ({ widget: b.widget, needs: b.needs, backTo: b.back_to ?? null })),
    refresh: views.map((v) => refreshOf[v]).find(Boolean) ?? null,
  };
});

const recipes = (registry.kpis ?? []).map((k) => ({
  id: k.id,
  status: k.status,
  meaning: k.meaning ?? '',
  owner: k.owner ?? null,
  excludes: k.excludes ?? null,
  format: k.format ?? null,
  dashboards: dashboards.filter((d) => d.numbers.includes(k.id)).map((d) => d.id),
}));

const roles = Object.entries(policies.roles ?? {}).map(([id, r]) => ({ id, groups: r.groups ?? [], note: r.note ?? '' }));

const out = { from: sample ? 'docs/sample' : 'repo', dashboards, recipes, roles };
const target = join(here, '..', 'src', 'data', 'portal.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`portal.json: ${dashboards.length} dashboards, ${recipes.length} recipes, ${roles.length} roles (from ${out.from})`);
