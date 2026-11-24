// Throwaway: shared bits for the shell directions. Deleted with the prototype.
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Avatar, Icon, Menu, MenuItem } from '../../src/ds';
import { canOpen, type Page } from '../../src/shell/access';
import { href } from '../../src/shell/router';
import { useSession, viewers } from '../../src/shell/session';
import type { Top } from '../../src/shell/Shell';

export type ShellProps = { active: Page | null; top: Top; full?: boolean; children: ReactNode };
export type Nav = { page: Page; label: string; short: string; to: string; icon: (s: number) => ReactNode; eng?: boolean };

const NAV: Nav[] = [
  { page: 'home', label: 'Dashboards', short: 'Dashboards', to: href.home, icon: (s) => <Icon.LayoutGrid size={s} /> },
  { page: 'analytics', label: 'Analytics', short: 'Analytics', to: href.analytics(), icon: (s) => <Icon.ChartLine size={s} /> },
  { page: 'catalog', label: 'Catalog', short: 'Catalog', to: href.catalog(), icon: (s) => <Icon.BookOpen size={s} /> },
  { page: 'access', label: 'Access', short: 'Access', to: href.access, icon: (s) => <Icon.ShieldCheck size={s} /> },
  { page: 'model', label: 'Model Explorer', short: 'Model', to: href.model, icon: (s) => <Icon.Network size={s} />, eng: true },
];

export function useNav() {
  const { viewer } = useSession();
  return NAV.filter((n) => canOpen(viewer, n.page) && (!n.eng || viewer.eng));
}

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export function useFindKeys(open: (fn: (f: boolean) => boolean) => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open((f) => !f); }
      else if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) { e.preventDefault(); open(() => true); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
}

export function ViewAsMenu({ open, onClose, style, withTheme }: { open: boolean; onClose: () => void; style: CSSProperties; withTheme?: boolean }) {
  const { viewer, setViewer, theme, toggleTheme } = useSession();
  return (
    <Menu open={open} onClose={onClose} style={{ width: 260, ...style }}>
      <div className="ds-menu__label">View the portal as</div>
      {viewers.map((v) => (
        <MenuItem key={v.id} active={v.id === viewer.id} onClick={() => { setViewer(v.id); onClose(); }}>
          <Avatar name={v.label} />
          <span className="ds-truncate" style={{ flex: 1 }}>{v.label}</span>
          {v.id === viewer.id && <Icon.Check size={16} />}
        </MenuItem>
      ))}
      {withTheme && (
        <>
          <div className="ds-menu__sep" />
          <MenuItem onClick={() => { toggleTheme(); onClose(); }}>
            {theme === 'light' ? <Icon.Moon size={16} /> : <Icon.Sun size={16} />}
            <span style={{ flex: 1 }}>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
          </MenuItem>
        </>
      )}
      <div className="ds-menu__sep" />
      <div className="ds-menu__label">Stands in for sign-in until SSO is wired. Changes what you can open, never which rows you see.</div>
    </Menu>
  );
}

export function Crumbs({ top }: { top: Top }) {
  return (
    <div className="pv-crumbs">
      {top.scope && <>{top.scope}<span className="pv-crumbs__sep" aria-hidden="true">/</span></>}
      <span className="pv-crumbs__title ds-label ds-truncate">{top.title}</span>
    </div>
  );
}
