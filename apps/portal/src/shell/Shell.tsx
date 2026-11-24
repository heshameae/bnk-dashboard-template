/* The frame every page sits in: sidebar on the left, a 56px topbar, the page below.
   Pages pass the topbar's three slots (scope on the left, title in the middle, actions on the right). */
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Icon } from '../ds';
import type { Page } from './access';
import { CommandMenu } from './CommandMenu';
import { Sidebar } from './Sidebar';
import './shell.css';

export type Top = { scope?: ReactNode; title: ReactNode; actions?: ReactNode };

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export function Shell({ active, top, full, children }: { active: Page | null; top: Top; full?: boolean; children: ReactNode }) {
  const [finding, setFinding] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setFinding((f) => !f); }
      else if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) { e.preventDefault(); setFinding(true); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  return (
    <div className="shell" data-drawer={drawer || undefined}>
      <Sidebar active={active} onFind={() => setFinding(true)} onNavigate={() => setDrawer(false)} />
      <div className="shell-scrim" onClick={() => setDrawer(false)} />
      <CommandMenu open={finding} onClose={() => setFinding(false)} />
      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar__left">
            <Button variant="tertiary" iconOnly className="shell-topbar__menu" aria-label="Menu" onClick={() => setDrawer(true)}><Icon.Menu size={16} /></Button>
            {top.scope}
          </div>
          <div className="shell-topbar__title ds-label ds-truncate">{top.title}</div>
          <div className="shell-topbar__right">{top.actions}</div>
        </header>
        <main className="shell-content" data-full={full || undefined}>{children}</main>
      </div>
    </div>
  );
}
