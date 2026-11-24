/* Dashboards: the home page. A toolbar, then every published dashboard the viewer can open, once.
   Recently opened lives in the sidebar, not here, so no dashboard shows twice. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Card, EmptyState, Field, Icon, Kbd, Segmented, SectionTitle } from '../ds';
import { dashboardsFor } from '../shell/access';
import type { Dashboard } from '../shell/data';
import { href } from '../shell/router';
import { useSession } from '../shell/session';

export function Home() {
  const { viewer } = useSession();
  const [q, setQ] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
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
    return all.filter((d) => !s || `${d.title} ${d.owner ?? ''} ${d.audience ?? ''}`.toLowerCase().includes(s));
  }, [all, q]);

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
        <Segmented
          value={layout}
          onChange={setLayout}
          items={[
            { key: 'grid', icon: <Icon.LayoutGrid size={16} />, label: 'Grid' },
            { key: 'list', icon: <Icon.List size={16} />, label: 'List' },
          ]}
        />
      </div>

      <SectionTitle>Dashboards</SectionTitle>
      {all.length === 0 ? (
        <Card>
          <EmptyState icon={<Icon.LayoutDashboard size={18} />} title="No dashboards published yet">
            A dashboard shows here once its spec is ready and it has passed verify.
          </EmptyState>
        </Card>
      ) : shown.length === 0 ? (
        <Card><EmptyState title="No dashboards match">Clear the search.</EmptyState></Card>
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
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

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
      </div>
      <div className="dcard__line ds-muted">
        <Icon.Clock size={14} /><span className="ds-truncate">{d.refresh ? `Refreshes ${d.refresh}` : 'Refresh not given'}</span>
      </div>
    </Card>
  );
}
