/* Analytics: who uses which dashboard. The same journey as the reference: pick a dashboard, then
   stat tabs, a chart and breakdown panels. The portal does not record usage yet, so every count is
   empty and says so. The row names (roles, filters, numbers) are real: they come from the repo's files. */
import { useMemo, useState, type ReactNode } from 'react';
import { Avatar, Button, Card, EmptyState, Field, Icon, Menu, MenuItem, Notice } from '../ds';
import { dashboardsFor } from '../shell/access';
import { humanize, roles, type Dashboard } from '../shell/data';
import { go, href } from '../shell/router';
import { useSession } from '../shell/session';
import { DashboardBadge } from './status';

/* ------------------------------------------------------------- the picker */
export function AnalyticsPicker() {
  const { viewer } = useSession();
  const [q, setQ] = useState('');
  const all = dashboardsFor(viewer);
  const shown = all.filter((d) => d.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="shell-page">
      <div className="an-pick">
        <div className="an-pick__icon"><Icon.ChartLine size={16} /></div>
        <h1 className="ds-label an-pick__title">Continue to Analytics</h1>
        <p className="ds-muted an-pick__text">Choose a dashboard to continue</p>
        {all.length === 0 ? (
          <Card className="an-pick__list">
            <EmptyState icon={<Icon.LayoutDashboard size={18} />} title="No dashboards yet">
              A dashboard shows here once its folder exists under dashboards/.
            </EmptyState>
          </Card>
        ) : (
          <>
            <Field placeholder="Find dashboard…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find dashboard" autoFocus />
            <div className="an-pick__list">
              {shown.length === 0 && <div className="an-pick__none ds-muted">Nothing matches “{q}”.</div>}
              {shown.map((d) => (
                <a key={d.id} href={href.analytics(d.id)} className="an-pick__item">
                  <Avatar name={d.title} shape="square" />
                  <span className="ds-truncate">{d.title}</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The topbar's dashboard switcher, as the reference's project switcher. */
export function DashboardSwitch({ d }: { d: Dashboard }) {
  const { viewer } = useSession();
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', minWidth: 0 }}>
      <button className="shell-scope ds-label" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={d.title} shape="square" />
        <span className="ds-truncate" style={{ maxWidth: 180 }}>{d.title}</span>
        <Icon.ChevronsUpDown size={16} className="ds-faint" />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} style={{ top: 40, left: -8, width: 260 }}>
        <div className="ds-menu__label">Dashboards</div>
        {dashboardsFor(viewer).map((o) => (
          <MenuItem key={o.id} active={o.id === d.id} onClick={() => { setOpen(false); go(href.analytics(o.id)); }}>
            <Avatar name={o.title} shape="square" />
            <span className="ds-truncate" style={{ flex: 1 }}>{o.title}</span>
            {o.id === d.id && <Icon.Check size={16} />}
          </MenuItem>
        ))}
      </Menu>
    </span>
  );
}

/* ---------------------------------------------------------- one dashboard */
const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
] as const;
type Days = (typeof RANGES)[number]['days'];

const STATS = [
  { key: 'viewers', label: 'Viewers' },
  { key: 'views', label: 'Views' },
  { key: 'return', label: 'Return rate' },
] as const;
type Stat = (typeof STATS)[number]['key'];

export function AnalyticsPage({ d }: { d: Dashboard }) {
  const [days, setDays] = useState<Days>(7);
  const [ranging, setRanging] = useState(false);
  const [stat, setStat] = useState<Stat>('viewers');
  const range = RANGES.find((r) => r.days === days)!;

  return (
    <div className="shell-page">
      <div className="an-bar">
        <a href={href.dashboard(d.id)} className="an-bar__name ds-label">
          <Icon.LayoutDashboard size={16} className="ds-muted" />
          <span className="ds-truncate">{d.title}</span>
          <Icon.ArrowUpRight size={14} className="ds-muted" />
        </a>
        <DashboardBadge d={d} />
        <span style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Button size="lg" onClick={() => setRanging((r) => !r)} aria-haspopup="menu" aria-expanded={ranging}>
            <Icon.Calendar size={16} />{range.label}<Icon.ChevronDown size={16} className="ds-muted" />
          </Button>
          <Menu open={ranging} onClose={() => setRanging(false)} style={{ top: 42, right: 0, width: 200 }}>
            {RANGES.map((r) => (
              <MenuItem key={r.days} active={r.days === days} onClick={() => { setDays(r.days); setRanging(false); }}>
                <span style={{ flex: 1 }}>{r.label}</span>
                {r.days === days && <Icon.Check size={16} />}
              </MenuItem>
            ))}
          </Menu>
        </div>
      </div>

      <Notice tone="blue" icon={<Icon.Info size={16} />}>
        Usage is not recorded yet. These panels fill once the portal logs who opens which dashboard.
      </Notice>

      <Card className="an-chart">
        <div className="an-stats" role="tablist">
          {STATS.map((s) => (
            <button key={s.key} role="tab" className="an-stat" aria-selected={s.key === stat} onClick={() => setStat(s.key)}>
              <span className="an-stat__label">{s.label}</span>
              <span className="an-stat__value ds-faint" title="Not recorded yet">–</span>
            </button>
          ))}
        </div>
        <EmptyChart days={days} />
      </Card>

      <div className="an-grid an-grid--2">
        <Panel
          tabs={['Roles', 'People']}
          unit="Viewers"
          rows={{ Roles: roles.map((r) => humanize(r.id)), People: [] }}
          empty={{ Roles: 'No roles in security/rls-policies.yaml yet.', People: 'People show here once sign-in is wired.' }}
        />
        <Panel
          tabs={['Filters']}
          unit="Uses"
          rows={{ Filters: d.filters.map(humanize) }}
          empty={{ Filters: 'This dashboard has no filters yet.' }}
        />
      </div>
      <div className="an-grid an-grid--2">
        <Panel
          tabs={['Numbers']}
          unit="Views"
          rows={{ Numbers: d.numbers.map(humanize) }}
          empty={{ Numbers: 'This dashboard has no numbers yet.' }}
        />
        <Panel
          tabs={['Exports']}
          unit="Total"
          rows={{ Exports: [] }}
          empty={{ Exports: 'Downloads to Excel or PDF show here once they are recorded.' }}
          emptyIcon={<Icon.Download size={16} />}
          emptyTitle="No exports"
        />
      </div>
    </div>
  );
}

/** The chart frame with no line: gridlines and the dates of the range, and a note in the middle. */
function EmptyChart({ days }: { days: number }) {
  const ticks = useMemo(() => {
    const n = 8;
    const today = new Date();
    return Array.from({ length: n }, (_, i) => {
      const t = new Date(today);
      t.setDate(today.getDate() - Math.round(((n - 1 - i) * days) / (n - 1)));
      return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  }, [days]);
  return (
    <div className="an-plot">
      <div className="an-plot__grid" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} />)}
      </div>
      <div className="an-plot__note">
        <div>
          <span className="ds-label">No views recorded</span>
          <span className="ds-small ds-muted">The line appears once usage is logged.</span>
        </div>
      </div>
      <div className="an-plot__x ds-caption ds-muted" aria-hidden="true">
        {ticks.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}

/** A breakdown card: tabs on the left, the unit on the right, one row per name. Counts are empty until usage is logged. */
function Panel<T extends string>({ tabs, unit, rows, empty, emptyIcon, emptyTitle }: {
  tabs: T[];
  unit: string;
  rows: Record<T, string[]>;
  empty: Record<T, string>;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
}) {
  const [tab, setTab] = useState<T>(tabs[0]!);
  const list = rows[tab];
  return (
    <Card className="an-panel">
      <div className="an-panel__head">
        <div className="an-panel__tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t} role="tab" className="ds-tab" aria-selected={t === tab} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <span className="an-panel__unit ds-caption ds-muted">{unit}</span>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={emptyIcon ?? <Icon.Inbox size={16} />} title={emptyTitle ?? 'Nothing yet'}>{empty[tab]}</EmptyState>
      ) : (
        <div className="an-panel__rows">
          {list.map((name) => (
            <div key={name} className="an-row">
              <span className="ds-truncate">{name}</span>
              <span className="ds-faint" title="Not recorded yet">–</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
