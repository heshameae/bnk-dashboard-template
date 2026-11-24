/* Find (F or ⌘K): one list of dashboards, numbers and pages the viewer can open. Arrows move, Enter opens. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Kbd } from '../ds';
import { canOpen, dashboardsFor, recipesFor } from './access';
import { href, go } from './router';
import { useSession } from './session';

type Item = { key: string; label: string; hint: string; to: string; icon: React.ReactNode };

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { viewer } = useSession();
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = [
      { key: 'p.home', label: 'Dashboards', hint: 'Page', to: href.home, icon: <Icon.LayoutGrid size={16} /> },
      { key: 'p.analytics', label: 'Analytics', hint: 'Page', to: href.analytics(), icon: <Icon.ChartLine size={16} /> },
      { key: 'p.catalog', label: 'Catalog', hint: 'Page', to: href.catalog(), icon: <Icon.BookOpen size={16} /> },
      ...(canOpen(viewer, 'access') ? [{ key: 'p.access', label: 'Access', hint: 'Page', to: href.access, icon: <Icon.ShieldCheck size={16} /> }] : []),
      ...(canOpen(viewer, 'model') ? [{ key: 'p.model', label: 'Model Explorer', hint: 'Eng. team', to: href.model, icon: <Icon.Network size={16} /> }] : []),
    ];
    return [
      ...dashboardsFor(viewer).map((d) => ({ key: d.id, label: d.title, hint: 'Dashboard', to: href.dashboard(d.id), icon: <Icon.LayoutDashboard size={16} /> })),
      ...recipesFor(viewer).map((r) => ({ key: r.id, label: r.meaning, hint: `Number · ${r.status === 'DRAFT' ? 'draft' : 'confirmed'}`, to: href.catalog(), icon: <Icon.Hash size={16} /> })),
      ...pages,
    ];
  }, [viewer]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hit = s ? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(s)) : items;
    return hit.slice(0, 8);
  }, [items, q]);

  useEffect(() => { if (open) { setQ(''); setAt(0); setTimeout(() => input.current?.focus()); } }, [open]);
  useEffect(() => setAt(0), [q]);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open, onClose]);

  if (!open) return null;
  const pick = (i: Item | undefined) => { if (!i) return; go(i.to); onClose(); };

  return (
    <div className="shell-find" ref={box} role="dialog" aria-label="Find">
      <div className="shell-find__input">
        <Icon.Search size={16} />
        <input
          ref={input}
          value={q}
          placeholder="Find dashboards, numbers, pages"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAt((a) => Math.min(a + 1, shown.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setAt((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter') pick(shown[at]);
            if (e.key === 'Escape') onClose();
          }}
        />
        <Kbd>Esc</Kbd>
      </div>
      <div className="shell-find__list">
        {shown.length === 0 && <div className="shell-find__none ds-muted">Nothing matches “{q}”.</div>}
        {shown.map((i, n) => (
          <button key={i.key} className="ds-menu__item shell-find__item" data-active={n === at || undefined} onMouseEnter={() => setAt(n)} onClick={() => pick(i)}>
            <span className="ds-muted">{i.icon}</span>
            <span className="shell-find__text">
              <span className="ds-label ds-truncate">{i.label}</span>
              <span className="ds-small ds-muted">{i.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
