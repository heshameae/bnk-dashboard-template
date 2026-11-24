// Throwaway. Inset: the chrome is one tinted surface; the page sits on it as a raised panel.
import { useState } from 'react';
import { Button, Icon, Kbd } from '../../src/ds';
import { CommandMenu } from '../../src/shell/CommandMenu';
import { useSession } from '../../src/shell/session';
import '../../src/shell/shell.css';
import { Crumbs, ViewAsMenu, useFindKeys, useNav, type ShellProps } from './common';
import './inset.css';

export function Inset({ active, top, full, children }: ShellProps) {
  const { viewer, theme, toggleTheme } = useSession();
  const [finding, setFinding] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [switching, setSwitching] = useState(false);
  useFindKeys(setFinding);
  const nav = useNav();
  const close = () => setDrawer(false);

  return (
    <div className="pv-inset" data-drawer={drawer || undefined}>
      <aside className="pv-inset__side">
        <div style={{ position: 'relative' }}>
          <button className="pv-inset__ws" onClick={() => setSwitching((s) => !s)} aria-haspopup="menu" aria-expanded={switching}>
            <span className="pv-mark" aria-hidden="true"><Icon.Landmark size={14} /></span>
            <span className="pv-inset__wsname">
              <span className="ds-label ds-truncate">Leap BI</span>
              <span className="ds-caption ds-muted ds-truncate">Viewing as {viewer.label}</span>
            </span>
            <Icon.ChevronsUpDown size={16} className="ds-muted" style={{ flex: 'none' }} />
          </button>
          <ViewAsMenu open={switching} onClose={() => setSwitching(false)} style={{ top: 52, left: 0 }} />
        </div>

        <nav className="pv-inset__nav">
          <button className="pv-item" onClick={() => { close(); setFinding(true); }}>
            <Icon.Search size={16} /><span style={{ flex: 1, textAlign: 'left' }}>Find</span><Kbd>F</Kbd>
          </button>
          <div className="pv-inset__gap" />
          {nav.filter((n) => !n.eng).map((n) => (
            <a key={n.page} href={n.to} className="pv-item" aria-current={active === n.page ? 'page' : undefined} onClick={close}>
              {n.icon(16)}<span>{n.label}</span>
            </a>
          ))}
          {nav.some((n) => n.eng) && <div className="pv-inset__group ds-caption">Eng. team</div>}
          {nav.filter((n) => n.eng).map((n) => (
            <a key={n.page} href={n.to} className="pv-item" aria-current={active === n.page ? 'page' : undefined} onClick={close}>
              {n.icon(16)}<span>{n.label}</span>
            </a>
          ))}
        </nav>

        <button className="pv-item" onClick={toggleTheme}>
          {theme === 'light' ? <Icon.Moon size={16} /> : <Icon.Sun size={16} />}
          <span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
        </button>
      </aside>
      <div className="pv-inset__scrim" onClick={close} />
      <CommandMenu open={finding} onClose={() => setFinding(false)} />

      <div className="pv-inset__panel">
        <header className="pv-inset__head">
          <Button variant="tertiary" iconOnly className="pv-inset__menu" aria-label="Menu" onClick={() => setDrawer(true)}><Icon.Menu size={16} /></Button>
          <Crumbs top={top} />
          {top.actions && <div className="pv-inset__actions">{top.actions}</div>}
        </header>
        <main className="shell-content" data-full={full || undefined}>{children}</main>
      </div>
    </div>
  );
}
