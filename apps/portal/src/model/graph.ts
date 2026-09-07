import raw from '../data/graph.json';

/* ------------------------------------------------------------------ types */

export type Layer = 'raw' | 'model';

export interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  description: string;
  distinct?: number | null;
  nullPct?: number | null;
  isKey?: boolean;
  from?: string;
  isRls?: boolean;
}

export interface Profile {
  profiled_at?: string;
  rows?: number;
  distinct_key?: number;
  date_column?: string;
  date_min?: string;
  date_max?: string;
  last_load?: string;
  refresh?: string;
}

export interface GrainProof {
  rows: number;
  distinct_key: number;
  as_of: string;
  from: string;
}

export interface TableNode {
  id: string;
  layer: Layer;
  name: string;
  /** What the node is, which decides its colour and badge. */
  role: 'fact' | 'dimension' | 'reference' | 'master' | 'calendar';
  /** Clean tables only: `draft` until the data dictionary lists the view (step 7), then `live`. */
  status?: 'draft' | 'live';
  schema?: string;
  system?: string;
  description: string;
  grain: string;
  key: string[];
  notes?: string;
  profile?: Profile;
  grainProof?: GrainProof | null;
  rls?: string;
  refresh?: string;
  sources?: string[];
  usedBy?: string[];
  columns: Column[];
}

export type EdgeStatus = 'proven' | 'declared' | 'inferred';

export interface Edge {
  id: string;
  layer: Layer;
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  status: EdgeStatus;
  /** Why this edge exists, shown verbatim in the detail panel. */
  basis: string;
}

export interface Kpi {
  id: string;
  status: string;
  meaning: string;
  owner: string;
  view: string;
  formula: string;
  aggregation: string;
  filters: string[];
  excludes: string;
  dimensions: string[];
  format: string;
  introducedBy: string;
}

/* ------------------------------------------------- raw layer: tables + FKs */

/** A raw table's role comes from its declared grain and its inbound keys, not its name. */
function rawRole(t: { id: string; grain: string; profile?: Profile }): TableNode['role'] {
  if (/per calendar day/i.test(t.grain)) return 'calendar';
  if (/per .+ per /i.test(t.grain)) return 'fact';
  const rows = t.profile?.rows ?? 0;
  if (rows > 100_000) return 'master';
  return 'reference';
}

const rawTables: TableNode[] = (raw.rawTables as any[]).map((t) => ({
  id: t.id,
  layer: 'raw' as const,
  name: t.name,
  role: rawRole(t),
  schema: t.schema,
  system: t.system,
  description: t.description,
  grain: t.grain,
  key: t.key ?? [],
  notes: t.notes,
  profile: t.profile,
  columns: t.columns,
}));

const rawEdges: Edge[] = (raw.rawEdges as any[]).map((e) => ({
  id: e.id,
  layer: 'raw' as const,
  from: e.from,
  fromColumn: e.fromColumn,
  to: e.to,
  toColumn: e.toColumn,
  status: (e.status === 'proven' ? 'proven' : 'declared') as EdgeStatus,
  basis:
    e.status === 'proven'
      ? `Declared in sources/${e.from}.yaml and proven by the data engineers.`
      : `Declared in sources/${e.from}.yaml; not yet proven.`,
}));

/* --------------------------------------- model layer: views + joinable keys */

const views: TableNode[] = (raw.views as any[]).map((v) => ({
  id: v.id,
  layer: 'model' as const,
  status: (v.status === 'draft' ? 'draft' : 'live') as 'draft' | 'live',
  name: v.name,
  role: v.name === 'dim_date' ? 'calendar' : v.kind === 'dimension' ? 'dimension' : 'fact',
  description: v.description,
  grain: v.grain,
  key: [],
  grainProof: v.grainProof,
  rls: v.rls,
  refresh: v.refresh,
  sources: v.sources,
  usedBy: v.usedBy,
  columns: v.columns,
}));

/** A dimension's key is its first column: the conventions name it before anything else. */
const dimensionKey = (v: TableNode) => v.columns[0]?.name ?? '';

/**
 * The data dictionary records no view-to-view relationships, so the model graph shows
 * *joinable* pairs and says so. Two rules, both from docs/CONVENTIONS.md:
 *   1. The same business word is the same column everywhere, so an exact name match joins.
 *   2. dim_date is the single calendar, so any DATE column on a fact joins date_key.
 * Neither is a proof. Every edge here is drawn dashed and labelled "inferred".
 */
function inferModelEdges(nodes: TableNode[]): Edge[] {
  const dims = nodes.filter((n) => n.role === 'dimension' || n.role === 'calendar');
  const facts = nodes.filter((n) => n.role === 'fact');
  const edges: Edge[] = [];

  for (const fact of facts) {
    for (const dim of dims) {
      const dimKey = dimensionKey(dim);
      const exact = fact.columns.find((c) => c.name === dimKey);
      if (exact) {
        edges.push({
          id: `${fact.id}.${exact.name}~${dim.id}.${dimKey}`,
          layer: 'model',
          from: fact.id,
          fromColumn: exact.name,
          to: dim.id,
          toColumn: dimKey,
          status: 'inferred',
          basis: `Same business word on both sides. Joinable, not proven.`,
        });
        continue;
      }
      if (dim.role === 'calendar') {
        const dateCol = fact.columns.find((c) => /^DATE$/i.test(c.type));
        if (dateCol) {
          edges.push({
            id: `${fact.id}.${dateCol.name}~${dim.id}.${dimKey}`,
            layer: 'model',
            from: fact.id,
            fromColumn: dateCol.name,
            to: dim.id,
            toColumn: dimKey,
            status: 'inferred',
            basis: `dim_date is the single calendar, so this date joins it. Joinable, not proven.`,
          });
        }
      }
    }
  }
  return edges;
}

const modelEdges = inferModelEdges(views);

/* ------------------------------------------------------------------ layout */

const NODE_W = 224;
const NODE_H = 70;
const COL_GAP = 110;
const ROW_GAP = 54;

export interface Placed extends TableNode {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Layered left-to-right: a node sits one column right of everything that points at it,
 * so a fact lands on the left and the things it looks up land on the right. A table with
 * no relationship at all sits in its own row underneath, rather than stretching the graph
 * sideways for a node that connects to nothing.
 */
export function layout(nodes: TableNode[], edges: Edge[]): Placed[] {
  const connected = new Set(edges.flatMap((e) => [e.from, e.to]));
  const linked = nodes.filter((n) => connected.has(n.id));
  const isolated = nodes.filter((n) => !connected.has(n.id));

  const depth = new Map<string, number>(linked.map((n) => [n.id, 0]));
  for (let pass = 0; pass < linked.length; pass++) {
    let changed = false;
    for (const e of edges) {
      const want = (depth.get(e.from) ?? 0) + 1;
      if (want > (depth.get(e.to) ?? 0)) {
        depth.set(e.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns = new Map<number, TableNode[]>();
  for (const n of linked) {
    const d = depth.get(n.id) ?? 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(n);
  }

  const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length));
  const fullH = tallest * NODE_H + (tallest - 1) * ROW_GAP;
  const placed: Placed[] = [];

  for (const [d, group] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    const colH = group.length * NODE_H + (group.length - 1) * ROW_GAP;
    const top = (fullH - colH) / 2;
    group.forEach((n, i) => {
      placed.push({ ...n, x: d * (NODE_W + COL_GAP), y: top + i * (NODE_H + ROW_GAP), w: NODE_W, h: NODE_H });
    });
  }

  isolated.forEach((n, i) => {
    placed.push({ ...n, x: i * (NODE_W + COL_GAP), y: fullH + ROW_GAP * 2, w: NODE_W, h: NODE_H });
  });

  return placed;
}

/* ------------------------------------------------------------------ export */

export const kpis = raw.kpis as Kpi[];
export const dictionaryGeneratedAt = raw.dictionaryGeneratedAt as string | null;

export const layers: Record<Layer, { nodes: TableNode[]; edges: Edge[]; label: string }> = {
  raw: { nodes: rawTables, edges: rawEdges, label: 'Sources' },
  model: { nodes: views, edges: modelEdges, label: 'BI model' },
};

export const byId = new Map<string, TableNode>([...rawTables, ...views].map((n) => [n.id, n]));
