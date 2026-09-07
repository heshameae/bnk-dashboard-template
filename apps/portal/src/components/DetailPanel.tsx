import { useState } from 'react';
import type { Column, Edge, Kpi, TableNode } from '../model/graph';
import * as I from './Icons';

const ROLE_ICON: Record<TableNode['role'], (p: { size?: number }) => JSX.Element> = {
  fact: I.Fact, dimension: I.Dimension, calendar: I.Calendar, master: I.Database, reference: I.Dimension,
};
const ROLE_LABEL: Record<TableNode['role'], string> = {
  fact: 'Fact', dimension: 'Dimension', calendar: 'Calendar', master: 'Master', reference: 'Reference',
};

const n = (v?: number | null) => (v == null ? '—' : v.toLocaleString('en-US'));

/** The column's type decides its glyph, the same way an attribute is glyphed by its type. */
function typeIcon(type: string) {
  if (/DATE|TIMESTAMP/i.test(type)) return I.Calendar;
  if (/NUMBER|INT|FLOAT/i.test(type)) return I.Hash;
  return I.Text;
}

function ColumnRow({ col, rls }: { col: Column; rls?: string }) {
  const [open, setOpen] = useState(false);
  const Icon = typeIcon(col.type);
  const isRls = col.isRls || col.name === rls;
  const hasBody = Boolean(col.description || col.from || col.distinct != null || col.nullPct != null);
  return (
    <div className="col" data-open={open}>
      <button className="col__head" onClick={() => hasBody && setOpen(!open)}>
        <span className="chip" data-role={isRls ? 'recipe' : col.isKey ? 'calendar' : 'reference'}>
          <Icon size={12} />
        </span>
        <span className="col__name">{col.name}</span>
        {col.isKey && <span className="tag" data-tone="key"><I.Key size={10} />key</span>}
        {isRls && <span className="tag" data-tone="rls"><I.Shield size={10} />RLS</span>}
        {col.nullable === false && !col.isKey && <span className="tag">required</span>}
        <span className="col__type">{col.type}</span>
      </button>
      {open && (
        <div className="col__body">
          <span>{col.description || 'No meaning recorded. Ask the data engineers to fill it in.'}</span>
          <span className="col__facts">
            {col.from && <span className="tag" data-tone="mono">from {col.from}</span>}
            {col.distinct != null && <span className="tag">{n(col.distinct)} distinct</span>}
            {col.nullPct != null && (
              <span className="tag" data-tone={col.nullPct > 50 ? 'draft' : undefined}>{col.nullPct}% null</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="field__value field__value--plain">{value}</div>
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  );
}

/** Everything that would stop a build, read off the facts rather than asserted. */
function warnings(node: TableNode, edges: Edge[]): { tone: 'warn' | 'note' | 'good'; text: string }[] {
  const out: { tone: 'warn' | 'note' | 'good'; text: string }[] = [];
  const p = node.profile;

  if (p?.rows != null && p.distinct_key != null) {
    out.push(
      p.rows === p.distinct_key
        ? { tone: 'good', text: `Grain holds: ${n(p.rows)} rows, ${n(p.distinct_key)} distinct keys.` }
        : { tone: 'warn', text: `Grain is broken: ${n(p.rows)} rows but only ${n(p.distinct_key)} distinct keys. Joining this table fans out.` }
    );
  }
  if (node.grainProof) {
    const g = node.grainProof;
    out.push(
      g.rows === g.distinct_key
        ? { tone: 'good', text: `Grain proven ${g.as_of}: ${n(g.rows)} rows, ${n(g.distinct_key)} distinct keys.` }
        : { tone: 'warn', text: `Proof shows ${n(g.rows)} rows against ${n(g.distinct_key)} distinct keys.` }
    );
  } else if (node.layer === 'model' && node.status === 'draft') {
    out.push({ tone: 'warn', text: 'Draft. Written by /build-model draft and not deployed. A data engineer runs its proof, /build-model finalize reviews it, and step 7 makes it live.' });
  } else if (node.layer === 'model') {
    out.push({ tone: 'warn', text: 'No proof on file. A data engineer runs the proof pack before this view is used.' });
  }

  if (node.layer === 'model') {
    out.push(
      node.rls && node.rls !== 'none'
        ? { tone: 'note', text: `Row-level security is applied on ${node.rls}.` }
        : { tone: 'note', text: 'No row-level security: reference data, no balances.' }
    );
  }

  const wide = node.columns.filter((c) => (c.nullPct ?? 0) > 50);
  for (const c of wide) out.push({ tone: 'warn', text: `${c.name} is ${c.nullPct}% null. Counting it will undercount.` });

  if (node.notes) out.push({ tone: 'note', text: node.notes });
  if (node.layer === 'raw' && edges.length === 0) {
    out.push({ tone: 'note', text: 'No relationship declared to any other source table.' });
  }
  return out;
}

/**
 * A recipe is not a table, so it gets its own panel: what the number means, who owns it,
 * and every filter that shapes it. The formula and filters are shown verbatim, because a
 * recipe is the one place a number's meaning is allowed to live.
 */
function RecipeDetail({
  recipe, onSelect, onBack, onCollapse,
}: {
  recipe: Kpi;
  onSelect: (id: string) => void;
  onBack: () => void;
  onCollapse: () => void;
}) {
  const draft = recipe.status === 'DRAFT';
  return (
    <aside className="panel">
      <div className="panel__top">
        <button className="icon-btn" onClick={onBack} title="Back"><I.ChevronLeft /></button>
        <span className="panel__top-title" />
        <button className="icon-btn" onClick={onCollapse} title="Collapse panel"><I.PanelRight /></button>
      </div>

      <div className="panel__scroll">
        <div className="panel__head">
          <div className="panel__head-row">
            <span className="chip chip--lg" data-role="recipe"><I.Recipe size={15} /></span>
            <span className="panel__title">{recipe.id}</span>
            <span style={{ flex: 1 }} />
            <span className="tag" data-tone={draft ? 'draft' : 'good'}>{recipe.status}</span>
          </div>
          <p className="panel__desc">{recipe.meaning}</p>
        </div>

        <div className="section">
          <div className="alert" data-tone={draft ? 'warn' : 'good'}>
            {draft ? <I.Warning size={15} /> : <I.Check size={15} />}
            <span>
              {draft
                ? `Still DRAFT. ${recipe.owner} confirms the meaning on the Catalog page before this merges.`
                : `Confirmed by ${recipe.owner}. The meaning is settled; changing it is a new decision.`}
            </span>
          </div>
        </div>

        <div className="section">
          <h3 className="section__title">The number</h3>
          <Field label="Formula" value={<code className="mono">{recipe.formula}</code>} />
          <Field label="Aggregation" value={recipe.aggregation} />
          <Field label="Format" value={recipe.format} />
        </div>

        <div className="section">
          <h3 className="section__title">Reads</h3>
          <p className="section__sub">A recipe names exactly one clean table and never joins.</p>
          <button className="rel" onClick={() => onSelect(recipe.view)}>
            <span className="rel__top">
              <span className="chip" data-role="fact"><I.Fact size={12} /></span>
              {recipe.view}
              <span className="rel__arrow"><I.ChevronRight size={13} /></span>
            </span>
          </button>
        </div>

        <div className="section">
          <h3 className="section__title">What it counts</h3>
          {recipe.filters.length > 0 ? (
            recipe.filters.map((f) => (
              <div key={f} className="rel">
                <span className="rel__join">{f}</span>
              </div>
            ))
          ) : (
            <div className="alert" data-tone="note"><I.Flag size={15} /><span>No filter. Every row on the table counts.</span></div>
          )}
          {recipe.excludes && (
            <>
              <span className="field__label" style={{ marginTop: 12, display: 'block' }}>Excludes</span>
              <div className="field__value field__value--plain">{recipe.excludes}</div>
            </>
          )}
        </div>

        <div className="section">
          <h3 className="section__title">Can be split by</h3>
          <p className="section__sub">The dimensions this number is allowed to be broken down on.</p>
          <div className="col__facts">
            {recipe.dimensions.map((d) => <span key={d} className="tag" data-tone="link">{d}</span>)}
          </div>
        </div>

        <div className="section">
          <h3 className="section__title">Provenance</h3>
          <Field label="Owner" value={recipe.owner} />
          <Field label="Introduced by" value={recipe.introducedBy} />
        </div>
      </div>
    </aside>
  );
}

/** What the panel shows before you pick anything: what this is, and what still blocks it. */
function Overview({
  layer, nodes, edges, kpis, onSelect, onCollapse,
}: {
  layer: 'raw' | 'model';
  nodes: TableNode[];
  edges: Edge[];
  kpis: Kpi[];
  onSelect: (id: string) => void;
  onCollapse: () => void;
}) {
  const blockers: { text: string; id?: string }[] = [];
  if (layer === 'raw') {
    for (const t of nodes) {
      if (t.profile?.rows != null && t.profile.distinct_key != null && t.profile.rows !== t.profile.distinct_key) {
        blockers.push({ text: `${t.name} does not hold its stated grain.`, id: t.id });
      }
      const unproven = edges.filter((e) => e.from === t.id && e.status !== 'proven');
      if (unproven.length) blockers.push({ text: `${t.name} has ${unproven.length} unproven relationships.`, id: t.id });
    }
  } else {
    for (const v of nodes) if (!v.grainProof) blockers.push({ text: `${v.name} has no proof on file.`, id: v.id });
    for (const k of kpis) if (k.status === 'DRAFT') blockers.push({ text: `${k.id} is DRAFT until the business confirms it.`, id: k.view });
  }

  const columns = nodes.reduce((sum, t) => sum + t.columns.length, 0);

  return (
    <aside className="panel">
      <div className="panel__top">
        <span className="panel__top-title" />
        <button className="icon-btn" onClick={onCollapse} title="Collapse panel"><I.PanelRight /></button>
      </div>
      <div className="panel__scroll">
        <div className="panel__head">
          <div className="panel__head-row">
            <span className="chip chip--lg" data-role={layer === 'raw' ? 'master' : 'fact'}>
              {layer === 'raw' ? <I.Database size={15} /> : <I.Fact size={15} />}
            </span>
            <span className="panel__title">{layer === 'raw' ? 'Sources' : 'BI model'}</span>
          </div>
          <p className="panel__desc">
            {layer === 'raw'
              ? 'The tables the data engineers hand over, exactly as they filed them. Read-only, and nothing here is renamed.'
              : 'The clean tables we build. A join lives here and nowhere else; a recipe reads one of these and never joins.'}
          </p>
        </div>

        <div className="section">
          <div className="field__grid">
            <Field label="Tables" value={String(nodes.length)} />
            <Field label="Columns" value={String(columns)} />
          </div>
          <Field
            label="Relationships"
            value={`${edges.length} ${layer === 'raw' ? 'declared' : 'joinable'}`}
            hint={layer === 'raw'
              ? 'Filed by the data engineers in sources/*.yaml.'
              : 'Inferred from the naming conventions. Not a proof.'}
          />
        </div>

        <div className="section">
          <h3 className="section__title">What blocks a build</h3>
          {blockers.length === 0 ? (
            <div className="alert" data-tone="good"><I.Check size={15} /><span>Nothing outstanding on this layer.</span></div>
          ) : (
            blockers.map((b, i) => (
              <button key={i} className="rel" onClick={() => b.id && onSelect(b.id)}>
                <span className="rel__top"><I.Warning size={14} />{b.text}</span>
              </button>
            ))
          )}
        </div>

        <div className="section">
          <h3 className="section__title">How to read this</h3>
          <div className="alert" data-tone="note">
            <I.Flag size={15} />
            <span>
              A solid line is a relationship a data engineer proved. A dashed line is a join the
              conventions allow but nobody has checked. Click any table to see its grain, its
              profile and what every column means.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DetailPanel({
  node, recipe, layer, edges, nodes, kpis, onSelect, onOpenSource, onBack, onCollapse,
}: {
  node: TableNode | null;
  recipe: Kpi | null;
  layer: 'raw' | 'model';
  edges: Edge[];
  nodes: TableNode[];
  kpis: Kpi[];
  onSelect: (id: string) => void;
  /** A source table lives on the other layer, so opening one switches layers first. */
  onOpenSource: (id: string) => void;
  onBack: () => void;
  onCollapse: () => void;
}) {
  if (recipe) {
    return <RecipeDetail recipe={recipe} onSelect={onSelect} onBack={onBack} onCollapse={onCollapse} />;
  }
  if (!node) {
    return <Overview layer={layer} nodes={nodes} edges={edges} kpis={kpis} onSelect={onSelect} onCollapse={onCollapse} />;
  }

  const Icon = ROLE_ICON[node.role];
  const alerts = warnings(node, edges.filter((e) => e.from === node.id || e.to === node.id));
  const out = edges.filter((e) => e.from === node.id);
  const inbound = edges.filter((e) => e.to === node.id);
  const name = (id: string) => nodes.find((x) => x.id === id)?.name ?? id;
  const usedBy = kpis.filter((k) => k.view === node.id);
  const p = node.profile;

  return (
    <aside className="panel">
      <div className="panel__top">
        <button className="icon-btn" onClick={onBack} title="Back"><I.ChevronLeft /></button>
        <span className="panel__top-title" />
        <button className="icon-btn" onClick={onCollapse} title="Collapse panel"><I.PanelRight /></button>
      </div>

      <div className="panel__scroll">
        <div className="panel__head">
          <div className="panel__head-row">
            <span className="chip chip--lg" data-role={node.role}><Icon size={15} /></span>
            <span className="panel__title">{node.name}</span>
            <span className="panel__kind">{ROLE_LABEL[node.role]}</span>
            {node.status === 'draft' && <span className="tag" data-tone="draft">draft</span>}
            <span style={{ flex: 1 }} />
            <button className="icon-btn" title="More"><I.More /></button>
          </div>
          <p className="panel__desc">{node.description || node.grain || 'No description on file.'}</p>
        </div>

        {alerts.length > 0 && (
          <div className="section">
            {alerts.map((a, i) => (
              <div key={i} className="alert" data-tone={a.tone}>
                {a.tone === 'good' ? <I.Check size={15} /> : a.tone === 'warn' ? <I.Warning size={15} /> : <I.Flag size={15} />}
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <h3 className="section__title">{node.layer === 'raw' ? 'Profile' : 'Contract'}</h3>
          <Field label="Grain" value={node.grain || '—'} />
          {node.key.length > 0 && (
            <Field label="Key" value={node.key.join(', ')} hint="One row per key. A join on anything else fans out." />
          )}
          {node.layer === 'raw' && (
            <>
              <div className="field__grid">
                <Field label="Rows" value={n(p?.rows)} />
                <Field label="Distinct keys" value={n(p?.distinct_key)} />
              </div>
              {p?.date_column && (
                <Field
                  label={`Range on ${p.date_column}`}
                  value={`${p.date_min} to ${p.date_max}`}
                  hint={`Profiled ${p.profiled_at}`}
                />
              )}
              <Field label="Refresh" value={p?.refresh ?? '—'} hint={p?.last_load ? `Last load ${p.last_load}` : undefined} />
              <Field label="Location" value={`${node.schema}.${node.name}`} hint={`Source system: ${node.system}`} />
            </>
          )}
          {node.layer === 'model' && (
            <>
              <Field label="Row-level security" value={node.rls && node.rls !== 'none' ? node.rls : 'none'} />
              <Field label="Refresh" value={node.refresh ?? '—'} />
              {node.grainProof && <Field label="Proof" value={node.grainProof.from} hint={`Run ${node.grainProof.as_of}`} />}
            </>
          )}
        </div>

        {node.layer === 'model' && node.sources && node.sources.length > 0 && (
          <div className="section">
            <h3 className="section__title">Reads</h3>
            <p className="section__sub">The source tables this view joins. The join lives here and nowhere else.</p>
            {node.sources.map((s) => (
              <button key={s} className="rel" onClick={() => onOpenSource(s)}>
                <span className="rel__top">
                  <span className="chip" data-role="master"><I.Database size={12} /></span>
                  {s}
                </span>
              </button>
            ))}
          </div>
        )}

        {(out.length > 0 || inbound.length > 0) && (
          <div className="section">
            <h3 className="section__title">Relationships</h3>
            <p className="section__sub">
              {node.layer === 'raw'
                ? 'Declared by the data engineers in the source file.'
                : 'Joinable pairs inferred from the conventions. Not a proof.'}
            </p>
            {out.map((e) => (
              <button key={e.id} className="rel" onClick={() => onSelect(e.to)}>
                <span className="rel__top">
                  {name(e.to)}
                  <span className="rel__arrow"><I.ChevronRight size={13} /></span>
                  <span style={{ flex: 1 }} />
                  <span className="tag" data-tone={e.status === 'proven' ? 'good' : undefined}>{e.status}</span>
                </span>
                <span className="rel__join">{node.name}.{e.fromColumn} = {name(e.to)}.{e.toColumn}</span>
                <span className="rel__basis">{e.basis}</span>
              </button>
            ))}
            {inbound.map((e) => (
              <button key={e.id} className="rel" onClick={() => onSelect(e.from)}>
                <span className="rel__top">
                  <span className="rel__arrow"><I.ChevronLeft size={13} /></span>
                  {name(e.from)}
                  <span style={{ flex: 1 }} />
                  <span className="tag" data-tone={e.status === 'proven' ? 'good' : undefined}>{e.status}</span>
                </span>
                <span className="rel__join">{name(e.from)}.{e.fromColumn} = {node.name}.{e.toColumn}</span>
                <span className="rel__basis">{e.basis}</span>
              </button>
            ))}
          </div>
        )}

        {usedBy.length > 0 && (
          <div className="section">
            <h3 className="section__title">Recipes on this table</h3>
            <p className="section__sub">Each names one clean table and never joins.</p>
            {usedBy.map((k) => (
              <div key={k.id} className="rel">
                <span className="rel__top">
                  <span className="chip" data-role="recipe"><I.Recipe size={12} /></span>
                  {k.id}
                  <span style={{ flex: 1 }} />
                  <span className="tag" data-tone={k.status === 'CONFIRMED' ? 'good' : 'draft'}>{k.status}</span>
                </span>
                <span className="rel__basis">{k.meaning}</span>
                <span className="rel__join">{k.formula}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <h3 className="section__title">Columns</h3>
          <p className="section__sub">{node.columns.length} columns. Open one to read what it means.</p>
          <div className="cols">
            {node.columns.map((c) => <ColumnRow key={c.name} col={c} rls={node.rls} />)}
          </div>
        </div>
      </div>
    </aside>
  );
}
