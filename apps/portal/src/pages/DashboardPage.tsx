/* One dashboard. The page is the dashboard: its own app fills everything below the topbar.
   The portal adds no header. Who owns it, when it refreshes and which numbers it shows sit behind
   the info button in the topbar (DashboardInfo). Dashboards are separate apps; their pages are not designed here.
   Only published dashboards reach here, so there is no state to show. */
import { useEffect, useState } from 'react';
import { Button, EmptyState, Icon, Menu, MenuItem } from '../ds';
import { humanize, recipeById, type Dashboard } from '../shell/data';
import { go, href } from '../shell/router';
import { useSession } from '../shell/session';

export function DashboardPage({ d }: { d: Dashboard }) {
  const { touch } = useSession();
  useEffect(() => touch(d.id), [d.id, touch]);

  return (
    <div className="dash-frame">
      <EmptyState icon={<Icon.AppWindow size={18} />} title="The dashboard app loads here">
        Each dashboard is its own app. The portal signs you in, checks you can open it, and passes on who you are. The app draws the page, and every number comes from the query service.
      </EmptyState>
    </div>
  );
}

/** The topbar's info button: the dashboard's details, out of the way of the dashboard. */
export function DashboardInfo({ d }: { d: Dashboard }) {
  const [open, setOpen] = useState(false);
  const meta: [string, string][] = [
    ['Owner', d.owner ?? 'not given'],
    ['For', d.audience ? humanize(d.audience) : 'not given'],
    ['Refreshes', d.refresh ?? 'not given'],
    ['Data as of', 'not connected'],
  ];
  return (
    <div style={{ position: 'relative' }}>
      <Button variant="tertiary" iconOnly aria-label="About this dashboard" title="About this dashboard" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon.Info size={16} />
      </Button>
      <Menu open={open} onClose={() => setOpen(false)} style={{ top: 40, right: 0, width: 320 }}>
        <dl className="dash-info">
          {meta.map(([k, v]) => (
            <div key={k}><dt className="ds-small ds-muted">{k}</dt><dd className="ds-small">{v}</dd></div>
          ))}
        </dl>
        {d.numbers.length > 0 && (
          <>
            <div className="ds-menu__sep" />
            <div className="ds-menu__label">Numbers on this dashboard</div>
            {d.numbers.map((id) => (
              <MenuItem key={id} onClick={() => { setOpen(false); go(href.catalog()); }}>
                <Icon.Hash size={14} className="ds-faint" />
                <span className="ds-truncate" style={{ flex: 1 }}>{recipeById(id)?.meaning ?? id}</span>
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </div>
  );
}
