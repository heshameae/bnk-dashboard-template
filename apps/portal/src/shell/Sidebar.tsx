/* The sidebar: workspace and "view as" switch, Find, the places, recently opened dashboards, the viewer. */
import { useState } from 'react';
import { Avatar, Badge, Button, Icon, Kbd, Menu, MenuItem } from '../ds';
import { canOpen, dashboardsFor, type Page } from './access';
import { href, useRoute } from './router';
import { useSession, viewers } from './session';

const WORKSPACE = 'Leap BI';

type Nav = { page: Page; label: string; to: string; icon: React.ReactNode };

export function Sidebar({ active, onFind, onNavigate }: { active: Page | null; onFind: () => void; onNavigate: () => void }) {
  const { viewer, setViewer, theme, toggleTheme, recent } = useSession();
  const [switching, setSwitching] = useState(false);
  const route = useRoute();

  // Only dashboards this viewer can still open: one unpublished since, or another role's, drops out.
  const openable = dashboardsFor(viewer);
  const recents = recent.map((id) => openable.find((d) => d.id === id)).filter((d) => d !== undefined);
  const here = route.page === 'dashboard' ? route.id : null;
  // On a dashboard in Recent, that row is the one highlighted, not Dashboards as well.
  const isCurrent = (n: Nav) => active === n.page && !(n.page === 'home' && recents.some((d) => d.id === here));

  const main: Nav[] = [
    { page: 'home', label: 'Dashboards', to: href.home, icon: <Icon.LayoutGrid size={16} /> },
    { page: 'analytics', label: 'Analytics', to: href.analytics(), icon: <Icon.ChartLine size={16} /> },
    { page: 'catalog', label: 'Catalog', to: href.catalog(), icon: <Icon.BookOpen size={16} /> },
    { page: 'access', label: 'Access', to: href.access, icon: <Icon.ShieldCheck size={16} /> },
  ];
  const eng: Nav[] = [
    { page: 'model', label: 'Model Explorer', to: href.model, icon: <Icon.Network size={16} /> },
  ];
  const link = (n: Nav) =>
    canOpen(viewer, n.page) && (
      <a key={n.page} href={n.to} className="shell-nav__item" aria-current={isCurrent(n) ? 'page' : undefined} onClick={onNavigate}>
        {n.icon}
        <span className="ds-label">{n.label}</span>
      </a>
    );

  return (
    <aside className="shell-sidebar">
      <div className="shell-sidebar__head">
        <button className="shell-ws" onClick={() => setSwitching((s) => !s)} aria-haspopup="menu" aria-expanded={switching}>
          <span className="shell-ws__logo" aria-hidden="true"><Icon.Landmark size={12} /></span>
          <span className="ds-label ds-truncate">{WORKSPACE}</span>
          <Badge>{viewer.label}</Badge>
          <Icon.ChevronsUpDown size={16} className="shell-ws__chev" />
        </button>
        <Menu open={switching} onClose={() => setSwitching(false)} style={{ top: 48, left: 8, width: 240 }}>
          <div className="ds-menu__label">View the portal as</div>
          {viewers.map((v) => (
            <MenuItem key={v.id} active={v.id === viewer.id} onClick={() => { setViewer(v.id); setSwitching(false); }}>
              <Avatar name={v.label} />
              <span className="ds-truncate" style={{ flex: 1 }}>{v.label}</span>
              {v.id === viewer.id && <Icon.Check size={16} />}
            </MenuItem>
          ))}
          <div className="ds-menu__sep" />
          <div className="ds-menu__label">Stands in for sign-in until SSO is wired. Changes what you can open, never which rows you see.</div>
        </Menu>

        <button className="shell-findbtn" onClick={onFind}>
          <Icon.Search size={16} />
          <span style={{ flex: 1, textAlign: 'left' }}>Find</span>
          <Kbd>F</Kbd>
        </button>
      </div>

      <nav className="shell-nav">
        {main.map(link)}
        {recents.length > 0 && (
          <>
            <hr className="shell-nav__sep" />
            <div className="shell-nav__group ds-caption">Recent</div>
            {recents.map((d) => (
              <a key={d.id} href={href.dashboard(d.id)} className="shell-nav__item shell-nav__item--recent" title={d.title} aria-current={here === d.id ? 'page' : undefined} onClick={onNavigate}>
                <span className="shell-nav__mark" aria-hidden="true">{d.title.charAt(0).toUpperCase()}</span>
                <span className="ds-label ds-truncate">{d.title}</span>
              </a>
            ))}
          </>
        )}
        {viewer.eng && (
          <>
            <hr className="shell-nav__sep" />
            <div className="shell-nav__group ds-caption">Eng. team</div>
            {eng.map(link)}
          </>
        )}
      </nav>

      <div className="shell-sidebar__foot">
        <Avatar name={viewer.label} />
        <span className="ds-label ds-truncate" style={{ flex: 1 }}>{viewer.label}</span>
        <Button variant="tertiary" size="sm" iconOnly aria-label={theme === 'light' ? 'Dark theme' : 'Light theme'} title={theme === 'light' ? 'Dark theme' : 'Light theme'} onClick={toggleTheme}>
          {theme === 'light' ? <Icon.Moon size={14} /> : <Icon.Sun size={14} />}
        </Button>
      </div>
    </aside>
  );
}
