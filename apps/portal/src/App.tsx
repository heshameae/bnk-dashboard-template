import { useMemo, useState } from 'react';
import { Canvas } from './components/Canvas';
import { ColumnsGrid } from './components/ColumnsGrid';
import { DetailPanel } from './components/DetailPanel';
import { Sidebar } from './components/Sidebar';
import * as I from './components/Icons';
import { dictionaryGeneratedAt, kpis, layers, layout, type Layer } from './model/graph';
import './styles/app.css';

const TABS = [
  { key: 'graph', label: 'Graph', Icon: I.Fact },
  { key: 'columns', label: 'Columns', Icon: I.Text },
] as const;

const isRecipe = (id: string | null) => Boolean(id?.startsWith('kpi.'));

export default function App() {
  const [layer, setLayer] = useState<Layer>('raw');
  const [selected, setSelected] = useState<Record<Layer, string | null>>({ raw: null, model: null });
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('graph');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  const { nodes, edges, label } = layers[layer];
  const placed = useMemo(() => layout(nodes, edges), [nodes, edges]);

  const selectedId = selected[layer];
  const recipe = kpis.find((k) => k.id === selectedId) ?? null;
  // A recipe is not a node, so the canvas highlights the clean table it reads.
  const canvasId = recipe ? recipe.view : selectedId;
  const node = nodes.find((t) => t.id === canvasId) ?? null;

  const select = (id: string | null) => {
    setSelected((s) => ({ ...s, [layer]: id }));
    if (id) setPanelOpen(true);
  };

  /** Following lineage crosses layers: jump to Sources and land on that table. */
  const openSource = (id: string) => {
    setLayer('raw');
    setSelected((s) => ({ ...s, raw: id }));
    setPanelOpen(true);
  };

  const drafts = kpis.filter((k) => k.status === 'DRAFT');
  const draftTables = nodes.filter((t) => t.status === 'draft');
  const banner =
    layer === 'model' && (drafts.length > 0 || draftTables.length > 0)
      ? {
          text: [
            draftTables.length > 0 ? `${draftTables.length} clean tables are drafts, not deployed.` : '',
            drafts.length > 0 ? `${drafts.length} recipes are still DRAFT. The business confirms them before merge.` : '',
          ].filter(Boolean).join(' '),
          action: 'Open Catalog',
        }
      : null;

  const pillTitle = recipe ? recipe.id : node?.name ?? label;

  return (
    <div className="app" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
      <Sidebar
        layer={layer}
        onLayer={setLayer}
        nodes={nodes}
        kpis={kpis}
        selectedId={selectedId}
        onSelect={select}
        onCollapse={() => setSidebarOpen(false)}
      />

      <div className="main">
        <header className="topbar">
          {!sidebarOpen && (
            <button className="topbar__expand" onClick={() => setSidebarOpen(true)} title="Show sidebar">
              <I.PanelLeft size={15} />
            </button>
          )}
          <div className="crumb">
            <button className="crumb__link" onClick={() => select(null)}>
              <I.Database size={15} />
              {label}
            </button>
            {(node || recipe) && (
              <>
                <span className="crumb__sep">/</span>
                <span className="crumb__here">{recipe ? recipe.id : node!.name}</span>
              </>
            )}
          </div>
          <div className="topbar__right">
            <button className="icon-btn" title="Help"><I.Help /></button>
            <button className="icon-btn" title="More"><I.More /></button>
            <button className="pill"><I.Recipe size={14} />Ask the model</button>
          </div>
        </header>

        <div className="tabbar">
          {TABS.map(({ key, label: l, Icon }) => (
            <button key={key} className="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
              <Icon size={14} />{l}
            </button>
          ))}
          <div className="tabbar__right">
            {layer === 'raw' ? 'Read-only · profiled 2026-09-03' : `Dictionary generated ${(dictionaryGeneratedAt ?? '').slice(0, 10)}`}
          </div>
        </div>

        <div className="body">
          <div className="body__main">
            {tab === 'graph' ? (
              <Canvas
                nodes={placed}
                edges={edges}
                selectedId={canvasId}
                onSelect={select}
                banner={banner}
              />
            ) : (
              <ColumnsGrid nodes={nodes} selectedId={canvasId} onSelect={select} />
            )}

            {!panelOpen && (
              <button className="panel-pill" onClick={() => setPanelOpen(true)}>
                <span className="chip" data-role={recipe ? 'recipe' : node?.role ?? 'master'}>
                  {recipe ? <I.Recipe size={12} /> : <I.Database size={12} />}
                </span>
                <span className="panel-pill__name">{pillTitle}</span>
                <span className="icon-btn"><I.PanelRight size={15} /></span>
              </button>
            )}
          </div>

          {panelOpen && (
            <DetailPanel
              node={node}
              recipe={recipe}
              layer={layer}
              edges={edges}
              nodes={nodes}
              kpis={kpis}
              onSelect={select}
              onOpenSource={openSource}
              onBack={() => select(null)}
              onCollapse={() => setPanelOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { isRecipe };
