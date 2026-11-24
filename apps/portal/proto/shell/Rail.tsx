// Throwaway. Rail: a narrow icon rail with labels, Find in the header; the most room for the page.
import { useState } from 'react';
import { Avatar, Icon, Kbd } from '../../src/ds';
import { CommandMenu } from '../../src/shell/CommandMenu';
import { href } from '../../src/shell/router';
import { useSession } from '../../src/shell/session';
import '../../src/shell/shell.css';
import { Crumbs, ViewAsMenu, useFindKeys, useNav, type ShellProps } from './common';
import './rail.css';

export function Rail({ active, top, full, children }: ShellProps) {
  const { viewer } = useSession();
  const [finding, setFinding] = useState(false);
  const [switching, setSwitching] = useState(false);
  useFindKeys(setFinding);
  const nav = useNav();

  return (
    <div className="pv-rail">
      <nav className="pv-rail__bar" aria-label="Main">
        <a href={href.home} className="pv-rail__mark" aria-label="Leap BI home">
          <span className="pv-mark"><Icon.Landmark size={14} /></span>
        </a>
        {nav.map((n) => (
          <a key={n.page} href={n.to} className="pv-rail__item" aria-current={active === n.page ? 'page' : undefined} title={n.label}>
            <span className="pv-rail__icon">{n.icon(18)}</span>
            <span className="pv-rail__label">{n.short}</span>
          </a>
        ))}
        <span className="pv-rail__spacer" />
        <div className="pv-rail__me">
          <button className="pv-rail__item" onClick={() => setSwitching((s) => !s)} aria-haspopup="menu" aria-expanded={switching} aria-label={`Viewing as ${viewer.label}`} title={`Viewing as ${viewer.label}`}>
            <span className="pv-rail__icon"><Avatar name={viewer.label} /></span>
            <span className="pv-rail__label pv-rail__label--phone">You</span>
          </button>
          <ViewAsMenu open={switching} onClose={() => setSwitching(false)} withTheme style={{ bottom: 0, left: 'calc(100% + 8px)' }} />
        </div>
      </nav>
      <CommandMenu open={finding} onClose={() => setFinding(false)} />

      <div className="pv-rail__main">
        <header className="pv-rail__head">
          <Crumbs top={top} />
          <button className="pv-rail__find" onClick={() => setFinding(true)} aria-label="Find">
            <Icon.Search size={16} />
            <span className="pv-rail__findtext">Find dashboards, numbers, pages</span>
            <Kbd>F</Kbd>
          </button>
          {top.actions && <div className="pv-rail__actions">{top.actions}</div>}
        </header>
        <main className="shell-content" data-full={full || undefined}>{children}</main>
      </div>
    </div>
  );
}
