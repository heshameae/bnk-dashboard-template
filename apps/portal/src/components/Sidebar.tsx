import { useMemo, useState } from 'react';
import type { Kpi, Layer, TableNode } from '../model/graph';
import * as I from './Icons';

const ROLE_ICON: Record<TableNode['role'], (p: { size?: number }) => JSX.Element> = {
  fact: I.Fact, dimension: I.Dimension, calendar: I.Calendar, master: I.Database, reference: I.Dimension,
};

const GROUPS: Record<Layer, { key: string; label: string; has: (n: TableNode) => boolean }[]> = {
  raw: [
    { key: 'facts', label: 'Transaction tables', has: (n) => n.role === 'fact' },
    { key: 'master', label: 'Master data', has: (n) => n.role === 'master' },
    { key: 'ref', label: 'Reference', has: (n) => n.role === 'reference' || n.role === 'calendar' },
  ],
  model: [
    { key: 'facts', label: 'Facts', has: (n) => n.role === 'fact' },
    { key: 'dims', label: 'Dimensions', has: (n) => n.role === 'dimension' || n.role === 'calendar' },
  ],
};

function Group({
  label, nodes, selectedId, onSelect,
}: {
  label: string; nodes: TableNode[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (nodes.length === 0) return null;
  return (
    <div className="group">
      <button className="group__head" onClick={() => setOpen(!open)}>
        <span className="group__chev" data-open={open}><I.ChevronDown size={13} /></span>
        {label}
        <span className="group__count">{nodes.length}</span>
      </button>
      {open && nodes.map((t) => {
        const Icon = ROLE_ICON[t.role];
        return (
          <button
            key={t.id}
            className="row"
            aria-current={t.id === selectedId}
            onClick={() => onSelect(t.id)}
            title={t.grain}
          >
            <span className="chip" data-role={t.role}><Icon size={12} /></span>
            <span className="row__name">{t.name}</span>
            {t.status === 'draft' && <span className="tag" data-tone="draft">draft</span>}
            <span className="row__meta">{t.columns.length}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({
  layer, onLayer, nodes, kpis, selectedId, onSelect, onCollapse,
}: {
  layer: Layer;
  onLayer: (l: Layer) => void;
  nodes: TableNode[];
  kpis: Kpi[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCollapse: () => void;
}) {
  const [q, setQ] = useState('');

  const matched = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return nodes;
    return nodes.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.columns.some((c) => c.name.toLowerCase().includes(term))
    );
  }, [nodes, q]);

  const systems = [...new Set(nodes.map((t) => t.system).filter(Boolean))] as string[];
  const draftCount = kpis.filter((k) => k.status === 'DRAFT').length;
  const draftTables = nodes.filter((t) => t.status === 'draft').length;

  return (
    <nav className="sidebar">
      <div className="sidebar__top">
        <button className="ws">
          <span className="ws__avatar">E</span>
          <span className="ws__name">nbd</span>
          <span className="ws__chev"><I.ChevronDown size={13} /></span>
        </button>
        <button className="icon-btn" onClick={onCollapse} title="Collapse sidebar"><I.PanelLeft /></button>
      </div>

      <div className="sidebar__search">
        <label className="search">
          <I.Search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tables"
          />
          {!q && <span className="kbd"><span>⌘</span><span>K</span></span>}
        </label>
      </div>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={layer === 'raw'} onClick={() => onLayer('raw')}>
          <I.Database size={13} />Sources
        </button>
        <button role="tab" aria-selected={layer === 'model'} onClick={() => onLayer('model')}>
          <I.Fact size={13} />BI model
        </button>
      </div>

      <div className="sidebar__scroll">
        {GROUPS[layer].map((g) => (
          <Group
            key={g.key}
            label={g.label}
            nodes={matched.filter(g.has)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}

        {layer === 'model' && (
          <div className="group">
            <div className="group__head">Recipes<span className="group__count">{kpis.length}</span></div>
            {kpis.map((k) => (
              <button key={k.id} className="row" aria-current={k.id === selectedId} onClick={() => onSelect(k.id)} title={k.meaning}>
                <span className="chip" data-role="recipe"><I.Recipe size={12} /></span>
                <span className="row__name">{k.id.replace(/^kpi\./, '')}</span>
                {k.status === 'DRAFT' && <span className="tag" data-tone="draft">draft</span>}
              </button>
            ))}
          </div>
        )}

        {matched.length === 0 && (
          <div style={{ padding: '16px 6px', color: 'var(--text-muted)', fontSize: 14 }}>
            Nothing matches “{q}”.
          </div>
        )}
      </div>

      <div className="sidebar__foot">
        <I.Clock size={14} />
        {layer === 'raw'
          ? `${nodes.length} source tables${systems.length ? ' from ' + systems.join(', ') : ''}`
          : `${nodes.length} clean tables (${draftTables} draft) · ${draftCount} draft recipes`}
      </div>
    </nav>
  );
}
