import { useMemo, useState } from 'react';
import type { TableNode } from '../model/graph';
import * as I from './Icons';

const typeIcon = (t: string) =>
  /DATE|TIMESTAMP/i.test(t) ? I.Calendar : /NUMBER|INT|FLOAT/i.test(t) ? I.Hash : I.Text;

/** The table's glyph follows its role, the same way it does on the canvas and in the sidebar. */
const ROLE_ICON: Record<TableNode['role'], (p: { size?: number }) => JSX.Element> = {
  fact: I.Fact, dimension: I.Dimension, calendar: I.Calendar, master: I.Database, reference: I.Dimension,
};

/** Every column on the layer in one grid: the fastest way to find where a word is used. */
export function ColumnsGrid({
  nodes, selectedId, onSelect,
}: {
  nodes: TableNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [onlyUndocumented, setOnlyUndocumented] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return nodes.flatMap((t) =>
      t.columns
        .filter((c) => !onlyUndocumented || !c.description)
        .filter(
          (c) =>
            !term ||
            c.name.toLowerCase().includes(term) ||
            t.name.toLowerCase().includes(term) ||
            c.description.toLowerCase().includes(term)
        )
        .map((c) => ({ table: t, col: c }))
    );
  }, [nodes, q, onlyUndocumented]);

  const undocumented = nodes.reduce((n, t) => n + t.columns.filter((c) => !c.description).length, 0);

  return (
    <div className="grid">
      <div className="grid__bar">
        <label className="grid__search">
          <I.Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter columns" />
        </label>
        <button
          className="grid__chip"
          aria-pressed={onlyUndocumented}
          onClick={() => setOnlyUndocumented(!onlyUndocumented)}
        >
          <I.Warning size={13} />
          Missing a meaning
          <span className="grid__chip-count">{undocumented}</span>
        </button>
      </div>

      <div className="grid__scroll">
        <table className="grid__table">
          <thead>
            <tr>
              <th style={{ width: 210 }}><span className="grid__cell"><I.Fact size={13} />Table</span></th>
              <th style={{ width: 190 }}><span className="grid__cell"><I.Text size={13} />Column</span></th>
              <th style={{ width: 150 }}><span className="grid__cell"><I.Hash size={13} />Type</span></th>
              <th style={{ width: 110 }}><span className="grid__cell"><I.Key size={13} />Role</span></th>
              <th><span className="grid__cell"><I.Flag size={13} />Meaning</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ table, col }) => {
              const Icon = typeIcon(col.type);
              const TableIcon = ROLE_ICON[table.role];
              const isRls = col.isRls || col.name === table.rls;
              return (
                <tr
                  key={`${table.id}.${col.name}`}
                  aria-current={table.id === selectedId}
                  onClick={() => onSelect(table.id)}
                >
                  <td>
                    <span className="grid__cell">
                      <span className="chip" data-role={table.role}><TableIcon size={12} /></span>
                      <span className="grid__mono">{table.name}</span>
                    </span>
                  </td>
                  <td>
                    <span className="grid__cell"><Icon size={14} /><span className="grid__mono">{col.name}</span></span>
                  </td>
                  <td><span className="grid__cell grid__mono grid__dim">{col.type}</span></td>
                  <td>
                    <span className="grid__cell">
                      {col.isKey && <span className="tag" data-tone="key">key</span>}
                      {isRls && <span className="tag" data-tone="rls">RLS</span>}
                      {!col.isKey && !isRls && col.nullable === false && <span className="tag">required</span>}
                    </span>
                  </td>
                  <td className="grid__meaning">
                    {col.description || <span className="grid__missing">No meaning recorded</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="grid__empty">No column matches that filter.</div>}
      </div>

      <div className="grid__foot">{rows.length} columns</div>
    </div>
  );
}
