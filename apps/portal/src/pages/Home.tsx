/* Dashboards: the home page. Toolbar, then a side column (recently opened) and the grid. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Card, EmptyState, Field, Icon, Kbd, Menu, MenuItem, Segmented, SectionTitle } from '../ds';
import { dashboardsFor } from '../shell/access';
import { dashboardById, type Dashboard, type DashboardStatus } from '../shell/data';
import { href } from '../shell/router';
import { useSession } from '../shell/session';
import { DashboardBadge } from './status';

type Filter = 'all' | DashboardStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All dashboards' },
  { key: 'READY', label: 'Live and in review' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'IN_PROGRESS', label: 'In progress' },
];

export function Home() {
  const { viewer, recent } = useSession();
  const [q, setQ] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<Filter>('all');
  const [filtering, setFiltering] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); search.current?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  const all = dashboardsFor(viewer);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((d) => (filter === 'all' || d.status === filter) && (!s || `${d.title} ${d.owner ?? ''} ${d.audience ?? ''}`.toLowerCase().includes(s)));
  }, [all, q, filter]);

  const recents = recent.map(dashboardById).filter((d): d is Dashboard => Boolean(d));

  return (
    <div className="shell-page">
      <div className="home-toolbar">
        <Field
          inputRef={search}
          icon={<Icon.Search size={16} />}
          placeholder="Search dashboards"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          suffix={<Kbd>/</Kbd>}
          className="home-toolbar__search"
          aria-label="Search dashboards"
        />
        <div style={{ position: 'relative' }}>
          <Button size="lg" iconOnly aria-label="Filter" title="Filter" onClick={() => setFiltering((f) => !f)} data-on={filter !== 'all' || undefined}>
            <Icon.ListFilter size={16} />
          </Button>
          <Menu open={filtering} onClose={() => setFiltering(false)} style={{ top: 42, right: 0 }}>
            {FILTERS.map((f) => (
              <MenuItem key={f.key} active={f.key === filter} onClick={() => { setFilter(f.key); setFiltering(false); }}>
                <span style={{ flex: 1 }}>{f.label}</span>
                {f.key === filter && <Icon.Check size={16} />}
              </MenuItem>
            ))}
          </Menu>
        </div>
        <Segmented
          value={layout}
          onChange={setLayout}
          items={[
            { key: 'grid', icon: <Icon.LayoutGrid size={16} />, label: 'Grid' },
            { key: 'list', icon: <Icon.List size={16} />, label: 'List' },
          ]}
        />
      </div>

      <div className="home-columns">
        <aside className="home-side">
          <section>
            <SectionTitle>Recently opened</SectionTitle>
            <Card>
              {recents.length === 0 ? (
                <div className="home-row ds-muted">Dashboards you open show here.</div>
              ) : (
                <div className="home-list">
                  {recents.map((d) => (
                    <a key={d.id} href={href.dashboard(d.id)} className="home-row home-row--link">
                      <Avatar name={d.title} shape="square" />
                      <span className="ds-label ds-truncate" style={{ flex: 1 }}>{d.title}</span>
                      <DashboardBadge d={d} />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </aside>

        <section className="home-main">
          <SectionTitle>Dashboards</SectionTitle>
          {all.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Icon.LayoutDashboard size={18} />}
                title="No dashboards yet"
              >
                A dashboard shows here once its folder exists under dashboards/.
              </EmptyState>
            </Card>
          ) : shown.length === 0 ? (
            <Card><EmptyState title="No dashboards match">Clear the search or the filter.</EmptyState></Card>
          ) : layout === 'grid' ? (
            <ul className="home-grid">
              {shown.map((d) => <DashboardCard key={d.id} d={d} />)}
            </ul>
          ) : (
            <Card as="section">
              <div className="home-list">
                {shown.map((d) => (
                  <a key={d.id} href={href.dashboard(d.id)} className="home-row home-row--link home-row--wide">
                    <Avatar name={d.title} shape="square" size="lg" />
                    <span className="home-row__text">
                      <span className="ds-label ds-truncate">{d.title}</span>
                      <span className="ds-small ds-muted ds-truncate">{d.owner ?? 'Owner not given'}</span>
                    </span>
                    <span className="ds-small ds-muted home-hide-sm">{counts(d)}</span>
                    <DashboardBadge d={d} />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </section>
      </div>

    </div>
  );
}

const counts = (d: Dashboard) =>
  d.status === 'IN_PROGRESS' ? 'Being defined' : `${d.numbers.length} ${d.numbers.length === 1 ? 'number' : 'numbers'} · ${d.filters.length} ${d.filters.length === 1 ? 'filter' : 'filters'}`;

function DashboardCard({ d }: { d: Dashboard }) {
  return (
    <Card as="li" interactive className="dcard">
      <a href={href.dashboard(d.id)} className="dcard__link" aria-label={d.title} />
      <div className="dcard__head">
        <Avatar name={d.title} shape="square" size="lg" />
        <span className="dcard__title">
          <span className="ds-label ds-truncate">{d.title}</span>
          <span className="ds-muted ds-truncate">{d.owner ?? 'Owner not given'}</span>
        </span>
        <DashboardBadge d={d} />
      </div>
      <div className="dcard__line"><Icon.Hash size={14} />{counts(d)}</div>
      <div className="dcard__line ds-muted">
        {d.blocked.length > 0
          ? <><Icon.TriangleAlert size={14} /><span className="ds-truncate">{d.blocked.length} {d.blocked.length === 1 ? 'widget waits' : 'widgets wait'} for a recipe</span></>
          : <><Icon.Clock size={14} /><span className="ds-truncate">{d.refresh ? `Refreshes ${d.refresh}` : 'Refresh not given'}</span></>}
      </div>
    </Card>
  );
}
