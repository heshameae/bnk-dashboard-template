// Throwaway. Masthead: no sidebar. One top bar with the places inline, and a real page title under it.
import { useState } from 'react';
import { Avatar, Button, Icon, Kbd, Menu, MenuItem } from '../../src/ds';
import { CommandMenu } from '../../src/shell/CommandMenu';
import { go, href } from '../../src/shell/router';
import { useSession } from '../../src/shell/session';
import '../../src/shell/shell.css';
import { ViewAsMenu, useFindKeys, useNav, type ShellProps } from './common';
import './masthead.css';

export function Masthead({ active, top, full, children }: ShellProps) {
  const { viewer, theme, toggleTheme } = useSession();
  const [finding, setFinding] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [menu, setMenu] = useState(false);
  useFindKeys(setFinding);
  const nav = useNav();

  const head = (
    <div className="pv-mast__pagehead" data-full={full || undefined}>
      <div className="pv-mast__pagetext">
        {top.scope && <div className="pv-mast__scope">{top.scope}</div>}
        <h1 className="pv-mast__title ds-truncate">{top.title}</h1>
      </div>
      {top.actions && <div className="pv-mast__actions">{top.actions}</div>}
    </div>
  );

  return (
    <div className="pv-mast">
      <header className="pv-mast__bar">
        <div className="pv-mast__inner">
          <div style={{ position: 'relative' }} className="pv-mast__menuwrap">
            <Button variant="tertiary" iconOnly aria-label="Menu" onClick={() => setMenu((m) => !m)} aria-expanded={menu}><Icon.Menu size={16} /></Button>
            <Menu open={menu} onClose={() => setMenu(false)} style={{ top: 40, left: 0, width: 240 }}>
              {nav.map((n) => (
                <MenuItem key={n.page} active={active === n.page} onClick={() => { setMenu(false); go(n.to); }}>
                  {n.icon(16)}<span style={{ flex: 1 }}>{n.label}</span>
                </MenuItem>
              ))}
            </Menu>
          </div>
          <a href={href.home} className="pv-mast__brand">
            <span className="pv-mark" aria-hidden="true"><Icon.Landmark size={14} /></span>
            <span className="ds-label">Leap BI</span>
          </a>
          <nav className="pv-mast__nav" aria-label="Main">
            {nav.map((n) => (
              <a key={n.page} href={n.to} className="pv-mast__link" aria-current={active === n.page ? 'page' : undefined}>{n.label}</a>
            ))}
          </nav>
          <span style={{ flex: 1 }} />
          <button className="pv-mast__find" onClick={() => setFinding(true)} aria-label="Find">
            <Icon.Search size={16} /><span className="pv-mast__findtext">Find</span><Kbd>F</Kbd>
          </button>
          <Button variant="tertiary" iconOnly aria-label={theme === 'light' ? 'Dark theme' : 'Light theme'} title={theme === 'light' ? 'Dark theme' : 'Light theme'} onClick={toggleTheme}>
            {theme === 'light' ? <Icon.Moon size={16} /> : <Icon.Sun size={16} />}
          </Button>
          <div style={{ position: 'relative' }}>
            <button className="pv-mast__me" onClick={() => setSwitching((s) => !s)} aria-haspopup="menu" aria-expanded={switching} aria-label={`Viewing as ${viewer.label}`} title={`Viewing as ${viewer.label}`}>
              <Avatar name={viewer.label} />
            </button>
            <ViewAsMenu open={switching} onClose={() => setSwitching(false)} style={{ top: 40, right: 0 }} />
          </div>
        </div>
      </header>
      <CommandMenu open={finding} onClose={() => setFinding(false)} />
      <main className="shell-content" data-full={full || undefined}>
        {!full && head}
        {children}
      </main>
    </div>
  );
}
